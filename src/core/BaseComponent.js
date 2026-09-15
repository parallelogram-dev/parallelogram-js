import {
  camelCase,
  getDataAttr,
  generateId,
  debounce,
  throttle,
  delay,
  waitForTransition,
  fadeIn,
  fadeOut,
  getFocusableElements,
  trapFocus,
  restoreFocus,
  createElement,
} from '../utils/dom-utils.js';

const classesWarnedAboutSelector = new WeakSet();

/**
 * A component's state for one mounted element: the object `_init` returns, which subclasses extend
 * with their own entries
 *
 * @typedef {{ controller: AbortController, cleanup: () => void, [key: string]: unknown }} ComponentState
 */

/**
 * What the framework passes to the components it creates
 *
 * @typedef {Object} ComponentContext
 * @property {import('../managers/EventManager.js').EventManager} [eventBus]
 * @property {import('./DevLogger.js').DevLogger} [logger]
 * @property {import('../managers/RouterManager.js').RouterManager | null} [router]
 * @property {import('./ComponentHost.js').RegistryEntry} [config] - The registry entry the
 *   component was loaded from
 */

/**
 * BaseComponent - Production-ready base class with state management
 *
 * Provides lifecycle helpers, state tracking per element, data-attribute
 * parsing, and event dispatching. Components should extend this class and
 * implement _init(element) and optionally update(element).
 */
export class BaseComponent {
  /**
   * @param {ComponentContext} [context]
   */
  constructor({ eventBus, logger, router } = {}) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    /** @type {Map<HTMLElement, ComponentState>} Mounted elements and their state */
    this.elements = new Map();
    // Backward-compat alias for older components expecting `states`
    this.states = this.elements;
    /**
     * Elements whose asynchronous _init is still running
     *
     * @internal
     * @type {Map<HTMLElement, Promise<void>>}
     */
    this._initializing = new Map();
    /**
     * Controllers created by the base _init
     *
     * @internal
     * @type {WeakMap<HTMLElement, AbortController>}
     */
    this._controllers = new WeakMap();
  }

  /**
   * Mount the component on an element, or call update() if it is already mounted.
   *
   * If _init throws, the element is not tracked and its abort signal is aborted
   * before the error is rethrown. An _init that returns a Promise is tracked
   * straight away, and its state is stored once the Promise resolves.
   *
   * @param {HTMLElement} element
   * @returns {void}
   */
  mount(element) {
    if (this.elements.has(element) || this._initializing.has(element)) {
      return this.update(element);
    }

    let state;
    try {
      state = this._init(element);
    } catch (error) {
      this._abortController(element);
      throw error;
    }

    if (typeof state?.then !== 'function') {
      this.elements.set(element, state);
      return;
    }

    const pending = Promise.resolve(state).then(
      resolved => {
        if (this._initializing.get(element) !== pending) {
          this._cleanupLate(element, resolved);
          return;
        }
        this._initializing.delete(element);
        this.elements.set(element, resolved);
      },
      error => {
        if (this._initializing.get(element) === pending) {
          this._initializing.delete(element);
          this._abortController(element);
        }
        this.logger?.error('Component failed to initialize', { element, error });
      }
    );
    this._initializing.set(element, pending);
  }

  /**
   * Called by mount() for an element the component is already mounted on
   *
   * @param {HTMLElement} _element
   * @returns {void}
   */
  update(_element) {
    // Override in subclasses for update logic
  }

  /**
   * Unmount the component from an element.
   *
   * The state's cleanup() runs and the element's abort signal is aborted
   * afterwards, even if cleanup throws.
   *
   * @param {HTMLElement} element
   * @returns {void}
   */
  unmount(element) {
    if (this._initializing.has(element)) {
      this._initializing.delete(element);
      this._abortController(element);
      return;
    }

    const state = this.elements.get(element);
    if (!state) return;

    this.elements.delete(element);
    this._controllers.delete(element);
    this._runCleanup(state);
  }

  /**
   * Unmount the component from every element it is mounted on
   *
   * @returns {void}
   */
  destroy() {
    for (const element of this.trackedElements()) {
      this.unmount(element);
    }
  }

  /**
   * Elements this component is mounted on, including ones still initializing.
   *
   * @returns {HTMLElement[]}
   */
  trackedElements() {
    return [...this.elements.keys(), ...this._initializing.keys()];
  }

  /**
   * @deprecated 0.5.0 Use trackedElements() instead. Will be removed in 0.6.0.
   * @protected
   * @returns {Set<HTMLElement>}
   */
  _elementsKeys() {
    return new Set(this.trackedElements());
  }

  /** @internal */
  _runCleanup(state) {
    try {
      state?.cleanup?.();
    } finally {
      state?.controller?.abort();
    }
  }

  /** @internal */
  _cleanupLate(element, state) {
    try {
      this._runCleanup(state);
    } catch (error) {
      this.logger?.error('Component cleanup failed', { element, error });
    }
  }

  /** @internal */
  _abortController(element) {
    this._controllers.get(element)?.abort();
    this._controllers.delete(element);
  }

  /**
   * Initialize per-element state. Called by mount() the first time an element
   * is encountered; the returned object is stored in this.elements (a Map)
   * and retrieved later by getState() / unmount().
   *
   * Subclasses MUST override and return a ComponentState object. The returned
   * state's cleanup() will be invoked by unmount() and is responsible for
   * releasing every per-element resource the component allocated (listeners,
   * observers, timers, DOM nodes, etc).
   *
   * Recommended pattern — call super._init(element) to inherit the base
   * AbortController, then extend the returned state and
   * wrap cleanup so the base teardown still runs:
   *
   *   _init(element) {
   *     const state = super._init(element);
   *     const baseCleanup = state.cleanup;
   *
   *     element.addEventListener('click', this._onClick, { signal: state.controller.signal });
   *     state.observer = new ResizeObserver(...);
   *     state.observer.observe(element);
   *
   *     state.cleanup = () => {
   *       state.observer.disconnect();
   *       baseCleanup();   // aborts the controller
   *     };
   *     return state;
   *   }
   *
   * Listeners attached with { signal: state.controller.signal } are removed
   * automatically when baseCleanup() runs — no manual removeEventListener()
   * calls needed.
   *
   * @protected
   * @param {HTMLElement} element - Element being mounted
   * @returns {ComponentState} State stored in this.elements for the element
   */
  _init(element) {
    const controller = new AbortController();
    this._controllers.set(element, controller);
    return { cleanup: () => controller.abort(), controller };
  }

  /**
   * The component's JavaScript state for a mounted element: the object `_init` returned, with its
   * controller and cleanup
   *
   * This is not the `data-<component>-state` attribute; read that with getElementState() and write it
   * with setState().
   *
   * @param {HTMLElement} element
   * @returns {ComponentState|undefined}
   */
  getState(element) {
    return this.elements.get(element);
  }

  /**
   * @deprecated 0.5.0 Reads an unprefixed `data-<attr>` and guesses its type. Use getAttr(),
   * getBoolAttr() or getNumberAttr(), which read `data-<component>-<attr>`. Removed in 0.6.0.
   * @protected
   * @param {HTMLElement} element
   * @param {string} attr
   * @param {unknown} [defaultValue]
   * @returns {unknown}
   */
  _getDataAttr(element, attr, defaultValue) {
    return getDataAttr(element, attr, defaultValue);
  }

  /**
   * @protected
   * @param {string} str
   * @returns {string}
   */
  _camelCase(str) {
    return camelCase(str);
  }

  /**
   * @protected
   * @template {(...args: any[]) => void} F
   * @param {F} func
   * @param {number} [wait=300] - Milliseconds to wait after the last call
   * @returns {(...args: Parameters<F>) => void}
   */
  _debounce(func, wait = 300) {
    return debounce(func, wait);
  }

  /**
   * @protected
   * @template {(...args: any[]) => void} F
   * @param {F} func
   * @param {number} [limit=100] - Milliseconds between calls
   * @returns {(...args: Parameters<F>) => void}
   */
  _throttle(func, limit = 100) {
    return throttle(func, limit);
  }

  /**
   * @protected
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return delay(ms);
  }

  /**
   * Get target element from data attribute with validation
   * Supports both CSS selectors (data-*-target="#id") and data-view lookups (data-*-target-view="viewname")
   *
   * @protected
   * @param {HTMLElement} element - Element containing the data attribute
   * @param {string} dataAttr - Data attribute name (without 'data-' prefix)
   * @param {Object} [options] - Options for validation
   * @param {boolean} [options.required] - Whether to warn if not found
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
          attribute: viewAttr,
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
   *
   * Each value is converted to the type of the matching entry in
   * `static defaults`: boolean defaults are read with getBoolAttr(), number
   * defaults with getNumberAttr(), and everything else as a string.
   *
   * @protected
   * @param {HTMLElement} element - Element with data attributes
   * @param {Record<string, string>} mapping - Map of config keys to short attribute names (without component prefix)
   * @returns {Record<string, string|number|boolean|null>} Configuration object
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
      if (typeof defaultValue === 'boolean') {
        config[key] = this.getBoolAttr(element, attrName, defaultValue);
      } else if (typeof defaultValue === 'number') {
        config[key] = this.getNumberAttr(element, attrName, defaultValue);
      } else {
        config[key] = this.getAttr(element, attrName, defaultValue);
      }
    }
    return config;
  }

  /**
   * Validate and require state exists before proceeding
   * @protected
   * @param {HTMLElement} element - Element to get state for
   * @param {string} [methodName] - Name of calling method for error messages
   * @returns {ComponentState|undefined} State object, or undefined after logging a warning
   */
  _requireState(element, methodName = 'method') {
    const state = this.getState(element);
    if (!state) {
      this.logger?.warn(`${methodName}: No state found for element`, element);
    }
    return state;
  }

  /**
   * @protected
   * @param {string} [prefix='elem']
   * @returns {string}
   */
  _generateId(prefix = 'elem') {
    return generateId(prefix);
  }

  /**
   * @protected
   * @param {HTMLElement} element
   * @param {number} [timeout=2000] - Longest wait in milliseconds
   * @returns {Promise<void>}
   */
  async _waitForTransition(element, timeout = 2000) {
    return waitForTransition(element, timeout);
  }

  /**
   * @protected
   * @param {HTMLElement} element
   * @param {number} [duration=300] - Milliseconds
   * @returns {Promise<void>}
   */
  async _fadeIn(element, duration = 300) {
    return fadeIn(element, duration);
  }

  /**
   * @protected
   * @param {HTMLElement} element
   * @param {number} [duration=300] - Milliseconds
   * @returns {Promise<void>}
   */
  async _fadeOut(element, duration = 300) {
    return fadeOut(element, duration);
  }

  /**
   * @protected
   * @param {ParentNode} [container=document]
   * @returns {HTMLElement[]}
   */
  _getFocusableElements(container = document) {
    return getFocusableElements(container);
  }

  /**
   * @protected
   * @param {HTMLElement} container
   * @param {KeyboardEvent} event - The Tab keydown event
   * @returns {void}
   */
  _trapFocus(container, event) {
    return trapFocus(container, event);
  }

  /**
   * @protected
   * @param {HTMLElement|null} element
   * @returns {void}
   */
  _restoreFocus(element) {
    return restoreFocus(element);
  }

  /**
   * @protected
   * @param {string} tag
   * @param {Record<string, string>} [attributes]
   * @param {string|HTMLElement} [content] - Text content or a child element
   * @returns {HTMLElement}
   */
  _createElement(tag, attributes = {}, content = '') {
    return createElement(tag, attributes, content);
  }

  /**
   * Dispatch a bubbling, cancelable CustomEvent on an element, and emit it on the event bus with the
   * element added to its detail
   *
   * @protected
   * @template {Record<string, unknown>} [T=Record<string, unknown>]
   * @param {HTMLElement} element
   * @param {string} eventType
   * @param {T} [detail]
   * @returns {CustomEvent<T>}
   */
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
   * The component's data attribute name, such as `data-toggle`
   *
   * Read from `static selector` on the component class, written as `'data-toggle'`, `'toggle'` or
   * `'[data-toggle]'`. Without one the name comes from the class name, which minifiers change, so a
   * warning is logged once per class.
   *
   * @protected
   * @returns {string}
   */
  _getSelector() {
    if (this._selector) return this._selector;

    const declared = this.constructor.selector;
    if (declared) {
      const name = String(declared).replace(/^\[|\]$/g, '');
      this._selector = name.startsWith('data-') ? name : `data-${name}`;
      return this._selector;
    }

    const className = this.constructor.name;
    if (!classesWarnedAboutSelector.has(this.constructor)) {
      classesWarnedAboutSelector.add(this.constructor);
      this.logger?.warn(
        `${className || 'A component'} has no static selector, so its data attribute is derived from a class name that minifiers can change. Declare static selector = 'data-…'.`
      );
    }

    const kebab = className.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    this._selector = `data-${kebab}`;
    return this._selector;
  }

  /**
   * Set an element's state in `data-<component>-state`
   *
   * The value is also copied to the component's own `data-<component>` attribute, as before 0.5.0.
   * That copy is deprecated and stops in 0.6.0; style and query the `-state` attribute instead.
   *
   * @param {HTMLElement} element
   * @param {string} state
   * @example
   * this.setState(element, ExtendedStates.OPEN); // <div data-datatable-state="open">
   */
  setState(element, state) {
    const attribute = this._getSelector();
    element.setAttribute(`${attribute}-state`, state);
    element.setAttribute(attribute, state);
  }

  /**
   * An element's state from `data-<component>-state`, or from the deprecated copy in
   * `data-<component>` when the state attribute is missing
   *
   * @param {HTMLElement} element
   * @returns {string|null}
   */
  getElementState(element) {
    const attribute = this._getSelector();
    return element.getAttribute(`${attribute}-state`) ?? element.getAttribute(attribute);
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
   *
   * Always returns the raw string when the attribute is present. Use
   * getBoolAttr() or getNumberAttr() for flags and numbers, because the
   * string "false" is truthy.
   *
   * @template [T=null]
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @param {T} [defaultValue=null] - Value when the attribute doesn't exist
   * @returns {string|T} Attribute value, or the default
   * @example
   * const duration = this.getAttr(element, 'duration', '300'); // "300"
   */
  getAttr(element, attr, defaultValue = null) {
    const value = element.getAttribute(`${this._getSelector()}-${attr}`);
    return value !== null ? value : defaultValue;
  }

  /**
   * Get a boolean component attribute (data-<component>-<attr>)
   *
   * A missing attribute returns the default. "false" and "0" (in any case)
   * mean false; any other value, including an empty attribute, means true.
   *
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @param {boolean|null} [defaultValue=false] - Value when the attribute is missing
   * @returns {boolean|null}
   * @example
   * // <div data-toggle-animate="false">
   * this.getBoolAttr(element, 'animate', true); // false
   */
  getBoolAttr(element, attr, defaultValue = false) {
    const value = this.getAttr(element, attr);
    if (value === null) return defaultValue;
    return !['false', '0'].includes(value.trim().toLowerCase());
  }

  /**
   * Get a numeric component attribute (data-<component>-<attr>)
   *
   * Returns the default when the attribute is missing, empty or not a finite number.
   *
   * @param {HTMLElement} element - Target element
   * @param {string} attr - Attribute name (without data- prefix)
   * @param {number|null} [defaultValue=null] - Value when the attribute is missing or invalid
   * @returns {number|null}
   * @example
   * // <div data-scrollhide-scroll-threshold="80">
   * this.getNumberAttr(element, 'scroll-threshold', 50); // 80
   */
  getNumberAttr(element, attr, defaultValue = null) {
    const value = this.getAttr(element, attr);
    if (value === null || value.trim() === '') return defaultValue;
    const number = Number(value);
    return Number.isFinite(number) ? number : defaultValue;
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
