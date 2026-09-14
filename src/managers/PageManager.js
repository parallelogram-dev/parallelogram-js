import { ComponentHost } from '../core/ComponentHost.js';
import { announce } from '../utils/announce.js';
import { prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';

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

/**
 * PageManager - Enhanced page lifecycle and component management
 * Handles fragment replacement and delegates component loading, mounting and DOM
 * observation to a ComponentHost (available as `pageManager.host`).
 */
export class PageManager {
  constructor({ containerSelector, registry, eventBus, logger, router, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    this.containerSelector = containerSelector;
    this.registry = registry;

    // Configuration options
    this.options = {
      // Delay before mounting non-critical components after a fragment swap
      mountDelay: 1200,
      scrollPosition: 'top', // 'top', 'preserve', 'element'
      scrollElement: null,
      focusTarget: 'h1',
      announce: true,
      // Component loading
      retryFailedLoads: true,
      maxRetryAttempts: 3,
      // Element or selector whose subtree components mount in and are observed (defaults to the container)
      observeRoot: null,
      // Debug
      trackPerformance: false,
      // Fragment target groups - define which fragments update together
      targetGroups: {},
      fragmentFallbacks: false,
      runScripts: true,
      assetTimeout: 3000,
      ...options,
    };

    this.host = new ComponentHost({
      registry: registry ?? [],
      eventBus,
      logger,
      router,
      maxRetryAttempts: this.options.retryFailedLoads ? this.options.maxRetryAttempts : 0,
    });

    // Performance tracking
    this.performanceMetrics = {
      fragmentReplacements: 0,
      componentMounts: 0,
      componentUnmounts: 0,
      totalMountTime: 0,
      averageMountTime: 0,
    };

    // Session-persistent component tracking
    this.sessionTracking = {
      componentsLoaded: new Set(), // Components that have been loaded this session
      loadHistory: [], // History of component loads with timestamps
      mountCount: new Map(), // Total mount count per component
      lastMountTime: new Map(), // Last mount time per component
    };

    this._initialize();
  }

  /**
   * Initialize the PageManager with event listeners
   */
  _initialize() {
    this._listeners = new AbortController();

    this.logger?.info('PageManager initializing', {
      containerSelector: this.containerSelector,
      registrySize: this.registry.length,
    });

    // Router event handlers
    this._subscribe(
      'router:navigate-success',
      ({ html, url, trigger, viewTarget, viewTargets, scroll, waitUntil }) => {
        const fromPopstate = trigger === 'popstate';
        const swap = this.replaceFragments(html, {
          fromNavigation: true,
          fromPopstate,
          url,
          trigger,
          viewTargets: this._resolveTargetGroups(viewTargets || [viewTarget || 'main']),
          preserveScroll: fromPopstate && this.options.scrollPosition === 'preserve',
          scroll,
        });

        if (waitUntil) {
          waitUntil(swap);
        } else {
          /* replaceFragments reports its own failures through page:fragments-replace-error */
          swap.catch(() => {});
        }
      }
    );

    // Component lifecycle events
    this._subscribe('component:lazy-load', ({ element, componentName }) => {
      this._handleLazyLoad(element, componentName);
    });
    this._subscribe('page:component-mounted', () => {
      this.performanceMetrics.componentMounts++;
    });
    this._subscribe('page:component-unmounted', () => {
      this.performanceMetrics.componentUnmounts++;
    });
    this._subscribe('page:component-loaded', ({ componentName }) => {
      this._trackComponentLoad(componentName);
    });

    // Initial component mounting
    this._initialMount();

    this.eventBus.emit('page-manager:initialized', {
      containerSelector: this.containerSelector,
      options: this.options,
    });
  }

  /**
   * Subscribe to an event bus event until this manager is destroyed.
   */
  _subscribe(event, handler) {
    return this.eventBus.on(event, handler, { signal: this._listeners.signal });
  }

  /**
   * Get the container element
   */
  get container() {
    const element = document.querySelector(this.containerSelector);
    if (!element) {
      const error = new Error(`Container not found: ${this.containerSelector}`);
      this.logger?.error('Container element not found', { selector: this.containerSelector });
      throw error;
    }
    return element;
  }

  /**
   * Resolve target groups based on configuration
   */
  _resolveTargetGroups(requestedTargets) {
    const resolved = new Set();

    for (const target of requestedTargets) {
      if (this.options.targetGroups[target]) {
        // Add all targets from the group
        for (const groupTarget of this.options.targetGroups[target]) {
          resolved.add(groupTarget);
        }
        this.logger?.info(
          `Resolved target group '${target}' to:`,
          this.options.targetGroups[target]
        );
      } else {
        // Use the target as-is if no group defined
        resolved.add(target);
        this.logger?.debug(`Using target '${target}' directly (no group defined)`);
      }
    }

    const finalTargets = Array.from(resolved);
    this.logger?.info('Final resolved targets:', finalTargets);

    return finalTargets;
  }

  /**
   * Replace multiple fragments content with enhanced fragment-based targeting
   */
  async replaceFragments(html, options = {}) {
    const {
      fromNavigation = false,
      fromPopstate = false,
      preserveScroll = false,
      url = null,
      trigger = 'unknown',
      viewTargets = ['main'], // Array of fragment targets
    } = options;

    const startTime = this.options.trackPerformance ? performance.now() : 0;

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
      const doc = new DOMParser().parseFromString(html, 'text/html');
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
      const successfulTargets = replacementResults.filter(result => result.success);

      // Update performance metrics
      if (this.options.trackPerformance) {
        const duration = performance.now() - startTime;
        this.performanceMetrics.fragmentReplacements++;
        this.logger?.info('Multiple fragments replacement completed', {
          duration: `${duration.toFixed(2)}ms`,
          targetsProcessed: viewTargets.length,
          successfulReplacements: successfulTargets.length,
          metrics: this.performanceMetrics,
        });
      }

      this.eventBus.emit('page:fragments-replaced', {
        results: replacementResults,
        viewTargets,
        duration: this.options.trackPerformance ? performance.now() - startTime : null,
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

    // Emit pre-unmount event
    this.eventBus.emit('page:fragment-will-replace', {
      sourceFragment,
      targetFragment,
      viewTarget,
      html: originalHtml,
      options,
      transitionConfig,
    });

    let swapped = false;

    try {
      if (transitionConfig?.out) {
        await this._performFragmentTransition(targetFragment, 'out', transitionConfig);
      }

      /* The main fragment scrolls to the top between the out transition and the swap, so old
         content fades out, the page snaps up and the new content fades in. 'instant' overrides any
         CSS scroll-behavior: smooth on the document. */
      if (
        viewTarget === 'main' &&
        !options.preserveScroll &&
        !options.url?.hash &&
        this.options.scrollPosition === 'top' &&
        !options.fromPopstate
      ) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }

      this._swapFragment(sourceFragment, targetFragment, viewTarget, options, transitionConfig);
      swapped = true;

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

      if (!swapped) {
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
   */
  _swapFragment(sourceFragment, targetFragment, viewTarget, options, transitionConfig) {
    this.unmountAllWithin(targetFragment);
    targetFragment.innerHTML = sourceFragment.innerHTML;
    this._syncFragmentRoot(sourceFragment, targetFragment, transitionConfig);

    if (viewTarget === 'main') {
      this._handleScrollRestoration(options.storedScroll, options);
      this._updateDocumentHead(options.doc);
    }

    if (this.options.runScripts) {
      this._runFragmentScripts(targetFragment);
    }

    this.mountAllWithin(targetFragment, { priority: 'critical', fragmentTarget: viewTarget });

    this.eventBus.emit('dom:content-loaded', {
      fragment: targetFragment,
      viewTarget,
      trigger: 'fragment-replacement',
    });

    const mountNormal = () =>
      this.mountAllWithin(targetFragment, { priority: 'normal', fragmentTarget: viewTarget });
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
      // Check if it's a CSS class-based transition
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
        // Use TransitionManager or inline styles
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
  _performCSSTransition(fragment, className, duration, direction = 'in', outClassName = null) {
    return new Promise(resolve => {
      requestAnimationFrame(async () => {
        fragment.classList.add(className);

        /* Remove the 'out' class a frame later so the 'in' class applies first, avoiding a flicker */
        if (direction === 'in' && outClassName) {
          requestAnimationFrame(() => {
            fragment.classList.remove(outClassName);
          });
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

        resolve();
      });
    });
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

    // Apply transition styles
    fragment.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;

    if (direction === 'out') {
      // Fade out with slide
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(-20px)';
    } else {
      // Reset and fade in
      fragment.style.opacity = '0';
      fragment.style.transform = 'translateX(20px)';

      // Force reflow then animate in
      fragment.getBoundingClientRect();

      fragment.style.opacity = '1';
      fragment.style.transform = 'translateX(0)';
    }

    // Wait for transition to complete
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
   * Replace fragment content with enhanced fragment-based targeting (kept for backwards compatibility)
   */
  replaceFragment(html, options = {}) {
    const {
      fromNavigation = false,
      fromPopstate = false,
      preserveScroll = false,
      url = null,
      trigger = 'unknown',
      viewTarget = 'main', // Single fragment target
    } = options;

    // Delegate to the multi-fragment method
    return this.replaceFragments(html, {
      fromNavigation,
      fromPopstate,
      preserveScroll,
      url,
      trigger,
      viewTargets: [viewTarget],
    });
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
   * Run the scripts in swapped-in content, which the browser does not execute when content is set
   * through innerHTML
   *
   * Scripts marked [data-router-skip] and data blocks such as `type="application/json"` are left
   * alone. Page scripts run again on every visit, as they would on a full page load.
   */
  _runFragmentScripts(fragment) {
    for (const original of fragment.querySelectorAll('script:not([data-router-skip])')) {
      const type = (original.getAttribute('type') ?? '').trim().toLowerCase();
      if (type === '' || type === 'module' || /(java|ecma)script/.test(type)) {
        original.replaceWith(this._cloneScript(original));
      }
    }
  }

  /**
   * An executable copy of a parsed script, keeping its order among other scripts added with it
   */
  _cloneScript(original, base = null) {
    const script = document.createElement('script');
    for (const { name, value } of original.attributes) {
      script.setAttribute(name, value);
    }
    if (base && original.hasAttribute('src')) {
      script.src = new URL(original.getAttribute('src'), base).href;
    }
    if (!original.hasAttribute('async')) {
      script.async = false;
    }
    if (original.nonce) {
      script.nonce = original.nonce;
    }
    script.textContent = original.textContent;
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
      // Restore exact scroll position
      window.scrollTo({ top: storedPosition.y, left: storedPosition.x, behavior: 'instant' });
      return;
    }

    switch (this.options.scrollPosition) {
      case 'top':
        // Scroll to top is now handled in _processSingleFragment after out transition
        // Only scroll here for popstate events (browser back/forward)
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
        // Do nothing - keep current position
        break;
    }
  }

  /**
   * Move focus into the new page and announce its title, as a full page load would
   */
  _completeNavigation(fragment, url) {
    const target = this._navigationFocusTarget(fragment, url);
    if (target) {
      if (!target.matches(NATIVELY_FOCUSABLE)) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    }

    if (this.options.announce) {
      const title = document.title || fragment.querySelector('h1')?.textContent.trim();
      if (title) {
        announce(title);
      }
    }
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

  _hashTarget(url) {
    if (!url?.hash || url.hash === '#') {
      return null;
    }

    try {
      return document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      return null;
    }
  }

  /**
   * Mount components within a root
   *
   * @param {Element} root - Scope to search for component selectors
   * @param {Object} [options]
   * @param {Element[]|null} [options.addedNodes] - Only search these nodes
   * @param {'all'|'critical'|'normal'} [options.priority='all'] - Which registry entries to
   *   mount. 'all' mounts critical entries first, then the rest.
   * @param {string|null} [options.fragmentTarget] - Fragment being mounted, if any
   */
  mountAllWithin(root, { addedNodes = null, priority = 'all', fragmentTarget = null } = {}) {
    const startTime = this.options.trackPerformance ? performance.now() : 0;

    this.host.mountWithin(root, { priority, nodes: addedNodes, fragmentTarget });

    if (this.options.trackPerformance) {
      this.performanceMetrics.totalMountTime += performance.now() - startTime;
      this.performanceMetrics.averageMountTime =
        this.performanceMetrics.totalMountTime /
        Math.max(1, this.performanceMetrics.fragmentReplacements);
    }
  }

  /**
   * Unmount every component within a root
   */
  unmountAllWithin(root) {
    this.host.unmountWithin(root);
  }

  /**
   * Mount a registered component on an element requested through component:lazy-load
   */
  _handleLazyLoad(element, componentName) {
    if (!this.host.mount(componentName, element)) {
      this.logger?.warn(`Lazy load requested for unknown component: ${componentName}`);
    }
  }

  /**
   * Mount components in the observed root and start watching it
   */
  _initialMount() {
    try {
      this.host.start(this._observeRoot());
    } catch (error) {
      this.logger?.error('Initial component mounting failed', { error });
    }
  }

  _observeRoot() {
    const { observeRoot } = this.options;
    if (observeRoot instanceof Element) return observeRoot;
    if (typeof observeRoot === 'string') {
      return document.querySelector(observeRoot) ?? this.container;
    }
    return this.container;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get component instances
   */
  getInstances() {
    return this.host.getInstances();
  }

  /**
   * Loaded component instances by name
   *
   * @returns {Map<string, Object>}
   */
  get instances() {
    return this.host.getInstances();
  }

  /**
   * Get loading status
   */
  getLoadingStatus() {
    return this.host.getLoadingStatus();
  }

  getComponentRegistry() {
    return this.registry || [];
  }

  getComponentStates() {
    // Return current state of all components based on actual instances
    const states = {};
    const loadingStatus = this.getLoadingStatus();

    this.registry.forEach(comp => {
      const instance = this.instances.get(comp.name);
      const isLoading = loadingStatus.loading.includes(comp.name);

      // Count actual DOM elements that match this component's selector
      const elements = document.querySelectorAll(comp.selector);
      const elementCount = elements.length;

      let status = 'not-loaded';
      if (isLoading) {
        status = 'loading';
      } else if (instance) {
        status = 'loaded';
      } else if (elementCount > 0) {
        status = 'available'; // Elements exist but component not instantiated yet
      }

      states[comp.name] = {
        status,
        hasInstance: !!instance,
        instanceType: instance ? instance.constructor.name : null,
        elementsFound: elementCount,
        isLoading,
        retryCount: loadingStatus.retries[comp.name] || 0,
        selector: comp.selector,
      };
    });

    return states;
  }

  getMetrics() {
    return {
      componentMounts: this.performanceMetrics?.componentMounts || 0,
      componentUnmounts: this.performanceMetrics?.componentUnmounts || 0,
      averageMountTime: this.performanceMetrics?.averageMountTime || 0,
      fragmentReplacements: this.performanceMetrics?.fragmentReplacements || 0,
      totalMountTime: this.performanceMetrics?.totalMountTime || 0,
    };
  }

  /**
   * Track component loading for session persistence
   */
  _trackComponentLoad(componentName) {
    const now = Date.now();

    // Add to session tracking
    this.sessionTracking.componentsLoaded.add(componentName);
    this.sessionTracking.loadHistory.push({
      component: componentName,
      timestamp: now,
      page: window.location.pathname,
    });

    // Update counts
    const currentCount = this.sessionTracking.mountCount.get(componentName) || 0;
    this.sessionTracking.mountCount.set(componentName, currentCount + 1);
    this.sessionTracking.lastMountTime.set(componentName, now);

    // Keep history to reasonable size (last 100 loads)
    if (this.sessionTracking.loadHistory.length > 100) {
      this.sessionTracking.loadHistory.shift();
    }
  }

  /**
   * Get session tracking data for performance dashboard
   */
  getSessionTracking() {
    return {
      totalComponentsLoaded: this.sessionTracking.componentsLoaded.size,
      componentsLoadedThisSession: Array.from(this.sessionTracking.componentsLoaded),
      loadHistory: [...this.sessionTracking.loadHistory],
      mountCounts: Object.fromEntries(this.sessionTracking.mountCount),
      lastMountTimes: Object.fromEntries(this.sessionTracking.lastMountTime),
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.logger?.info('PageManager destroying');

    // Unmount every component and stop observing the page
    this.host.stop();

    // Remove event bus listeners
    this._listeners?.abort();

    this.eventBus.emit('page-manager:destroyed', {});

    this.logger?.info('PageManager destroyed');
  }
}
