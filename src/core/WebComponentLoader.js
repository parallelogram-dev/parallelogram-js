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
export class WebComponentLoader {
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

export default WebComponentLoader;