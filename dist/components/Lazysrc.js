/**
 * ComponentRegistry - Core utility for building component registries
 * Provides a fluent API for defining component loader configurations
 * with sensible defaults and path conventions.
 */

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
 * Lazysrc Component - Standalone lazy loading without external dependencies
 * Supports img, picture elements, and background images with automatic parent detection
 *
 * @example
 * HTML:
 * <!-- Basic lazy image with semantic markup -->
 * <figure>
 *   <img data-lazysrc data-lazysrc-src="image.jpg" alt="Description">
 *   <figcaption>Image caption</figcaption>
 * </figure>
 *
 * <!-- Responsive lazy image with srcset -->
 * <figure>
 *   <img data-lazysrc
 *        src="placeholder.jpg"
 *        data-lazysrc-src="image.jpg"
 *        data-lazysrc-srcset="image-320.jpg 320w, image-640.jpg 640w, image-1280.jpg 1280w"
 *        data-lazysrc-sizes="(max-width: 320px) 280px, (max-width: 640px) 600px, 1200px"
 *        alt="Description">
 *   <figcaption>Responsive image caption</figcaption>
 * </figure>
 *
 * <!-- Native HTML with progressive enhancement -->
 * <figure>
 *   <img data-lazysrc
 *        src="image.jpg"
 *        srcset="image-320.jpg 320w, image-640.jpg 640w"
 *        sizes="(max-width: 640px) 600px, 1200px"
 *        alt="Description">
 *   <figcaption>Progressive enhancement example</figcaption>
 * </figure>
 *
 * <!-- Picture element with sources (data-lazysrc on img, not picture) -->
 * <picture>
 *   <source data-lazysrc-srcset="image.webp" type="image/webp">
 *   <source data-lazysrc-srcset="image.jpg" type="image/jpeg">
 *   <img data-lazysrc data-lazysrc-src="image.jpg" alt="Description">
 * </picture>
 *
 * <!-- Picture with responsive images (srcset + sizes) -->
 * <picture>
 *   <source
 *     data-lazysrc-srcset="image-320.webp 320w, image-1280.webp 1280w"
 *     data-lazysrc-sizes="(max-width: 640px) 320px, 1280px"
 *     type="image/webp">
 *   <source
 *     data-lazysrc-srcset="image-320.jpg 320w, image-1280.jpg 1280w"
 *     data-lazysrc-sizes="(max-width: 640px) 320px, 1280px"
 *     type="image/jpeg">
 *   <img data-lazysrc data-lazysrc-src="image-1280.jpg" alt="Description">
 * </picture>
 *
 * <!-- Background image -->
 * <div data-lazysrc data-lazysrc-bg="background.jpg"></div>
 *
 * <!-- Custom threshold and classes -->
 * <img data-lazysrc
 *      data-lazysrc-src="image.jpg"
 *      data-lazysrc-threshold="0.2"
 *      data-lazysrc-loading-class="custom-loading"
 *      data-lazysrc-loaded-class="custom-loaded"
 *      alt="Description">
 */
class Lazysrc extends BaseComponent {
  static get defaults() {
    return {
      threshold: 0.1,
      rootMargin: '50px',
      loadingClass: 'loading',
      loadedClass: 'loaded',
      errorClass: 'error',
      fadeInDuration: 300,
      retryAttempts: 3,
      retryDelay: 1000,
      useNativeLoading: false, // Use native loading="lazy" when available
    };
  }

  constructor(options = {}) {
    super(options);

    // Create intersection observer
    this._createObserver();

    // Track loading attempts for retry logic
    this.loadingAttempts = new Map();
  }

  /**
   * Create intersection observer for lazy loading
   * @private
   */
  _createObserver() {
    const observerOptions = {
      root: null,
      rootMargin: Lazysrc.defaults.rootMargin,
      threshold: Lazysrc.defaults.threshold,
    };

    this.observer = new IntersectionObserver(this._handleIntersection.bind(this), observerOptions);

    this.logger?.info('Lazysrc intersection observer created', observerOptions);
  }

  async _init(element) {
    const state = super._init(element);

    // Get configuration for this element
    const config = this._getConfiguration(element);

    // Store state
    state.config = config;
    state.isLoaded = false;
    state.isLoading = false;
    state.hasError = false;

    /* Detect if this element is inside a <picture> element */
    if (this._isImage(element) && element.parentElement?.tagName === 'PICTURE') {
      state.pictureParent = element.parentElement;
    }

    // Check if we should use native lazy loading
    if (
      (config.useNativeLoading || element.hasAttribute('loading')) &&
      this._supportsNativeLoading() &&
      this._isImage(element)
    ) {
      this._setupNativeLoading(element, state);
    } else {
      // Use intersection observer
      this._setupIntersectionLoading(element, state);
    }

    // Listen for force load events (e.g., from Lightbox component)
    const forceLoadHandler = async (event) => {
      const statePromise = this.getState(element);
      const state = statePromise instanceof Promise ? await statePromise : statePromise;

      // Only force load if element hasn't been loaded yet and has valid state
      if (state && !state.isLoaded && !state.isLoading) {
        await this._loadElement(element, state);
      }
      // If state.isLoaded is true or state doesn't exist, silently ignore
    };
    element.addEventListener('lazysrc:forceLoad', forceLoadHandler);

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this.observer.unobserve(element);
      this.loadingAttempts.delete(element);
      element.removeEventListener('lazysrc:forceLoad', forceLoadHandler);
      originalCleanup();
    };

    // Emit via custom event instead of eventBus
    this._dispatch(element, 'lazysrc:mounted', {
      element,
      config,
      timestamp: performance.now(),
    });

    this.logger?.info('Lazysrc initialized', {
      element,
      threshold: config.threshold,
      useNative: config.useNativeLoading,
    });

    return state;
  }

  /**
   * Get configuration from data attributes
   * @private
   * @param {HTMLElement} element - Element to configure
   * @returns {Object} Configuration object
   */
  _getConfiguration(element) {
    const config = { ...Lazysrc.defaults };

    // Threshold
    if (element.dataset.lazysrcThreshold) {
      config.threshold = parseFloat(element.dataset.lazysrcThreshold);
    }

    // Root margin
    if (element.dataset.lazysrcRootMargin) {
      config.rootMargin = element.dataset.lazysrcRootMargin;
    }

    // CSS Classes
    if (element.dataset.lazysrcLoadingClass) {
      config.loadingClass = element.dataset.lazysrcLoadingClass;
    }
    if (element.dataset.lazysrcLoadedClass) {
      config.loadedClass = element.dataset.lazysrcLoadedClass;
    }
    if (element.dataset.lazysrcErrorClass) {
      config.errorClass = element.dataset.lazysrcErrorClass;
    }

    // Animation
    if (element.dataset.lazysrcFadeDuration) {
      config.fadeInDuration = parseInt(element.dataset.lazysrcFadeDuration, 10);
    }

    // Retry logic
    if (element.dataset.lazysrcRetryAttempts) {
      config.retryAttempts = parseInt(element.dataset.lazysrcRetryAttempts, 10);
    }
    if (element.dataset.lazysrcRetryDelay) {
      config.retryDelay = parseInt(element.dataset.lazysrcRetryDelay, 10);
    }

    // Native loading
    if (element.dataset.lazysrcUseNative !== undefined) {
      config.useNativeLoading = element.dataset.lazysrcUseNative !== 'false';
    }

    return config;
  }

  /**
   * Check if browser supports native lazy loading
   * @private
   * @returns {boolean}
   */
  _supportsNativeLoading() {
    return 'loading' in HTMLImageElement.prototype;
  }

  /**
   * Check if element is an image
   * @private
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  _isImage(element) {
    return element.tagName === 'IMG';
  }

  /**
   * Setup native lazy loading
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _setupNativeLoading(element, state) {
    if (this._isImage(element)) {
      // Set up native loading if not already present
      if (!element.hasAttribute('loading')) {
        element.loading = 'lazy';
      }

      // Apply the src immediately for native loading
      this._applySources(element, state);

      // Listen for load events
      element.addEventListener('load', () => {
        this._onElementLoaded(element, state);
      });

      element.addEventListener('error', () => {
        this._onElementError(element, state);
      });
    }
  }

  /**
   * Setup intersection observer loading
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _setupIntersectionLoading(element, state) {
    this.logger?.info('Setting up intersection loading for element', { element, state });

    // Store original sources and clear them to prevent immediate loading
    this._storeAndClearSources(element, state);

    // Update observer threshold if different from default
    if (
      state.config.threshold !== Lazysrc.defaults.threshold ||
      state.config.rootMargin !== Lazysrc.defaults.rootMargin
    ) {
      this.logger?.info('Creating custom observer for element', {
        threshold: state.config.threshold,
        rootMargin: state.config.rootMargin,
      });

      // Create custom observer for this element
      state.customObserver = new IntersectionObserver(this._handleIntersection.bind(this), {
        root: null,
        rootMargin: state.config.rootMargin,
        threshold: state.config.threshold,
      });
      state.customObserver.observe(element);
      this.logger?.info('Element added to custom observer', { element });
    } else {
      this.logger?.info('Adding element to default observer', { element });
      this.observer.observe(element);
      this.logger?.info('Element added to default observer', { element });
    }
  }

  /**
   * Store original sources and clear them to prevent immediate loading
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _storeAndClearSources(element, state) {
    if (element.tagName === 'IMG') {
      /* Check if this img is inside a picture element */
      const pictureParent = state.pictureParent;

      if (pictureParent) {
        /* Handle picture sources when data-lazysrc is on the img */
        const sources = pictureParent.querySelectorAll('source');
        state.originalSources = [];

        sources.forEach((source, index) => {
          if (source.srcset && !source.dataset.lazysrcSrcset) {
            state.originalSources[index] = {
              srcset: source.srcset,
              sizes: source.sizes || null,
            };
            source.removeAttribute('srcset');
          }
        });
      }

      /* Store and clear img src/srcset */
      if (element.src && !element.dataset.lazysrcSrc) {
        state.originalSrc = element.src;
        element.removeAttribute('src');
      }
      if (element.srcset && !element.dataset.lazysrcSrcset) {
        state.originalSrcset = element.srcset;
        element.removeAttribute('srcset');
      }
      if (element.sizes && !element.dataset.lazysrcSizes) {
        state.originalSizes = element.sizes;
      }
    } else if (element.tagName === 'PICTURE') {
      /* Handle picture sources when data-lazysrc is on the picture element */
      const sources = element.querySelectorAll('source');
      state.originalSources = [];

      sources.forEach((source, index) => {
        if (source.srcset && !source.dataset.lazysrcSrcset) {
          state.originalSources[index] = {
            srcset: source.srcset,
            sizes: source.sizes || null,
          };
          source.removeAttribute('srcset');
        }
      });

      /* Handle img within picture */
      const img = element.querySelector('img');
      if (img) {
        if (img.src && !img.dataset.lazysrcSrc) {
          state.originalSrc = img.src;
          img.removeAttribute('src');
        }
        if (img.srcset && !img.dataset.lazysrcSrcset) {
          state.originalSrcset = img.srcset;
          img.removeAttribute('srcset');
        }
      }
    }
  }

  /**
   * Handle intersection observer entries
   * @private
   * @param {IntersectionObserverEntry[]} entries
   */
  async _handleIntersection(entries) {
    this.logger?.info('Intersection handler called', { entriesCount: entries.length });

    for (const entry of entries) {
      this.logger?.info('Processing intersection entry', {
        isIntersecting: entry.isIntersecting,
        element: entry.target,
        intersectionRatio: entry.intersectionRatio,
      });

      if (entry.isIntersecting) {
        const element = entry.target;
        const statePromise = this.getState(element);

        // Await the state if it's a Promise
        const state = statePromise instanceof Promise ? await statePromise : statePromise;

        // Debug logging to understand state structure
        this.logger?.debug('State structure debug:', {
          wasPromise: statePromise instanceof Promise,
          hasState: !!state,
          stateKeys: state ? Object.keys(state) : null,
          hasConfig: !!state?.config,
          fullState: state,
        });

        this.logger?.info('Resolved state for intersecting element', {
          hasState: !!state,
          isLoaded: state?.isLoaded,
          isLoading: state?.isLoading,
        });

        // Fix: Access properties directly on resolved state
        if (state && !state.isLoaded && !state.isLoading) {
          this.logger?.info('Calling _loadElement for element', { element });
          await this._loadElement(element, state);
        }
      }
    }
  }

  /**
   * Load an element
   * @private
   * @param {HTMLElement} element
   * @param {Object} componentState
   */
  async _loadElement(element, componentState) {
    // Debug logging to understand the state structure
    this.logger?.debug('_loadElement called with:', {
      element,
      componentState,
      componentStateKeys: componentState ? Object.keys(componentState) : null,
      hasConfig: !!(componentState && componentState.config),
      configKeys: componentState?.config ? Object.keys(componentState.config) : null,
    });

    if (!componentState) {
      this.logger?.error('Invalid state for element', { element, componentState });
      return;
    }

    if (!componentState.config) {
      this.logger?.error('Missing config for element', {
        element,
        componentState,
        componentStateKeys: Object.keys(componentState),
      });
      return;
    }

    if (componentState.isLoading || componentState.isLoaded) return;

    componentState.isLoading = true;
    componentState.loadStartTime = performance.now(); // Track when loading started
    element.classList.add(componentState.config.loadingClass);

    // Emit via custom event
    this._dispatch(element, 'lazysrc:loading-start', {
      element,
      timestamp: performance.now(),
    });

    try {
      // Handle different element types
      if (element.dataset.lazysrcBg) {
        await this._loadBackgroundImage(element, componentState);
      } else if (element.tagName === 'PICTURE') {
        await this._loadPictureElement(element, componentState);
      } else if (this._isImage(element)) {
        await this._loadImageElement(element, componentState);
      } else {
        // Generic element with background image
        await this._loadBackgroundImage(element, componentState);
      }

      this._onElementLoaded(element, componentState);
    } catch (error) {
      this._onElementError(element, componentState, error);
    }
  }

  /**
   * Load image element
   * @private
   * @param {HTMLImageElement} element
   * @param {Object} state
   * @returns {Promise}
   */
  _loadImageElement(element, state) {
    return new Promise((resolve, reject) => {
      /* Check if this image is inside a picture element */
      if (state.pictureParent) {
        /*
         * Handle picture element with race condition prevention
         *
         * Apply sources to the actual img element, not a temporary Image object.
         * This ensures the picture element's source selection works correctly.
         *
         * IMPORTANT: Handlers are set up AFTER applying sources to prevent race conditions:
         * - Prevents infinite loops when images are cached (onload fires immediately)
         * - Ensures browser doesn't start loading before all source elements are ready
         * - Maintains correct picture element source selection order
         */
        this._applyPictureSources(state.pictureParent, state);

        /* Set up handlers AFTER applying sources */
        element.onload = () => {
          resolve();
        };

        element.onerror = () => {
          reject(new Error('Picture image failed to load'));
        };
      } else {
        /* Standard image loading */
        // Create new image for preloading
        const img = new Image();

        // Handle load success
        img.onload = () => {
          this._applySources(element, state);
          resolve();
        };

        // Handle load error
        img.onerror = () => {
          reject(new Error('Image failed to load'));
        };

        // Get src and srcset
        const src = element.dataset.lazysrcSrc || state.originalSrc;
        const srcset = element.dataset.lazysrcSrcset || state.originalSrcset;
        const sizes = element.dataset.lazysrcSizes || state.originalSizes;

        // Set srcset and sizes first (browser will choose best image)
        if (srcset) {
          img.srcset = srcset;
          if (sizes) {
            img.sizes = sizes;
          }
        }

        // Set src (either as fallback or primary)
        if (src) {
          img.src = src;
        } else if (!srcset) {
          reject(new Error('No src or srcset specified'));
          return;
        }
      }
    });
  }

  /**
   * Load picture element
   * @private
   * @param {HTMLPictureElement} element
   * @param {Object} state
   * @returns {Promise}
   */
  _loadPictureElement(element, state) {
    return new Promise((resolve, reject) => {
      const img = element.querySelector('img');
      if (!img) {
        reject(new Error('No img element found in picture'));
        return;
      }

      // Apply sources to trigger loading
      this._applyPictureSources(element, state);

      // Set up handlers AFTER applying sources to avoid infinite loop
      // (onload can fire immediately if image is cached)
      img.onload = () => {
        resolve();
      };

      img.onerror = () => {
        reject(new Error('Picture failed to load'));
      };
    });
  }

  /**
   * Load background image
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   * @returns {Promise}
   */
  _loadBackgroundImage(element, state) {
    return new Promise((resolve, reject) => {
      const bgUrl = element.dataset.lazysrcBg;
      if (!bgUrl) {
        reject(new Error('No background image URL specified'));
        return;
      }

      // Create new image for preloading
      const img = new Image();

      img.onload = () => {
        element.style.backgroundImage = `url("${bgUrl}")`;
        resolve();
      };

      img.onerror = () => {
        reject(new Error('Background image failed to load'));
      };

      img.src = bgUrl;
    });
  }

  /**
   * Apply sources to image element
   * @private
   * @param {HTMLImageElement} element
   * @param {Object} state
   */
  _applySources(element, state) {
    // Apply srcset - prefer data attribute, fall back to stored original
    if (element.dataset.lazysrcSrcset) {
      element.srcset = element.dataset.lazysrcSrcset;
    } else if (state.originalSrcset) {
      element.srcset = state.originalSrcset;
    }

    // Apply sizes - prefer data attribute, fall back to stored original
    if (element.dataset.lazysrcSizes) {
      element.sizes = element.dataset.lazysrcSizes;
    } else if (state.originalSizes) {
      element.sizes = state.originalSizes;
    }

    // Apply src - prefer data attribute, fall back to stored original
    if (element.dataset.lazysrcSrc) {
      element.src = element.dataset.lazysrcSrc;
    } else if (state.originalSrc) {
      element.src = state.originalSrc;
    }
  }

  /**
   * Apply sources to picture element
   * @private
   * @param {HTMLPictureElement} element
   * @param {Object} state
   */
  _applyPictureSources(element, state) {
    /* Handle source elements */
    const sources = element.querySelectorAll('source');
    sources.forEach((source, index) => {
      if (source.dataset.lazysrcSrcset) {
        source.srcset = source.dataset.lazysrcSrcset;
        /* Also apply data-lazysrc-sizes if present */
        if (source.dataset.lazysrcSizes) {
          source.sizes = source.dataset.lazysrcSizes;
        }
      } else if (state.originalSources && state.originalSources[index]) {
        source.srcset = state.originalSources[index].srcset;
        if (state.originalSources[index].sizes) {
          source.sizes = state.originalSources[index].sizes;
        }
      }
    });

    /* Handle img element */
    const img = element.querySelector('img');
    if (img) {
      this._applySources(img, state);
    }
  }

  /**
   * Handle successful element load
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _onElementLoaded(element, state) {
    state.isLoading = false;
    state.isLoaded = true;
    state.hasError = false;

    // Calculate load time
    const loadTime = state.loadStartTime ? performance.now() - state.loadStartTime : 0;

    element.classList.remove(state.config.loadingClass);
    element.classList.add(state.config.loadedClass);

    // Apply fade-in effect
    if (state.config.fadeInDuration > 0) {
      this._applyFadeInEffect(element, state.config.fadeInDuration);
    }

    // Stop observing this element
    this.observer.unobserve(element);
    if (state.customObserver) {
      state.customObserver.unobserve(element);
    }

    // Clear retry attempts
    this.loadingAttempts.delete(element);

    // Emit via custom event
    this._dispatch(element, 'lazysrc:loaded', {
      element,
      timestamp: performance.now(),
      loadTime: Math.round(loadTime),
    });

    this.logger?.debug('Element loaded successfully', { element, loadTime });
    
    // Auto-detach after successful load if configured
    if (state.config.autoDetach !== false) {
      setTimeout(() => {
        this._detachElement(element, state);
      }, 100);
    }
  }

  /**
   * Handle element load error
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   * @param {Error} error
   */
  _onElementError(element, state, error) {
    state.isLoading = false;
    state.hasError = true;

    element.classList.remove(state.config.loadingClass);
    element.classList.add(state.config.errorClass);

    // Retry logic
    const attempts = this.loadingAttempts.get(element) || 0;
    if (attempts < state.config.retryAttempts) {
      this.loadingAttempts.set(element, attempts + 1);

      setTimeout(
        () => {
          state.isLoading = false;
          state.hasError = false;
          element.classList.remove(state.config.errorClass);
          this._loadElement(element, state);
        },
        state.config.retryDelay * (attempts + 1)
      ); // Exponential backoff

      this.logger?.info(
        `Retrying load for element (attempt ${attempts + 1}/${state.config.retryAttempts})`,
        { element }
      );
      return;
    }

    // Emit via custom event
    this._dispatch(element, 'lazysrc:error', {
      element,
      error: error?.message || 'Load failed',
      timestamp: performance.now(),
    });

    this.logger?.warn('Element failed to load after retries', { element, error });
  }

  /**
   * Apply fade-in effect
   * @private
   * @param {HTMLElement} element
   * @param {number} duration
   */
  _applyFadeInEffect(element, duration) {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in-out`;

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';

    // Clean up after animation
    setTimeout(() => {
      element.style.transition = '';
    }, duration);
  }

  /**
   * Force load a specific element
   * @param {HTMLElement} element - Element to load
   */
  async loadElement(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;

    if (state && !state.isLoaded && !state.isLoading) {
      await this._loadElement(element, state);
    }
  }

  /**
   * Force load all lazy elements in container
   * @param {HTMLElement} [container] - Container to search within
   */
  async loadAll(container = document) {
    const elements = container.querySelectorAll('[data-lazysrc-enhanced="true"]');

    for (const element of elements) {
      const statePromise = this.getState(element);
      const state = statePromise instanceof Promise ? await statePromise : statePromise;

      if (state && !state.isLoaded && !state.isLoading) {
        await this._loadElement(element, state);
      }
    }
  }

  /**
   * Update observer for new content
   * @param {HTMLElement} [container] - Container to search for new elements
   */
  update(container = document) {
    // Find new lazy load elements that haven't been enhanced
    const newElements = container.querySelectorAll(
      '[data-lazysrc]:not([data-lazysrc-enhanced="true"])'
    );
    newElements.forEach(element => {
      this.mount(element);
    });
  }

  /**
   * Check if element is loaded
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is loaded
   */
  async isLoaded(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
    return state ? state.isLoaded : false;
  }

  /**
   * Check if element is loading
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is loading
   */
  async isLoading(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
    return state ? state.isLoading : false;
  }

  /**
   * Check if element has error
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element has error
   */
  async hasError(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
    return state ? state.hasError : false;
  }

  /**
   * Get component status
   * @returns {Object} Component status
   */
  getStatus() {
    const elements = document.querySelectorAll('[data-lazysrc-enhanced="true"]');
    let loadedCount = 0;
    let loadingCount = 0;
    let errorCount = 0;

    elements.forEach(element => {
      if (this.isLoaded(element)) loadedCount++;
      if (this.isLoading(element)) loadingCount++;
      if (this.hasError(element)) errorCount++;
    });

    return {
      totalElements: elements.length,
      loadedCount,
      loadingCount,
      errorCount,
      observerActive: !!this.observer,
      supportsNative: this._supportsNativeLoading(),
      defaults: Lazysrc.defaults,
    };
  }

  /**
   * Detach element from component after loading
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _detachElement(element, state) {
    // Only detach if already loaded
    if (!state.isLoaded) return;
    
    // Clean up state
    if (state.customObserver) {
      state.customObserver.disconnect();
      state.customObserver = null;
    }
    
    // Emit detached event via custom event
    this._dispatch(element, 'lazysrc:detached', {
      element,
      timestamp: performance.now(),
    });
    
    this.logger?.debug('Element detached after loading', { element });
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.loadingAttempts.clear();
    super.destroy();
    this.logger?.info('Lazysrc destroyed');
  }

  /**
   * Enhance all lazy load elements on the page
   * @param {string} selector - CSS selector for lazy elements
   * @param {Object} options - Component options
   * @returns {Lazysrc} Component instance
   */
  static enhanceAll(selector = '[data-lazysrc]', options) {
    const instance = new Lazysrc(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Lazysrc as default };
