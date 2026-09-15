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

/**
 * @typedef {Object} ParallelogramConfig
 * @property {'development'|'production'} [mode='production'] - Framework mode
 * @property {boolean} [debug=false] - Enable debug/log/info/group output. The package's default
 *   build leaves out the framework's own debug output, so it only appears when the bundler resolves
 *   the `development` export condition (Vite does during development; esbuild needs
 *   `--conditions=development`).
 * @property {boolean} [silent=false] - Suppress ALL logger output, including warn and error. Use in
 *   production when console pollution is unacceptable. Overrides `debug`.
 * @property {import('../managers/RouterManager.js').RouterOptions} [router] - Router options; the
 *   router is only created when they are given
 * @property {import('../managers/PageManager.js').PageManagerOptions & { containerSelector?: string }} [pageManager] -
 *   PageManager options, and the selector of the element whose fragments it manages (the body by
 *   default)
 */

/**
 * Returns a component's module or class, usually with a dynamic `import()`
 *
 * @typedef {() => (object | Promise<object>)} ComponentLoader
 */

/**
 * @typedef {Object} ComponentOptions
 * @property {string} [name] - The name `dependsOn` refers to; the selector by default
 * @property {ComponentLoader} [loader] - Loads the component, when it isn't the second argument
 * @property {'critical'|'normal'} [priority='normal'] - Critical components mount first
 * @property {string[]} [dependsOn] - Names of components that must load first
 * @property {string} [exportName] - The named export to use when the module has no default export
 */

export class Parallelogram {
  /**
   * Create a new Parallelogram instance
   * @param {ParallelogramConfig} [config] - Configuration options
   * @returns {Parallelogram}
   */
  static create(config = {}) {
    return new Parallelogram(config);
  }

  /**
   * @param {ParallelogramConfig} [config] - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'production',
      debug: config.debug || false,
      silent: config.silent || false,
      router: config.router || null,
      pageManager: config.pageManager || {},
    };

    // Core instances (will be initialized in init())
    this.logger = null;
    this.eventBus = null;
    this.router = null;
    this.pageManager = null;
    /** @type {import('./ComponentHost.js').RegistryEntry[] | null} */
    this.componentRegistry = null;
    this.webComponentLoader = null;

    // Component registration helper
    this.components = new ComponentRegistrationHelper(this);

    /** @internal */
    this._initialized = false;
  }

  /**
   * Smart initialization - runs immediately if DOM ready, otherwise waits
   * Handles async/defer script loading correctly
   * @returns {Promise<Parallelogram>}
   */
  run() {
    // Check if DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
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
   * @returns {Parallelogram}
   */
  init() {
    if (this._initialized) {
      this.logger?.warn('Parallelogram is already initialized');
      return this;
    }

    // Create logger
    this.logger = new DevLogger('parallelogram', this.config.debug, this.config.silent);
    this.logger?.info('Parallelogram initializing', {
      mode: this.config.mode,
      debug: this.config.debug,
      routerEnabled: !!this.config.router,
    });

    // Create event bus
    this.eventBus = new EventManager({ logger: this.logger });

    // Create component registry for enhancement components
    const registry = ComponentRegistry.create(this.config.mode);
    this.components._configs.enhancementComponents.forEach(({ name, selector, options }) => {
      registry.component(name, selector, options);
    });
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
      options: { observeRoot: document.body, ...this.config.pageManager },
    };
    this.pageManager = new PageManager(pageManagerConfig);

    // Create web component loader
    const webComponentMap = {};
    this.components._configs.webComponents.forEach(({ name, loader }) => {
      webComponentMap[name] = loader;
    });

    this.webComponentLoader = new WebComponentLoader(webComponentMap, {
      observeDOM: true, // Watch for dynamically added web components
      logger: this.logger,
      onLoad: tagName => {
        this.logger?.info(`Web component loaded: ${tagName}`);
      },
      onError: (tagName, error) => {
        this.logger?.error(`Failed to load web component: ${tagName}`, error);
      },
    });

    // Initialize web component loader
    this.webComponentLoader.init();

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
   * Register an enhancement component added after init()
   * @internal
   */
  _registerLateComponent({ name, selector, options }) {
    if (!this._initialized) return;

    const entry = {
      name,
      selector,
      priority: options.priority,
      dependsOn: options.dependsOn,
      exportName: options.exportName,
      loader: options.loader,
    };
    this.componentRegistry.push(entry);
    this.pageManager.host.add(entry);
  }

  /**
   * Register a web component added after init()
   * @internal
   */
  _registerLateWebComponent(tagName, loader) {
    if (!this._initialized) return;

    this.webComponentLoader.register(tagName, loader);
    this.webComponentLoader.scanAndLoad();
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
  /**
   * @param {Parallelogram} parallelogram
   */
  constructor(parallelogram) {
    /** @internal */
    this.parallelogram = parallelogram;
    /** @internal */
    this._configs = {
      webComponents: [],
      enhancementComponents: [],
    };
  }

  /**
   * Add a component (auto-detects type based on selector pattern)
   *
   * Custom element tag names (containing a hyphen, such as `p-modal`) are lazy-loaded
   * web components; anything else is an enhancement component selector. An
   * enhancement component is named by its `name` option, or otherwise by its selector,
   * and `dependsOn` refers to those names. Components added after `run()` are mounted
   * straight away.
   *
   * @param {string} nameOrSelector - Custom element tag name, or selector for an enhancement
   * @param {ComponentLoader|ComponentOptions} loaderOrOptions - Loader function or options object
   * @param {ComponentOptions} [options] - Additional options (only for enhancement components)
   * @returns {ComponentRegistrationHelper}
   * @throws {Error} If an enhancement component with the same name is already registered.
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
   *   name: 'toggle',
   *   loader: () => import('./Toggle'),
   *   priority: 'critical'
   * })
   */
  add(nameOrSelector, loaderOrOptions, options = {}) {
    if (this._detectWebComponent(nameOrSelector)) {
      const loader =
        typeof loaderOrOptions === 'function' ? loaderOrOptions : loaderOrOptions?.loader;
      this._configs.webComponents.push({ name: nameOrSelector, loader });
      this.parallelogram._registerLateWebComponent(nameOrSelector, loader);
      return this;
    }

    const loader = typeof loaderOrOptions === 'function' ? loaderOrOptions : loaderOrOptions.loader;
    const componentOptions =
      typeof loaderOrOptions === 'function' ? options : { ...loaderOrOptions, ...options };
    const name = componentOptions.name ?? nameOrSelector;

    if (this._configs.enhancementComponents.some(config => config.name === name)) {
      throw new Error(`A component named "${name}" is already registered`);
    }

    const config = {
      name,
      selector: nameOrSelector,
      options: { ...componentOptions, loader },
    };
    this._configs.enhancementComponents.push(config);
    this.parallelogram._registerLateComponent(config);

    return this;
  }

  /**
   * Whether a string is a valid custom element name (lowercase, starting with a letter,
   * containing a hyphen)
   * @internal
   */
  _detectWebComponent(nameOrSelector) {
    return /^[a-z][a-z0-9._]*-[a-z0-9._-]*$/.test(nameOrSelector);
  }
}

export default Parallelogram;
