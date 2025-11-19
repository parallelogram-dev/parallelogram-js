/**
 * ComponentRegistry - Core utility for building component registries
 * Provides a fluent API for defining component loader configurations
 * with sensible defaults and path conventions.
 */
class ComponentRegistry {
  /**
   * Create a new ComponentRegistry instance
   * @param {Object} options - Configuration options
   * @param {string} [options.basePath='./components/'] - Base path for component imports
   * @param {string} [options.defaultPriority='normal'] - Default priority for components
   * @param {string} [options.fileExtension='.js'] - Default file extension
   * @param {boolean} [options.useMinified=false] - Whether to use .min.js files by default
   */
  constructor(options = {}) {
    this.basePath = options.basePath || '../components/';
    this.defaultPriority = options.defaultPriority || 'normal';
    this.fileExtension = options.fileExtension || '.js';
    this.useMinified = options.useMinified || false;
    this.registry = [];
  }

  /**
   * Add a component to the registry
   * @param {string} name - Component name (used for filename convention)
   * @param {string} selector - CSS selector for component elements
   * @param {Object} [options={}] - Component configuration options
   * @param {string} [options.priority] - Component loading priority ('critical', 'normal', 'low')
   * @param {string[]} [options.dependsOn] - Array of component names this depends on
   * @param {string} [options.exportName] - Name of the export (defaults to PascalCase of name)
   * @param {string} [options.path] - Custom import path (overrides convention)
   * @param {string} [options.filename] - Custom filename (overrides convention)
   * @returns {ComponentRegistry} This instance for chaining
   */
  component(name, selector, options = {}) {
    if (!options.loader) {
      throw new Error(`Component '${name}' must provide a loader function`);
    }

    const config = {
      name,
      selector,
      priority: options.priority || this.defaultPriority,
      dependsOn: options.dependsOn,
      loader: options.loader,
    };

    this.registry.push(config);
    return this;
  }

  /**
   * Convert string to PascalCase
   * @private
   * @param {string} str - Input string
   * @returns {string} PascalCase string
   */
  toPascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get the built registry array
   * @returns {Array} Component registry configuration
   */
  build() {
    return [...this.registry];
  }

  /**
   * Clear the registry
   * @returns {ComponentRegistry} This instance for chaining
   */
  clear() {
    this.registry = [];
    return this;
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStats() {
    const priorities = this.registry.reduce((acc, comp) => {
      acc[comp.priority] = (acc[comp.priority] || 0) + 1;
      return acc;
    }, {});

    const withDependencies = this.registry.filter(comp => comp.dependsOn?.length > 0).length;

    return {
      totalComponents: this.registry.length,
      priorities,
      withDependencies,
      basePath: this.basePath,
    };
  }

  /**
   * Validate the registry for circular dependencies and missing dependencies
   * @returns {Object} Validation result
   */
  validate() {
    const componentNames = new Set(this.registry.map(comp => comp.name));
    const errors = [];
    const warnings = [];

    // Check for missing dependencies
    this.registry.forEach(comp => {
      if (comp.dependsOn) {
        comp.dependsOn.forEach(dep => {
          if (!componentNames.has(dep)) {
            errors.push(
              `Component '${comp.name}' depends on '${dep}' which is not in the registry`
            );
          }
        });
      }
    });

    // Check for circular dependencies (simplified check)
    const hasCycles = this.detectCycles();
    if (hasCycles.length > 0) {
      errors.push(`Circular dependencies detected: ${hasCycles.join(', ')}`);
    }

    // Check for duplicate selectors
    const selectors = new Map();
    this.registry.forEach(comp => {
      if (selectors.has(comp.selector)) {
        warnings.push(
          `Duplicate selector '${comp.selector}' used by '${comp.name}' and '${selectors.get(comp.selector)}'`
        );
      } else {
        selectors.set(comp.selector, comp.name);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect circular dependencies
   * @private
   * @returns {Array} Component names involved in cycles
   */
  detectCycles() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const visit = (componentName, path = []) => {
      if (recursionStack.has(componentName)) {
        const cycleStart = path.indexOf(componentName);
        cycles.push(path.slice(cycleStart).concat(componentName).join(' -> '));
        return;
      }

      if (visited.has(componentName)) {
        return;
      }

      visited.add(componentName);
      recursionStack.add(componentName);

      const component = this.registry.find(comp => comp.name === componentName);
      if (component?.dependsOn) {
        component.dependsOn.forEach(dep => {
          visit(dep, [...path, componentName]);
        });
      }

      recursionStack.delete(componentName);
    };

    this.registry.forEach(comp => {
      if (!visited.has(comp.name)) {
        visit(comp.name);
      }
    });

    return cycles;
  }

  /**
   * Create a new registry with different base configuration
   * @param {Object} options - New configuration options
   * @returns {ComponentRegistry} New registry instance
   */
  fork(options = {}) {
    return new ComponentRegistry({
      basePath: this.basePath,
      defaultPriority: this.defaultPriority,
      fileExtension: this.fileExtension,
      useMinified: this.useMinified,
      ...options,
    });
  }

  /**
   * Static factory method for creating a registry with common configurations
   * @param {'dev'|'prod'|'custom'} preset - Configuration preset
   * @param {Object} [options={}] - Additional options
   * @returns {ComponentRegistry} Configured registry instance
   */
  static create(preset = 'dev', options = {}) {
    const presets = {
      dev: {
        basePath: '/dist/esm/components/',
        useMinified: false,
        fileExtension: '.js',
      },
      production: {
        basePath: '/dist/esm/components/',
        useMinified: true,
        fileExtension: '.js',
      },
      custom: {},
    };

    const config = { ...presets[preset], ...options };
    return new ComponentRegistry(config);
  }
}

class DevLogger {
  constructor(namespace, enabled = false) {
    this.namespace = namespace;
    this.enabled = enabled;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  _getPrefix(level) {
    return `${new Date().toISOString()} [${this.namespace}] ${level}:`;
  }

  debug(...args) {
    if (this.enabled) {
      console.debug(this._getPrefix('DEBUG'), ...args);
    }
  }

  log(...args) {
    if (this.enabled) {
      console.log(this._getPrefix('LOG'), ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info(this._getPrefix('INFO'), ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(this._getPrefix('WARN'), ...args);
    }
  }

  error(...args) {
    console.error(this._getPrefix('ERROR'), ...args);
  }

  child(subNamespace) {
    return new DevLogger(`${this.namespace}:${subNamespace}`, this.enabled);
  }

  group(label, data) {
    if (!this.enabled || !console.groupCollapsed) return;

    /* Open the group with just the label */
    console.groupCollapsed(`[${this.namespace}] ${label}`);

    /* Log data separately inside the group if provided */
    if (data && typeof data === 'object') {
      console.log('Details:', data);
    }
  }
  groupEnd() {
    if (this.enabled && console.groupEnd) console.groupEnd();
  }
}

/**
 * WebComponentLoader - Utility for lazy-loading web components
 *
 * Automatically detects web components in the DOM and loads their
 * implementation only when needed, preventing tree-shaking and
 * enabling code splitting with webpack/rollup.
 *
 * @example
 * // In your application code, explicitly choose which components to lazy-load
 * import { WebComponentLoader } from '@peptolab/parallelogram/core/WebComponentLoader.js';
 *
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@peptolab/parallelogram/components/PModal'),
 *   'p-select': () => import('@peptolab/parallelogram/components/PSelect'),
 * });
 *
 * loader.init(); // Auto-loads components found in DOM
 *
 * @example
 * // With custom options and DOM observation
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@peptolab/parallelogram/components/PModal'),
 * }, {
 *   observeDOM: true,        // Watch for dynamically added components
 *   onLoad: (tagName) => console.log(`Loaded ${tagName}`),
 * });
 *
 * @example
 * // Eager load on user interaction instead of DOM presence
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@peptolab/parallelogram/components/PModal'),
 * }, {
 *   eager: false  // Don't auto-scan on init
 * });
 *
 * // Load when user clicks a trigger
 * document.querySelector('[data-modal-trigger]').addEventListener('click', () => {
 *   loader.loadComponent('p-modal');
 * });
 */
class WebComponentLoader {
  /**
   * Create a new WebComponentLoader instance
   * @param {Object} componentMap - Map of tag names to dynamic import functions
   *   Each value should be a function that returns a dynamic import promise
   *   Example: { 'p-modal': () => import('@pkg/components/PModal') }
   * @param {Object} options - Configuration options
   * @param {boolean} [options.eager=true] - Auto-scan DOM on init
   * @param {boolean} [options.observeDOM=false] - Watch for dynamically added components
   * @param {Element} [options.rootElement=document.documentElement] - Root element to observe
   * @param {Function} [options.onLoad] - Callback when component is loaded (receives tagName)
   * @param {Function} [options.onError] - Callback when component fails to load (receives tagName, error)
   */
  constructor(componentMap = {}, options = {}) {
    this.componentMap = componentMap;
    this.options = {
      eager: options.eager ?? true,
      observeDOM: options.observeDOM ?? false,
      rootElement: options.rootElement ?? document.documentElement,
      onLoad: options.onLoad ?? null,
      onError: options.onError ?? null,
    };

    this.loadedComponents = new Set();
    this.loadingComponents = new Map();
    this.observer = null;
  }

  /**
   * Initialize the loader - scans DOM and optionally sets up observer
   */
  init() {
    // Load components already in the DOM if eager mode
    if (this.options.eager) {
      this.scanAndLoad();
    }

    // Set up MutationObserver if requested
    if (this.options.observeDOM) {
      this.startObserving();
    }
  }

  /**
   * Scan the DOM for web components and load them
   * @param {Element} [root] - Root element to scan (defaults to configured root)
   */
  scanAndLoad(root = this.options.rootElement) {
    Object.keys(this.componentMap).forEach(tagName => {
      if (!this.loadedComponents.has(tagName)) {
        const elements = root.querySelectorAll(tagName);
        if (elements.length > 0) {
          this.loadComponent(tagName);
        }
      }
    });
  }

  /**
   * Load a specific component by tag name
   * @param {string} tagName - The custom element tag name
   * @returns {Promise<void>}
   */
  async loadComponent(tagName) {
    // Already loaded
    if (this.loadedComponents.has(tagName)) {
      return;
    }

    // Already loading - return existing promise
    if (this.loadingComponents.has(tagName)) {
      return this.loadingComponents.get(tagName);
    }

    // No loader defined for this component
    if (!this.componentMap[tagName]) {
      console.warn(
        `[WebComponentLoader] No loader defined for component: ${tagName}`
      );
      return;
    }

    // Create loading promise
    const loadPromise = this.componentMap[tagName]()
      .then(() => {
        this.loadedComponents.add(tagName);
        this.loadingComponents.delete(tagName);

        if (this.options.onLoad) {
          this.options.onLoad(tagName);
        }
      })
      .catch(error => {
        this.loadingComponents.delete(tagName);

        if (this.options.onError) {
          this.options.onError(tagName, error);
        } else {
          console.error(
            `[WebComponentLoader] Failed to load component: ${tagName}`,
            error
          );
        }
      });

    this.loadingComponents.set(tagName, loadPromise);
    return loadPromise;
  }

  /**
   * Start observing DOM for new components
   */
  startObserving() {
    if (this.observer) {
      return; // Already observing
    }

    this.observer = new MutationObserver(mutations => {
      const nodesToCheck = new Set();

      mutations.forEach(mutation => {
        // Check added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            nodesToCheck.add(node);
          }
        });
      });

      // Check each added node for components
      nodesToCheck.forEach(node => {
        Object.keys(this.componentMap).forEach(tagName => {
          if (!this.loadedComponents.has(tagName)) {
            // Check if the node itself is the component
            if (node.tagName?.toLowerCase() === tagName) {
              this.loadComponent(tagName);
            }
            // Check if the node contains the component
            else if (node.querySelector && node.querySelector(tagName)) {
              this.loadComponent(tagName);
            }
          }
        });
      });
    });

    this.observer.observe(this.options.rootElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stop observing DOM changes
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Manually register a new component loader
   * @param {string} tagName - The custom element tag name
   * @param {Function} loader - Dynamic import function
   */
  register(tagName, loader) {
    this.componentMap[tagName] = loader;
  }

  /**
   * Unregister a component loader
   * @param {string} tagName - The custom element tag name
   */
  unregister(tagName) {
    delete this.componentMap[tagName];
  }

  /**
   * Check if a component has been loaded
   * @param {string} tagName - The custom element tag name
   * @returns {boolean}
   */
  isLoaded(tagName) {
    return this.loadedComponents.has(tagName);
  }

  /**
   * Check if a component is currently loading
   * @param {string} tagName - The custom element tag name
   * @returns {boolean}
   */
  isLoading(tagName) {
    return this.loadingComponents.has(tagName);
  }

  /**
   * Destroy the loader and clean up
   */
  destroy() {
    this.stopObserving();
    this.loadedComponents.clear();
    this.loadingComponents.clear();
  }
}

class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);
    listeners.add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const unsubscribe = this.on(event, payload => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    const listenersCopy = [...listeners];
    for (const callback of listenersCopy) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[EventManager] Error in listener for "${event}":`, error);
      }
    }
  }

  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * RouterManager - Enhanced routing component for the Enhancement Framework
 * Handles client-side navigation, history management, and fragment loading
 */
class RouterManager {
  constructor({ eventBus, logger, options = {} }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.options = {
      // Default options
      baseUrl: '',
      timeout: 10000,
      retryAttempts: 0,
      fragmentSelector: '[data-router-fragment]',
      loadingClass: 'router-loading',
      errorClass: 'router-error',
      ...options,
    };

    this.controller = null;
    this.currentUrl = new URL(location.href);
    this.isNavigating = false;

    // Bind event handlers
    this.boundPopState = this._onPopState.bind(this);
    this.boundLinkClick = this._onLinkClick.bind(this);

    this._initialize();
  }

  /**
   * Initialize the router with event listeners
   */
  _initialize() {
    this.logger?.info('RouterManager initializing');

    // History events
    window.addEventListener('popstate', this.boundPopState);
    window.addEventListener('pageshow', e => {
      if (e.persisted) {
        this.eventBus.emit('router:bfcache-restore', { url: this.currentUrl });
      }
    });
    window.addEventListener('pagehide', () => {
      this.eventBus.emit('router:bfcache-store', { url: this.currentUrl });
    });

    // Enhance existing links
    this._enhanceLinks();

    // Listen for dynamic content changes
    this.eventBus.on('dom:content-loaded', () => {
      this._enhanceLinks();
    });

    this.eventBus.emit('router:initialized', { currentUrl: this.currentUrl });
  }

  /**
   * Enhance links for progressive navigation
   */
  _enhanceLinks() {
    const links = document.querySelectorAll('a[href]:not([data-router-enhanced])');
    links.forEach(link => {
      if (this._shouldEnhanceLink(link)) {
        link.addEventListener('click', this.boundLinkClick);
        link.setAttribute('data-router-enhanced', 'true');
        this.logger?.debug('Enhanced link', { href: link.href });
      }
    });
  }

  /**
   * Determine if a link should be enhanced for SPA navigation
   */
  _shouldEnhanceLink(link) {
    const href = link.getAttribute('href');

    // Skip if external, mailto, tel, etc.
    if (
      !href ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      return false;
    }

    // Skip if explicitly marked to skip
    if (link.hasAttribute('data-router-skip')) {
      return false;
    }

    // Skip if different origin (unless explicitly marked for enhancement)
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin && !link.hasAttribute('data-router-enhance')) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * Handle link clicks for SPA navigation
   */
  _onLinkClick(event) {
    // Allow default behavior with modifier keys
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    // Allow default for middle mouse button
    if (event.which === 2) {
      return;
    }

    const link = event.currentTarget;
    const href = link.getAttribute('href');
    const viewTarget = link.getAttribute('data-view-target') || 'main';

    // Check if link OR any parent container has data-router-immutable-url
    const immutableContainer = link.closest('[data-router-immutable-url]');
    const immutableUrl = link.hasAttribute('data-router-immutable-url')
      ? link.getAttribute('data-router-immutable-url') !== 'false'
      : immutableContainer
        ? immutableContainer.getAttribute('data-router-immutable-url') !== 'false'
        : false;

    try {
      const url = new URL(href, location.href);

      // Same page anchor links - allow default behavior
      if (url.pathname === location.pathname && url.hash) {
        return;
      }

      event.preventDefault();
      this.navigate(url, {
        viewTarget,
        replace: link.hasAttribute('data-router-replace'),
        immutableUrl,
        trigger: 'link-click',
        element: link,
      });
    } catch (error) {
      this.logger?.error('Failed to parse link URL', { href, error });
    }
  }

  /**
   * Handle browser back/forward navigation
   */
  _onPopState(event) {
    const url = new URL(location.href);
    this.currentUrl = url;
    this.eventBus.emit('router:popstate', {
      url,
      state: event.state,
      trigger: 'popstate',
    });
  }

  /**
   * Perform HTTP GET request with enhanced error handling and logging
   */
  async get(url, init = {}) {
    const requestUrl = typeof url === 'string' ? url : url.toString();
    this.logger?.group(`RouterManager GET ${requestUrl}`);

    // Abort any in-flight request
    this._abortInFlight();

    // Create new abort controller
    const controller = new AbortController();
    this.controller = controller;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.options.timeout);

    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/html,application/json,*/*',
          ...init.headers,
        },
        ...init,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this._createHttpError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      this.logger?.info('GET successful', {
        url: requestUrl,
        status: response.status,
        contentType,
      });

      return { response, data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        this.logger?.warn('GET aborted', { url: requestUrl });
        throw error;
      }

      this.logger?.error('GET failed', { url: requestUrl, error });
      throw error;
    } finally {
      this.logger?.groupEnd();
      this.controller = null;
    }
  }

  /**
   * Navigate to a new URL with enhanced options
   */
  async navigate(url, options = {}) {
    const { replace = false, trigger = 'programmatic', element = null, force = false, immutableUrl = false } = options;

    const targetUrl = typeof url === 'string' ? new URL(url, location.href) : url;
    const targetUrlString = targetUrl.toString();

    // Prevent navigation to same URL unless forced
    if (!force && targetUrlString === this.currentUrl.toString()) {
      this.logger?.debug('Navigation skipped - same URL', { url: targetUrlString });
      return;
    }

    // Prevent concurrent navigation
    if (this.isNavigating) {
      this.logger?.warn('Navigation in progress, aborting new navigation', {
        url: targetUrlString,
      });
      return;
    }

    this.isNavigating = true;
    this.currentUrl = targetUrl;

    // Emit navigation start event
    this.eventBus.emit('router:navigate-start', {
      url: targetUrl,
      trigger,
      element,
      replace,
    });

    // Add loading state
    if (element) {
      element.classList.add(this.options.loadingClass);
    }
    document.body.classList.add(this.options.loadingClass);

    try {
      const { data } = await this.get(targetUrlString);

      if (typeof data !== 'string') {
        throw new Error('Expected HTML string response for navigation');
      }

      // Update browser history only if URL is not immutable
      if (!immutableUrl) {
        const historyState = { timestamp: Date.now(), trigger };
        if (replace) {
          history.replaceState(historyState, '', targetUrlString);
        } else {
          history.pushState(historyState, '', targetUrlString);
        }
      }

      // Emit success event with HTML data
      this.eventBus.emit('router:navigate-success', {
        url: targetUrl,
        html: data,
        trigger,
        element,
        replace,
        viewTarget: options.viewTarget,
        immutableUrl,
      });

      this.logger?.info('Navigation successful', {
        url: targetUrlString,
        trigger,
        replace,
        immutableUrl,
      });

      return data;
    } catch (error) {
      // Add error state
      if (element) {
        element.classList.add(this.options.errorClass);
      }
      document.body.classList.add(this.options.errorClass);

      this.eventBus.emit('router:navigate-error', {
        url: targetUrl,
        error,
        trigger,
        element,
      });

      this.logger?.error('Navigation failed', {
        url: targetUrlString,
        error,
        trigger,
      });

      throw error;
    } finally {
      // Clean up loading states
      if (element) {
        element.classList.remove(this.options.loadingClass, this.options.errorClass);
      }
      document.body.classList.remove(this.options.loadingClass, this.options.errorClass);

      this.isNavigating = false;

      this.eventBus.emit('router:navigate-end', {
        url: targetUrl,
        trigger,
      });
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
   * Check if currently navigating
   */
  isNavigating() {
    return this.isNavigating;
  }

  /**
   * Abort any in-flight request
   */
  _abortInFlight() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
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
   * Clean up event listeners and abort any pending requests
   */
  destroy() {
    this.logger?.info('RouterManager destroying');

    // Remove event listeners
    window.removeEventListener('popstate', this.boundPopState);

    // Remove enhanced link listeners
    document.querySelectorAll('a[data-router-enhanced]').forEach(link => {
      link.removeEventListener('click', this.boundLinkClick);
      link.removeAttribute('data-router-enhanced');
    });

    // Abort any pending requests
    this._abortInFlight();

    // Remove event bus listeners
    this.eventBus.off('dom:content-loaded');

    this.eventBus.emit('router:destroyed', {});

    this.logger?.info('RouterManager destroyed');
  }
}

/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} Camel-cased string
 */
function camelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Get data attribute with type conversion
 * @param {HTMLElement} element - Element to read from
 * @param {string} attr - Attribute name (kebab-case or camelCase)
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Converted value
 */
function getDataAttr(element, attr, defaultValue) {
  const key = attr.includes('-') ? camelCase(attr) : attr;
  const value = element.dataset[key];
  if (value === undefined) return defaultValue;

  /* Convert string values to appropriate types */
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}

/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function - delays execution until after wait milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function - ensures it's only called at most once per time period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between allowed executions
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Delay helper - returns a promise that resolves after specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for CSS transition or animation to complete
 * @param {HTMLElement} element - Element with transition/animation
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise} Promise that resolves when transition ends
 */
async function waitForTransition(element, timeout = 2000) {
  return new Promise((resolve) => {
    const handleEnd = () => {
      element.removeEventListener('animationend', handleEnd);
      element.removeEventListener('transitionend', handleEnd);
      resolve();
    };

    element.addEventListener('animationend', handleEnd, { once: true });
    element.addEventListener('transitionend', handleEnd, { once: true });

    setTimeout(() => {
      element.removeEventListener('animationend', handleEnd);
      element.removeEventListener('transitionend', handleEnd);
      resolve();
    }, timeout);
  });
}

/**
 * Apply fade-in effect to element
 * @param {HTMLElement} element - Element to fade in
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
async function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '1';

  return new Promise((resolve) => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Apply fade-out effect to element
 * @param {HTMLElement} element - Element to fade out
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
async function fadeOut(element, duration = 300) {
  element.style.opacity = '1';
  element.style.transition = `opacity ${duration}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '0';

  return new Promise((resolve) => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusableElements(container = document) {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
  ];
  return Array.from(container.querySelectorAll(selectors.join(',')));
}

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 * @param {HTMLElement} container - Container to trap focus within
 * @param {KeyboardEvent} event - Tab key event
 */
function trapFocus(container, event) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.contains(document.activeElement) ? document.activeElement : null;

  if (event.shiftKey && (active === first || !active)) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && active === last) {
    first.focus();
    event.preventDefault();
  }
}

/**
 * Restore focus to an element with smooth transition
 * @param {HTMLElement} element - Element to focus
 */
function restoreFocus(element) {
  if (element && typeof element.focus === 'function') {
    requestAnimationFrame(() => element.focus());
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Text content or child element
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }

  return element;
}

/**
 * BaseComponent - Production-ready base class with state management
 *
 * Provides lifecycle helpers, state tracking per element, data-attribute
 * parsing, and event dispatching. Components should extend this class and
 * implement _init(element) and optionally update(element).
 *
 * @typedef {Object} ComponentState
 * @property {AbortController} controller - Abort controller for listeners
 * @property {Function} cleanup - Cleanup function called on unmount
 */
class BaseComponent {
  constructor({ eventBus, logger, router }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    // Primary storage for element states
    this.elements = new WeakMap();
    // Backward-compat alias for older components expecting `states`
    this.states = this.elements;
    this._keys = null;
  }

  mount(element) {
    if (this.elements.has(element)) return this.update(element);
    const state = this._init(element);
    this.elements.set(element, state);
  }

  update(element) {
    // Override in subclasses for update logic
  }

  unmount(element) {
    const state = this.elements.get(element);
    if (!state) return;
    try {
      state.cleanup?.();
    } finally {
      this.elements.delete(element);
    }
  }

  destroy() {
    for (const element of this._elementsKeys()) {
      this.unmount(element);
    }
  }

  _elementsKeys() {
    if (!this._keys) this._keys = new Set();
    return this._keys;
  }

  _track(element) {
    if (!this._keys) this._keys = new Set();
    this._keys.add(element);
  }

  _untrack(element) {
    this._keys?.delete(element);
  }

  _init(element) {
    const controller = new AbortController();
    const cleanup = () => {
      controller.abort();
      this._untrack(element);
    };
    this._track(element);
    return { cleanup, controller };
  }

  // Helper method for getting state
  getState(element) {
    return this.elements.get(element);
  }

  /* Wrapper methods that delegate to shared utilities */
  _getDataAttr(element, attr, defaultValue) {
    return getDataAttr(element, attr, defaultValue);
  }

  _camelCase(str) {
    return camelCase(str);
  }

  _debounce(func, wait = 300) {
    return debounce(func, wait);
  }

  _throttle(func, limit = 100) {
    return throttle(func, limit);
  }

  _delay(ms) {
    return delay(ms);
  }

  /**
   * Get target element from data attribute with validation
   * Supports both CSS selectors (data-*-target="#id") and data-view lookups (data-*-target-view="viewname")
   *
   * @param {HTMLElement} element - Element containing the data attribute
   * @param {string} dataAttr - Data attribute name (without 'data-' prefix)
   * @param {Object} options - Options for validation
   * @param {boolean} options.required - Whether to warn if not found
   * @returns {HTMLElement|null} Target element or null
   *
   * @example
   * // CSS selector approach
   * <button data-toggle-target="#sidebar">Toggle</button>
   *
   * // data-view approach (more consistent with framework)
   * <button data-toggle-target-view="sidebar">Toggle</button>
   * <div data-view="sidebar">...</div>
   */
  _getTargetElement(element, dataAttr, options = {}) {
    /* Check for data-view based target first (e.g., data-toggle-target-view) */
    const viewAttr = `${dataAttr}-view`;
    const viewName = this._getDataAttr(element, viewAttr);

    if (viewName) {
      const target = document.querySelector(`[data-view="${viewName}"]`);
      if (!target && options.required) {
        this.logger?.warn(`Target element with data-view="${viewName}" not found`, {
          viewName,
          element,
          attribute: viewAttr
        });
      }
      return target;
    }

    /* Fallback to CSS selector approach (e.g., data-toggle-target="#id") */
    const selector = this._getDataAttr(element, dataAttr);
    if (!selector) {
      if (options.required) {
        this.logger?.warn(`No ${dataAttr} or ${viewAttr} attribute found`, element);
      }
      return null;
    }

    const target = document.querySelector(selector);
    if (!target && options.required) {
      this.logger?.warn(`Target element not found`, { selector, element });
    }
    return target;
  }

  /**
   * Parse multiple data attributes into configuration object
   * @param {HTMLElement} element - Element with data attributes
   * @param {Object} mapping - Map of config keys to data attribute names
   * @returns {Object} Configuration object
   */
  _getConfigFromAttrs(element, mapping) {
    const config = {};
    for (const [key, attrName] of Object.entries(mapping)) {
      const defaultValue = this.constructor.defaults?.[key];
      config[key] = this._getDataAttr(element, attrName, defaultValue);
    }
    return config;
  }

  /**
   * Validate and require state exists before proceeding
   * @param {HTMLElement} element - Element to get state for
   * @param {string} methodName - Name of calling method for error messages
   * @returns {Object|null} State object or null
   */
  _requireState(element, methodName = 'method') {
    const state = this.getState(element);
    if (!state) {
      this.logger?.warn(`${methodName}: No state found for element`, element);
    }
    return state;
  }

  _generateId(prefix = 'elem') {
    return generateId(prefix);
  }

  async _waitForTransition(element, timeout = 2000) {
    return waitForTransition(element, timeout);
  }

  async _fadeIn(element, duration = 300) {
    return fadeIn(element, duration);
  }

  async _fadeOut(element, duration = 300) {
    return fadeOut(element, duration);
  }

  _getFocusableElements(container = document) {
    return getFocusableElements(container);
  }

  _trapFocus(container, event) {
    return trapFocus(container, event);
  }

  _restoreFocus(element) {
    return restoreFocus(element);
  }

  _createElement(tag, attributes = {}, content = '') {
    return createElement(tag, attributes, content);
  }

  // Dispatch custom events
  _dispatch(element, eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    this.eventBus?.emit(eventType, { element, ...detail });
    return event;
  }
}

/**
 * QueuedComponentProxy - Placeholder component for async loading
 */
class QueuedComponentProxy extends BaseComponent {
  constructor(onMount, onUnmount) {
    // Provide minimal services for proxy
    super({
      eventBus: { on() {}, emit() {} },
      logger: { info() {}, error() {}, enabled: false },
      router: null,
    });
    this._onMount = onMount;
    this._onUnmount = onUnmount;
  }

  mount(element) {
    this._onMount(element);
  }

  unmount(element) {
    this._onUnmount(element);
  }
}

/**
 * PageManager - Enhanced page lifecycle and component management
 * Handles fragment replacement, component mounting/unmounting, and DOM observation
 */
class PageManager {
  constructor({ containerSelector, registry, eventBus, logger, router, options = {} }) {
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
      // Fragment target groups - define which fragments update together
      targetGroups: {
        main: ['main', 'menubar', 'breadcrumb'], // When 'main' is requested, also update nav and breadcrumbs
        panel: ['panel'], // When 'panel' is requested, only update that
        sidebar: ['sidebar', 'toolbar'], // Sidebar updates might also update related toolbar
        modal: ['modal'], // Modal content standalone
      },
      ...options,
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
      averageMountTime: 0,
    };

    // Session-persistent component tracking
    this.sessionTracking = {
      componentsLoaded: new Set(), // Components that have been loaded this session
      loadHistory: [], // History of component loads with timestamps
      mountCount: new Map(), // Total mount count per component
      lastMountTime: new Map(), // Last mount time per component
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
      registrySize: this.registry.length,
    });

    // Router event handlers
    this.eventBus.on(
      'router:navigate-success',
      ({ html, url, trigger, viewTarget, viewTargets }) => {
        // Resolve target groups based on configuration
        const resolvedTargets = this._resolveTargetGroups(viewTargets || [viewTarget || 'main']);

        this.replaceFragments(html, {
          fromNavigation: true,
          url,
          trigger,
          viewTargets: resolvedTargets,
          preserveScroll: trigger === 'popstate' && this.options.scrollPosition === 'preserve',
        });
      }
    );

    this.eventBus.on('router:popstate', async ({ url }) => {
      try {
        this.logger?.info('Handling popstate navigation', { url: url.toString() });
        const { data } = await this.router.get(url.toString());

        if (typeof data === 'string') {
          const resolvedTargets = this._resolveTargetGroups(['main']);

          this.replaceFragments(data, {
            fromPopstate: true,
            url,
            viewTargets: resolvedTargets,
            preserveScroll: this.options.scrollPosition === 'preserve',
          });
        }
      } catch (error) {
        this.logger?.error('Popstate fetch failed', { url: url.toString(), error });
        this.eventBus.emit('page:popstate-error', { url, error });
      }
    });

    // Component lifecycle events
    this.eventBus.on('component:lazy-load', ({ element, componentName }) => {
      this._handleLazyLoad(element, componentName);
    });

    // Initial component mounting
    this._initialMount();

    this.eventBus.emit('page-manager:initialized', {
      containerSelector: this.containerSelector,
      options: this.options,
    });
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
      // Store current scroll position if needed
      let scrollPosition = null;
      if (preserveScroll) {
        scrollPosition = {
          x: window.scrollX,
          y: window.scrollY,
        };
      } else if (this.options.scrollPosition === 'top' && !fromPopstate) {
        // Scroll to top immediately before content replacement to avoid visual jump
        window.scrollTo(0, 0);
      }

      // Parse the incoming HTML once
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const replacementResults = [];
      let hasMainContentUpdate = false;

      // Process each target fragment
      for (const viewTarget of viewTargets) {
        try {
          const result = await this._processSingleFragment(doc, viewTarget, html, options);
          replacementResults.push(result);

          if (viewTarget === 'main') {
            hasMainContentUpdate = true;
          }
        } catch (error) {
          this.logger?.error(`Failed to replace fragment ${viewTarget}`, { error });
          replacementResults.push({
            viewTarget,
            success: false,
            error: error.message,
          });
        }
      }

      // Handle scroll restoration and head updates only if main content changed
      if (hasMainContentUpdate) {
        this._handleScrollRestoration(scrollPosition, options);
        this._updateDocumentHead(html);
      }

      // Mount components for all successfully updated fragments
      const successfulTargets = replacementResults.filter(r => r.success);

      for (const result of successfulTargets) {
        // Mount components within the updated fragment
        this.mountAllWithin(result.targetFragment, {
          priority: 'critical',
          fragmentTarget: result.viewTarget,
        });

        // Emit dom:content-loaded for router link enhancement
        this.eventBus.emit('dom:content-loaded', {
          fragment: result.targetFragment,
          viewTarget: result.viewTarget,
          trigger: 'fragment-replacement',
        });

        // Schedule non-critical component mounting
        if (this.options.mountDelay > 0) {
          setTimeout(() => {
            this.mountAllWithin(result.targetFragment, {
              priority: 'normal',
              fragmentTarget: result.viewTarget,
            });
          }, this.options.mountDelay);
        } else {
          this.mountAllWithin(result.targetFragment, {
            priority: 'normal',
            fragmentTarget: result.viewTarget,
          });
        }
      }

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
  async _processSingleFragment(doc, viewTarget, originalHtml, options) {
    // Extract target fragment from parsed HTML and find matching fragment in current document
    const { sourceFragment, targetFragment } = this._extractTargetFragmentFromDoc(doc, viewTarget);

    if (!sourceFragment) {
      throw new Error(`Source fragment with data-view="${viewTarget}" not found in fetched HTML`);
    }

    if (!targetFragment) {
      throw new Error(
        `Target fragment with data-view="${viewTarget}" not found in current document`
      );
    }

    // Get transition configuration for this target
    const transitionConfig = this.options.targetGroupTransitions?.[viewTarget];

    // Emit pre-unmount event
    this.eventBus.emit('page:fragment-will-replace', {
      sourceFragment,
      targetFragment,
      viewTarget,
      html: originalHtml,
      options,
      transitionConfig,
    });

    try {
      // 1. OUT transition (if configured)
      if (transitionConfig?.out) {
        await this._performFragmentTransition(targetFragment, 'out', transitionConfig);
      }

      // 2. Unmount components only within the target fragment
      this.unmountAllWithin(targetFragment);

      // 3 & 4. Replace content and prepare for IN transition in same frame
      if (transitionConfig?.in) {
        // Set initial state for in-transition before replacing content
        await this._replaceContentWithTransition(
          targetFragment,
          sourceFragment,
          transitionConfig
        );
      } else {
        // No transition - just replace
        targetFragment.innerHTML = sourceFragment.innerHTML;
        this._copyFragmentAttributes(sourceFragment, targetFragment);
      }

      // Emit post-mount event
      this.eventBus.emit('page:fragment-did-replace', {
        targetFragment,
        viewTarget,
        options,
        transitionConfig,
      });
    } catch (transitionError) {
      this.logger?.error(`Fragment transition failed for ${viewTarget}`, {
        error: transitionError,
        viewTarget,
        transitionConfig,
      });

      // Continue with replacement even if transition fails
      this.unmountAllWithin(targetFragment);
      targetFragment.innerHTML = sourceFragment.innerHTML;
      this._copyFragmentAttributes(sourceFragment, targetFragment);
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
   * Replace content and start IN transition in same frame to prevent flash
   * @private
   * @param {HTMLElement} targetFragment - Target fragment element
   * @param {HTMLElement} sourceFragment - Source fragment element
   * @param {Object} config - Transition configuration
   */
  async _replaceContentWithTransition(targetFragment, sourceFragment, config) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        /* Replace content and copy attributes */
        targetFragment.innerHTML = sourceFragment.innerHTML;
        this._copyFragmentAttributes(sourceFragment, targetFragment);

        /* Trigger IN transition in same frame */
        this._performFragmentTransition(targetFragment, 'in', config).then(resolve);
      });
    });
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
        await this._performCSSTransition(fragment, transitionType, duration, direction, outClassName);
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
      const handleEnd = event => {
        /* Only handle events from the fragment itself, not bubbled from children */
        if (event && event.target !== fragment) return;

        fragment.removeEventListener('animationend', handleEnd);
        fragment.removeEventListener('transitionend', handleEnd);

        /* When 'in' transition finishes, remove the 'in' class */
        if (direction === 'in') {
          fragment.classList.remove(className);
        }

        resolve();
      };

      /* Set up event listeners */
      fragment.addEventListener('animationend', handleEnd);
      fragment.addEventListener('transitionend', handleEnd);

      /* Use requestAnimationFrame to ensure DOM is ready */
      requestAnimationFrame(() => {
        /* Add the new transition class */
        fragment.classList.add(className);

        /* If this is an 'in' transition, remove the 'out' class in the next frame */
        /* This prevents flicker by ensuring the 'in' class is applied first */
        if (direction === 'in' && outClassName) {
          requestAnimationFrame(() => {
            fragment.classList.remove(outClassName);
          });
        }
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
   * Extract target fragment from already parsed document
   */
  _extractTargetFragmentFromDoc(doc, viewTarget) {
    let sourceFragment = null;
    let targetFragment = null;

    // Find the source fragment in the parsed document
    sourceFragment = doc.querySelector(`[data-view="${viewTarget}"]`);

    // If not found, try some fallback strategies
    if (!sourceFragment) {
      this.logger?.warn(`Fragment data-view="${viewTarget}" not found, trying fallbacks`);

      // Fallback 1: Try to find by ID (common pattern)
      sourceFragment = doc.querySelector(`#${viewTarget}`);

      // Fallback 2: If viewTarget is 'main', try common main selectors
      if (!sourceFragment && viewTarget === 'main') {
        sourceFragment =
          doc.querySelector('main') ||
          doc.querySelector('[role="main"]') ||
          doc.querySelector('#app') ||
          doc.querySelector('.main-content');
      }

      // Fallback 3: For other targets, try class-based selector
      if (!sourceFragment) {
        sourceFragment = doc.querySelector(`.${viewTarget}`);
      }
    }

    // Find the target fragment in the current document
    targetFragment = document.querySelector(`[data-view="${viewTarget}"]`);

    // Apply same fallback strategies for target
    if (!targetFragment) {
      this.logger?.warn(
        `Target fragment data-view="${viewTarget}" not found in current document, trying fallbacks`
      );

      targetFragment = document.querySelector(`#${viewTarget}`);

      if (!targetFragment && viewTarget === 'main') {
        targetFragment =
          document.querySelector('main') ||
          document.querySelector('[role="main"]') ||
          document.querySelector('#app') ||
          document.querySelector('.main-content');
      }

      if (!targetFragment) {
        targetFragment = document.querySelector(`.${viewTarget}`);
      }
    }

    this.logger?.info('Fragment extraction result', {
      viewTarget,
      sourceFound: !!sourceFragment,
      targetFound: !!targetFragment,
      sourceSelector:
        sourceFragment?.tagName + (sourceFragment?.className ? '.' + sourceFragment.className : ''),
      targetSelector:
        targetFragment?.tagName + (targetFragment?.className ? '.' + targetFragment.className : ''),
    });

    return { sourceFragment, targetFragment };
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
   * Update document head metadata when replacing main content
   */
  _updateDocumentHead(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const sourceHead = doc.querySelector('head');

      if (!sourceHead) {
        this.logger?.warn('No head element found in source HTML');
        return;
      }

      this.logger?.group('Updating document head metadata');

      // Define which head elements should be updated
      const updateableSelectors = [
        'title',
        'meta[name="description"]',
        'meta[name="keywords"]',
        'meta[name="robots"]',
        'meta[name="author"]',
        'meta[property^="og:"]', // Open Graph tags
        'meta[name^="twitter:"]', // Twitter Card tags
        'meta[property^="article:"]', // Article-specific OG tags
        'link[rel="canonical"]',
        'link[rel="alternate"]',
        'meta[name="theme-color"]',
      ];

      let updatedCount = 0;

      for (const selector of updateableSelectors) {
        const sourceElements = sourceHead.querySelectorAll(selector);

        if (sourceElements.length === 0) continue;

        // Handle title specially (only one allowed)
        if (selector === 'title') {
          const sourceTitle = sourceElements[0];
          if (sourceTitle && sourceTitle.textContent.trim()) {
            document.title = sourceTitle.textContent.trim();
            updatedCount++;
            this.logger?.info('Updated document title', {
              newTitle: document.title,
            });
          }
          continue;
        }

        // Handle canonical link specially (only one should exist)
        if (selector === 'link[rel="canonical"]') {
          // Remove existing canonical links
          document.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());

          const sourceCanonical = sourceElements[0];
          if (sourceCanonical && sourceCanonical.href) {
            const newCanonical = document.createElement('link');
            newCanonical.rel = 'canonical';
            newCanonical.href = sourceCanonical.href;
            document.head.appendChild(newCanonical);
            updatedCount++;
            this.logger?.info('Updated canonical URL', {
              canonicalUrl: sourceCanonical.href,
            });
          }
          continue;
        }

        // Handle meta tags
        for (const sourceElement of sourceElements) {
          if (sourceElement.tagName.toLowerCase() === 'meta') {
            this._updateMetaTag(sourceElement);
            updatedCount++;
          } else if (sourceElement.tagName.toLowerCase() === 'link') {
            this._updateLinkTag(sourceElement);
            updatedCount++;
          }
        }
      }

      // Emit head update event
      this.eventBus.emit('page:head-updated', {
        updatedElements: updatedCount,
        newTitle: document.title,
      });

      this.logger?.info(`Updated ${updatedCount} head elements`);
    } catch (error) {
      this.logger?.error('Failed to update document head', { error });
      this.eventBus.emit('page:head-update-error', { error });
    } finally {
      this.logger?.groupEnd();
    }
  }

  /**
   * Update or create a meta tag
   */
  _updateMetaTag(sourceMetaTag) {
    const name = sourceMetaTag.getAttribute('name');
    const property = sourceMetaTag.getAttribute('property');
    const content = sourceMetaTag.getAttribute('content');

    if (!content) return; // Skip empty content

    let selector;
    if (name) {
      selector = `meta[name="${name}"]`;
    } else if (property) {
      selector = `meta[property="${property}"]`;
    } else {
      return; // Can't identify the meta tag
    }

    // Remove existing meta tag(s) with same name/property
    document.querySelectorAll(selector).forEach(el => el.remove());

    // Create new meta tag
    const newMeta = document.createElement('meta');
    if (name) newMeta.setAttribute('name', name);
    if (property) newMeta.setAttribute('property', property);
    newMeta.setAttribute('content', content);

    // Copy other relevant attributes
    ['charset', 'http-equiv', 'scheme'].forEach(attr => {
      if (sourceMetaTag.hasAttribute(attr)) {
        newMeta.setAttribute(attr, sourceMetaTag.getAttribute(attr));
      }
    });

    document.head.appendChild(newMeta);

    this.logger?.debug('Updated meta tag', {
      selector,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    });
  }

  /**
   * Update or create a link tag
   */
  _updateLinkTag(sourceLinkTag) {
    const rel = sourceLinkTag.getAttribute('rel');
    const href = sourceLinkTag.getAttribute('href');

    if (!rel || !href) return;

    // Don't update critical link tags
    const criticalRels = ['stylesheet', 'icon', 'manifest', 'preload', 'prefetch'];
    if (criticalRels.includes(rel)) {
      this.logger?.debug('Skipping critical link tag', { rel, href });
      return;
    }

    const selector = `link[rel="${rel}"]`;

    // For alternate links, also match hreflang if present
    const hreflang = sourceLinkTag.getAttribute('hreflang');
    const fullSelector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : selector;

    // Remove existing link(s)
    document.querySelectorAll(fullSelector).forEach(el => el.remove());

    // Create new link tag
    const newLink = document.createElement('link');
    newLink.setAttribute('rel', rel);
    newLink.setAttribute('href', href);

    // Copy other relevant attributes
    ['hreflang', 'type', 'media', 'sizes'].forEach(attr => {
      if (sourceLinkTag.hasAttribute(attr)) {
        newLink.setAttribute(attr, sourceLinkTag.getAttribute(attr));
      }
    });

    document.head.appendChild(newLink);

    this.logger?.debug('Updated link tag', { rel, href });
  }

  /**
   * Copy relevant attributes from source fragment to target fragment
   */
  _copyFragmentAttributes(sourceFragment, targetFragment) {
    // Attributes to copy (excluding core structural ones)
    const attributesToCopy = [
      'data-state',
      'data-loading',
      'data-error',
      'data-version',
      'aria-live',
      'aria-label',
      'aria-describedby',
    ];

    attributesToCopy.forEach(attr => {
      if (sourceFragment.hasAttribute(attr)) {
        targetFragment.setAttribute(attr, sourceFragment.getAttribute(attr));
      } else {
        targetFragment.removeAttribute(attr);
      }
    });

    // Copy CSS classes if source has any (but preserve existing target classes that might be needed)
    if (sourceFragment.className) {
      // Keep important target classes like component mount states
      const preserveClasses = Array.from(targetFragment.classList).filter(
        cls => cls.startsWith('component-') || cls.startsWith('router-') || cls.startsWith('page-')
      );

      targetFragment.className = sourceFragment.className;
      preserveClasses.forEach(cls => targetFragment.classList.add(cls));
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
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
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

    this.observer = new MutationObserver(mutations => {
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
      attributeFilter: ['data-component', 'data-lazy-component'],
    });

    this.logger?.info('DOM observer started', { root: this.containerSelector });
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
            node
              .querySelectorAll('[data-component], [data-lazy-component]')
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
        trigger: 'mutation',
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
      trigger = 'initial',
      fragmentTarget = null, // New option to track which fragment is being mounted
    } = options;

    const startTime = this.options.trackPerformance ? performance.now() : 0;

    this.logger?.group('Mounting components', {
      priority,
      trigger,
      fragmentTarget,
      addedNodesCount: addedNodes?.length || 0,
      rootSelector:
        root.tagName +
        (root.id ? '#' + root.id : '') +
        (root.className ? '.' + root.className.split(' ')[0] : ''),
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
          this._mountComponentConfig(config, root, addedNodes, fragmentTarget);
        } catch (error) {
          this.logger?.error(`Failed to mount component ${config.name}`, { error, config });
          this.eventBus.emit('page:component-mount-error', {
            componentName: config.name,
            error,
            config,
            fragmentTarget,
          });
        }
      }

      // Update performance metrics
      if (this.options.trackPerformance) {
        const duration = performance.now() - startTime;
        this.performanceMetrics.totalMountTime += duration;
        this.performanceMetrics.averageMountTime =
          this.performanceMetrics.totalMountTime /
          Math.max(1, this.performanceMetrics.fragmentReplacements);
      }
    } finally {
      this.logger?.groupEnd();
    }
  }

  /**
   * Enhanced component mounting with fragment awareness
   */
  _mountComponentConfig(config, root, addedNodes, fragmentTarget) {
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

        // Track which fragment this component belongs to
        if (fragmentTarget) {
          element.setAttribute('data-fragment-target', fragmentTarget);
        }

        mountedCount++;

        this.eventBus.emit('page:component-mounted', {
          componentName: config.name,
          element,
          instance,
          fragmentTarget,
        });
      } catch (error) {
        this.logger?.error(`Failed to mount ${config.name} on element`, { error, element });
      }
    }

    if (mountedCount > 0) {
      this.performanceMetrics.componentMounts += mountedCount;
      this.logger?.info(`Mounted ${mountedCount} instances of ${config.name}`, {
        fragmentTarget,
      });
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
              element.removeAttribute('data-fragment-target');
              unmountedCount++;

              this.eventBus.emit('page:component-unmounted', {
                componentName,
                element,
                instance,
              });
            } catch (error) {
              this.logger?.error(`Failed to unmount ${componentName}`, { error, element });
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
              reason: 'removed',
            });
          } catch (error) {
            this.logger?.error(`Failed to unmount removed ${componentName}`, { error, element });
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
      this._trackComponentLoad(config.name);
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
      element => queue.push(['mount', element]),
      element => queue.push(['unmount', element])
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
            this.logger?.error(`Dequeued ${config.name}.${action} failed`, { error, element });
            // Add error state for failed mounts
            if (action === 'mount') {
              element.classList.remove('component-loading');
              element.classList.add('component-error');
              element.setAttribute('data-component-state', 'error');
            }
          }
        }

        this.instances.set(config.name, realInstance);
        this._trackComponentLoad(config.name);
        this.loadingPromises.delete(config.name);
        this.retryCount.delete(config.name);

        this.eventBus.emit('page:component-loaded', {
          componentName: config.name,
          instance: realInstance,
          queueSize: queue.length,
        });

        this.logger?.info(`Component ${config.name} loaded successfully`, {
          queuedOperations: queue.length,
        });
      })
      .catch(error => {
        this.logger?.error(`Failed to load component ${config.name}`, { error });

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
            this.logger?.info(
              `Retrying component load: ${config.name} (attempt ${currentRetries + 1})`
            );

            setTimeout(
              () => {
                this._handleAsyncLoading(config, config.loader());
              },
              Math.pow(2, currentRetries) * 1000
            ); // Exponential backoff
            return;
          }
        }

        this.instances.delete(config.name);
        this.loadingPromises.delete(config.name);

        this.eventBus.emit('page:component-load-error', {
          componentName: config.name,
          error,
          retries: this.retryCount.get(config.name) || 0,
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
        throw new Error(
          `No valid constructor found in module for component ${config.name}. Available exports: ${Object.keys(moduleOrClass || {}).join(', ')}`
        );
      }
    }

    this.logger?.info(`Creating instance of ${config.name}`, {
      ComponentClass: ComponentClass.name,
      config,
    });

    try {
      // Try the standard framework pattern first (with DI)
      const instance = new ComponentClass({
        eventBus: this.eventBus,
        logger: this.logger,
        router: this.router,
        config,
      });

      this.logger?.info(`Created ${config.name} with DI pattern`, { config });
      return instance;
    } catch (error) {
      this.logger?.warn(`DI constructor failed for ${config.name}, trying fallback patterns`, {
        error,
      });

      try {
        // Try no-args constructor (for components that don't use DI)
        const fallbackInstance = new ComponentClass();
        this.logger?.info(`Created ${config.name} with no-args constructor`, { config });

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
          ComponentClass: ComponentClass.name,
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

    this.logger?.info(`Lazy loading component: ${componentName}`, { element });

    const instance = this._ensureInstance(config);
    instance.mount(element);
  }

  /**
   * Initial component mounting
   */
  _initialMount() {
    try {
      const container = this.container;
      this.mountAllWithin(container, { trigger: 'initial' });

      // Start observer after initial mount
      this._startObserver(container);
    } catch (error) {
      this.logger?.error('Initial component mounting failed', { error });
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
        timeoutId = setTimeout(
          () => {
            func.apply(this, args);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime)
        );
      }
    };
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
    return new Map(this.instances);
  }

  /**
   * Get loading status
   */
  getLoadingStatus() {
    return {
      loading: Array.from(this.loadingPromises.keys()),
      retries: Object.fromEntries(this.retryCount),
    };
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
      loadingStatus.retries[comp.name] > 0;

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
    if (this._componentPool) {
      for (const [componentName, pool] of this._componentPool) {
        for (const instance of pool) {
          if (typeof instance.destroy === 'function') {
            try {
              instance.destroy();
            } catch (error) {
              this.logger?.warn(`Error destroying pooled instance of ${componentName}`, { error });
            }
          }
        }
      }
      this._componentPool.clear();
    }

    // Clear all tracking data
    this.instances.clear();
    this.loadingPromises.clear();
    this.retryCount.clear();
    if (this._mountedElements) this._mountedElements.clear();
    if (this._errorCounts) this._errorCounts.clear();
    if (this._circuitBreakers) this._circuitBreakers.clear();

    // Remove event listeners
    this.eventBus.off('router:navigate-success');
    this.eventBus.off('router:popstate');
    this.eventBus.off('component:lazy-load');

    this.eventBus.emit('page-manager:destroyed', {});

    this.logger?.info('PageManager destroyed');
  }
}

/**
 * Parallelogram - Main framework class
 * Provides a simplified, unified API for initializing the framework with sane defaults
 *
 * @example
 * // Minimal setup - run() handles async/defer scripts automatically
 * import { Parallelogram } from '@parallelogram-js/core';
 *
 * const app = Parallelogram.create();
 *
 * app.components
 *   .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
 *   .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));
 *
 * app.run(); // Smart initialization - works with async/defer scripts
 *
 * @example
 * // Full configuration
 * const app = Parallelogram.create({
 *   mode: 'development',
 *   debug: true,
 *   router: {
 *     timeout: 10000,
 *     loadingClass: 'router-loading'
 *   },
 *   pageManager: {
 *     containerSelector: '[data-view="main"]',
 *     targetGroups: {
 *       'main': ['navbar', 'main']
 *     }
 *   }
 * });
 */


class Parallelogram {
  /**
   * Create a new Parallelogram instance
   * @param {Object} config - Configuration options
   * @param {string} [config.mode='production'] - Framework mode ('development' or 'production')
   * @param {boolean} [config.debug=false] - Enable debug logging
   * @param {Object} [config.router] - Router configuration (enables router if provided)
   * @param {Object} [config.pageManager] - PageManager configuration
   * @returns {Parallelogram}
   */
  static create(config = {}) {
    return new Parallelogram(config);
  }

  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'production',
      debug: config.debug || false,
      router: config.router || null,
      pageManager: config.pageManager || {},
    };

    // Core instances (will be initialized in init())
    this.logger = null;
    this.eventBus = null;
    this.router = null;
    this.pageManager = null;
    this.componentRegistry = null;
    this.webComponentLoader = null;

    // Component registration helper
    this.components = new ComponentRegistrationHelper(this);

    // Track initialization state
    this._initialized = false;
  }

  /**
   * Smart initialization - runs immediately if DOM ready, otherwise waits
   * Handles async/defer script loading correctly
   * @returns {Promise<Parallelogram>}
   */
  run() {
    // Check if DOM is already ready
    if (
      document.readyState === 'complete' ||
      document.readyState === 'interactive'
    ) {
      // DOM is ready, initialize immediately
      this.init();
      return Promise.resolve(this);
    }

    // DOM not ready yet, wait for DOMContentLoaded
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', () => {
        this.init();
        resolve(this);
      });
    });
  }

  /**
   * Initialize the framework
   * Sets up all managers and starts component loading
   * Note: Use run() instead if you're unsure about DOM ready state
   */
  init() {
    if (this._initialized) {
      console.warn('[Parallelogram] Already initialized');
      return this;
    }

    // Create logger
    this.logger = new DevLogger({}, this.config.debug);
    this.logger?.info('Parallelogram initializing', {
      mode: this.config.mode,
      debug: this.config.debug,
      routerEnabled: !!this.config.router,
    });

    // Create event bus
    this.eventBus = new EventManager();

    // Create component registry for enhancement components
    const registry = ComponentRegistry.create(this.config.mode);
    this.components._configs.enhancementComponents.forEach(
      ({ name, selector, options }) => {
        registry.component(name, selector, options);
      }
    );
    this.componentRegistry = registry.build();

    // Create router if configured
    if (this.config.router) {
      this.router = new RouterManager({
        eventBus: this.eventBus,
        logger: this.logger,
        options: this.config.router,
      });
    }

    // Create page manager
    const pageManagerConfig = {
      containerSelector: this.config.pageManager.containerSelector || 'body',
      registry: this.componentRegistry,
      eventBus: this.eventBus,
      logger: this.logger,
      router: this.router,
      options: this.config.pageManager,
    };
    this.pageManager = new PageManager(pageManagerConfig);

    // Create web component loader
    const webComponentMap = {};
    this.components._configs.webComponents.forEach(({ name, loader }) => {
      webComponentMap[name] = loader;
    });

    this.webComponentLoader = new WebComponentLoader(webComponentMap, {
      observeDOM: true, // Watch for dynamically added web components
      onLoad: tagName => {
        this.logger?.info(`Web component loaded: ${tagName}`);
      },
      onError: (tagName, error) => {
        this.logger?.error(`Failed to load web component: ${tagName}`, error);
      },
    });

    // Initialize web component loader
    this.webComponentLoader.init();

    // Mount all enhancement components in the initial page
    this.pageManager.mountAllWithin(document.body, {
      trigger: 'initial-global',
    });

    this._initialized = true;
    this.logger?.info('Parallelogram initialized successfully');

    return this;
  }

  /**
   * Destroy the framework and clean up resources
   */
  destroy() {
    if (!this._initialized) {
      return;
    }

    this.logger?.info('Parallelogram destroying');

    // Clean up web component loader
    if (this.webComponentLoader) {
      this.webComponentLoader.destroy();
    }

    // Clean up page manager
    if (this.pageManager) {
      this.pageManager.destroy?.();
    }

    // Clean up router
    if (this.router) {
      this.router.destroy?.();
    }

    // Clear event bus
    if (this.eventBus) {
      this.eventBus.clear();
    }

    this._initialized = false;
  }

  /**
   * Check if framework is initialized
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }
}

/**
 * ComponentRegistrationHelper - Fluent API for registering components
 * Automatically detects web components vs enhancement components
 */
class ComponentRegistrationHelper {
  constructor(parallelogram) {
    this.parallelogram = parallelogram;
    this._configs = {
      webComponents: [],
      enhancementComponents: [],
    };
  }

  /**
   * Add a component (auto-detects type based on selector pattern)
   * @param {string} nameOrSelector - Component name (web component) or selector (enhancement)
   * @param {Function|Object} loaderOrOptions - Loader function or options object
   * @param {Object} [options] - Additional options (only for enhancement components)
   * @returns {ComponentRegistrationHelper}
   *
   * @example
   * // Web component (tag name + loader)
   * .add('p-modal', () => import('./PModal'))
   *
   * @example
   * // Enhancement component (selector + loader)
   * .add('[data-toggle]', () => import('./Toggle'))
   *
   * @example
   * // Enhancement component with options
   * .add('[data-toggle]', {
   *   loader: () => import('./Toggle'),
   *   priority: 'critical'
   * })
   */
  add(nameOrSelector, loaderOrOptions, options = {}) {
    const isWebComponent = this._detectWebComponent(nameOrSelector);

    if (isWebComponent) {
      // Web component: nameOrSelector is tag name, loaderOrOptions is loader function
      this._configs.webComponents.push({
        name: nameOrSelector,
        loader: loaderOrOptions,
      });
    } else {
      // Enhancement component: nameOrSelector is selector
      const loader =
        typeof loaderOrOptions === 'function'
          ? loaderOrOptions
          : loaderOrOptions.loader;
      const componentOptions =
        typeof loaderOrOptions === 'function'
          ? options
          : { ...loaderOrOptions, ...options };

      this._configs.enhancementComponents.push({
        name: this._generateComponentName(nameOrSelector),
        selector: nameOrSelector,
        options: {
          ...componentOptions,
          loader,
        },
      });
    }

    return this; // Chainable
  }

  /**
   * Detect if a selector is a web component (custom element tag)
   * @private
   */
  _detectWebComponent(nameOrSelector) {
    // Web components are simple tag names (no special selector characters)
    // Enhancement components have [, ., #, :, or space
    return !/[\[\.\#\:\s]/.test(nameOrSelector);
  }

  /**
   * Generate a component name from a selector
   * @private
   */
  _generateComponentName(selector) {
    // Extract meaningful name from selector
    // [data-toggle] -> toggle
    // .lightbox -> lightbox
    // #main-nav -> main-nav
    const match = selector.match(/data-([a-z-]+)|[\.\#]([a-z-]+)/i);
    if (match) {
      return match[1] || match[2];
    }
    // Fallback: sanitize the selector
    return selector.replace(/[^a-z0-9-]/gi, '');
  }
}

export { Parallelogram, Parallelogram as default };
