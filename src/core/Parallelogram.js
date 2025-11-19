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

import { ComponentRegistry } from './ComponentRegistry.js';
import { DevLogger } from './DevLogger.js';
import { WebComponentLoader } from './WebComponentLoader.js';
import { EventManager } from '../managers/EventManager.js';
import { RouterManager } from '../managers/RouterManager.js';
import { PageManager } from '../managers/PageManager.js';

export class Parallelogram {
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

export default Parallelogram;