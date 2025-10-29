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
 * Scrollhide Component
 *
 * Progressive enhancement for scroll-responsive element behavior.
 * Hides/shows elements based on scroll direction and position with overlay effects.
 *
 * @example
 * HTML:
 * <!-- Basic scroll-hiding menu -->
 * <nav data-scrollhide class="main-nav">
 *   <a href="/">Home</a>
 *   <a href="/about">About</a>
 * </nav>
 *
 * <!-- Custom configuration -->
 * <header data-scrollhide
 *         data-scroll-threshold="50"
 *         data-overlay-threshold="100"
 *         class="site-header">
 *   Navigation content
 * </header>
 *
 * <!-- Manual targeting -->
 * <div data-scrollhide data-scrollhide-target="#floating-menu">
 *   <nav id="floating-menu">Menu items</nav>
 * </div>
 *
 * JavaScript (standalone):
 * import { Scrollhide } from './components/Scrollhide.js';
 * const scrollhide = new Scrollhide();
 * document.querySelectorAll('[data-scrollhide]')
 *   .forEach(element => scrollhide.mount(element));
 */
class Scrollhide extends BaseComponent {
  /**
   * Default configuration for scrollhide component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      scrollThreshold: 50, // Pixels scrolled before hiding/showing
      overlayThreshold: 100, // Pixels scrolled before adding overlay class
      scrolledClass: 'scrollhide', // Class added when element should hide
      overlayClass: 'scrolloverlay', // Class added for overlay effect
      debounce: 16, // Scroll event debouncing (60fps = ~16ms)
      passive: true, // Use passive scroll listeners
    };
  }

  /**
   * Initialize the scrollhide functionality on an element
   * @param {HTMLElement} element - Element with data-scrollhide attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target element (could be self or specified target)
    const targetSelector = this._getDataAttr(element, 'scrollhide-target');
    const target = targetSelector ? document.querySelector(targetSelector) : element;

    if (!target) {
      this.logger?.warn('Scrollhide: Target element not found', {
        selector: targetSelector,
        element,
      });
      return state;
    }

    // Get configuration from data attributes
    const scrollThreshold = this._getDataAttr(
      element,
      'scroll-threshold',
      Scrollhide.defaults.scrollThreshold
    );
    const overlayThreshold = this._getDataAttr(
      element,
      'overlay-threshold',
      Scrollhide.defaults.overlayThreshold
    );
    const scrolledClass = this._getDataAttr(
      element,
      'scrolled-class',
      Scrollhide.defaults.scrolledClass
    );
    const overlayClass = this._getDataAttr(
      element,
      'overlay-class',
      Scrollhide.defaults.overlayClass
    );
    const debounce = this._getDataAttr(element, 'debounce', Scrollhide.defaults.debounce);

    // Store state
    state.target = target;
    state.targetSelector = targetSelector;
    state.scrollThreshold = parseInt(scrollThreshold, 10);
    state.overlayThreshold = parseInt(overlayThreshold, 10);
    state.scrolledClass = scrolledClass;
    state.overlayClass = overlayClass;
    state.currentY = 0;
    state.lastY = 0;
    state.ticking = false;

    // Create throttled scroll handler
    const scrollHandler = this._createScrollHandler(element, state);
    const throttledHandler = this._throttle(scrollHandler, debounce);

    // Set up scroll listener
    window.addEventListener('scroll', throttledHandler, {
      passive: Scrollhide.defaults.passive,
    });

    // Store handler for cleanup
    state.scrollHandler = throttledHandler;

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      window.removeEventListener('scroll', state.scrollHandler);
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
      }
      originalCleanup();
    };

    // Initial position check
    this._updateElementState(element, state);

    // Mark as enhanced for status tracking
    element.setAttribute('data-scrollhide-enhanced', 'true');

    this.eventBus?.emit('scrollhide:mount', {
      element,
      target,
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
      timestamp: performance.now(),
    });

    this.logger?.info('Scrollhide initialized', {
      element,
      target: targetSelector || 'self',
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
    });

    return state;
  }

  /**
   * Create scroll event handler for an element
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   * @returns {Function} Scroll handler function
   */
  _createScrollHandler(element, state) {
    return () => {
      if (!state.ticking) {
        state.animationFrame = requestAnimationFrame(() => {
          this._onScroll(element, state);
          state.ticking = false;
        });
        state.ticking = true;
      }
    };
  }

  /**
   * Handle scroll events
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   */
  _onScroll(element, state) {
    state.currentY = window.scrollY;

    this._updateElementState(element, state);

    // Update last position for next comparison
    state.lastY = state.currentY;
  }

  /**
   * Update element state based on scroll position
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   */
  _updateElementState(element, state) {
    const {
      target,
      currentY,
      lastY,
      scrollThreshold,
      overlayThreshold,
      scrolledClass,
      overlayClass,
    } = state;

    // Handle overlay class (for background/styling effects)
    const hasOverlay = target.classList.contains(overlayClass);
    if (currentY > overlayThreshold && !hasOverlay) {
      target.classList.add(overlayClass);
      this._emitStateChange(element, 'overlay-added', { scrollY: currentY });
    } else if (currentY <= overlayThreshold && hasOverlay) {
      target.classList.remove(overlayClass);
      this._emitStateChange(element, 'overlay-removed', { scrollY: currentY });
    }

    // Handle scroll hide/show behavior
    const isHidden = target.classList.contains(scrolledClass);

    // Show element when at top of page
    if (currentY <= 0) {
      if (isHidden) {
        target.classList.remove(scrolledClass);
        this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'top' });
      }
      return;
    }

    // Hide element when scrolling down past threshold
    if (currentY > scrollThreshold && currentY > lastY && !isHidden) {
      target.classList.add(scrolledClass);
      this._emitStateChange(element, 'hidden', { scrollY: currentY, reason: 'scroll-down' });
    }
    // Show element when scrolling up
    else if (currentY < lastY && isHidden) {
      target.classList.remove(scrolledClass);
      this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'scroll-up' });
    }
  }

  /**
   * Emit state change events
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {string} action - Action that occurred
   * @param {Object} data - Additional event data
   */
  _emitStateChange(element, action, data) {
    const state = this.getState(element);

    // DOM event
    this._dispatch(element, `scrollhide:${action}`, {
      target: state.target,
      ...data,
    });

    // Framework event
    this.eventBus?.emit(`scrollhide:${action}`, {
      element,
      target: state.target,
      timestamp: performance.now(),
      ...data,
    });

    this.logger?.debug(`Scrollhide ${action}`, {
      element,
      target: state.targetSelector || 'self',
      ...data,
    });
  }

  /**
   * Manually show the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  show(element) {
    const state = this.getState(element);
    if (!state) return;

    state.target.classList.remove(state.scrolledClass);
    this._emitStateChange(element, 'shown', {
      scrollY: state.currentY,
      reason: 'manual',
    });
  }

  /**
   * Manually hide the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  hide(element) {
    const state = this.getState(element);
    if (!state) return;

    state.target.classList.add(state.scrolledClass);
    this._emitStateChange(element, 'hidden', {
      scrollY: state.currentY,
      reason: 'manual',
    });
  }

  /**
   * Toggle element visibility
   * @param {HTMLElement} element - Element with scrollhide
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state) return;

    if (this.isHidden(element)) {
      this.show(element);
    } else {
      this.hide(element);
    }
  }

  /**
   * Check if element is currently hidden
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {boolean} Whether the element is hidden
   */
  isHidden(element) {
    const state = this.getState(element);
    return state ? state.target.classList.contains(state.scrolledClass) : false;
  }

  /**
   * Check if element has overlay effect active
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {boolean} Whether the overlay is active
   */
  hasOverlay(element) {
    const state = this.getState(element);
    return state ? state.target.classList.contains(state.overlayClass) : false;
  }

  /**
   * Get current scroll position
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {number} Current scroll Y position
   */
  getScrollPosition(element) {
    const state = this.getState(element);
    return state ? state.currentY : window.scrollY;
  }

  /**
   * Update thresholds dynamically
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} options - New threshold values
   * @param {number} [options.scrollThreshold] - New scroll threshold
   * @param {number} [options.overlayThreshold] - New overlay threshold
   */
  updateThresholds(element, { scrollThreshold, overlayThreshold }) {
    const state = this.getState(element);
    if (!state) return;

    if (typeof scrollThreshold === 'number') {
      state.scrollThreshold = scrollThreshold;
    }

    if (typeof overlayThreshold === 'number') {
      state.overlayThreshold = overlayThreshold;
    }

    // Re-evaluate current state with new thresholds
    this._updateElementState(element, state);

    this.logger?.info('Scrollhide thresholds updated', {
      element,
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
    });
  }

  /**
   * Create a throttled function
   * @private
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  _throttle(func, delay) {
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
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const elements = document.querySelectorAll('[data-scrollhide-enhanced="true"]');
    let hiddenCount = 0;
    let overlayCount = 0;

    elements.forEach(element => {
      const state = this.getState(element);
      if (state) {
        if (this.isHidden(element)) hiddenCount++;
        if (this.hasOverlay(element)) overlayCount++;
      }
    });

    return {
      totalElements: elements.length,
      hiddenCount,
      overlayCount,
      currentScrollY: window.scrollY,
      defaults: Scrollhide.defaults,
    };
  }

  /**
   * Enhance all scrollhide elements on the page
   * @param {string} selector - CSS selector for scrollhide elements
   * @param {Object} options - Component options
   * @returns {Scrollhide} Component instance
   */
  static enhanceAll(selector = '[data-scrollhide]', options) {
    const instance = new Scrollhide(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Scrollhide as default };
