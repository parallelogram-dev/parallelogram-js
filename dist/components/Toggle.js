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
    const viewName = this.getAttr(element, viewAttr);

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
    const selector = this.getAttr(element, dataAttr);
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
   * @param {Object} mapping - Map of config keys to short attribute names (without component prefix)
   * @returns {Object} Configuration object
   * @example
   * // In SelectLoader component:
   * const config = this._getConfigFromAttrs(element, {
   *   target: 'target',           // Uses data-selectloader-target
   *   loadingClass: 'loading-class' // Uses data-selectloader-loading-class
   * });
   */
  _getConfigFromAttrs(element, mapping) {
    const config = {};
    for (const [key, attrName] of Object.entries(mapping)) {
      const defaultValue = this.constructor.defaults?.[key];
      config[key] = this.getAttr(element, attrName, defaultValue);
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

  /**
   * Get the component's data attribute selector
   * Extracts from class name (e.g., "Toggle" -> "data-toggle")
   * Can be overridden in subclasses if needed
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    if (this._selector) return this._selector;

    // Extract component name from class name and convert to kebab-case
    const className = this.constructor.name;
    // Convert PascalCase to kebab-case: "DataTable" -> "data-table"
    const kebab = className
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();

    this._selector = `data-${kebab}`;
    return this._selector;
  }

  /**
   * Set component state using data attribute (data-<component>="<state>")
   * @param {HTMLElement} element - Target element
   * @param {string} state - State value
   * @example
   * // In Toggle component:
   * this.setState(element, ExtendedStates.OPEN);
   * // Sets: <div data-toggle="open">
   */
  setState(element, state) {
    element.setAttribute(this._getSelector(), state);
  }

  /**
   * Get component state from data attribute
   * @param {HTMLElement} element - Target element
   * @returns {string|null} Current state value
   * @example
   * const state = this.getElementState(element); // "open"
   */
  getElementState(element) {
    return element.getAttribute(this._getSelector());
  }

  /**
   * Set component attribute (data-<component>-<attr>="<value>")
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @param {string|number|boolean} value - Attribute value
   * @example
   * // In Toggle component:
   * this.setAttr(element, 'duration', '300');
   * // Sets: <div data-toggle-duration="300">
   */
  setAttr(element, attr, value) {
    element.setAttribute(`${this._getSelector()}-${attr}`, String(value));
  }

  /**
   * Get component attribute (data-<component>-<attr>)
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @param {*} defaultValue - Default value if attribute doesn't exist
   * @returns {string|null} Attribute value or null
   * @example
   * const duration = this.getAttr(element, 'duration', '300'); // "300"
   */
  getAttr(element, attr, defaultValue = null) {
    const value = element.getAttribute(`${this._getSelector()}-${attr}`);
    return value !== null ? value : defaultValue;
  }

  /**
   * Remove component attribute (data-<component>-<attr>)
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @example
   * this.removeAttr(element, 'duration');
   * // Removes: data-toggle-duration
   */
  removeAttr(element, attr) {
    element.removeAttribute(`${this._getSelector()}-${attr}`);
  }

  /**
   * Check if component attribute exists (data-<component>-<attr>)
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @returns {boolean}
   * @example
   * if (this.hasAttr(element, 'disabled')) { ... }
   */
  hasAttr(element, attr) {
    return element.hasAttribute(`${this._getSelector()}-${attr}`);
  }
}

/**
 * ComponentStates - Standard state values for component lifecycle
 *
 * These states are used in data attributes to track component initialization
 * and lifecycle. Each component uses its selector attribute (e.g., data-lazysrc)
 * to store its current state.
 *
 * @example
 * // Initial HTML
 * <img data-lazysrc data-lazysrc-src="/image.jpg">
 *
 * // After mounting
 * <img data-lazysrc="mounted" data-lazysrc-src="/image.jpg">
 *
 * // After loading
 * <img data-lazysrc="loaded" data-lazysrc-src="/image.jpg" src="/image.jpg">
 *
 * @example
 * // CSS Hooks
 * [data-lazysrc="loading"] { opacity: 0.5; }
 * [data-lazysrc="loaded"] { opacity: 1; }
 * [data-lazysrc="error"] { border: 2px solid red; }
 */


/**
 * Extended states for specific component behaviors
 * Components can use these in addition to core states
 */
const ExtendedStates = {
  // Interactive states (for Toggle, Modal, etc.)
  OPEN: 'open',
  CLOSED: 'closed',
  OPENING: 'opening',
  CLOSING: 'closing'};

/**
 * Toggle Component
 *
 * Progressive enhancement for toggle functionality with show/hide states.
 * Supports dropdowns, modals, accordion panels, and other toggleable content.
 * Includes auto-close functionality for navigation links.
 *
 * @example
 * HTML:
 * <button data-toggle data-toggle-target="#dropdown-menu">Toggle Menu</button>
 * <div id="dropdown-menu" class="dropdown hidden">
 *   <p>Dropdown content here</p>
 * </div>
 *
 * <!-- Dropdown with outside click capture -->
 * <button data-toggle
 *         data-toggle-target="#dropdown"
 *         data-toggle-capture="true">Dropdown</button>
 * <div id="dropdown" class="dropdown">Menu items</div>
 *
 * <!-- Navigation menu that auto-closes when links are clicked -->
 * <button data-toggle data-toggle-target="#navbar-navigation">Menu</button>
 * <nav id="navbar-navigation">
 *   <a href="/page1">Page 1</a>
 *   <a href="/page2">Page 2</a>
 *   <a href="#section">Anchor link (won't close)</a>
 *   <a href="https://external.com" target="_blank">External (won't close)</a>
 * </nav>
 *
 * <!-- Disable navigation auto-close -->
 * <button data-toggle
 *         data-toggle-target="#persistent-nav"
 *         data-toggle-close-navigation="false">Persistent Nav</button>
 * <nav id="persistent-nav">Navigation links won't auto-close this</nav>
 *
 * <!-- Manual toggle (won't auto-close at all) -->
 * <button data-toggle data-toggle-target="#persistent">Persistent Toggle</button>
 * <div id="persistent" data-toggle-manual="true">This won't auto-close</div>
 *
 * <!-- Accordion panel -->
 * <button data-toggle data-toggle-target="#panel-1" aria-expanded="false">Panel 1</button>
 * <div id="panel-1" class="panel">Panel 1 content</div>
 *
 * JavaScript (standalone):
 * import { Toggle } from './components/Toggle.js';
 * const toggles = new Toggle();
 * document.querySelectorAll('[data-toggle]')
 *   .forEach(trigger => toggles.mount(trigger));
 */
class Toggle extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-toggle';
  }

  /**
   * Default configuration for toggle component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      openClass: 'open',
      transitioningClass: 'transitioning',
      transitionDuration: 750,
      capture: false, // Whether to capture outside clicks
      manual: false, // Whether to prevent auto-closing
      multiple: false, // Allow multiple toggles open at once
      animateToggle: true,
      closeOnEscape: true,
      closeOnNavigation: true, // Auto-close when navigation links are clicked
    };
  }

  /**
   * Initialize the toggle functionality on a trigger element
   * @param {HTMLElement} element - Trigger element with data-toggle attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target element
    const targetSelector = this.getAttr(element, 'target');
    if (!targetSelector) {
      this.logger?.warn('Toggle: No data-toggle-target attribute found', element);
      return state;
    }

    const target = document.querySelector(targetSelector);
    if (!target) {
      this.logger?.warn('Toggle: Target element not found', { selector: targetSelector, element });
      return state;
    }

    // Get configuration from data attributes
    const capture = this.getAttr(element, 'capture', Toggle.defaults.capture);
    const manual =
      target.hasAttribute('data-toggle-manual') ||
      this.getAttr(element, 'manual', Toggle.defaults.manual);
    const multiple = this.getAttr(element, 'multiple', Toggle.defaults.multiple);
    const animateToggle = this.getAttr(
      element,
      'animate',
      Toggle.defaults.animateToggle
    );
    const closeOnNavigation = this.getAttr(
      element,
      'close-navigation',
      Toggle.defaults.closeOnNavigation
    );

    // Store state
    state.target = target;
    state.targetSelector = targetSelector;
    state.capture = capture;
    state.manual = manual;
    state.multiple = multiple;
    state.animateToggle = animateToggle;
    state.closeOnNavigation = closeOnNavigation;
    state.isOpen = target.classList.contains(Toggle.defaults.openClass);
    state.transitionTimer = null;

    // Set initial state attribute on target
    const initialState = state.isOpen ? ExtendedStates.OPEN : ExtendedStates.CLOSED;
    this.setAttr(target, 'target', initialState);

    // Set up click handler
    const clickHandler = e => this._handleClick(e, element, state);
    element.addEventListener('click', clickHandler);

    // Mark as enhanced for status tracking
    element.setAttribute('data-toggle-enhanced', 'true');

    // Set up ARIA attributes
    element.setAttribute('aria-expanded', String(state.isOpen));
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', targetSelector.replace('#', ''));
    }

    // Set up escape key handler if enabled
    if (Toggle.defaults.closeOnEscape) {
      const escapeHandler = e => this._handleEscape(e, element, state);
      document.addEventListener('keydown', escapeHandler);
      state.escapeHandler = escapeHandler;
    }

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeEventListener('click', clickHandler);
      if (state.escapeHandler) {
        document.removeEventListener('keydown', state.escapeHandler);
      }
      this._clearTransitionTimer(state);
      this._removeGlobalListeners(state);
      originalCleanup();
    };

    this.eventBus?.emit('toggle:mount', {
      element,
      target,
      isOpen: state.isOpen,
      timestamp: performance.now(),
    });

    this.logger?.info('Toggle initialized', {
      element,
      target: targetSelector,
      capture,
      manual,
      isOpen: state.isOpen,
    });

    return state;
  }

  /**
   * Handle click events on toggle triggers
   * @private
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleClick(event, element, state) {
    event.preventDefault();
    event.stopPropagation();

    this.toggle(element);
  }

  /**
   * Handle escape key to close toggles
   * @private
   * @param {Event} event - Keydown event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleEscape(event, element, state) {
    if (event.key === 'Escape' && state.isOpen && !state.manual) {
      this.hide(element);
    }
  }

  /**
   * Toggle the open/closed state
   * @param {HTMLElement} element - Trigger element
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check the actual target state, not just this trigger's stored state
    const isActuallyOpen = state.target.classList.contains(Toggle.defaults.openClass);

    if (isActuallyOpen) {
      this.hide(element);
    } else {
      this.show(element);
    }
  }

  /**
   * Show/open the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  show(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check current state to prevent transitions during animation
    const currentState = this.getAttr(state.target, 'target');
    if (currentState === ExtendedStates.OPENING || currentState === ExtendedStates.OPEN) {
      return;
    }

    // Close other toggles if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherToggles(element);
    }

    // Update internal state for this trigger
    state.isOpen = true;

    // Update state for all triggers targeting the same element
    this._syncTriggerStates(state.targetSelector, true);

    // Update ARIA attributes
    element.setAttribute('aria-expanded', 'true');
    this._updateRelatedTriggers(state.targetSelector, true);

    // Set up global listeners for outside click capture or navigation link detection
    if (state.capture || state.closeOnNavigation) {
      this._setupGlobalListeners(element, state);
    }

    // Handle state transitions with animation
    if (state.animateToggle) {
      // Set opening state
      this.setAttr(state.target, 'target', ExtendedStates.OPENING);
      state.target.classList.add(Toggle.defaults.openClass);

      // Transition to fully open after animation
      state.transitionTimer = setTimeout(() => {
        this.setAttr(state.target, 'target', ExtendedStates.OPEN);
        state.transitionTimer = null;
      }, Toggle.defaults.transitionDuration);
    } else {
      // No animation - set open state immediately
      this.setAttr(state.target, 'target', ExtendedStates.OPEN);
      state.target.classList.add(Toggle.defaults.openClass);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:show', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:show', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle shown', { element, target: state.targetSelector });
  }

  /**
   * Hide/close the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  hide(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check current state to prevent transitions during animation
    const currentState = this.getAttr(state.target, 'target');
    if (currentState === ExtendedStates.CLOSING || currentState === ExtendedStates.CLOSED) {
      return;
    }

    // Update internal state for this trigger
    state.isOpen = false;

    // Update state for all triggers targeting the same element
    this._syncTriggerStates(state.targetSelector, false);

    // Update ARIA attributes
    element.setAttribute('aria-expanded', 'false');
    this._updateRelatedTriggers(state.targetSelector, false);

    // Remove global listeners
    this._removeGlobalListeners(state);

    // Handle state transitions with animation
    if (state.animateToggle) {
      // Set closing state
      this.setAttr(state.target, 'target', ExtendedStates.CLOSING);

      // Wait for animation before removing open class and setting closed state
      state.transitionTimer = setTimeout(() => {
        state.target.classList.remove(Toggle.defaults.openClass);
        this.setAttr(state.target, 'target', ExtendedStates.CLOSED);
        state.transitionTimer = null;
      }, Toggle.defaults.transitionDuration);
    } else {
      // No animation - set closed state immediately
      state.target.classList.remove(Toggle.defaults.openClass);
      this.setAttr(state.target, 'target', ExtendedStates.CLOSED);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:hide', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:hide', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle hidden', { element, target: state.targetSelector });
  }

  /**
   * Hide all non-manual toggles
   */
  hideAll() {
    // Get all mounted elements
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      const state = this.getState(element);
      if (state && state.isOpen && !state.manual) {
        this.hide(element);
      }
    });
  }

  /**
   * Check if a toggle is currently open
   * @param {HTMLElement} element - Trigger element
   * @returns {boolean} Whether the toggle is open
   */
  isOpen(element) {
    const state = this.getState(element);
    return state ? state.isOpen : false;
  }

  /**
   * Update ARIA attributes for related triggers
   * @private
   * @param {string} targetSelector - Target selector
   * @param {boolean} isOpen - Whether the toggle is open
   */
  _updateRelatedTriggers(targetSelector, isOpen) {
    const relatedTriggers = document.querySelectorAll(
      `[data-toggle-target="${targetSelector}"]`
    );
    relatedTriggers.forEach(trigger => {
      trigger.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /**
   * Set up global event listeners for outside click capture
   * @private
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _setupGlobalListeners(element, state) {
    // Handle clicks inside the target
    const targetClickHandler = e => {
      // Check for navigation links if closeOnNavigation is enabled
      if (state.closeOnNavigation && !state.manual && this._isNavigationLink(e.target)) {
        this.hide(element);
        return;
      }
      // Otherwise prevent clicks inside the target from closing
      e.stopPropagation();
    };

    // Close on outside click (only if not manual mode)
    const documentClickHandler = e => {
      if (!state.manual && !element.contains(e.target) && !state.target.contains(e.target)) {
        this.hide(element);
      }
    };

    state.target.addEventListener('click', targetClickHandler);
    document.addEventListener('click', documentClickHandler);

    // Store handlers for cleanup
    state.targetClickHandler = targetClickHandler;
    state.documentClickHandler = documentClickHandler;
  }

  /**
   * Remove global event listeners
   * @private
   * @param {Object} state - Component state
   */
  _removeGlobalListeners(state) {
    if (state.targetClickHandler) {
      state.target.removeEventListener('click', state.targetClickHandler);
      state.targetClickHandler = null;
    }

    if (state.documentClickHandler) {
      document.removeEventListener('click', state.documentClickHandler);
      state.documentClickHandler = null;
    }
  }

  /**
   * Check if an element is a navigation link that should trigger toggle closure
   * @private
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether the element is a navigation link
   */
  _isNavigationLink(element) {
    // Walk up the DOM tree to find a link element
    let current = element;
    while (current && current !== document.body) {
      if (current.tagName === 'A') {
        const href = current.getAttribute('href');
        // Check if it's a navigation link (has href and causes page navigation)
        if (href &&
            !href.startsWith('#') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !current.hasAttribute('download') &&
            current.getAttribute('target') !== '_blank') {
          return true;
        }
        break;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Clear transition timer
   * @private
   * @param {Object} state - Component state
   */
  _clearTransitionTimer(state) {
    if (state.transitionTimer) {
      clearTimeout(state.transitionTimer);
      state.transitionTimer = null;
    }
  }

  /**
   * Close other open toggles when multiple is disabled
   * @private
   * @param {HTMLElement} currentElement - Current trigger element
   */
  _closeOtherToggles(currentElement) {
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      if (element !== currentElement) {
        const state = this.getState(element);
        if (state && state.isOpen && !state.manual) {
          this.hide(element);
        }
      }
    });
  }

  /**
   * Sync state for all triggers targeting the same element
   * @private
   * @param {string} targetSelector - Target selector to sync
   * @param {boolean} isOpen - Whether the target is open
   */
  _syncTriggerStates(targetSelector, isOpen) {
    const triggers = document.querySelectorAll(
      `[data-toggle-target="${targetSelector}"][data-toggle-enhanced="true"]`
    );

    triggers.forEach(trigger => {
      const triggerState = this.getState(trigger);
      if (triggerState) {
        triggerState.isOpen = isOpen;
      }
    });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const triggers = document.querySelectorAll('[data-toggle-enhanced="true"]');
    let openCount = 0;
    let captureCount = 0;
    let manualCount = 0;

    triggers.forEach(trigger => {
      const state = this.getState(trigger);
      if (state) {
        if (state.isOpen) openCount++;
        if (state.capture) captureCount++;
        if (state.manual) manualCount++;
      }
    });

    return {
      totalTriggers: triggers.length,
      openCount,
      captureCount,
      manualCount,
      defaults: Toggle.defaults,
    };
  }

  /**
   * Enhance all toggle triggers on the page
   * @param {string} selector - CSS selector for toggle triggers
   * @param {Object} options - Component options
   * @returns {Toggle} Component instance
   */
  static enhanceAll(selector = '[data-toggle]', options) {
    const instance = new Toggle(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Toggle as default };
