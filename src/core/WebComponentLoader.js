/**
 * WebComponentLoader - Utility for lazy-loading web components
 *
 * Automatically detects web components in the DOM and loads their
 * implementation only when needed, enabling code splitting with webpack/rollup.
 * With `observeDOM` it watches the page for components added later, and stops
 * watching once every registered component has loaded.
 *
 * @example
 * // In your application code, explicitly choose which components to lazy-load
 * import { WebComponentLoader } from '@parallelogram-js/core';
 *
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@parallelogram-js/core/components/PModal'),
 *   'p-select': () => import('@parallelogram-js/core/components/PSelect'),
 * });
 *
 * loader.init(); // Auto-loads components found in DOM
 *
 * @example
 * // With custom options and DOM observation
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@parallelogram-js/core/components/PModal'),
 * }, {
 *   observeDOM: true,        // Watch for dynamically added components
 *   onLoad: (tagName) => console.log(`Loaded ${tagName}`),
 * });
 *
 * @example
 * // Eager load on user interaction instead of DOM presence
 * const loader = new WebComponentLoader({
 *   'p-modal': () => import('@parallelogram-js/core/components/PModal'),
 * }, {
 *   eager: false  // Don't auto-scan on init
 * });
 *
 * // Load when user clicks a trigger
 * document.querySelector('[data-modal-trigger]').addEventListener('click', () => {
 *   loader.loadComponent('p-modal');
 * });
 */
export class WebComponentLoader {
  /**
   * Create a new WebComponentLoader instance
   * @param {Object} componentMap - Map of tag names to dynamic import functions
   *   Each value should be a function that returns a dynamic import promise
   *   Example: { 'p-modal': () => import('@parallelogram-js/core/components/PModal') }
   * @param {Object} options - Configuration options
   * @param {boolean} [options.eager=true] - Auto-scan DOM on init
   * @param {boolean} [options.observeDOM=false] - Watch for dynamically added components
   * @param {Element} [options.rootElement=document.documentElement] - Root element to observe
   * @param {Function} [options.onLoad] - Callback when component is loaded (receives tagName)
   * @param {Function} [options.onError] - Callback when component fails to load (receives tagName, error)
   * @param {Object} [options.logger] - Receives warnings and errors; the console is used otherwise
   */
  constructor(componentMap = {}, options = {}) {
    this.componentMap = componentMap;
    this.options = {
      eager: options.eager ?? true,
      observeDOM: options.observeDOM ?? false,
      rootElement: options.rootElement ?? document.documentElement,
      onLoad: options.onLoad ?? null,
      onError: options.onError ?? null,
      logger: options.logger ?? null,
    };

    this.loadedComponents = new Set();
    this.loadingComponents = new Map();
    this.observer = null;
    this._initialized = false;
    this._destroyed = false;
  }

  /**
   * Initialize the loader - scans DOM and optionally sets up observer
   */
  init() {
    this._initialized = true;

    if (this.options.eager) {
      this.scanAndLoad();
    }
    if (this.options.observeDOM) {
      this.startObserving();
    }
  }

  /**
   * Scan the DOM for web components and load them
   * @param {Element} [root] - Root element to scan (defaults to configured root)
   */
  scanAndLoad(root = this.options.rootElement) {
    for (const tagName of this._pendingTags()) {
      if (root.querySelector(tagName)) {
        this.loadComponent(tagName);
      }
    }
  }

  /**
   * Load a specific component by tag name
   *
   * A loader whose module doesn't define the element counts as a failure.
   *
   * @param {string} tagName - The custom element tag name
   * @returns {Promise<void>}
   */
  async loadComponent(tagName) {
    if (this.loadedComponents.has(tagName)) {
      return;
    }
    if (this.loadingComponents.has(tagName)) {
      return this.loadingComponents.get(tagName);
    }

    const loader = this.componentMap[tagName];
    if (!loader) {
      this._report('warn', `No loader defined for component: ${tagName}`);
      return;
    }

    const loading = new Promise(resolve => resolve(loader()))
      .then(() => {
        if (!customElements.get(tagName)) {
          throw new Error(`Loading ${tagName} did not define the element`);
        }
      })
      .then(
        () => {
          if (this._destroyed) return;
          this.loadingComponents.delete(tagName);
          this.loadedComponents.add(tagName);
          this.options.onLoad?.(tagName);
          this._stopWhenDone();
        },
        error => {
          if (this._destroyed) return;
          this.loadingComponents.delete(tagName);
          if (this.options.onError) {
            this.options.onError(tagName, error);
          } else {
            this._report('error', `Failed to load component: ${tagName}`, error);
          }
        }
      );

    this.loadingComponents.set(tagName, loading);
    return loading;
  }

  /**
   * Start observing DOM for new components, unless every registered component has loaded
   */
  startObserving() {
    if (this.observer || this._destroyed || this._pendingTags().length === 0) {
      return;
    }

    this.observer = new MutationObserver(records => this._onMutations(records));
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
    if (!this._initialized || this._destroyed) return;

    if (this.options.eager && this.options.rootElement.querySelector(tagName)) {
      this.loadComponent(tagName);
    }
    if (this.options.observeDOM) {
      this.startObserving();
    }
  }

  /**
   * Unregister a component loader
   * @param {string} tagName - The custom element tag name
   */
  unregister(tagName) {
    delete this.componentMap[tagName];
    this._stopWhenDone();
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
   * Destroy the loader and clean up; components still loading are then ignored
   */
  destroy() {
    this._destroyed = true;
    this.stopObserving();
    this.loadedComponents.clear();
    this.loadingComponents.clear();
  }

  _pendingTags() {
    return Object.keys(this.componentMap).filter(tagName => !this.loadedComponents.has(tagName));
  }

  _stopWhenDone() {
    if (this._pendingTags().length === 0) {
      this.stopObserving();
    }
  }

  /**
   * Load the components in added elements, checking each element once against every tag not yet
   * loaded or loading
   */
  _onMutations(records) {
    const pending = this._pendingTags().filter(tagName => !this.loadingComponents.has(tagName));
    if (pending.length === 0) return;

    const selector = pending.join(',');
    const found = new Set();
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(selector)) {
          found.add(node.localName);
        }
        for (const match of node.querySelectorAll(selector)) {
          found.add(match.localName);
        }
      }
    }

    found.forEach(tagName => this.loadComponent(tagName));
  }

  _report(level, message, ...details) {
    const { logger } = this.options;
    if (logger) {
      logger[level]?.(message, ...details);
    } else {
      console[level](`[WebComponentLoader] ${message}`, ...details);
    }
  }
}

export default WebComponentLoader;
