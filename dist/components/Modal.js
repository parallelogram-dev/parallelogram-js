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
function generateId$1(prefix = 'elem') {
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
function createElement$1(tag, attributes = {}, content = '') {
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
    return generateId$1(prefix);
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
    return createElement$1(tag, attributes, content);
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
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */


/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
 * Modal - Modal dialog enhancement component
 * Works with PModal web component and data attributes for modal triggers
 * Follows new naming conventions: data-modal-* attributes
 *
 * @example
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal"
 *          data-modal-size="large"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * JavaScript (standalone):
 * import { Modal } from './components/Modal.js';
 * const modals = new Modal();
 * document.querySelectorAll('[data-modal]')
 *   .forEach(trigger => modals.mount(trigger));
 */


class Modal extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-modal';
  }

  /**
   * Default options for modal enhancement
   */
  static get defaults() {
    return {
      size: 'md', // Modal size: xs, sm, md, lg, xl, fullscreen
      closable: true, // Whether modal can be closed
      backdropClose: true, // Close on backdrop click
      keyboard: true, // Enable keyboard navigation
      focus: true, // Auto-focus when opened
      multiple: false, // Allow multiple modals
      appendTo: 'body', // Where to append modal elements
    };
  }

  /**
   * Initialize modal enhancement for a trigger element
   * @protected
   * @param {HTMLElement} element - Trigger element to enhance
   * @returns {import('../core/BaseComponent.js').ComponentState} Component state
   */
  _init(element) {
    const state = super._init(element);

    // Get configuration from data attributes
    // Note: getAttr automatically adds component prefix (data-modal-)
    const target = this.getAttr(element, 'target');
    const size = this.getAttr(element, 'size', Modal.defaults.size);
    const closable = this.getAttr(element, 'closable', Modal.defaults.closable);
    const backdropClose = this.getAttr(
      element,
      'backdrop-close',
      Modal.defaults.backdropClose
    );
    const keyboard = this.getAttr(element, 'keyboard', Modal.defaults.keyboard);
    const focus = this.getAttr(element, 'focus', Modal.defaults.focus);
    const multiple = this.getAttr(element, 'multiple', Modal.defaults.multiple);

    if (!target) {
      this.logger?.warn('Modal: No data-modal-target attribute found', element);
      return state;
    }

    // Find or create target modal
    let modalElement = document.querySelector(target);
    if (!modalElement) {
      this.logger?.warn('Modal: Target modal not found', { target, element });
      return state;
    }

    // Ensure it's an p-modal element
    if (modalElement.tagName.toLowerCase() !== 'p-modal') {
      this.logger?.warn('Modal: Target is not an p-modal element', { target, element });
      return state;
    }

    // Configure modal attributes
    this._configureModal(modalElement, {
      size,
      closable,
      backdropClose,
      keyboard,
    });

    // Store state
    state.target = target;
    state.modalElement = modalElement;
    state.size = size;
    state.closable = closable;
    state.backdropClose = backdropClose;
    state.keyboard = keyboard;
    state.focus = focus;
    state.multiple = multiple;

    // Set up event listeners
    element.addEventListener('click', this._handleTriggerClick.bind(this, element), {
      signal: state.controller.signal,
    });

    // Listen for modal events
    modalElement.addEventListener('modal:open', this._handleModalOpen.bind(this, element), {
      signal: state.controller.signal,
    });

    modalElement.addEventListener('modal:close', this._handleModalClose.bind(this, element), {
      signal: state.controller.signal,
    });

    // Set up ARIA attributes
    element.setAttribute('aria-haspopup', 'dialog');
    element.setAttribute('aria-expanded', 'false');
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', target.replace('#', ''));
    }

    this.logger?.info('Modal trigger initialized', {
      element,
      target,
      size,
      closable,
    });

    return state;
  }

  /**
   * Open a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Close other modals if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherModals(state.modalElement);
    }

    // Store the trigger element for focus restoration
    state.modalElement._triggerElement = triggerElement;

    // Open the modal - wait for custom element to be defined if needed
    if (typeof state.modalElement.open === 'function') {
      state.modalElement.open();
    } else {
      // Fallback: wait for custom element to be fully defined
      customElements.whenDefined('p-modal').then(() => {
        if (typeof state.modalElement.open === 'function') {
          state.modalElement.open();
        } else {
          this.logger?.error('PModal open method not available', state.modalElement);
        }
      });
    }
  }

  /**
   * Close a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  close(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (typeof state.modalElement.close === 'function') {
      state.modalElement.close();
    } else {
      this.logger?.error('PModal close method not available', state.modalElement);
    }
  }

  /**
   * Toggle a modal
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(triggerElement, force) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (force === true) {
      this.open(triggerElement);
    } else if (force === false) {
      this.close(triggerElement);
    } else {
      if (state.modalElement.hasAttribute('open')) {
        this.close(triggerElement);
      } else {
        this.open(triggerElement);
      }
    }
  }

  /**
   * Check if a modal is open
   * @param {HTMLElement} triggerElement - Trigger element
   * @returns {boolean} Whether modal is open
   */
  isOpen(triggerElement) {
    const state = this.getState(triggerElement);
    return state?.modalElement?.hasAttribute('open') || false;
  }

  /**
   * Configure modal element with data attributes
   * @private
   * @param {PModal} modalElement - Modal element
   * @param {Object} config - Configuration object
   */
  _configureModal(modalElement, config) {
    if (config.size) {
      this.setAttr(modalElement, 'size', config.size);
    }

    if (config.closable !== undefined) {
      this.setAttr(modalElement, 'closable', String(config.closable));
    }

    if (config.backdropClose !== undefined) {
      this.setAttr(modalElement, 'backdrop-close', String(config.backdropClose));
    }

    if (config.keyboard !== undefined) {
      this.setAttr(modalElement, 'keyboard', String(config.keyboard));
    }
  }

  /**
   * Handle trigger click
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Event} event - Click event
   */
  _handleTriggerClick(triggerElement, event) {
    event.preventDefault();
    this.open(triggerElement);
  }

  /**
   * Handle modal open event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal open event
   */
  _handleModalOpen(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'true');

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal opened', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Handle modal close event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal close event
   */
  _handleModalClose(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'false');

    // Restore focus to trigger
    const state = this.getState(triggerElement);
    if (state?.focus && event.detail.modal._triggerElement) {
      requestAnimationFrame(() => {
        event.detail.modal._triggerElement.focus();
      });
    }

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal closed', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Close other open modals
   * @private
   * @param {PModal} currentModal - Current modal to keep open
   */
  _closeOtherModals(currentModal) {
    const openModals = document.querySelectorAll('p-modal[open]');
    openModals.forEach(modal => {
      if (modal !== currentModal) {
        modal.close();
      }
    });
  }

  /**
   * Update modal configuration
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Object} newConfig - New configuration
   */
  updateConfig(triggerElement, newConfig) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Update state
    Object.assign(state, newConfig);

    // Update modal element
    this._configureModal(state.modalElement, newConfig);

    this.logger?.info('Modal configuration updated', { triggerElement, newConfig });
  }

  /**
   * Static method to enhance all modal triggers on the page
   * @param {string} [selector='[data-modal][data-modal-target]'] - CSS selector
   * @param {Object} [options] - Component options
   * @returns {Modal} Modal instance
   */
  static enhanceAll(selector = '[data-modal][data-modal-target]', options) {
    const instance = new Modal(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }

  /**
   * Static method to create a modal programmatically
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string} config.content - Modal content (HTML)
   * @param {Array} [config.actions] - Action buttons
   * @param {string} [config.size] - Modal size
   * @param {Object} [config.options] - Additional options
   * @returns {Promise<PModal>} Modal element
   */
  static async create({ title, content, actions = [], size = 'medium', options = {} }) {
    // Create modal element
    const modal = document.createElement('p-modal');
    modal.id = generateId('modal');

    // Configure attributes
    modal.setAttribute('data-modal-size', size);
    Object.entries(options).forEach(([key, value]) => {
      modal.setAttribute(`data-modal-${key}`, String(value));
    });

    // Create title
    if (title) {
      const titleElement = createElement('h2', { slot: 'title' }, title);
      modal.appendChild(titleElement);
    }

    // Create content
    if (content) {
      const contentElement = document.createElement('div');
      contentElement.innerHTML = content;
      modal.appendChild(contentElement);
    }

    // Create actions
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.slot = 'actions';

      actions.forEach(action => {
        const button = createElement(
          'button',
          {
            className: `btn btn--${action.type || 'secondary'}`,
            'data-modal-close': action.close !== false ? '' : undefined,
          },
          action.label
        );

        if (action.onClick) {
          button.addEventListener('click', action.onClick);
        }

        actionsContainer.appendChild(button);
      });

      modal.appendChild(actionsContainer);
    }

    // Append to document
    document.body.appendChild(modal);
  }
}

export { Modal as default };
