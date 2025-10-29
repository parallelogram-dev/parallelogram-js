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
 * Toast Component
 *
 * Handles data-toast-trigger elements and bridges to the existing PToasts web component
 * and AlertManager system.
 *
 * @example
 * HTML:
 * <button data-toast-trigger="info" data-toast-message="Hello World!">Show Toast</button>
 * <button data-toast-trigger="success"
 *         data-toast-message="Operation completed"
 *         data-toast-duration="5000">Success Toast</button>
 *
 * <p-toasts placement="top-right"></p-toasts>
 *
 * JavaScript (standalone):
 * import { Toast } from './components/Toast.js';
 * const toasts = new Toast();
 * document.querySelectorAll('[data-toast-trigger]')
 *   .forEach(trigger => toasts.mount(trigger));
 */
class Toast extends BaseComponent {
  /**
   * Default configuration for toast component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      defaultDuration: 4000,
      defaultType: 'info',
      fadeOutDuration: 300,
      typeMapping: {
        info: 'info',
        success: 'success',
        warn: 'warning',
        warning: 'warning',
        error: 'error',
        danger: 'error',
      },
    };
  }

  /**
   * Initialize the toast trigger on an element
   * @param {HTMLElement} element - Element with data-toast-trigger attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    const message = this._getDataAttr(element, 'toast-message');
    const type = this._getDataAttr(element, 'toast-trigger', Toast.defaults.defaultType);
    const duration = parseInt(
      this._getDataAttr(element, 'toast-duration', Toast.defaults.defaultDuration)
    );
    const title = this._getDataAttr(element, 'toast-title');
    const dismissible = this._getDataAttr(element, 'toast-dismissible', 'true') !== 'false';

    if (!element.hasAttribute('data-toast-trigger')) {
      this.logger?.warn(
        'Toast component mounted on element without data-toast-trigger attribute',
        element
      );
      return state;
    }

    if (!message) {
      this.logger?.warn('Toast trigger missing data-toast-message attribute', element);
      return state;
    }

    // Store configuration in state
    state.message = message;
    state.type = type;
    state.duration = duration;
    state.title = title;
    state.dismissible = dismissible;

    // Create bound click handler for this specific element
    const clickHandler = event => this._handleClick(event, element);

    // Add click listener
    element.addEventListener('click', clickHandler);

    // Mark as enhanced
    element.setAttribute('data-toast-enhanced', 'true');
    element.classList.add('toast-trigger--enhanced');

    // Store cleanup function
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeEventListener('click', clickHandler);
      element.removeAttribute('data-toast-enhanced');
      element.classList.remove('toast-trigger--enhanced');
      originalCleanup();
    };

    // Emit mount event
    this.eventBus?.emit('toast:mount', {
      element,
      message,
      type,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toast trigger initialized', {
      element,
      message,
      type,
      duration,
    });

    return state;
  }

  /**
   * Handle click events on toast triggers
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The trigger element
   */
  _handleClick(event, element) {
    // Prevent default behavior
    event.preventDefault();

    const state = this.getState(element);
    if (!state) {
      this.logger?.warn('Toast trigger clicked but no state found', element);
      return;
    }

    // Map type if needed
    const alertType = Toast.defaults.typeMapping[state.type] || state.type;

    // Show the toast
    this._showToast({
      message: state.message,
      type: alertType,
      duration: state.duration,
      title: state.title,
      dismissible: state.dismissible,
      trigger: element,
    });
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type (info, success, warning, error)
   * @param {number} options.duration - Display duration in ms
   * @param {string} options.title - Optional title
   * @param {boolean} options.dismissible - Whether toast can be dismissed
   * @param {HTMLElement} options.trigger - Element that triggered the toast
   */
  _showToast(options) {
    const {
      message,
      type = Toast.defaults.defaultType,
      duration = Toast.defaults.defaultDuration,
      title,
      dismissible = true,
      trigger,
    } = options;

    try {
      // Use AlertManager if available, otherwise try direct PToasts
      if (window.alertManager && typeof window.alertManager.show === 'function') {
        window.alertManager.show({
          message,
          type,
          duration,
          title,
          dismissible,
        });
      } else {
        // Fallback: try to use PToasts directly
        const toastContainer = document.querySelector('p-toasts');
        if (toastContainer && typeof toastContainer.toast === 'function') {
          toastContainer.toast({
            message,
            type,
            duration,
            title,
            dismissible,
          });
        } else {
          // Final fallback: simple alert
          this.logger?.warn('No toast system available, falling back to alert');
          alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
        }
      }

      // Dispatch custom event on the trigger element
      this._dispatch(trigger, 'toast:shown', {
        message,
        type,
        duration,
        title,
      });

      // Emit success event
      this.eventBus?.emit('toast:show', {
        message,
        type,
        duration,
        title,
        trigger,
        timestamp: performance.now(),
      });

      this.logger?.info('Toast shown', { message, type, duration, title });
    } catch (error) {
      this.logger?.error('Failed to show toast', error);

      // Dispatch error event on the trigger element
      this._dispatch(trigger, 'toast:error', {
        error: error.message,
        message,
        type,
      });

      // Emit error event
      this.eventBus?.emit('toast:error', {
        error: error.message,
        options,
        trigger,
        timestamp: performance.now(),
      });

      // Fallback to alert
      alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
    }
  }

  /**
   * Programmatically trigger a toast (for use by other components)
   * @param {string} message - Toast message
   * @param {string} type - Toast type
   * @param {Object} options - Additional options
   */
  static show(message, type = 'info', options = {}) {
    const toast = new Toast();
    toast._showToast({
      message,
      type,
      ...options,
    });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const triggers = document.querySelectorAll('[data-toast-enhanced="true"]');

    return {
      mountedTriggers: triggers.length,
      availableTypes: Object.keys(Toast.defaults.typeMapping),
      alertManagerAvailable: !!(
        window.alertManager && typeof window.alertManager.show === 'function'
      ),
      xToastsAvailable: !!document.querySelector('p-toasts'),
      defaults: Toast.defaults,
    };
  }

  /**
   * Enhance all toast triggers on the page
   * @param {string} selector - CSS selector for toast triggers
   * @param {Object} options - Component options
   * @returns {Toast} Component instance
   */
  static enhanceAll(selector = '[data-toast-trigger][data-toast-message]', options) {
    const instance = new Toast(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Toast as default };
