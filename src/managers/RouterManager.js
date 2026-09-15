/**
 * @typedef {Object} RouterOptions
 * @property {number} [timeout=10000] - Milliseconds before a page request is abandoned
 * @property {string} [loadingClass='router-loading'] - Class on the body and the followed link
 *   while a navigation is in progress
 * @property {string} [errorClass='router-error'] - Class on the body and the followed link after a
 *   navigation fails
 * @property {boolean} [fullLoadOnError=true] - Load the page normally when it can't be shown in
 *   place
 * @property {string[]} [nonRoutableExtensions] - Lowercase file extensions, without the dot, that
 *   links open natively instead of loading as a page
 * @property {number} [historyCache=5] - Pages kept in memory for Back and Forward to show without
 *   fetching them again, most recently shown first; 0 fetches every history move
 */

/**
 * Client-side navigation for server-rendered pages
 *
 * Handles same-origin link clicks and history moves by fetching the new page and emitting
 * `router:navigate-success` for PageManager to swap fragments. The most recent navigation always
 * wins, and a navigation that cannot be shown in place falls back to a normal page load, so the
 * router is never worse than a plain link.
 */
export class RouterManager {
  /**
   * @param {Object} config
   * @param {import('./EventManager.js').EventManager} config.eventBus
   * @param {import('../core/DevLogger.js').DevLogger} [config.logger]
   * @param {RouterOptions} [config.options]
   */
  constructor({ eventBus, logger, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.options = {
      timeout: 10000,
      loadingClass: 'router-loading',
      errorClass: 'router-error',
      fullLoadOnError: true,
      historyCache: 5,
      /* File extensions that are never loaded as an HTML fragment, unless the link is marked
         [data-router-enhance]. The browser downloads or opens them natively. */
      nonRoutableExtensions: [
        'pdf',
        'zip',
        'rar',
        '7z',
        'tar',
        'gz',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'csv',
        'rtf',
        'txt',
        'dmg',
        'exe',
        'pkg',
        'apk',
        'mp3',
        'mp4',
        'wav',
        'avi',
        'mov',
        'mkv',
        'webm',
        'jpg',
        'jpeg',
        'png',
        'gif',
        'svg',
        'webp',
        'avif',
        'xml',
        'rss',
        'ics',
      ],
      ...options,
    };

    this.currentUrl = new URL(location.href);
    this._navigation = null;
    this._swap = Promise.resolve();
    this._failedElement = null;
    /* Set when the latest navigation failed, so its address can be tried again */
    this._lastFailed = false;
    this._entry = null;
    this._entryCount = 0;
    this._scrollPositions = new Map();
    /* Pages shown in place, by address without the hash, for history moves to show again */
    this._pages = new Map();
    this._previousScrollRestoration = history.scrollRestoration;

    /* Aborted in destroy() to remove every window and document listener */
    this._listeners = new AbortController();

    this._initialize();
  }

  _initialize() {
    this.logger?.info('RouterManager initializing');

    const { signal } = this._listeners;

    /* The router restores scroll itself, after the new content is in place */
    this._entry = this._adoptEntry(history.state);
    history.scrollRestoration = 'manual';
    this._restoreScrollAfterLoad(history.state?.scroll);

    window.addEventListener('scroll', () => this._rememberScroll(), { passive: true, signal });
    window.addEventListener('popstate', event => this._onPopState(event), { signal });
    document.addEventListener('click', event => this._onClick(event), { signal });
    window.addEventListener(
      'pageshow',
      event => {
        if (event.persisted) {
          this.eventBus.emit('router:bfcache-restore', { url: this.currentUrl });
        }
      },
      { signal }
    );
    window.addEventListener(
      'pagehide',
      () => {
        this._persistScroll();
        this.eventBus.emit('router:bfcache-store', { url: this.currentUrl });
      },
      { signal }
    );

    this.eventBus.emit('router:initialized', { currentUrl: this.currentUrl });
  }

  /**
   * Whether a navigation is in progress, including the fragment swap that follows it
   */
  get navigating() {
    return this._navigation !== null;
  }

  isNavigating() {
    return this.navigating;
  }

  /**
   * Whether the router takes over clicks on this link
   *
   * Links are left to the browser when their href is missing or only a hash, when they or an
   * ancestor have [data-router-skip], when they download, open another browsing context, are
   * rel="external" or leave the site, and when they point at a file type listed in
   * `nonRoutableExtensions` without [data-router-enhance].
   *
   * @param {Element} link An `a` or `area` element
   * @returns {boolean}
   */
  handlesLink(link) {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || link.closest('[data-router-skip]')) {
      return false;
    }

    const target = link.getAttribute('target');
    const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    if (
      link.hasAttribute('download') ||
      rel.includes('external') ||
      (target && target !== '_self')
    ) {
      return false;
    }

    let url;
    try {
      url = new URL(href, document.baseURI);
    } catch {
      return false;
    }

    if (url.origin !== location.origin) {
      return false;
    }

    return !this._isNonRoutableAsset(url) || link.hasAttribute('data-router-enhance');
  }

  /**
   * Determine whether a URL points at a static asset that must not be
   * loaded as an HTML fragment (matched by file extension on the pathname).
   */
  _isNonRoutableAsset(url) {
    const match = url.pathname.match(/\.([a-z0-9]+)$/i);
    if (!match) {
      return false;
    }
    return this.options.nonRoutableExtensions.includes(match[1].toLowerCase());
  }

  _onClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const path = event.composedPath().filter(node => node instanceof Element);
    const index = path.findIndex(node => node.matches('a[href], area[href]'));
    const link = path[index];

    /* closest() stops at a shadow root, so ancestors outside it are checked through the path */
    if (
      !link ||
      path.slice(index).some(node => node.matches('[data-router-skip]')) ||
      !this.handlesLink(link)
    ) {
      return;
    }

    const url = new URL(link.getAttribute('href'), document.baseURI);

    /* Same-page hash links keep native scrolling, focus and :target behaviour */
    if (url.hash && this._isSameDocument(url, new URL(location.href))) {
      return;
    }

    event.preventDefault();

    /* Failures are reported through router:navigate-error */
    this.navigate(url, {
      viewTarget: link.getAttribute('data-view-target') || 'main',
      replace: link.hasAttribute('data-router-replace'),
      immutableUrl: this._isImmutableUrlLink(link),
      trigger: 'link-click',
      element: link,
    }).catch(() => {});
  }

  _isImmutableUrlLink(link) {
    const source = link.closest('[data-router-immutable-url]');
    return source ? source.getAttribute('data-router-immutable-url') !== 'false' : false;
  }

  _isSameDocument(a, b) {
    return a.origin === b.origin && a.pathname === b.pathname && a.search === b.search;
  }

  /**
   * Load the page for the history entry the browser moved to
   *
   * Moves between entries of the same document (a hash change) only restore their scroll position.
   * Otherwise the fragment changed by the later of the two entries is replaced: going back undoes
   * the navigation that created the entry being left. A jump over other entries, whose changes
   * aren't known, replaces `main`.
   */
  _onPopState(event) {
    const departing = this._entry;
    const isTraversal = Boolean(event.state?.key);
    const arriving = this._adoptEntry(event.state, departing.position + 1);
    const savedScroll = this._scrollPositions.get(arriving.key) ?? event.state?.scroll ?? null;
    const url = new URL(location.href);
    this._entry = arriving;

    if (this._isSameDocument(url, this.currentUrl)) {
      this.currentUrl = url;
      if (isTraversal && savedScroll) {
        this._scrollTo(savedScroll);
      }
      return;
    }

    this.eventBus.emit('router:popstate', {
      url,
      state: event.state,
      trigger: 'popstate',
    });

    const changed = arriving.position < departing.position ? departing : arriving;
    const adjacent = Math.abs(arriving.position - departing.position) === 1;

    this.navigate(url, {
      trigger: 'popstate',
      force: true,
      viewTarget: adjacent ? changed.viewTarget : 'main',
      scroll: savedScroll,
    }).catch(() => {});
  }

  /**
   * The router's key, position and view target for a history entry
   *
   * Entries the router did not create (the first page, native hash navigations) are given a key
   * and position so their scroll position can be remembered.
   */
  _adoptEntry(state, position = 0) {
    if (state?.key) {
      return { key: state.key, position: state.position ?? position, viewTarget: state.viewTarget };
    }

    const entry = { key: this._createKey(), position };
    const base = state && typeof state === 'object' ? state : {};
    history.replaceState({ ...base, key: entry.key, position }, '');
    return entry;
  }

  _createKey() {
    this._entryCount += 1;
    return `${Date.now().toString(36)}-${this._entryCount}`;
  }

  _entryState(trigger) {
    const { key, position, viewTarget } = this._entry;
    return { timestamp: Date.now(), trigger, key, position, viewTarget };
  }

  _rememberScroll() {
    const scroll = { x: window.scrollX, y: window.scrollY };
    this._scrollPositions.set(this._entry.key, scroll);
    return scroll;
  }

  /**
   * Save the scroll position into the current history entry, so it survives a reload
   */
  _persistScroll() {
    const scroll = this._rememberScroll();
    if (history.state?.key === this._entry.key) {
      history.replaceState({ ...history.state, scroll }, '');
    }
  }

  /**
   * Restore a scroll position saved before a reload, unless the user has already scrolled
   */
  _restoreScrollAfterLoad(scroll) {
    if (!scroll) {
      return;
    }

    const restore = () =>
      requestAnimationFrame(() => {
        if (window.scrollX === 0 && window.scrollY === 0) {
          this._scrollTo(scroll);
        }
      });

    if (document.readyState === 'complete') {
      restore();
    } else {
      window.addEventListener('load', restore, { once: true, signal: this._listeners.signal });
    }
  }

  _scrollTo({ x, y }) {
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  }

  /**
   * Fetch a URL without affecting navigation
   *
   * Resolves with the response and its body, parsed as JSON when the response says so.
   *
   * @param {string|URL} url
   * @param {RequestInit & { timeout?: number }} [init] `signal` cancels the request and
   *   `timeout` overrides the router's timeout in milliseconds
   * @returns {Promise<{ response: Response, data: string|Object }>}
   * @throws {Error} An `HttpError` for a non-2xx response, a `TimeoutError` DOMException when the
   *   timeout elapses, or the abort reason of `init.signal`.
   */
  async get(url, init = {}) {
    const { signal, timeout = this.options.timeout, headers, ...rest } = init;
    const requestUrl = String(url);
    const request = this._requestSignal(signal, timeout);

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'same-origin',
        ...rest,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/html,application/json,*/*',
          ...headers,
        },
        signal: request.signal,
      });

      if (!response.ok) {
        throw this._createHttpError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      this.logger?.info('GET successful', {
        url: requestUrl,
        status: response.status,
        contentType,
      });

      return { response, data };
    } catch (error) {
      if (error?.name === 'AbortError') {
        this.logger?.debug('GET aborted', { url: requestUrl });
      } else {
        this.logger?.error('GET failed', { url: requestUrl, error });
      }
      throw error;
    } finally {
      request.dispose();
    }
  }

  /**
   * A signal that aborts when the caller's signal does or when the timeout elapses
   */
  _requestSignal(signal, timeout) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    const timer = setTimeout(() => {
      controller.abort(new DOMException(`Request timed out after ${timeout}ms`, 'TimeoutError'));
    }, timeout);

    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }

    return {
      signal: controller.signal,
      dispose: () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      },
    };
  }

  /**
   * Navigate to a URL, replacing any navigation still in progress
   *
   * `router:navigate-success` listeners that change the page pass the work to `waitUntil()`
   * synchronously; the navigation stays in progress, and the next one waits, until it settles.
   * A navigation that fails, or whose response cannot be shown in place, loads the page normally
   * unless the `fullLoadOnError` option is false.
   *
   * @param {string|URL} url
   * @param {Object} [options]
   * @param {boolean} [options.replace=false] Replace the current history entry
   * @param {string} [options.trigger='programmatic']
   * @param {Element|null} [options.element=null] Element that started the navigation
   * @param {boolean} [options.force=false] Navigate even when the URL is the current one
   * @param {boolean} [options.immutableUrl=false] Leave the address bar and history untouched
   * @param {string} [options.viewTarget] Fragment to replace
   * @param {{ x: number, y: number }|null} [options.scroll] Scroll position for listeners to
   *   restore once the page is replaced
   * @returns {Promise<string|undefined>} The fetched HTML, or undefined when the navigation was
   *   skipped, replaced by a newer one or handed to the browser
   * @throws {Error} The fetch or swap error when the navigation fails.
   */
  async navigate(url, options = {}) {
    const {
      replace = false,
      trigger = 'programmatic',
      element = null,
      force = false,
      immutableUrl = false,
      viewTarget,
      scroll = null,
    } = options;

    const targetUrl = new URL(url, location.href);

    if (!force && !this._lastFailed && targetUrl.href === this.currentUrl.href) {
      this.logger?.debug('Navigation skipped - same URL', { url: targetUrl.href });
      return;
    }

    this._lastFailed = false;
    this._abortInFlight();
    const navigation = { controller: new AbortController(), element };
    this._navigation = navigation;
    this._showLoading(navigation);

    this.eventBus.emit('router:navigate-start', {
      url: targetUrl,
      trigger,
      element,
      replace,
    });

    const fromHistory = trigger === 'popstate';
    let historyUpdated = false;
    let status = 'success';

    try {
      const { signal } = navigation.controller;
      const kept = fromHistory && this._pages.get(this._pageKey(targetUrl));
      const { response, data } = kept || (await this.get(targetUrl, { signal }));
      const finalUrl = this._responseUrl(response, targetUrl);
      const contentType = response.headers.get('content-type') || '';

      if (
        finalUrl.origin !== location.origin ||
        typeof data !== 'string' ||
        !contentType.includes('text/html')
      ) {
        this.logger?.warn('Response cannot be shown in place; loading the page normally', {
          url: targetUrl.href,
          responseUrl: finalUrl.href,
          contentType,
        });
        status = 'full-load';
        this._fullLoad(targetUrl, fromHistory || replace);
        return;
      }

      await this._swap;
      signal.throwIfAborted();

      if (!immutableUrl && !fromHistory) {
        if (replace) {
          this._entry = { ...this._entry, viewTarget };
          history.replaceState(this._entryState(trigger), '', finalUrl.href);
        } else {
          this._persistScroll();
          this._entry = { key: this._createKey(), position: this._entry.position + 1, viewTarget };
          history.pushState(this._entryState(trigger), '', finalUrl.href);
        }
        historyUpdated = true;
      }

      this.currentUrl = finalUrl;

      const pending = [];
      this.eventBus.emit('router:navigate-success', {
        url: finalUrl,
        requestedUrl: targetUrl,
        redirected: response.redirected,
        html: data,
        trigger,
        element,
        replace,
        viewTarget,
        immutableUrl,
        scroll,
        signal,
        waitUntil: promise => pending.push(promise),
      });

      this._swap = Promise.allSettled(pending);
      const failure = (await this._swap).find(result => result.status === 'rejected');
      if (failure) {
        throw failure.reason;
      }

      this._remember(finalUrl, { response, data });

      this.logger?.info('Navigation successful', {
        url: finalUrl.href,
        trigger,
        replace,
        immutableUrl,
      });

      return data;
    } catch (error) {
      if (navigation.controller.signal.aborted) {
        status = 'aborted';
        this.logger?.debug('Navigation replaced by a newer one', { url: targetUrl.href });
        return;
      }

      status = 'error';
      this._lastFailed = true;
      this._pages.delete(this._pageKey(targetUrl));
      this._showError(navigation);

      this.eventBus.emit('router:navigate-error', {
        url: targetUrl,
        error,
        trigger,
        element,
      });

      this.logger?.error('Navigation failed', {
        url: targetUrl.href,
        error,
        trigger,
      });

      if (this.options.fullLoadOnError) {
        this._fullLoad(
          historyUpdated ? this.currentUrl : targetUrl,
          fromHistory || replace || historyUpdated
        );
      }

      throw error;
    } finally {
      this._finish(navigation);

      this.eventBus.emit('router:navigate-end', {
        url: targetUrl,
        trigger,
        status,
      });
    }
  }

  /**
   * The URL the response came from, keeping the requested hash
   */
  _responseUrl(response, requestedUrl) {
    const url = new URL(response.url || requestedUrl.href);
    if (!url.hash) {
      url.hash = requestedUrl.hash;
    }
    return url;
  }

  /**
   * Keep a page that was shown in place for history moves, dropping the pages shown least recently
   * beyond `historyCache`
   */
  _remember(url, page) {
    const key = this._pageKey(url);
    this._pages.delete(key);
    this._pages.set(key, page);
    for (const oldest of this._pages.keys()) {
      if (this._pages.size <= this.options.historyCache) {
        break;
      }
      this._pages.delete(oldest);
    }
  }

  _pageKey(url) {
    const key = new URL(url);
    key.hash = '';
    return key.href;
  }

  _fullLoad(url, replaceEntry) {
    if (replaceEntry) {
      window.location.replace(url.href);
    } else {
      window.location.assign(url.href);
    }
  }

  _showLoading({ element }) {
    const { loadingClass, errorClass } = this.options;

    document.body.classList.remove(errorClass);
    this._failedElement?.classList.remove(errorClass);
    this._failedElement = null;

    document.body.classList.add(loadingClass);
    element?.classList.add(loadingClass);
  }

  _showError({ element }) {
    const { errorClass } = this.options;

    document.body.classList.add(errorClass);
    element?.classList.add(errorClass);
    this._failedElement = element;
  }

  _finish(navigation) {
    navigation.element?.classList.remove(this.options.loadingClass);

    if (this._navigation === navigation) {
      this._navigation = null;
      document.body.classList.remove(this.options.loadingClass);
    }
  }

  /**
   * Programmatically go back in history
   */
  back() {
    this.logger?.info('Navigating back');
    history.back();
  }

  /**
   * Programmatically go forward in history
   */
  forward() {
    this.logger?.info('Navigating forward');
    history.forward();
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.currentUrl;
  }

  /**
   * Cancel the navigation in progress, if any
   */
  _abortInFlight() {
    this._navigation?.controller.abort();
  }

  /**
   * Create HTTP error with enhanced information
   */
  _createHttpError(response) {
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    error.name = 'HttpError';
    error.status = response.status;
    error.statusText = response.statusText;
    error.response = response;
    error.url = response.url;
    return error;
  }

  /**
   * Remove listeners and cancel the navigation in progress
   */
  destroy() {
    this.logger?.info('RouterManager destroying');

    this._listeners.abort();
    this._abortInFlight();
    history.scrollRestoration = this._previousScrollRestoration;

    this.eventBus.emit('router:destroyed', {});

    this.logger?.info('RouterManager destroyed');
  }
}
