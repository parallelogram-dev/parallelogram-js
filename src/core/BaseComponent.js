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
export class BaseComponent {
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

  // Helper method for data attributes
  _getDataAttr(element, attr, defaultValue) {
    const value = element.dataset[this._camelCase(attr)];
    if (value === undefined) return defaultValue;

    // Convert string values to appropriate types
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(value) && value !== '') return Number(value);
    return value;
  }

  _camelCase(str) {
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
  }

  /**
   * Debounce a function - delays execution until after wait milliseconds have elapsed
   * since the last time it was invoked
   * @param {Function} func - Function to debounce
   * @param {number} wait - Milliseconds to wait
   * @returns {Function} Debounced function
   */
  _debounce(func, wait = 300) {
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
   * Throttle a function - ensures it's only called at most once per specified time period
   * @param {Function} func - Function to throttle
   * @param {number} limit - Milliseconds between allowed executions
   * @returns {Function} Throttled function
   */
  _throttle(func, limit = 100) {
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
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  /**
   * Generate unique ID with optional prefix
   * @param {string} prefix - Prefix for the ID
   * @returns {string} Unique ID
   */
  _generateId(prefix = 'elem') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Wait for CSS transition or animation to complete
   * @param {HTMLElement} element - Element with transition/animation
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise} Promise that resolves when transition ends
   */
  async _waitForTransition(element, timeout = 2000) {
    return new Promise(resolve => {
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
  async _fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.offsetHeight; /* Force reflow */
    element.style.opacity = '1';

    return new Promise(resolve => {
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
  async _fadeOut(element, duration = 300) {
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.offsetHeight; /* Force reflow */
    element.style.opacity = '0';

    return new Promise(resolve => {
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
  _getFocusableElements(container = document) {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ];
    return Array.from(container.querySelectorAll(selectors.join(',')));
  }

  /**
   * Trap focus within a container (for modals, dialogs, etc.)
   * @param {HTMLElement} container - Container to trap focus within
   * @param {KeyboardEvent} event - Tab key event
   */
  _trapFocus(container, event) {
    const focusable = this._getFocusableElements(container);
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
  _restoreFocus(element) {
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
  _createElement(tag, attributes = {}, content = '') {
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
