import {QueuedComponentProxy} from '../core/QueuedComponentProxy.js';

/**
 * PageManager - Enhanced page lifecycle and component management
 * Handles fragment replacement, component mounting/unmounting, and DOM observation
 */
export class PageManager {
    constructor({containerSelector, registry, eventBus, logger, router, options = {}}) {
        this.eventBus = eventBus;
        this.logger = logger;
        this.router = router;
        this.containerSelector = containerSelector;
        this.registry = registry;

        // Configuration options
        this.options = {
            // Delay before mounting components (for performance)
            mountDelay: 1200,
            // Scroll restoration behavior
            scrollRestoration: true,
            scrollPosition: 'top', // 'top', 'preserve', 'element'
            scrollElement: null,
            // Component loading
            lazyLoadThreshold: '100px',
            retryFailedLoads: true,
            maxRetryAttempts: 3,
            // Performance
            batchUpdates: true,
            updateThrottleMs: 16,
            // Debug
            trackPerformance: false,
            ...options
        };

        // Instance management
        this.instances = new Map();
        this.observer = null;
        this.loadingPromises = new Map();
        this.retryCount = new Map();

        // Performance tracking
        this.performanceMetrics = {
            fragmentReplacements: 0,
            componentMounts: 0,
            componentUnmounts: 0,
            totalMountTime: 0,
            averageMountTime: 0
        };

        // Throttled update function for batch operations
        this.throttledUpdate = this._createThrottledFunction(
            this._processBatchedUpdates.bind(this),
            this.options.updateThrottleMs
        );
        this.pendingUpdates = [];

        this._initialize();
    }

    /**
     * Initialize the PageManager with event listeners
     */
    _initialize() {
        this.logger?.info('PageManager initializing', {
            containerSelector: this.containerSelector,
            registrySize: this.registry.length
        });

        // Router event handlers
        this.eventBus.on('router:navigate-success', ({html, url, trigger}) => {
            this.replaceFragment(html, {
                fromNavigation: true,
                url,
                trigger,
                preserveScroll: trigger === 'popstate' && this.options.scrollPosition === 'preserve'
            });
        });

        this.eventBus.on('router:popstate', async ({url}) => {
            try {
                this.logger?.info('Handling popstate navigation', {url: url.toString()});
                const {data} = await this.router.get(url.toString());

                if (typeof data === 'string') {
                    this.replaceFragment(data, {
                        fromPopstate: true,
                        url,
                        preserveScroll: this.options.scrollPosition === 'preserve'
                    });
                }
            } catch (error) {
                this.logger?.error('Popstate fetch failed', {url: url.toString(), error});
                this.eventBus.emit('page:popstate-error', {url, error});
            }
        });

        // Component lifecycle events
        this.eventBus.on('component:lazy-load', ({element, componentName}) => {
            this._handleLazyLoad(element, componentName);
        });

        // Initial component mounting
        this._initialMount();

        this.eventBus.emit('page-manager:initialized', {
            containerSelector: this.containerSelector,
            options: this.options
        });
    }

    /**
     * Get the container element
     */
    get container() {
        const element = document.querySelector(this.containerSelector);
        if (!element) {
            const error = new Error(`Container not found: ${this.containerSelector}`);
            this.logger?.error('Container element not found', {selector: this.containerSelector});
            throw error;
        }
        return element;
    }

    /**
     * Replace fragment content with enhanced options
     */
    replaceFragment(html, options = {}) {
        const {
            fromNavigation = false,
            fromPopstate = false,
            preserveScroll = false,
            url = null,
            trigger = 'unknown'
        } = options;

        const startTime = this.options.trackPerformance ? performance.now() : 0;
        const root = this.container;

        this.logger?.group('Fragment replacement', {
            fromNavigation,
            fromPopstate,
            preserveScroll,
            url: url?.toString(),
            trigger
        });

        try {
            // Store current scroll position if needed
            let scrollPosition = null;
            if (preserveScroll) {
                scrollPosition = {
                    x: window.scrollX,
                    y: window.scrollY
                };
            }

            // Emit pre-unmount event
            this.eventBus.emit('page:fragment-will-replace', {
                root,
                html,
                options,
                currentUrl: url
            });

            // Unmount all existing components
            this.unmountAllWithin(root);

            // Parse and insert new content
            const template = document.createElement('template');
            template.innerHTML = html.trim();

            // Validate content before replacement
            if (!template.content.hasChildNodes()) {
                throw new Error('Received empty or invalid HTML fragment');
            }

            root.replaceChildren(...template.content.childNodes);

            // Emit post-mount event
            this.eventBus.emit('page:fragment-did-replace', {
                root,
                options,
                currentUrl: url
            });

            // Handle scroll restoration
            this._handleScrollRestoration(scrollPosition, options);

            // Mount components immediately for critical ones
            this.mountAllWithin(root, {priority: 'critical'});

            // Schedule non-critical component mounting
            if (this.options.mountDelay > 0) {
                setTimeout(() => {
                    this.mountAllWithin(root, {priority: 'normal'});
                }, this.options.mountDelay);
            } else {
                this.mountAllWithin(root, {priority: 'normal'});
            }

            // Start observing DOM changes if not already observing
            if (!this.observer) {
                this._startObserver(root);
            }

            // Update performance metrics
            if (this.options.trackPerformance) {
                const duration = performance.now() - startTime;
                this.performanceMetrics.fragmentReplacements++;
                this.logger?.info('Fragment replacement completed', {
                    duration: `${duration.toFixed(2)}ms`,
                    metrics: this.performanceMetrics
                });
            }

            this.eventBus.emit('page:fragment-replaced', {
                root,
                duration: this.options.trackPerformance ? performance.now() - startTime : null,
                options
            });

        } catch (error) {
            this.logger?.error('Fragment replacement failed', {error, html: html.slice(0, 100)});
            this.eventBus.emit('page:fragment-replace-error', {root, error, options});
            throw error;
        } finally {
            this.logger?.groupEnd();
        }
    }

    /**
     * Handle scroll restoration based on configuration
     */
    _handleScrollRestoration(storedPosition, options) {
        if (options.preserveScroll && storedPosition) {
            // Restore exact scroll position
            window.scrollTo(storedPosition.x, storedPosition.y);
            return;
        }

        switch (this.options.scrollPosition) {
            case 'top':
                window.scrollTo(0, 0);
                break;
            case 'element':
                if (this.options.scrollElement) {
                    const element = document.querySelector(this.options.scrollElement);
                    if (element) {
                        element.scrollIntoView({behavior: 'smooth'});
                    }
                }
                break;
            case 'preserve':
                // Do nothing - keep current position
                break;
        }
    }

    /**
     * Start DOM mutation observer with enhanced capabilities
     */
    _startObserver(root) {
        if (!('MutationObserver' in window)) {
            this.logger?.warn('MutationObserver not available, falling back to manual updates');
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            if (this.options.batchUpdates) {
                // Batch mutations for performance
                this.pendingUpdates.push(...mutations);
                this.throttledUpdate();
            } else {
                this._processMutations(mutations);
            }
        });

        this.observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-component', 'data-lazy-component']
        });

        this.logger?.info('DOM observer started', {root: this.containerSelector});
    }

    /**
     * Process batched DOM updates
     */
    _processBatchedUpdates() {
        if (this.pendingUpdates.length === 0) return;

        const mutations = [...this.pendingUpdates];
        this.pendingUpdates = [];
        this._processMutations(mutations);
    }

    /**
     * Process DOM mutations
     */
    _processMutations(mutations) {
        const addedElements = new Set();
        const removedElements = new Set();

        for (const mutation of mutations) {
            // Handle added nodes
            if (mutation.addedNodes) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        addedElements.add(node);
                        // Also add descendants that might have components
                        node.querySelectorAll('[data-component], [data-lazy-component]')
                            .forEach(el => addedElements.add(el));
                    }
                }
            }

            // Handle removed nodes
            if (mutation.removedNodes) {
                for (const node of mutation.removedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        removedElements.add(node);
                    }
                }
            }
        }

        // Mount new components
        if (addedElements.size > 0) {
            this.mountAllWithin(this.container, {
                addedNodes: Array.from(addedElements),
                trigger: 'mutation'
            });
        }

        // Unmount removed components
        if (removedElements.size > 0) {
            this.unmountRemoved(Array.from(removedElements));
        }
    }

    /**
     * Mount all components within a scope with enhanced options
     */
    mountAllWithin(root, options = {}) {
        const {
            addedNodes = null,
            priority = 'normal',
            trigger = 'initial'
        } = options;

        const startTime = this.options.trackPerformance ? performance.now() : 0;

        this.logger?.group('Mounting components', {
            priority,
            trigger,
            addedNodesCount: addedNodes?.length || 0
        });

        try {
            // Filter registry by priority if specified
            const componentsToMount = this.registry.filter(cfg => {
                if (priority === 'critical') {
                    return cfg.priority === 'critical' || cfg.critical === true;
                }
                return priority === 'normal' ? cfg.priority !== 'critical' : true;
            });

            for (const config of componentsToMount) {
                try {
                    this._mountComponentConfig(config, root, addedNodes);
                } catch (error) {
                    this.logger?.error(`Failed to mount component ${config.name}`, {error, config});
                    this.eventBus.emit('page:component-mount-error', {
                        componentName: config.name,
                        error,
                        config
                    });
                }
            }

            // Update performance metrics
            if (this.options.trackPerformance) {
                const duration = performance.now() - startTime;
                this.performanceMetrics.totalMountTime += duration;
                this.performanceMetrics.averageMountTime =
                    this.performanceMetrics.totalMountTime / this.performanceMetrics.fragmentReplacements;
            }

        } finally {
            this.logger?.groupEnd();
        }
    }

    /**
     * Mount a specific component configuration
     */
    _mountComponentConfig(config, root, addedNodes) {
        const scope = addedNodes || [root];
        const elements = scope.flatMap(node => {
            // Handle both direct matches and descendant matches
            const matches = [];
            if (node.matches && node.matches(config.selector)) {
                matches.push(node);
            }
            matches.push(...node.querySelectorAll(config.selector));
            return matches;
        });

        if (elements.length === 0) return;

        const instance = this._ensureInstance(config);
        let mountedCount = 0;

        for (const element of elements) {
            try {
                // Check if element is already mounted
                if (element.hasAttribute('data-component-mounted')) {
                    continue;
                }

                instance.mount(element);
                element.setAttribute('data-component-mounted', config.name);
                mountedCount++;

                this.eventBus.emit('page:component-mounted', {
                    componentName: config.name,
                    element,
                    instance
                });

            } catch (error) {
                this.logger?.error(`Failed to mount ${config.name} on element`, {error, element});
            }
        }

        if (mountedCount > 0) {
            this.performanceMetrics.componentMounts += mountedCount;
            this.logger?.info(`Mounted ${mountedCount} instances of ${config.name}`);
        }
    }

    /**
     * Unmount all components within a root
     */
    unmountAllWithin(root) {
        this.logger?.group('Unmounting components within root');

        try {
            let unmountedCount = 0;

            for (const [componentName, instance] of this.instances) {
                if (!instance._elementsKeys) continue;

                for (const element of instance._elementsKeys()) {
                    if (root.contains(element)) {
                        try {
                            instance.unmount(element);
                            element.removeAttribute('data-component-mounted');
                            unmountedCount++;

                            this.eventBus.emit('page:component-unmounted', {
                                componentName,
                                element,
                                instance
                            });

                        } catch (error) {
                            this.logger?.error(`Failed to unmount ${componentName}`, {error, element});
                        }
                    }
                }
            }

            this.performanceMetrics.componentUnmounts += unmountedCount;

            if (unmountedCount > 0) {
                this.logger?.info(`Unmounted ${unmountedCount} component instances`);
            }

        } finally {
            this.logger?.groupEnd();
        }
    }

    /**
     * Unmount components from removed DOM nodes
     */
    unmountRemoved(removedNodes) {
        let unmountedCount = 0;

        for (const [componentName, instance] of this.instances) {
            if (!instance._elementsKeys) continue;

            for (const element of instance._elementsKeys()) {
                // Check if element is no longer in the document
                if (!document.documentElement.contains(element)) {
                    try {
                        instance.unmount(element);
                        unmountedCount++;

                        this.eventBus.emit('page:component-unmounted', {
                            componentName,
                            element,
                            instance,
                            reason: 'removed'
                        });

                    } catch (error) {
                        this.logger?.error(`Failed to unmount removed ${componentName}`, {error, element});
                    }
                }
            }
        }

        if (unmountedCount > 0) {
            this.logger?.info(`Unmounted ${unmountedCount} components from removed nodes`);
        }
    }

    /**
     * Ensure component instance exists with enhanced loading
     */
    _ensureInstance(config) {
        // Return existing instance
        const existingInstance = this.instances.get(config.name);
        if (existingInstance) {
            return existingInstance;
        }

        // Handle dependencies
        if (config.dependsOn?.length) {
            for (const dependency of config.dependsOn) {
                const depConfig = this.registry.find(c => c.name === dependency);
                if (depConfig) {
                    this._ensureInstance(depConfig);
                } else {
                    this.logger?.warn(`Dependency not found: ${dependency} for ${config.name}`);
                }
            }
        }

        // Try to load component
        const loaderResult = config.loader();

        // Handle synchronous loading
        if (!(loaderResult instanceof Promise)) {
            const instance = this._createInstance(loaderResult.default, config);
            this.instances.set(config.name, instance);
            return instance;
        }

        // Handle asynchronous loading with queueing
        return this._handleAsyncLoading(config, loaderResult);
    }

    /**
     * Handle asynchronous component loading
     */
    _handleAsyncLoading(config, loaderPromise) {
        const queue = [];
        const placeholder = new QueuedComponentProxy(
            (element) => queue.push(['mount', element]),
            (element) => queue.push(['unmount', element])
        );

        this.instances.set(config.name, placeholder);

        // Track loading promise to prevent duplicate loads
        this.loadingPromises.set(config.name, loaderPromise);

        loaderPromise
            .then(module => {
                const realInstance = this._createInstance(module.default, config);

                // Process queued operations
                for (const [action, element] of queue) {
                    try {
                        realInstance[action](element);
                        if (action === 'mount') {
                            element.setAttribute('data-component-mounted', config.name);
                            // Remove loading state from successfully mounted elements
                            element.classList.remove('component-loading');
                            element.removeAttribute('data-component-state');
                        }
                    } catch (error) {
                        this.logger?.error(`Dequeued ${config.name}.${action} failed`, {error, element});
                        // Add error state for failed mounts
                        if (action === 'mount') {
                            element.classList.remove('component-loading');
                            element.classList.add('component-error');
                            element.setAttribute('data-component-state', 'error');
                        }
                    }
                }

                this.instances.set(config.name, realInstance);
                this.loadingPromises.delete(config.name);
                this.retryCount.delete(config.name);

                this.eventBus.emit('page:component-loaded', {
                    componentName: config.name,
                    instance: realInstance,
                    queueSize: queue.length
                });

                this.logger?.info(`Component ${config.name} loaded successfully`, {
                    queuedOperations: queue.length
                });
            })
            .catch(error => {
                this.logger?.error(`Failed to load component ${config.name}`, {error});

                // Remove loading state and add error state for all queued elements
                for (const [action, element] of queue) {
                    if (action === 'mount') {
                        element.classList.remove('component-loading');
                        element.classList.add('component-error');
                        element.setAttribute('data-component-state', 'error');
                    }
                }

                // Handle retry logic
                if (this.options.retryFailedLoads) {
                    const currentRetries = this.retryCount.get(config.name) || 0;
                    if (currentRetries < this.options.maxRetryAttempts) {
                        this.retryCount.set(config.name, currentRetries + 1);
                        this.logger?.info(`Retrying component load: ${config.name} (attempt ${currentRetries + 1})`);

                        setTimeout(() => {
                            this._handleAsyncLoading(config, config.loader());
                        }, Math.pow(2, currentRetries) * 1000); // Exponential backoff
                        return;
                    }
                }

                this.instances.delete(config.name);
                this.loadingPromises.delete(config.name);

                this.eventBus.emit('page:component-load-error', {
                    componentName: config.name,
                    error,
                    retries: this.retryCount.get(config.name) || 0
                });
            });

        return placeholder;
    }

    /**
     * Create component instance with dependency injection
     */
    _createInstance(moduleOrClass, config) {
        let ComponentClass;

        // Handle different module export patterns
        if (typeof moduleOrClass === 'function') {
            // Direct constructor function
            ComponentClass = moduleOrClass;
        } else if (moduleOrClass && typeof moduleOrClass.default === 'function') {
            // ES6 default export
            ComponentClass = moduleOrClass.default;
        } else if (moduleOrClass && typeof moduleOrClass[config.name] === 'function') {
            // Named export matching component name
            ComponentClass = moduleOrClass[config.name];
        } else {
            // Try to find any function export
            const exports = Object.values(moduleOrClass || {});
            ComponentClass = exports.find(exp => typeof exp === 'function');

            if (!ComponentClass) {
                throw new Error(`No valid constructor found in module for component ${config.name}. Available exports: ${Object.keys(moduleOrClass || {}).join(', ')}`);
            }
        }

        this.logger?.info(`Creating instance of ${config.name}`, {
            ComponentClass: ComponentClass.name,
            config
        });

        try {
            // Try the standard framework pattern first (with DI)
            const instance = new ComponentClass({
                eventBus: this.eventBus,
                logger: this.logger,
                router: this.router,
                config
            });

            this.logger?.info(`Created ${config.name} with DI pattern`, {config});
            return instance;

        } catch (error) {
            this.logger?.warn(`DI constructor failed for ${config.name}, trying fallback patterns`, {error});

            try {
                // Try no-args constructor (for components that don't use DI)
                const fallbackInstance = new ComponentClass();
                this.logger?.info(`Created ${config.name} with no-args constructor`, {config});

                // Try to inject dependencies if methods exist
                if (typeof fallbackInstance.setEventBus === 'function') {
                    fallbackInstance.setEventBus(this.eventBus);
                }
                if (typeof fallbackInstance.setLogger === 'function') {
                    fallbackInstance.setLogger(this.logger);
                }
                if (typeof fallbackInstance.setRouter === 'function') {
                    fallbackInstance.setRouter(this.router);
                }

                return fallbackInstance;

            } catch (fallbackError) {
                this.logger?.error(`All constructor patterns failed for ${config.name}`, {
                    originalError: error,
                    fallbackError,
                    ComponentClass: ComponentClass.name
                });
                throw new Error(`Cannot instantiate component ${config.name}: ${error.message}`);
            }
        }
    }

    /**
     * Handle lazy loading of components
     */
    _handleLazyLoad(element, componentName) {
        const config = this.registry.find(c => c.name === componentName);
        if (!config) {
            this.logger?.warn(`Lazy load requested for unknown component: ${componentName}`);
            return;
        }

        this.logger?.info(`Lazy loading component: ${componentName}`, {element});

        const instance = this._ensureInstance(config);
        instance.mount(element);
    }

    /**
     * Initial component mounting
     */
    _initialMount() {
        try {
            const container = this.container;
            this.mountAllWithin(container, {trigger: 'initial'});

            // Start observer after initial mount
            this._startObserver(container);

        } catch (error) {
            this.logger?.error('Initial component mounting failed', {error});
        }
    }

    /**
     * Create throttled function for performance
     */
    _createThrottledFunction(func, delay) {
        let timeoutId = null;
        let lastExecTime = 0;

        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {...this.performanceMetrics};
    }

    /**
     * Get component instances
     */
    getInstances() {
        return new Map(this.instances);
    }

    /**
     * Get loading status
     */
    getLoadingStatus() {
        return {
            loading: Array.from(this.loadingPromises.keys()),
            retries: Object.fromEntries(this.retryCount)
        };
    }

    getComponentRegistry() {
        return this.registry || [];
    }

    getComponentStates() {
        // Return current state of all components
        const states = {};
        this.registry.forEach(comp => {
            const elements = document.querySelectorAll(comp.selector);
            const mountedCount = elements.length;
            const loadingCount = Array.from(elements).filter(el =>
                el.classList.contains('component--loading')
            ).length;

            states[comp.name] = {
                status: loadingCount > 0 ? 'loading' : mountedCount > 0 ? 'loaded' : 'not-loaded',
                mountedElements: mountedCount,
                loadingElements: loadingCount,
                //mountTime: this.getAverageMountTime(comp.name), // if you track this
                //errorCount: this.getErrorCount(comp.name) // if you track this
            };
        });
        return states;
    }

    getMetrics() {
        return {
            componentMounts: this.stats?.componentMounts || 0,
            componentUnmounts: this.stats?.componentUnmounts || 0,
            averageMountTime: this.stats?.averageMountTime || 0,
            circuitBreakersOpen: this.stats?.circuitBreakersOpen || 0,
            pooledInstances: this.stats?.pooledInstances || 0,
            memoryLeaks: this.stats?.memoryLeaks || 0,
            healthChecksPassed: this.stats?.healthChecksPassed || 0
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.logger?.info('PageManager destroying');

        // Stop observing DOM changes
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Stop lazy loading observer
        if (this._lazyObserver) {
            this._lazyObserver.disconnect();
            this._lazyObserver = null;
        }

        // Clear cleanup interval
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }

        // Unmount all components
        this.unmountAllWithin(this.container);

        // Clean up component pool
        for (const [componentName, pool] of this._componentPool) {
            for (const instance of pool) {
                if (typeof instance.destroy === 'function') {
                    try {
                        instance.destroy();
                    } catch (error) {
                        this.logger?.warn(`Error destroying pooled instance of ${componentName}`, {error});
                    }
                }
            }
        }

        // Clear all tracking data
        this.instances.clear();
        this.loadingPromises.clear();
        this.retryCount.clear();
        this._componentPool.clear();
        this._mountedElements.clear();
        this._errorCounts.clear();
        this._circuitBreakers.clear();

        // Remove event listeners
        this.eventBus.off('router:navigate-success');
        this.eventBus.off('router:popstate');
        this.eventBus.off('component:lazy-load');

        this.eventBus.emit('page-manager:destroyed', {});

        this.logger?.info('PageManager destroyed');
    }
}