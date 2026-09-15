import { ComponentHost } from '../core/ComponentHost.js';

/**
 * @typedef {Object} FragmentTransition
 * @property {string} [out] - The transition that hides the old content
 * @property {string} [in] - The transition that shows the new content
 * @property {number} [duration=300] - Milliseconds
 * @property {string} [easing='ease']
 */

/**
 * @typedef {Object} PageManagerOptions
 * @property {number} [mountDelay=1200] - Milliseconds before components that aren't critical mount
 *   after a fragment swap
 * @property {'top'|'preserve'|'element'} [scrollPosition='top'] - Where the page scrolls after a
 *   navigation
 * @property {string|null} [scrollElement=null] - The selector scrolled to when scrollPosition is
 *   `element`
 * @property {string|false} [focusTarget='h1'] - The selector focused in the new page after a
 *   navigation, or false to leave focus alone
 * @property {boolean} [announce=true] - Announce the new page's title after a navigation
 * @property {boolean} [retryFailedLoads=true] - Retry a component whose module fails to load
 * @property {number} [maxRetryAttempts=3]
 * @property {Element|string|null} [observeRoot=null] - The element, or its selector, whose subtree
 *   components mount in and are watched; the container by default
 * @property {Record<string, string[]>} [targetGroups={}] - Fragments that update together, by target
 *   name
 * @property {Record<string, FragmentTransition>} [targetGroupTransitions] - Transitions for each
 *   fragment, by its `data-view` name
 * @property {boolean} [viewTransitions=false] - Swap fragments without their own transition inside
 *   `document.startViewTransition()`, where the browser supports it and motion isn't reduced
 * @property {boolean} [fragmentFallbacks=false] - Also find a fragment without `data-view` by its id
 * @property {boolean} [runScripts=true] - Run the scripts in swapped fragments
 * @property {number} [assetTimeout=3000] - Milliseconds to wait for each stylesheet or script the
 *   new page's head adds
 */

/**
 * PageManager - page lifecycle and component management
 *
 * Mounts components through a ComponentHost (`pageManager.host`) and replaces page fragments after
 * router navigation through a FragmentSwapper loaded on demand.
 */
export class PageManager {
  /**
   * @param {Object} config
   * @param {string} config.containerSelector - The element whose fragments are managed
   * @param {import('../core/ComponentHost.js').RegistryEntry[]} [config.registry]
   * @param {import('./EventManager.js').EventManager} config.eventBus
   * @param {import('../core/DevLogger.js').DevLogger} [config.logger]
   * @param {import('./RouterManager.js').RouterManager | null} [config.router]
   * @param {PageManagerOptions} [config.options]
   */
  constructor({ containerSelector, registry, eventBus, logger, router, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    this.containerSelector = containerSelector;
    this.registry = registry;

    /* Configuration options */
    this.options = {
      /* Delay before mounting non-critical components after a fragment swap */
      mountDelay: 1200,
      /* 'top', 'preserve', 'element' */
      scrollPosition: 'top',
      scrollElement: null,
      focusTarget: 'h1',
      announce: true,
      /* Component loading */
      retryFailedLoads: true,
      maxRetryAttempts: 3,
      /* Element or selector whose subtree components mount in and are observed (defaults to the
         container) */
      observeRoot: null,
      /* Fragment target groups - define which fragments update together */
      targetGroups: {},
      viewTransitions: false,
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

    /* Router event handlers */
    this._subscribe(
      'router:navigate-success',
      ({ html, url, trigger, viewTarget, viewTargets, scroll, signal, waitUntil }) => {
        const fromPopstate = trigger === 'popstate';
        const swap = this.replaceFragments(html, {
          fromNavigation: true,
          fromPopstate,
          url,
          trigger,
          viewTargets: this._resolveTargetGroups(viewTargets || [viewTarget || 'main']),
          preserveScroll: fromPopstate && this.options.scrollPosition === 'preserve',
          scroll,
          signal,
        });

        if (waitUntil) {
          waitUntil(swap);
        } else {
          /* replaceFragments reports its own failures through page:fragments-replace-error */
          swap.catch(() => {});
        }
      }
    );

    if (this.router) {
      this._useRouter(this.router);
    }

    /* Initial component mounting */
    this._initialMount();

    this.eventBus.emit('page-manager:initialized', {
      containerSelector: this.containerSelector,
      options: this.options,
    });
  }

  /**
   * Hand the router to components, including those that mounted before it loaded, and start loading
   * the swapping code now that navigation is possible
   * @internal
   * @param {import('./RouterManager.js').RouterManager} router
   */
  _useRouter(router) {
    this.router = router;
    this.host.router = router;
    for (const instance of this.host.getInstances().values()) {
      instance.router ??= router;
    }

    this._loadSwapper().catch(error => {
      this.logger?.error('Failed to load FragmentSwapper', { error });
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
        /* Add all targets from the group */
        for (const groupTarget of this.options.targetGroups[target]) {
          resolved.add(groupTarget);
        }
        this.logger?.info(
          `Resolved target group '${target}' to:`,
          this.options.targetGroups[target]
        );
      } else {
        /* Use the target as-is if no group defined */
        resolved.add(target);
        this.logger?.debug(`Using target '${target}' directly (no group defined)`);
      }
    }

    const finalTargets = Array.from(resolved);
    this.logger?.info('Final resolved targets:', finalTargets);

    return finalTargets;
  }

  /**
   * Replace fragments of the page with the matching fragments of a fetched document
   *
   * The swapping code is loaded when a router is present or on first use, so pages that never
   * navigate do not download it. Options are described on FragmentSwapper#replaceFragments. The
   * swap stops before changing the page when `signal` aborts or this manager is destroyed.
   *
   * @param {string} html - The fetched document's HTML
   * @param {Parameters<import('../core/FragmentSwapper.js').FragmentSwapper['replaceFragments']>[1]} [options]
   * @returns {Promise<void>}
   * @throws {Error} When a fragment is missing or tracked assets changed, before anything changes.
   */
  async replaceFragments(html, options = {}) {
    const swapper = await this._loadSwapper();
    const { signal, release } = this._swapSignal(options.signal);
    try {
      if (signal.aborted) {
        return undefined;
      }
      return await swapper.replaceFragments(html, { ...options, signal });
    } finally {
      release();
    }
  }

  /**
   * A signal that aborts when the given signal does or when this manager is destroyed, and a
   * function that removes the listeners joining them once the swap is over
   */
  _swapSignal(given) {
    const own = this._listeners.signal;
    if (!given) {
      return { signal: own, release() {} };
    }

    const controller = new AbortController();
    const joined = new AbortController();
    const abort = () => controller.abort();
    for (const source of [given, own]) {
      if (source.aborted) {
        abort();
      }
      source.addEventListener('abort', abort, { signal: joined.signal });
    }
    return { signal: controller.signal, release: () => joined.abort() };
  }

  _loadSwapper() {
    this._swapper ??= import('../core/FragmentSwapper.js').then(
      ({ FragmentSwapper }) =>
        new FragmentSwapper({
          options: this.options,
          eventBus: this.eventBus,
          logger: this.logger,
          mountWithin: (root, mountOptions) => this.mountAllWithin(root, mountOptions),
          unmountWithin: root => this.unmountAllWithin(root),
        }),
      error => {
        this._swapper = null;
        throw error;
      }
    );
    return this._swapper;
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
    this.host.mountWithin(root, { priority, nodes: addedNodes, fragmentTarget });
  }

  /**
   * Unmount every component within a root
   *
   * @param {Element} root
   */
  unmountAllWithin(root) {
    this.host.unmountWithin(root);
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
    /* Return current state of all components based on actual instances */
    const states = {};
    const loadingStatus = this.getLoadingStatus();

    this.registry.forEach(comp => {
      const instance = this.instances.get(comp.name);
      const isLoading = loadingStatus.loading.includes(comp.name);

      /* Count actual DOM elements that match this component's selector */
      const elements = document.querySelectorAll(comp.selector);
      const elementCount = elements.length;

      let status = 'not-loaded';
      if (isLoading) {
        status = 'loading';
      } else if (instance) {
        status = 'loaded';
      } else if (elementCount > 0) {
        status = 'available'; /* Elements exist but component not instantiated yet */
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

  /**
   * Clean up resources
   */
  destroy() {
    this.logger?.info('PageManager destroying');

    /* Unmount every component and stop observing the page */
    this.host.stop();

    /* Remove event bus listeners */
    this._listeners?.abort();

    this.eventBus.emit('page-manager:destroyed', {});

    this.logger?.info('PageManager destroyed');
  }
}
