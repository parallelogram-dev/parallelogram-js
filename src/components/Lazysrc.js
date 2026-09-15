import { BaseComponent } from '../core/BaseComponent.js';

const tokens = value =>
  String(value ?? '')
    .split(/\s+/)
    .filter(Boolean);

const cssUrl = url =>
  `url("${String(url)
    .replace(/[\\"]/g, '\\$&')
    .replace(/[\n\r\f]/g, '')}")`;

/**
 * Lazysrc - lazy image loading built on the browser's own `loading="lazy"`
 *
 * The browser decides when images load. Markup that already has a real `src` or `srcset` is never
 * stripped, so it works without JavaScript; Lazysrc only adds `loading="lazy"` and
 * `decoding="async"` when they are missing. Sources held in `data-lazysrc-src`,
 * `data-lazysrc-srcset` and `data-lazysrc-sizes` (on the image, or on the `<source>` elements of its
 * `<picture>`) are copied onto the elements as soon as the image mounts, with no observer or
 * preloader. Background images have no native lazy loading, so they load through an
 * IntersectionObserver shortly before they scroll into view.
 *
 * Failed loads are retried with a growing delay. Progress is written to `data-lazysrc-state`, which
 * the shipped stylesheet uses for the placeholder, the fade and the error outline; the fade is
 * skipped when the user prefers reduced motion.
 *
 * Don't lazy load the largest image above the fold. Give it a plain `src` and
 * `fetchpriority="high"` instead.
 *
 * @example
 * <!-- Recommended: real sources, which also work without JavaScript -->
 * <img data-lazysrc
 *      src="harbour-640.jpg"
 *      srcset="harbour-640.jpg 640w, harbour-1280.jpg 1280w"
 *      sizes="(max-width: 640px) 100vw, 640px"
 *      width="640" height="480" alt="Harbour at dawn">
 *
 * <!-- Sources held in data attributes; without JavaScript the image stays empty, so follow it with
 *      a <noscript> copy that has real sources -->
 * <picture>
 *   <source data-lazysrc-srcset="harbour.avif" type="image/avif">
 *   <img data-lazysrc data-lazysrc-src="harbour.jpg" width="640" height="480" alt="Harbour at dawn">
 * </picture>
 * <noscript>
 *   <img src="harbour.jpg" width="640" height="480" alt="Harbour at dawn">
 * </noscript>
 *
 * <!-- Background image; give the element a background colour for when scripts don't run -->
 * <div class="hero" data-lazysrc data-lazysrc-bg="hero.jpg"></div>
 *
 * @attributes
 * - data-lazysrc-src, data-lazysrc-srcset, data-lazysrc-sizes: sources copied onto the image
 * - data-lazysrc-bg: background image URL, loaded shortly before the element scrolls into view
 * - data-lazysrc-fetchpriority: high | low | auto, copied to the image's `fetchpriority`
 * - data-lazysrc-root-margin: how far outside the viewport background images start loading
 *   (default "600px 0px")
 * - data-lazysrc-threshold: visible fraction at which a background image starts loading (default 0)
 * - data-lazysrc-retry-attempts: retries after a failed load (default 3)
 * - data-lazysrc-retry-delay: milliseconds before the first retry, multiplied by the attempt
 *   number for later ones (default 1000)
 * - data-lazysrc-fade-duration: fade length in milliseconds, set as `--lazy-transition-duration`
 * - data-lazysrc-loading-class, data-lazysrc-loaded-class, data-lazysrc-error-class: classes added
 *   in each state (default lazysrc--loading, lazysrc--loaded and lazysrc--error)
 * - data-lazysrc-state: set by the component to loading, loaded or error
 *
 * @events
 * - lazysrc:mounted: the element is set up, with `{ element, config }`
 * - lazysrc:loading-start: sources were handed to the browser, or a background image started loading
 * - lazysrc:loaded: with `{ element, loadTime }`; loadTime is the download time in milliseconds from
 *   Resource Timing, or null when the browser has no entry for it
 * - lazysrc:error: every retry failed, or the element has no source to load, with
 *   `{ element, error }`
 * - lazysrc:detached: a loaded element's listeners have been released
 * - lazysrc:forceLoad: dispatch this on an element to load it straight away
 *
 * @cssprop --lazy-transition-duration - length of the fade (default 0.3s)
 * @cssprop --lazy-loading-opacity - opacity while loading (default 0.7)
 * @cssprop --lazy-placeholder-bg - background while loading
 * @cssprop --lazy-error-bg - background after an error
 * @cssprop --lazy-error-color - outline colour after an error
 */
export default class Lazysrc extends BaseComponent {
  static selector = 'data-lazysrc';

  static get defaults() {
    return {
      rootMargin: '600px 0px',
      threshold: 0,
      fetchPriority: '',
      retryAttempts: 3,
      retryDelay: 1000,
      fadeInDuration: 300,
      loadingClass: 'lazysrc--loading',
      loadedClass: 'lazysrc--loaded',
      errorClass: 'lazysrc--error',
    };
  }

  constructor(options = {}) {
    super(options);

    /** Background image observers keyed by root margin and threshold, with the elements each watches */
    this._observers = new Map();
  }

  _init(element) {
    const state = super._init(element);

    state.config = this._getConfigFromAttrs(element, {
      rootMargin: 'root-margin',
      threshold: 'threshold',
      fetchPriority: 'fetchpriority',
      retryAttempts: 'retry-attempts',
      retryDelay: 'retry-delay',
      fadeInDuration: 'fade-duration',
      loadingClass: 'loading-class',
      loadedClass: 'loaded-class',
      errorClass: 'error-class',
    });
    state.status = 'idle';
    state.attempts = 0;
    state.retryTimer = null;
    state.observerKey = null;
    state.listeners = new AbortController();
    state.image = this.hasAttr(element, 'bg') ? null : this._imageFor(element);
    this._resetSettled(state);

    if (this.hasAttr(element, 'fade-duration')) {
      element.style.setProperty('--lazy-transition-duration', `${state.config.fadeInDuration}ms`);
    }

    element.addEventListener('lazysrc:forceLoad', () => this.loadElement(element), {
      signal: state.listeners.signal,
    });

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      state.listeners.abort();
      clearTimeout(state.retryTimer);
      this._unobserve(element, state);
      state.resolveSettled();
      baseCleanup();
    };

    this._dispatch(element, 'lazysrc:mounted', {
      element,
      config: state.config,
      timestamp: performance.now(),
    });

    if (this.hasAttr(element, 'bg')) {
      this._observe(element, state);
    } else if (state.image) {
      this._prepareImage(element, state);
    } else {
      /* Nothing to load, so the error is final and loadElement() resolves straight away */
      state.noSource = true;
      this._fail(element, state, 'Lazysrc needs an <img>, a <picture> or data-lazysrc-bg');
    }

    return state;
  }

  /**
   * The image Lazysrc manages for an element: the element itself, or the image in a `<picture>`
   *
   * @returns {HTMLImageElement|null}
   */
  _imageFor(element) {
    if (element.localName === 'img') return element;
    if (element.localName === 'picture') return element.querySelector('img');
    return null;
  }

  /**
   * Make an image lazy, copy its data sources across and listen for it to load
   */
  _prepareImage(element, state) {
    const { image, config } = state;
    const { signal } = state.listeners;

    image.addEventListener('load', () => this._onImageLoad(element, state), { signal });
    image.addEventListener('error', () => this._onImageError(element, state), { signal });

    /* Set before the sources, or the browser starts loading them straight away */
    if (!image.hasAttribute('loading')) image.loading = 'lazy';
    if (!image.hasAttribute('decoding')) image.decoding = 'async';
    if (config.fetchPriority) image.setAttribute('fetchpriority', config.fetchPriority);

    const applied = this._applySources(image);

    if (!applied && !image.hasAttribute('src') && !image.hasAttribute('srcset')) {
      state.noSource = true;
      this._fail(element, state, 'Lazysrc image has no sources');
      return;
    }

    if (applied || !image.complete) {
      this._startLoading(element, state);
      return;
    }

    image.decode().then(
      () => this._onImageLoad(element, state),
      () => {
        if (state.listeners.signal.aborted) return;
        this._startLoading(element, state);
        this._onImageError(element, state);
      }
    );
  }

  /**
   * Copy `data-lazysrc-*` sources onto the image and the `<source>` elements of its picture
   *
   * Sizes are copied before source sets, and source sets before `src`, so the browser picks a
   * candidate from the complete set.
   *
   * @returns {boolean} Whether any source changed
   */
  _applySources(image) {
    let applied = false;
    const copy = (node, name) => {
      const value = node.getAttribute(`data-lazysrc-${name}`);
      if (value !== null && node.getAttribute(name) !== value) {
        node.setAttribute(name, value);
        applied = true;
      }
    };

    if (image.parentElement?.localName === 'picture') {
      for (const source of image.parentElement.querySelectorAll(':scope > source')) {
        copy(source, 'sizes');
        copy(source, 'srcset');
      }
    }

    copy(image, 'sizes');
    copy(image, 'srcset');
    copy(image, 'src');
    return applied;
  }

  async _onImageLoad(element, state) {
    if (state.status === 'loaded' || state.listeners.signal.aborted) return;

    await state.image.decode?.().catch(() => {});
    if (state.status === 'loaded' || state.listeners.signal.aborted) return;

    this._settleLoaded(element, state, state.image.currentSrc);
  }

  _onImageError(element, state) {
    if (state.status === 'loaded' || state.listeners.signal.aborted) return;

    this._retryOrFail(element, state, 'Image failed to load', () => this._reloadImage(state.image));
  }

  /**
   * Ask the browser to fetch an image again by setting its source to the same value
   */
  _reloadImage(image) {
    const attribute = image.hasAttribute('src') ? 'src' : 'srcset';
    image.setAttribute(attribute, image.getAttribute(attribute));
  }

  /**
   * Watch a background image element, sharing one observer between elements with the same options
   */
  _observe(element, state) {
    const { rootMargin, threshold } = state.config;
    const key = `${rootMargin}|${threshold}`;
    let entry = this._observers.get(key);

    if (!entry) {
      try {
        entry = {
          targets: new Set(),
          observer: new IntersectionObserver(entries => this._onIntersect(entries), {
            rootMargin,
            threshold,
          }),
        };
      } catch (error) {
        this.logger?.warn('Invalid Lazysrc root margin or threshold, loading straight away', {
          element,
          error,
        });
        this._loadBackground(element, state);
        return;
      }
      this._observers.set(key, entry);
    }

    entry.targets.add(element);
    entry.observer.observe(element);
    state.observerKey = key;
  }

  _unobserve(element, state) {
    const key = state.observerKey;
    const entry = this._observers.get(key);
    state.observerKey = null;
    if (!entry) return;

    entry.observer.unobserve(element);
    entry.targets.delete(element);
    if (entry.targets.size === 0) {
      entry.observer.disconnect();
      this._observers.delete(key);
    }
  }

  _onIntersect(entries) {
    for (const { target, isIntersecting } of entries) {
      const state = this.getState(target);
      if (!isIntersecting || !state?.observerKey) continue;

      this._unobserve(target, state);
      this._loadBackground(target, state);
    }
  }

  /**
   * Download and decode a background image, then show it
   */
  _loadBackground(element, state) {
    const url = this.getAttr(element, 'bg');
    this._startLoading(element, state);

    if (!url) {
      this._fail(element, state, 'No background image URL specified');
      return;
    }

    const image = new Image();
    image.onload = async () => {
      await image.decode?.().catch(() => {});
      if (state.status === 'loaded' || state.listeners.signal.aborted) return;

      element.style.backgroundImage = cssUrl(url);
      this._settleLoaded(element, state, url);
    };
    image.onerror = () => {
      if (state.listeners.signal.aborted) return;
      this._retryOrFail(element, state, 'Background image failed to load', () =>
        this._loadBackground(element, state)
      );
    };
    image.src = url;
  }

  _startLoading(element, state) {
    if (state.status === 'loading') return;

    this._setStatus(element, state, 'loading');
    this._dispatch(element, 'lazysrc:loading-start', { element, timestamp: performance.now() });
  }

  _retryOrFail(element, state, message, retry) {
    if (state.attempts >= state.config.retryAttempts) {
      this._fail(element, state, message);
      return;
    }

    state.attempts += 1;
    clearTimeout(state.retryTimer);
    state.retryTimer = setTimeout(retry, state.config.retryDelay * state.attempts);
    this.logger?.info(
      `Retrying load for element (attempt ${state.attempts}/${state.config.retryAttempts})`,
      { element }
    );
  }

  _fail(element, state, message) {
    this._setStatus(element, state, 'error');
    this._dispatch(element, 'lazysrc:error', {
      element,
      error: message,
      timestamp: performance.now(),
    });
    state.resolveSettled();
    this.logger?.warn('Element failed to load', { element, error: message });
  }

  _settleLoaded(element, state, url) {
    clearTimeout(state.retryTimer);
    state.attempts = 0;
    this._setStatus(element, state, 'loaded');

    this._dispatch(element, 'lazysrc:loaded', {
      element,
      timestamp: performance.now(),
      loadTime: this._loadTime(url),
    });
    state.resolveSettled();

    state.listeners.abort();
    this._dispatch(element, 'lazysrc:detached', { element, timestamp: performance.now() });
  }

  _setStatus(element, state, status) {
    const { loadingClass, loadedClass, errorClass } = state.config;
    const classes = { loading: loadingClass, loaded: loadedClass, error: errorClass };

    state.status = status;
    element.classList.remove(
      ...tokens(loadingClass),
      ...tokens(loadedClass),
      ...tokens(errorClass)
    );
    element.classList.add(...tokens(classes[status]));
    this.setState(element, status);
  }

  /**
   * How long the browser took to download a URL, from Resource Timing
   *
   * @returns {number|null}
   */
  _loadTime(url) {
    try {
      const href = new URL(url, document.baseURI).href;
      const entry = performance.getEntriesByName(href, 'resource').at(-1);
      return entry ? Math.round(entry.duration) : null;
    } catch {
      return null;
    }
  }

  _resetSettled(state) {
    state.settled = new Promise(resolve => {
      state.resolveSettled = resolve;
    });
  }

  /**
   * Load an element straight away instead of waiting for it to near the viewport, or try again after
   * an error
   *
   * @param {HTMLElement} element
   * @returns {Promise<void>} Resolves once the element has loaded, failed or been unmounted
   */
  loadElement(element) {
    const state = this.getState(element);
    if (!state || state.noSource) return Promise.resolve();

    if (state.status === 'error') {
      state.attempts = 0;
      this._resetSettled(state);
      if (state.image) {
        this._startLoading(element, state);
        this._reloadImage(state.image);
      } else {
        this._loadBackground(element, state);
      }
    } else if (state.status !== 'loaded') {
      if (state.observerKey) {
        this._unobserve(element, state);
        this._loadBackground(element, state);
      } else if (state.image?.loading === 'lazy') {
        state.image.loading = 'eager';
      }
    }

    return state.settled;
  }

  /**
   * Load every element in a container straight away
   *
   * @param {ParentNode} [container]
   */
  async loadAll(container = document) {
    const elements = this.trackedElements().filter(element => container.contains(element));
    await Promise.allSettled(elements.map(element => this.loadElement(element)));
  }

  /**
   * Mount any lazy elements in a container that aren't mounted yet
   *
   * Called with an element that is already mounted, as mount() does, it mounts any lazy elements
   * inside that element.
   *
   * @param {ParentNode} [container]
   */
  update(container = document) {
    container.querySelectorAll('[data-lazysrc]').forEach(element => {
      if (!this.elements.has(element)) {
        this.mount(element);
      }
    });
  }

  isLoaded(element) {
    return this.getState(element)?.status === 'loaded';
  }

  isLoading(element) {
    return this.getState(element)?.status === 'loading';
  }

  hasError(element) {
    return this.getState(element)?.status === 'error';
  }

  getStatus() {
    const states = this.trackedElements()
      .map(element => this.getState(element))
      .filter(Boolean);
    const count = status => states.filter(state => state.status === status).length;

    return {
      totalElements: states.length,
      loadedCount: count('loaded'),
      loadingCount: count('loading'),
      errorCount: count('error'),
      defaults: Lazysrc.defaults,
    };
  }

  destroy() {
    super.destroy();
    for (const { observer } of this._observers.values()) {
      observer.disconnect();
    }
    this._observers.clear();
  }

  static enhanceAll(selector = '[data-lazysrc]', options) {
    const instance = new Lazysrc(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
