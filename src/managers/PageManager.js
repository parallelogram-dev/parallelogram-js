import { ComponentHost } from '../core/ComponentHost.js';

/**
 * PageManager - page lifecycle and component management
 *
 * Mounts components through a ComponentHost (`pageManager.host`), replaces page fragments after
 * router navigation through a FragmentSwapper loaded on demand, and keeps the metrics shown by the
 * demo's performance dashboard.
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
    this._subscribe('page:fragments-replaced', () => {
      if (this.options.trackPerformance) {
        this.performanceMetrics.fragmentReplacements++;
      }
    });

    /* Start loading the swapping code early when navigation is possible */
    if (this.router) {
      this._loadSwapper().catch(error => {
        this.logger?.error('Failed to load FragmentSwapper', { error });
      });
    }

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
   * Replace fragments of the page with the matching fragments of a fetched document
   *
   * The swapping code is loaded when a router is present or on first use, so pages that never
   * navigate do not download it. Options are described on FragmentSwapper#replaceFragments; unless
   * a `signal` is given, the swap stops before changing the page once this manager is destroyed.
   *
   * @throws {Error} When a fragment is missing or tracked assets changed, before anything changes.
   */
  async replaceFragments(html, options = {}) {
    const swapper = await this._loadSwapper();
    const signal = options.signal ?? this._listeners.signal;
    if (signal.aborted) {
      return undefined;
    }
    return swapper.replaceFragments(html, { ...options, signal });
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
