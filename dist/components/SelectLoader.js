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
 * SelectLoader Component
 *
 * Enhances a native <select> element to load HTML fragments using RouterManager
 * and replace content in a target container when the selection changes.
 *
 * @example
 * <!-- HTML -->
 * <select data-selectloader
 *         data-selectloader-target="#content-area">
 *   <option value="">Select an option...</option>
 *   <option value="/fragments/option1">Option 1</option>
 *   <option value="/fragments/option2">Option 2</option>
 * </select>
 *
 * <div id="content-area">
 *   <!-- Content will be loaded here -->
 * </div>
 */
class SelectLoader extends BaseComponent {
  static get defaults() {
    return {
      loadingClass: 'loading',
      errorClass: 'error',
      transition: 'fade', // 'fade', 'slide', 'none'
      transitionDuration: 300,
      retainScroll: false,
      emptyMessage: 'Please select an option',
    };
  }

  /**
   * Initialize the select loader
   * @param {HTMLSelectElement} element - Select element to enhance
   * @returns {Object} Component state
   */
  _init(element) {
    const state = super._init(element);

    /* Validate it's a select element */
    if (element.tagName !== 'SELECT') {
      this.logger?.error('SelectLoader: Element must be a <select>', { element });
      return state;
    }

    /* Get configuration using BaseComponent helper */
    const config = this._getConfigFromAttrs(element, {
      target: 'selectloader-target',
      loadingClass: 'selectloader-loading-class',
      errorClass: 'selectloader-error-class',
      transition: 'selectloader-transition',
      transitionDuration: 'selectloader-transition-duration',
      retainScroll: 'selectloader-retain-scroll',
      emptyMessage: 'selectloader-empty-message',
    });

    /* Get target container using BaseComponent helper */
    const targetElement = this._getTargetElement(element, 'selectloader-target', {
      required: true,
    });

    if (!targetElement) {
      return state;
    }

    /* Store state */
    state.config = { ...SelectLoader.defaults, ...config };
    state.targetElement = targetElement;
    state.isLoading = false;
    state.currentUrl = null;
    state.scrollPosition = 0;

    /* Setup event listeners */
    this._setupEventListeners(element, state);

    /* Initial load if select has a value */
    if (element.value) {
      this._loadFragment(element, state, element.value);
    } else {
      this._showEmptyMessage(state);
    }

    this.logger?.info('SelectLoader initialized', {
      element,
      target: config.target,
      options: element.options.length,
    });

    return state;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners(element, state) {
    /* Listen for select changes */
    element.addEventListener(
      'change',
      event => {
        this._handleChange(event, element, state);
      },
      { signal: state.controller.signal }
    );

    /* Listen for form resets */
    const form = element.closest('form');
    if (form) {
      form.addEventListener(
        'reset',
        async () => {
          await this._delay(10);
          this._showEmptyMessage(state);
        },
        { signal: state.controller.signal }
      );
    }

    /* Listen for router navigation events via EventManager */
    this.eventBus?.on('router:navigate-success', data => {
      /* Check if target still exists after navigation */
      if (state.targetElement && !document.contains(state.targetElement)) {
        this.logger?.warn('SelectLoader: Target removed during navigation');
      }
    });
  }

  /**
   * Handle select change event
   * @private
   */
  async _handleChange(event, element, state) {
    const value = element.value;

    /* Emit cancelable event via BaseComponent helper */
    const beforeEvent = this._dispatch(element, 'selectloader:before-change', {
      value,
      previousUrl: state.currentUrl,
      targetElement: state.targetElement,
    });

    if (beforeEvent.defaultPrevented) {
      this.logger?.debug('SelectLoader: Change prevented by listener');
      return;
    }

    /* Handle empty selection */
    if (!value || value === '') {
      this._showEmptyMessage(state);
      state.currentUrl = null;

      this._dispatch(element, 'selectloader:cleared', {
        targetElement: state.targetElement,
      });
      return;
    }

    /* Load the fragment */
    await this._loadFragment(element, state, value);
  }

  /**
   * Load HTML fragment using RouterManager
   * @private
   */
  async _loadFragment(element, state, url) {
    /* Prevent concurrent loads */
    if (state.isLoading) {
      this.logger?.warn('SelectLoader: Load already in progress');
      return;
    }

    state.isLoading = true;
    state.currentUrl = url;

    /* Store scroll position if needed */
    if (state.config.retainScroll) {
      state.scrollPosition = state.targetElement.scrollTop;
    }

    /* Apply loading state */
    element.classList.add(state.config.loadingClass);
    element.disabled = true;
    state.targetElement.classList.add(state.config.loadingClass);

    /* Emit loading event */
    this._dispatch(element, 'selectloader:loading', {
      url,
      targetElement: state.targetElement,
    });

    try {
      /* Use RouterManager to fetch the fragment */
      if (!this.router) {
        throw new Error('RouterManager not available');
      }

      const result = await this.router.get(url);
      const html = result.data;

      /* Transition out old content */
      if (state.config.transition !== 'none') {
        await this._transitionOut(state);
      }

      /* Replace content */
      state.targetElement.innerHTML = html;

      /* Restore scroll position */
      if (state.config.retainScroll) {
        state.targetElement.scrollTop = state.scrollPosition;
      }

      /* Transition in new content */
      if (state.config.transition !== 'none') {
        await this._transitionIn(state);
      }

      /* Emit success via BaseComponent _dispatch and EventManager */
      this._dispatch(element, 'selectloader:loaded', {
        url,
        targetElement: state.targetElement,
        html,
      });

      /* EventManager will propagate this event */
      this.eventBus?.emit('selectloader:content-loaded', {
        element,
        url,
        targetElement: state.targetElement,
      });

      this.logger?.info('SelectLoader: Fragment loaded', { url });
    } catch (error) {
      this.logger?.error('SelectLoader: Load failed', { url, error });

      /* Show error message */
      this._showErrorMessage(state, error);

      /* Emit error event */
      this._dispatch(element, 'selectloader:error', {
        url,
        error,
        targetElement: state.targetElement,
      });

      /* Could notify via toast/alert if available */
      this.eventBus?.emit('app:notification', {
        type: 'error',
        message: `Failed to load content: ${error.message}`,
        duration: 5000,
      });
    } finally {
      /* Remove loading state */
      state.isLoading = false;
      element.classList.remove(state.config.loadingClass);
      element.disabled = false;
      state.targetElement.classList.remove(state.config.loadingClass);

      this._dispatch(element, 'selectloader:complete', {
        url,
        success: !state.targetElement.classList.contains(state.config.errorClass),
      });
    }
  }

  /**
   * Transition out old content using BaseComponent helpers
   * @private
   */
  async _transitionOut(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeOut(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideOut(state.targetElement, transitionDuration);
    }
  }

  /**
   * Transition in new content using BaseComponent helpers
   * @private
   */
  async _transitionIn(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeIn(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideIn(state.targetElement, transitionDuration);
    }
  }

  /**
   * Slide out animation
   * @private
   */
  async _slideOut(element, duration) {
    const height = element.offsetHeight;
    element.style.overflow = 'hidden';
    element.style.height = `${height}px`;
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.height = '0';
    element.style.opacity = '0';

    await this._delay(duration);
  }

  /**
   * Slide in animation
   * @private
   */
  async _slideIn(element, duration) {
    const scrollHeight = element.scrollHeight;
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-in, opacity ${duration}ms ease-in`;
    element.style.height = `${scrollHeight}px`;
    element.style.opacity = '1';

    await this._delay(duration);

    /* Cleanup */
    element.style.height = '';
    element.style.overflow = '';
    element.style.transition = '';
  }

  /**
   * Show empty message
   * @private
   */
  _showEmptyMessage(state) {
    const message = state.config.emptyMessage;
    state.targetElement.innerHTML = `
      <div class="select-loader__empty">
        <p>${message}</p>
      </div>
    `;
    state.targetElement.classList.remove(state.config.errorClass);
  }

  /**
   * Show error message with retry button
   * @private
   */
  _showErrorMessage(state, error) {
    const message = error.message || 'Failed to load content';
    const retryId = this._generateId('retry');

    state.targetElement.innerHTML = `
      <div class="select-loader__error">
        <p>${message}</p>
        <button type="button" id="${retryId}" class="btn btn--sm">Retry</button>
      </div>
    `;
    state.targetElement.classList.add(state.config.errorClass);

    /* Setup retry button using BaseComponent event handling */
    const retryButton = document.getElementById(retryId);
    if (retryButton) {
      retryButton.addEventListener(
        'click',
        () => {
          /* Find the select element from state */
          const element = Array.from(document.querySelectorAll('select')).find(
            el => this.getState(el) === state
          );
          if (element && state.currentUrl) {
            this._loadFragment(element, state, state.currentUrl);
          }
        },
        { once: true }
      );
    }
  }

  /**
   * Public API: Reload current fragment
   */
  reload(element) {
    const state = this._requireState(element, 'reload');
    if (!state || !state.currentUrl) return;

    this._loadFragment(element, state, state.currentUrl);
  }

  /**
   * Public API: Load specific URL
   */
  load(element, url) {
    const state = this._requireState(element, 'load');
    if (!state) return;

    element.value = url;
    this._loadFragment(element, state, url);
  }

  /**
   * Public API: Clear selection and content
   */
  clear(element) {
    const state = this._requireState(element, 'clear');
    if (!state) return;

    element.value = '';
    this._showEmptyMessage(state);
    state.currentUrl = null;
  }

  /**
   * Public API: Get current load state
   */
  getLoadState(element) {
    const state = this.getState(element);
    return state
      ? {
          isLoading: state.isLoading,
          currentUrl: state.currentUrl,
          hasContent: state.targetElement.children.length > 0,
          hasError: state.targetElement.classList.contains(state.config.errorClass),
        }
      : null;
  }
}

export { SelectLoader as default };
