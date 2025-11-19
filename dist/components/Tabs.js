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
 * Tabs Component
 *
 * Progressive enhancement for tab navigation with accessibility and keyboard support.
 * Works with existing HTML structure and enhances it with tab functionality.
 *
 * @example
 * HTML:
 * <div data-tabs>
 *   <div data-tabs-list>
 *     <button data-tab="panel-1" aria-selected="true">Tab 1</button>
 *     <button data-tab="panel-2">Tab 2</button>
 *     <button data-tab="panel-3">Tab 3</button>
 *   </div>
 *   <div data-tabs-panels>
 *     <div id="panel-1" data-tab-panel>Panel 1 content</div>
 *     <div id="panel-2" data-tab-panel style="display: none;">Panel 2 content</div>
 *     <div id="panel-3" data-tab-panel style="display: none;">Panel 3 content</div>
 *   </div>
 * </div>
 *
 * JavaScript (standalone):
 * import { Tabs } from './components/Tabs.js';
 * const tabs = new Tabs();
 * document.querySelectorAll('[data-tabs]')
 *   .forEach(container => tabs.mount(container));
 */
class Tabs extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-tabs';
  }

  /**
   * Default configuration for tabs component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      activeClass: 'tab--active',
      panelActiveClass: 'tab-panel--active',
      defaultTab: null, // If null, uses first tab or aria-selected="true"
      keyboardNavigation: true,
      autoFocus: false,
      transitionDuration: 200,
      transitionClass: 'tab-panel--transitioning',
    };
  }

  /**
   * Initialize the tabs functionality on a container element
   * @param {HTMLElement} element - Container element with data-tabs attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Find tab elements
    const tabsList = element.querySelector('[data-tabs-list]');
    const tabsContainer = element.querySelector('[data-tabs-panels]');

    if (!tabsList || !tabsContainer) {
      this.logger?.warn(
        'Tabs: Missing required elements (data-tabs-list or data-tabs-panels)',
        element
      );
      return state;
    }

    const tabs = [...tabsList.querySelectorAll('[data-tab]')];
    const panels = [...tabsContainer.querySelectorAll('[data-tab-panel]')];

    if (tabs.length === 0 || panels.length === 0) {
      this.logger?.warn('Tabs: No tabs or panels found', element);
      return state;
    }

    // Get configuration from data attributes
    const defaultTab = this.getAttr(element, 'default-tab', Tabs.defaults.defaultTab);
    const keyboardNav = this.getAttr(
      element,
      'keyboard',
      Tabs.defaults.keyboardNavigation
    );
    const autoFocus = this.getAttr(element, 'autofocus', Tabs.defaults.autoFocus);

    // Store elements and config in state
    state.tabsList = tabsList;
    state.tabsContainer = tabsContainer;
    state.tabs = tabs;
    state.panels = panels;
    state.activeTab = null;
    state.activePanel = null;
    state.keyboardNavigation = keyboardNav;
    state.autoFocus = autoFocus;

    // Setup tabs
    this._setupTabs(element, state);

    // Set initial active tab
    const initialTab = this._getInitialTab(tabs, defaultTab);
    if (initialTab) {
      this._activateTab(element, initialTab.dataset.tab, state, false); // false = no animation on init
    }

    // Setup event listeners
    this._setupEventListeners(element, state);

    // Mark as enhanced
    this.setAttr(element, 'enhanced', 'true');
    element.classList.add('tabs--enhanced');

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this._removeEventListeners(element, state);
      this.removeAttr(element, 'enhanced');
      element.classList.remove('tabs--enhanced');
      originalCleanup();
    };

    this.eventBus?.emit('tabs:mount', {
      element,
      tabCount: tabs.length,
      panelCount: panels.length,
      timestamp: performance.now(),
    });

    this.logger?.info('Tabs initialized', {
      element,
      tabCount: tabs.length,
      panelCount: panels.length,
    });

    return state;
  }

  /**
   * Setup accessibility attributes and IDs for tabs
   */
  _setupTabs(element, state) {
    state.tabs.forEach((tab, index) => {
      // Setup tab attributes
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', '-1');

      // Generate IDs if needed
      if (!tab.id) {
        tab.id = generateId('tab');
      }

      // Find corresponding panel
      const panelId = tab.dataset.tab;
      const panel = state.panels.find(p => p.id === panelId);

      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        panel.setAttribute('tabindex', '0');
        /* Initialize panel with inactive state */
        if (!panel.getAttribute('data-tab-panel')) {
          panel.setAttribute('data-tab-panel', 'inactive');
        }
      }
    });

    // Setup tab list
    state.tabsList.setAttribute('role', 'tablist');
  }

  /**
   * Determine which tab should be active initially
   */
  _getInitialTab(tabs, defaultTab) {
    // Check for explicitly selected tab
    const selectedTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (selectedTab) return selectedTab;

    // Check for default tab by ID
    if (defaultTab) {
      const defaultTabElement = tabs.find(tab => tab.dataset.tab === defaultTab);
      if (defaultTabElement) return defaultTabElement;
    }

    // Fall back to first tab
    return tabs[0];
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners(element, state) {
    // Click handlers for tabs
    state.clickHandlers = new Map();
    state.keydownHandlers = new Map();

    state.tabs.forEach(tab => {
      const clickHandler = event => this._handleTabClick(event, element, state);
      const keydownHandler = event => this._handleKeyDown(event, element, state);

      tab.addEventListener('click', clickHandler);
      if (state.keyboardNavigation) {
        tab.addEventListener('keydown', keydownHandler);
      }

      state.clickHandlers.set(tab, clickHandler);
      state.keydownHandlers.set(tab, keydownHandler);
    });
  }

  /**
   * Remove event listeners
   */
  _removeEventListeners(element, state) {
    if (state.clickHandlers) {
      state.clickHandlers.forEach((handler, tab) => {
        tab.removeEventListener('click', handler);
      });
    }

    if (state.keydownHandlers) {
      state.keydownHandlers.forEach((handler, tab) => {
        tab.removeEventListener('keydown', handler);
      });
    }
  }

  /**
   * Handle tab click events
   */
  _handleTabClick(event, element, state) {
    event.preventDefault();
    const tab = event.currentTarget;
    const panelId = tab.dataset.tab;

    if (panelId && panelId !== state.activeTab) {
      this._activateTab(element, panelId, state, true);
    }
  }

  /**
   * Handle keyboard navigation
   */
  _handleKeyDown(event, element, state) {
    const currentIndex = state.tabs.findIndex(tab => tab === event.currentTarget);
    let targetIndex = -1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        targetIndex = (currentIndex + 1) % state.tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        targetIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        targetIndex = state.tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const panelId = event.currentTarget.dataset.tab;
        this._activateTab(element, panelId, state, true);
        return;
    }

    if (targetIndex >= 0) {
      const targetTab = state.tabs[targetIndex];
      if (state.autoFocus) {
        targetTab.focus();
      }
      this._activateTab(element, targetTab.dataset.tab, state, true);
    }
  }

  /**
   * Activate a specific tab and show its panel
   */
  async _activateTab(element, panelId, state, animate = true) {
    const targetTab = state.tabs.find(tab => tab.dataset.tab === panelId);
    const targetPanel = state.panels.find(panel => panel.id === panelId);

    if (!targetTab || !targetPanel) {
      this.logger?.warn('Tabs: Invalid tab or panel ID', { panelId, element });
      return;
    }

    const previousTab = state.activeTab;
    const previousPanel = state.activePanel;

    /* Update tab states */
    state.tabs.forEach(tab => {
      const isActive = tab.dataset.tab === panelId;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    /* Handle panel transition */
    if (animate && previousPanel && previousPanel !== targetPanel) {
      await this._transitionPanels(previousPanel, targetPanel, state);
    } else {
      /* Simple show/hide without animation */
      state.panels.forEach(panel => {
        const shouldShow = panel.id === panelId;
        panel.style.display = shouldShow ? '' : 'none';
        panel.setAttribute('data-tab-panel', shouldShow ? 'active' : 'inactive');
      });
    }

    // Update state
    state.activeTab = panelId;
    state.activePanel = targetPanel;

    // Focus management
    if (state.autoFocus) {
      targetTab.focus();
    }

    // Dispatch events
    this._dispatch(element, 'tabs:change', {
      activeTab: panelId,
      previousTab,
      tab: targetTab,
      panel: targetPanel,
    });

    this.eventBus?.emit('tabs:change', {
      element,
      activeTab: panelId,
      previousTab,
      tab: targetTab,
      panel: targetPanel,
      timestamp: performance.now(),
    });

    this.logger?.debug('Tab activated', { panelId, previousTab });
  }

  /**
   * Transition between panels with animation support
   */
  async _transitionPanels(fromPanel, toPanel, state) {
    const duration = Tabs.defaults.transitionDuration;

    /* Set transitioning state */
    fromPanel.setAttribute('data-tab-panel', 'transitioning');
    toPanel.setAttribute('data-tab-panel', 'transitioning');

    /* Show target panel */
    toPanel.style.display = '';

    /* Transition out current panel */
    fromPanel.style.opacity = '0';

    /* Wait for transition */
    await new Promise(resolve => setTimeout(resolve, duration / 2));

    /* Hide previous panel */
    fromPanel.style.display = 'none';
    fromPanel.setAttribute('data-tab-panel', 'inactive');
    fromPanel.style.opacity = '';

    /* Transition in new panel */
    toPanel.style.opacity = '0';
    requestAnimationFrame(() => {
      toPanel.style.transition = `opacity ${duration}ms ease-in-out`;
      toPanel.style.opacity = '1';
    });

    /* Cleanup after transition */
    setTimeout(() => {
      toPanel.style.transition = '';
      toPanel.style.opacity = '';
      toPanel.setAttribute('data-tab-panel', 'active');
    }, duration);
  }

  /**
   * Programmatically activate a tab
   * @param {HTMLElement} element - Tabs container
   * @param {string} panelId - ID of panel to activate
   */
  activateTab(element, panelId) {
    const state = this.getState(element);
    if (state) {
      this._activateTab(element, panelId, state, true);
    }
  }

  /**
   * Get the currently active tab
   * @param {HTMLElement} element - Tabs container
   * @returns {string|null} Active panel ID
   */
  getActiveTab(element) {
    const state = this.getState(element);
    return state ? state.activeTab : null;
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const containers = document.querySelectorAll('[data-tabs]');
    const enhancedContainers = [];
    let totalTabs = 0;
    let totalPanels = 0;

    containers.forEach(container => {
      const state = this.getState(container);
      if (state && this.hasAttr(container, 'enhanced')) {
        enhancedContainers.push(container);
        totalTabs += state.tabs.length;
        totalPanels += state.panels.length;
      }
    });

    return {
      containers: enhancedContainers.length,
      totalTabs,
      totalPanels,
      keyboardNavigationSupported: true,
      defaults: Tabs.defaults,
    };
  }

  /**
   * Enhance all tabs containers on the page
   * @param {string} selector - CSS selector for tabs containers
   * @param {Object} options - Component options
   * @returns {Tabs} Component instance
   */
  static enhanceAll(selector = '[data-tabs]', options) {
    const instance = new Tabs(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Tabs as default };
