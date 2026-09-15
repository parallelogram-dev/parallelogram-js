import { announce } from '../utils/announce.js';
import { nextFrame, prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';
import { trustedHTML, trustedScript, trustedScriptURL } from '../utils/trusted.js';

const TRACKED_ASSETS = '[data-router-track="reload"]';

const HEAD_ASSETS = 'link[rel~="stylesheet"][href], script[src]';

const MANAGED_HEAD_SELECTORS = [
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="robots"]',
  'meta[name="author"]',
  'meta[name="theme-color"]',
  'meta[name^="twitter:"]',
  'meta[property^="og:"]',
  'meta[property^="article:"]',
  'link[rel="canonical"]',
  'link[rel="alternate"]',
];

const NATIVELY_FOCUSABLE =
  'a[href], area[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

const DEFAULTS = {
  mountDelay: 0,
  scrollPosition: 'top',
  scrollElement: null,
  focusTarget: 'h1',
  announce: true,
  fragmentFallbacks: false,
  runScripts: true,
  assetTimeout: 3000,
};

/**
 * Replaces fragments of the page with the matching fragments of a fetched HTML document
 *
 * Fragments are matched by `[data-view]` and all looked up before anything changes. Each one is
 * unmounted, transitioned out, swapped (content and root attributes), has its scripts run and its
 * components mounted, then transitioned in, independently of the others. For the main fragment the
 * head is reconciled, scroll is restored and focus is moved. PageManager creates one on demand, so
 * pages without a router never load this module.
 */
export class FragmentSwapper {
  /**
   * @param {Object} dependencies
   * @param {Object} [dependencies.options] PageManager options; missing ones get defaults
   * @param {Object} [dependencies.eventBus]
   * @param {Object} [dependencies.logger]
   * @param {(root: Element, options: { priority: string, fragmentTarget: string }) => void} dependencies.mountWithin
   * @param {(root: Element) => void} dependencies.unmountWithin
   */
  constructor({ options = {}, eventBus, logger, mountWithin, unmountWithin }) {
    for (const [name, value] of Object.entries(DEFAULTS)) {
      if (!(name in options)) {
        options[name] = value;
      }
    }

    this.options = options;
    this.eventBus = eventBus ?? { emit() {} };
    this.logger = logger;
    this.mountWithin = mountWithin;
    this.unmountWithin = unmountWithin;
  }

  /**
   * Replace fragments of the page with the matching fragments of an HTML document
   *
   * @param {string} html
   * @param {Object} [options]
   * @param {string[]} [options.viewTargets=['main']] Fragment names to replace
   * @param {URL|null} [options.url] Address of the document, for hash targets and relative assets
   * @param {boolean} [options.fromNavigation=false] Move focus and announce the page afterwards
   * @param {boolean} [options.fromPopstate=false]
   * @param {boolean} [options.preserveScroll=false]
   * @param {{ x: number, y: number }|null} [options.scroll] Scroll position to restore on popstate
   * @param {AbortSignal} [options.signal] Once aborted, the swap stops before changing the page
   * @throws {Error} A `FragmentMismatchError` when a fragment is missing from either page, or a
   *   `TrackedAssetsChangedError` when tracked assets differ, before anything is changed.
   */
  async replaceFragments(html, options = {}) {
    const {
      fromNavigation = false,
      fromPopstate = false,
      preserveScroll = false,
      url = null,
      trigger = 'unknown',
      /* Array of fragment targets */
      viewTargets = ['main'],
    } = options;

    this.logger?.group('Multiple fragments replacement', {
      fromNavigation,
      fromPopstate,
      preserveScroll,
      url: url?.toString(),
      trigger,
      viewTargets,
    });

    try {
      const storedScroll = preserveScroll ? { x: window.scrollX, y: window.scrollY } : null;
      const doc = new DOMParser().parseFromString(trustedHTML(html), 'text/html');
      const fragmentOptions = { ...options, storedScroll, doc };
      const fragments = viewTargets.map(viewTarget => ({
        viewTarget,
        ...this._extractTargetFragmentFromDoc(doc, viewTarget),
      }));

      /* A page with a different layout is not replaced piecemeal; the router loads it normally */
      const missing = fragments.filter(
        fragment => !fragment.sourceFragment || !fragment.targetFragment
      );
      if (missing.length > 0) {
        throw this._fragmentMismatchError(missing);
      }

      await this._mergeHeadAssets(doc, url);

      if (options.signal?.aborted) {
        return;
      }

      /* Fragments are replaced independently, so a slow or failing one cannot hold up the others */
      const outcomes = await Promise.allSettled(
        fragments.map(fragment => this._processSingleFragment(fragment, html, fragmentOptions))
      );

      const replacementResults = outcomes.map((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          return outcome.value;
        }

        this.logger?.error(`Failed to replace fragment ${viewTargets[index]}`, {
          error: outcome.reason,
        });
        return { viewTarget: viewTargets[index], success: false, error: outcome.reason?.message };
      });

      /* Without main, focus is only moved when it was lost with the content it was in */
      const firstReplaced = replacementResults.find(result => result.success)?.targetFragment;
      if (
        fromNavigation &&
        firstReplaced &&
        !viewTargets.includes('main') &&
        !options.signal?.aborted
      ) {
        this._completeNavigation(firstReplaced, url, {
          title: doc.title || document.title,
          moveFocus: this._focusLost(),
        });
      }

      this.eventBus.emit('page:fragments-replaced', {
        results: replacementResults,
        viewTargets,
        options,
      });
    } catch (error) {
      this.logger?.error('Multiple fragments replacement failed', {
        error,
        viewTargets,
        html: html.slice(0, 100),
      });
      this.eventBus.emit('page:fragments-replace-error', {
        viewTargets,
        error,
        options,
      });
      throw error;
    } finally {
      this.logger?.groupEnd();
    }
  }

  /**
   * Process a single fragment replacement with transitions
   */
  async _processSingleFragment(
    { viewTarget, sourceFragment, targetFragment },
    originalHtml,
    options
  ) {
    /* Transitions are skipped entirely when the user prefers reduced motion */
    const transitionConfig = prefersReducedMotion()
      ? undefined
      : this.options.targetGroupTransitions?.[viewTarget];

    /* Emit pre-unmount event */
    this.eventBus.emit('page:fragment-will-replace', {
      sourceFragment,
      targetFragment,
      viewTarget,
      html: originalHtml,
      options,
      transitionConfig,
    });

    /* Content that is in place is never swapped again, even when a step after it fails */
    let swapped = false;
    let swapFinished = false;

    try {
      if (transitionConfig?.out) {
        await this._performFragmentTransition(targetFragment, 'out', transitionConfig);
      }

      /* The main fragment scrolls to the top between the out transition and the swap, so old
         content fades out, the page snaps up and the new content fades in. 'instant' overrides any
         CSS scroll-behavior: smooth on the document. A hash naming an element in the new page
         scrolls to that element after the swap instead. */
      if (
        viewTarget === 'main' &&
        !options.preserveScroll &&
        !this._hashTarget(options.url, options.doc) &&
        this.options.scrollPosition === 'top' &&
        !options.fromPopstate
      ) {
        await nextFrame();
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }

      if (options.signal?.aborted) {
        return { viewTarget, success: false, aborted: true };
      }

      this._swapFragment(
        sourceFragment,
        targetFragment,
        viewTarget,
        options,
        transitionConfig,
        () => {
          swapped = true;
        }
      );
      swapFinished = true;

      this.eventBus.emit('page:fragment-did-replace', {
        targetFragment,
        viewTarget,
        options,
        transitionConfig,
      });

      if (transitionConfig?.in) {
        await this._performFragmentTransition(targetFragment, 'in', transitionConfig);
      }
    } catch (transitionError) {
      this.logger?.error(`Fragment transition failed for ${viewTarget}`, {
        error: transitionError,
        viewTarget,
        transitionConfig,
      });

      if (swapped && !swapFinished) {
        return { viewTarget, success: false, error: transitionError?.message };
      }
      if (!swapped && !options.signal?.aborted) {
        this._swapFragment(sourceFragment, targetFragment, viewTarget, options);
      }
    }

    return {
      viewTarget,
      success: true,
      sourceFragment,
      targetFragment,
      transitionConfig,
    };
  }

  /**
   * Replace a fragment's content and run everything that depends on the new content straight away,
   * rather than after its in-transition: scroll, head and focus for the main fragment, and component
   * mounting for every fragment
   *
   * `onReplaced` is called as soon as the content is in place, before the steps that follow it.
   */
  _swapFragment(sourceFragment, targetFragment, viewTarget, options, transitionConfig, onReplaced) {
    this.unmountWithin(targetFragment);
    targetFragment.replaceChildren(...this._fragmentContent(sourceFragment));
    onReplaced?.();
    this._syncFragmentRoot(sourceFragment, targetFragment, transitionConfig);

    if (viewTarget === 'main') {
      this._handleScrollRestoration(options.storedScroll, options);
      this._updateDocumentHead(options.doc);
    }

    if (this.options.runScripts) {
      this._runFragmentScripts(targetFragment);
    }

    this.mountWithin(targetFragment, { priority: 'critical', fragmentTarget: viewTarget });

    this.eventBus.emit('dom:content-loaded', {
      fragment: targetFragment,
      viewTarget,
      trigger: 'fragment-replacement',
    });

    const mountNormal = () =>
      this.mountWithin(targetFragment, { priority: 'normal', fragmentTarget: viewTarget });
    if (this.options.mountDelay > 0) {
      setTimeout(mountNormal, this.options.mountDelay);
    } else {
      mountNormal();
    }

    if (viewTarget === 'main' && options.fromNavigation) {
      this._completeNavigation(targetFragment, options.url);
    }
  }

  /**
   * Perform fragment transition animation
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} direction - 'in' or 'out'
   * @param {Object} config - Transition configuration
   */
  async _performFragmentTransition(fragment, direction, config) {
    const transitionType = config[direction];
    const duration = config.duration || 300;
    const easing = config.easing || 'ease';

    this.logger?.debug(`Performing ${direction} transition: ${transitionType}`, {
      fragment,
      duration,
      easing,
    });

    try {
      /* Check if it's a CSS class-based transition */
      if (typeof transitionType === 'string' && !transitionType.includes('(')) {
        /* Pass the out class name to the in transition so it can remove it */
        const outClassName = direction === 'in' ? config.out : null;
        await this._performCSSTransition(
          fragment,
          transitionType,
          duration,
          direction,
          outClassName
        );
      } else {
        /* Use TransitionManager or inline styles */
        await this._performJSTransition(fragment, direction, config);
      }

      this.eventBus.emit(`page:fragment-transition-${direction}`, {
        fragment,
        viewTarget: fragment.dataset.view,
        transitionType,
        duration,
      });
    } catch (error) {
      this.logger?.warn(`Fragment transition failed`, {
        fragment,
        direction,
        transitionType,
        error,
      });
      throw error;
    }
  }

  /**
   * Perform CSS class-based transition
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} className - CSS class name
   * @param {number} duration - Duration in ms (ignored for CSS transitions)
   * @param {string} direction - 'in' or 'out'
   * @param {string} outClassName - Name of the 'out' class to remove when 'in' starts
   */
  async _performCSSTransition(
    fragment,
    className,
    duration,
    direction = 'in',
    outClassName = null
  ) {
    await nextFrame();
    fragment.classList.add(className);

    /* Remove the 'out' class a frame later so the 'in' class applies first, avoiding a flicker */
    if (direction === 'in' && outClassName) {
      nextFrame().then(() => fragment.classList.remove(outClassName));
    }

    if (fragment.getAnimations?.().length === 0) {
      this.logger?.debug(`Transition class "${className}" did not start an animation`, {
        fragment,
      });
    }

    await whenAnimationsFinish(fragment, { fallback: duration + 250 });

    if (direction === 'in') {
      fragment.classList.remove(className);
    }
  }

  /**
   * Perform JavaScript-based transition
   * @private
   * @param {HTMLElement} fragment - Fragment element
   * @param {string} direction - 'in' or 'out'
   * @param {Object} config - Transition configuration
   */
  async _performJSTransition(fragment, direction, config) {
    const duration = config.duration || 300;
    const easing = config.easing || 'ease';

    /* Apply transition styles */
    fragment.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;

    if (direction === 'out') {
      /* Fade out with slide */
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(-20px)';
    } else {
      /* Reset and fade in */
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(20px)';

      /* Force reflow then animate in */
      fragment.getBoundingClientRect();

      fragment.style.opacity = '1';
      fragment.style.transform = 'translateX(0)';
    }

    /* Wait for transition to complete */
    await new Promise(resolve => {
      setTimeout(() => {
        fragment.style.transition = '';
        if (direction === 'in') {
          fragment.style.opacity = '';
          fragment.style.transform = '';
        }
        resolve();
      }, duration);
    });
  }

  /**
   * The fragment named `viewTarget` in the fetched document and in the current page
   */
  _extractTargetFragmentFromDoc(doc, viewTarget) {
    return {
      sourceFragment: this._findFragment(doc, viewTarget),
      targetFragment: this._findFragment(document, viewTarget),
    };
  }

  /**
   * Find a fragment by its [data-view] name
   *
   * With the `fragmentFallbacks` option, a fragment without [data-view] is also looked up by id, by
   * common main-content selectors for 'main', and by class.
   */
  _findFragment(root, viewTarget) {
    const name = CSS.escape(viewTarget);
    const fragment = root.querySelector(`[data-view="${name}"]`);
    if (fragment || !this.options.fragmentFallbacks) {
      return fragment;
    }

    const mainSelectors =
      viewTarget === 'main' ? ['main', '[role="main"]', '#app', '.main-content'] : [];
    return (
      [`#${name}`, ...mainSelectors, `.${name}`]
        .map(selector => root.querySelector(selector))
        .find(Boolean) ?? null
    );
  }

  _fragmentMismatchError(missing) {
    const details = missing.map(({ viewTarget, sourceFragment }) =>
      sourceFragment
        ? `${viewTarget} (not on the current page)`
        : `${viewTarget} (not in the new page)`
    );
    const error = new Error(`Fragments not found: ${details.join(', ')}`);
    error.name = 'FragmentMismatchError';
    error.viewTargets = missing.map(({ viewTarget }) => viewTarget);
    return error;
  }

  /**
   * Bring the page's title, language and metadata in line with the fetched document
   *
   * Only a full document is reconciled; a response without head content leaves the head alone. Each
   * kind of managed tag is replaced as a set, so tags the new page lacks are removed and repeated tags
   * such as several og:image entries are all kept.
   */
  _updateDocumentHead(doc) {
    if (!doc?.head || doc.head.childElementCount === 0) {
      return;
    }

    try {
      const title = doc.querySelector('title')?.textContent.trim();
      if (title) {
        document.title = title;
      }

      for (const attribute of ['lang', 'dir']) {
        const value = doc.documentElement.getAttribute(attribute);
        if (value === null) {
          document.documentElement.removeAttribute(attribute);
        } else {
          document.documentElement.setAttribute(attribute, value);
        }
      }

      let updatedElements = 0;
      for (const selector of MANAGED_HEAD_SELECTORS) {
        document.head.querySelectorAll(selector).forEach(element => element.remove());
        for (const element of doc.head.querySelectorAll(selector)) {
          document.head.append(document.importNode(element, true));
          updatedElements++;
        }
      }

      this.eventBus.emit('page:head-updated', { updatedElements, newTitle: document.title });
    } catch (error) {
      this.logger?.error('Failed to update document head', { error });
      this.eventBus.emit('page:head-update-error', { error });
    }
  }

  /**
   * Prepare the head for the fetched document before any of its content is shown
   *
   * Assets marked [data-router-track="reload"] identify the site's versioned bundles; when their set
   * differs from the current page's, nothing is replaced so the router can load the page normally.
   * Stylesheets and external scripts that the new page's head adds are appended and waited for, up
   * to `assetTimeout` milliseconds each. A response without head content is left alone.
   *
   * @throws {Error} A `TrackedAssetsChangedError` when the tracked assets differ.
   */
  async _mergeHeadAssets(doc, url) {
    if (!doc.head || doc.head.childElementCount === 0) {
      return;
    }

    const base = url?.href ?? document.baseURI;
    const keys = (elements, baseUrl) =>
      new Set([...elements].map(element => this._assetKey(element, baseUrl)));

    const trackedNow = keys(document.querySelectorAll(TRACKED_ASSETS), document.baseURI);
    const trackedNext = keys(doc.querySelectorAll(TRACKED_ASSETS), base);
    if (
      trackedNow.size !== trackedNext.size ||
      [...trackedNext].some(key => !trackedNow.has(key))
    ) {
      const error = new Error('Tracked assets changed, so the page must be loaded normally');
      error.name = 'TrackedAssetsChangedError';
      throw error;
    }

    const present = keys(document.querySelectorAll(HEAD_ASSETS), document.baseURI);
    const loading = [];

    for (const element of doc.head.querySelectorAll(HEAD_ASSETS)) {
      if (element.matches(TRACKED_ASSETS) || present.has(this._assetKey(element, base))) {
        continue;
      }

      const asset =
        element.localName === 'script'
          ? this._cloneScript(element, base)
          : document.importNode(element, true);
      if (asset.localName === 'link') {
        asset.href = new URL(element.getAttribute('href'), base).href;
      }

      loading.push(this._whenAssetLoads(asset));
      document.head.append(asset);
    }

    await Promise.all(loading);
  }

  _assetKey(element, base) {
    const url = element.getAttribute('src') ?? element.getAttribute('href');
    return url === null ? element.outerHTML : `${element.localName} ${new URL(url, base).href}`;
  }

  _whenAssetLoads(element) {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, this.options.assetTimeout);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      element.addEventListener('load', done, { once: true });
      element.addEventListener('error', done, { once: true });
    });
  }

  /**
   * A copy of a fetched fragment's content, ready to move into the page
   *
   * The copy is made in the parsed document, where scripts don't run and nothing loads. That
   * document parses `<noscript>` content as elements, so it is turned back into text, as the page's
   * own parser would leave it.
   */
  _fragmentContent(sourceFragment) {
    const content = sourceFragment.cloneNode(true);
    for (const noscript of content.querySelectorAll('noscript')) {
      noscript.textContent = noscript.innerHTML;
    }
    return [...content.childNodes];
  }

  /**
   * Run the scripts in swapped-in content, which the browser does not execute when they are moved
   * in from the parsed document
   *
   * Scripts marked [data-router-skip] and data blocks such as `type="application/json"` are left
   * alone. Page scripts run again on every visit, as they would on a full page load.
   */
  _runFragmentScripts(fragment) {
    for (const original of fragment.querySelectorAll('script:not([data-router-skip])')) {
      const type = (original.getAttribute('type') ?? '').trim().toLowerCase();
      if (type === '' || type === 'module' || /(java|ecma)script/.test(type)) {
        /* A script the page's Trusted Types policy rejects is skipped, and the swap carries on */
        try {
          original.replaceWith(this._cloneScript(original));
        } catch (error) {
          this.logger?.warn('Could not run a script in the new content', { error });
        }
      }
    }
  }

  /**
   * An executable copy of a parsed script, keeping its order among other scripts added with it
   */
  _cloneScript(original, base = null) {
    const script = document.createElement('script');
    for (const { name, value } of original.attributes) {
      if (name !== 'src') {
        script.setAttribute(name, value);
      }
    }
    const src = original.getAttribute('src');
    if (src !== null) {
      script.src = trustedScriptURL(base ? new URL(src, base).href : src);
    }
    if (!original.hasAttribute('async')) {
      script.async = false;
    }
    if (original.nonce) {
      script.nonce = original.nonce;
    }
    script.textContent = trustedScript(original.textContent);
    return script;
  }

  /**
   * Make the fragment root's attributes match the new page's, so selectors on the root (such as a
   * page component's data attribute) describe the new content
   *
   * `data-view` is left alone. Classes starting with `component-`, `router-` or `page-` are kept, as
   * is the out-transition class while an in-transition is about to take over from it.
   */
  _syncFragmentRoot(sourceFragment, targetFragment, transitionConfig) {
    const keptClasses = [...targetFragment.classList].filter(
      name =>
        /^(component|router|page)-/.test(name) ||
        (transitionConfig?.in && name === transitionConfig.out)
    );

    for (const { name } of [...targetFragment.attributes]) {
      if (name !== 'data-view' && !sourceFragment.hasAttribute(name)) {
        targetFragment.removeAttribute(name);
      }
    }

    for (const { name, value } of sourceFragment.attributes) {
      if (name !== 'data-view' && targetFragment.getAttribute(name) !== value) {
        targetFragment.setAttribute(name, value);
      }
    }

    targetFragment.classList.add(...keptClasses);
  }

  /**
   * Handle scroll restoration based on configuration
   * Note: For 'top' scroll position, scrolling is handled in _processSingleFragment
   * after the out transition completes for a smoother experience
   */
  _handleScrollRestoration(storedPosition, options) {
    if (options.fromPopstate && options.scroll && this.options.scrollPosition !== 'preserve') {
      window.scrollTo({ top: options.scroll.y, left: options.scroll.x, behavior: 'instant' });
      return;
    }

    const hashTarget = this._hashTarget(options.url);
    if (hashTarget) {
      hashTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
      return;
    }

    if (options.preserveScroll && storedPosition) {
      /* Restore exact scroll position */
      window.scrollTo({ top: storedPosition.y, left: storedPosition.x, behavior: 'instant' });
      return;
    }

    switch (this.options.scrollPosition) {
      case 'top':
        /* Scroll to top is now handled in _processSingleFragment after out transition
           Only scroll here for popstate events (browser back/forward) */
        if (options.fromPopstate) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        break;
      case 'element':
        if (this.options.scrollElement) {
          const element = document.querySelector(this.options.scrollElement);
          if (element) {
            element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
          }
        }
        break;
      case 'preserve':
        /* Do nothing - keep current position */
        break;
    }
  }

  /**
   * Move focus into the new page and announce its title, as a full page load would
   *
   * @param {Element} fragment
   * @param {URL|null} url
   * @param {Object} [options]
   * @param {string} [options.title] Title to announce; the document's title by default
   * @param {boolean} [options.moveFocus=true]
   */
  _completeNavigation(fragment, url, { title = document.title, moveFocus = true } = {}) {
    const target = moveFocus ? this._navigationFocusTarget(fragment, url) : null;
    if (target) {
      if (!target.matches(NATIVELY_FOCUSABLE)) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    }

    if (this.options.announce) {
      title ||= fragment.querySelector('h1')?.textContent.trim();
      if (title) {
        announce(title);
      }
    }
  }

  /**
   * Whether nothing on the page has focus, as when the focused element was replaced
   */
  _focusLost() {
    const active = document.activeElement;
    return !active || active === document.body || !active.isConnected;
  }

  /**
   * The element the URL hash names, else an [autofocus] element or the `focusTarget` match in the
   * new main fragment, else the fragment itself; null when `focusTarget` is false
   */
  _navigationFocusTarget(fragment, url) {
    const { focusTarget } = this.options;
    if (focusTarget === false) {
      return null;
    }

    return (
      this._hashTarget(url) ??
      fragment.querySelector('[autofocus]') ??
      (focusTarget ? fragment.querySelector(focusTarget) : null) ??
      fragment
    );
  }

  _hashTarget(url, root = document) {
    if (!url?.hash || url.hash === '#' || !root) {
      return null;
    }

    try {
      return root.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      return null;
    }
  }
}
