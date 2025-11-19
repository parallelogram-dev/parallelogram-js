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
function debounce$1(func, wait = 300) {
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
    return debounce$1(func, wait);
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
 * Core lifecycle states - common to all components
 */
const ComponentStates = {
  /**
   * MOUNTED - Component has been initialized and is ready
   * This is the baseline "active" state for most components
   */
  MOUNTED: 'mounted',

  /**
   * ERROR - Component initialization or operation failed
   * Check console for error details
   */
  ERROR: 'error'};

/**
 * Extended states for specific component behaviors
 * Components can use these in addition to core states
 */
const ExtendedStates = {
  // Loading states (for Lazysrc, async components)
  LOADING: 'loading',
  LOADED: 'loaded',

  // Animation/reveal states (for Scrollreveal, transitions)
  HIDDEN: 'hidden',
  REVEALING: 'revealing',
  REVEALED: 'revealed',

  // Interactive states (for Toggle, Modal, etc.)
  OPEN: 'open',
  CLOSED: 'closed',
  OPENING: 'opening',
  CLOSING: 'closing',

  // Processing states (for forms, uploaders)
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  VALIDATING: 'validating',
  VALIDATED: 'validated',

  // Media states (for video, audio)
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
};

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
 * DataTable Component - Enhanced table functionality
 *
 * @example
 * <table data-datatable
 *        data-datatable-sortable="true"
 *        data-datatable-filterable="true"
 *        data-datatable-paginate="10">
 *   <thead>
 *     <tr>
 *       <th data-sort="name">Name</th>
 *       <th data-sort="date" data-sort-type="date">Date</th>
 *       <th data-sort="price" data-sort-type="number">Price</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr><td>John</td><td>2023-01-15</td><td>100</td></tr>
 *   </tbody>
 * </table>
 */
class DataTable extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-datatable';
  }

  static get defaults() {
    return {
      sortable: true,
      filterable: false,
      paginate: false,
      pageSize: 10,
      searchDelay: 300,
      sortIcons: {
        unsorted: '↕',
        asc: '↑',
        desc: '↓',
      },
    };
  }

  constructor(options = {}) {
    super(options);
    this.searchTimeout = null;
  }

  _init(element) {
    const state = super._init(element);

    /* Initialize with idle state */
    this.setState(element, ComponentStates.MOUNTED);

    /* Get configuration */
    const config = this._getConfiguration(element);

    /* Store original data */
    const rows = Array.from(element.querySelectorAll('tbody tr'));

    state.config = config;
    state.originalRows = rows;
    state.filteredRows = [...rows];
    state.currentSort = { column: null, direction: null };
    state.currentPage = 1;
    state.searchTerm = '';
    state.errorMessage = null;

    /* Set up functionality */
    if (config.sortable) this._setupSorting(element, state);
    if (config.filterable) this._setupFiltering(element, state);
    if (config.paginate) this._setupPagination(element, state);

    this._render(element, state);

    this.eventBus?.emit('datatable:mounted', { element, config });
    return state;
  }

  _getConfiguration(element) {
    return {
      sortable: this.getAttr(element, 'sortable', DataTable.defaults.sortable),
      filterable: this.getAttr(element, 'filterable', DataTable.defaults.filterable),
      paginate:
        parseInt(this.getAttr(element, 'paginate', DataTable.defaults.paginate)) ||
        false,
      pageSize: parseInt(
        this.getAttr(element, 'page-size', DataTable.defaults.pageSize)
      ),
      searchDelay: parseInt(
        this.getAttr(element, 'search-delay', DataTable.defaults.searchDelay)
      ),
    };
  }

  _setupSorting(element, state) {
    const headers = element.querySelectorAll('th[data-sort]');

    headers.forEach(header => {
      header.style.cursor = 'pointer';
      header.classList.add('sortable');

      const icon = createElement(
        'span',
        { className: 'sort-icon' },
        DataTable.defaults.sortIcons.unsorted
      );
      header.appendChild(icon);

      header.addEventListener('click', () => {
        this._handleSort(element, state, header);
      });
    });
  }

  _setupFiltering(element, state) {
    const searchId = generateId('datatable-search');

    const label = createElement('label', { className: 'form__label', htmlFor: searchId }, 'Search:');

    const searchInput = createElement('input', {
      type: 'text',
      id: searchId,
      placeholder: 'Search table...',
      className: 'form__control datatable-search',
    });

    const debouncedFilter = debounce(value => {
      this._handleFilter(element, state, value);
    }, state.config.searchDelay);

    searchInput.addEventListener('input', e => debouncedFilter(e.target.value));

    const fieldContainer = createElement('div', { className: 'form__field' });
    fieldContainer.appendChild(searchInput);

    const filterContainer = createElement('div', {
      className: 'form__element form__element--sm datatable-filter',
    });
    filterContainer.appendChild(label);
    filterContainer.appendChild(fieldContainer);

    element.parentNode.insertBefore(filterContainer, element);
  }

  _setupPagination(element, state) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'datatable__pagination';
    element.parentNode.appendChild(paginationContainer);
    state.paginationContainer = paginationContainer;
  }

  _handleSort(element, state, header) {
    const column = header.dataset.sort;
    const sortType = header.dataset.sortType || 'string';

    // Determine sort direction
    let direction = 'asc';
    if (state.currentSort.column === column && state.currentSort.direction === 'asc') {
      direction = 'desc';
    }

    // Update sort state
    state.currentSort = { column, direction };

    // Update header icons
    element.querySelectorAll('.sort-icon').forEach(icon => {
      icon.textContent = DataTable.defaults.sortIcons.unsorted;
    });

    const icon = header.querySelector('.sort-icon');
    icon.textContent = DataTable.defaults.sortIcons[direction];

    // Get headers for column index lookup
    const headers = Array.from(element.querySelectorAll('th'));

    // Sort the filtered rows
    state.filteredRows.sort((a, b) => {
      const aValue = this._getCellValue(a, column, sortType, headers);
      const bValue = this._getCellValue(b, column, sortType, headers);

      let result = 0;
      if (sortType === 'number') {
        result = parseFloat(aValue) - parseFloat(bValue);
      } else if (sortType === 'date') {
        result = new Date(aValue) - new Date(bValue);
      } else {
        result = aValue.localeCompare(bValue);
      }

      return direction === 'desc' ? -result : result;
    });

    state.currentPage = 1; // Reset to first page
    this._render(element, state);
  }

  _handleFilter(element, state, searchTerm) {
    state.searchTerm = searchTerm.toLowerCase();

    if (!searchTerm) {
      state.filteredRows = [...state.originalRows];
    } else {
      state.filteredRows = state.originalRows.filter(row => {
        return Array.from(row.cells).some(cell =>
          cell.textContent.toLowerCase().includes(state.searchTerm)
        );
      });
    }

    state.currentPage = 1; // Reset to first page
    this._render(element, state);
  }

  _getCellValue(row, column, sortType, headers = null) {
    // Null safety checks
    if (!row || !row.cells) {
      return '';
    }

    // Get headers if not provided
    if (!headers) {
      const table = row.closest('table');
      if (!table) {
        return '';
      }
      headers = Array.from(table.querySelectorAll('th'));
    }

    const columnIndex = headers.findIndex(h => h && h.dataset && h.dataset.sort === column);
    if (columnIndex === -1 || !row.cells[columnIndex]) {
      return '';
    }

    const cell = row.cells[columnIndex];
    return cell && cell.textContent ? cell.textContent.trim() : '';
  }

  _render(element, state) {
    const tbody = element.querySelector('tbody');

    // Clear current rows
    tbody.innerHTML = '';

    // Determine which rows to show
    let rowsToShow = state.filteredRows;

    if (state.config.paginate) {
      const start = (state.currentPage - 1) * state.config.pageSize;
      const end = start + state.config.pageSize;
      rowsToShow = state.filteredRows.slice(start, end);
    }

    // Add rows to table
    rowsToShow.forEach(row => tbody.appendChild(row.cloneNode(true)));

    // Update pagination
    if (state.config.paginate) {
      this._renderPagination(element, state);
    }

    // Emit event
    this.eventBus?.emit('datatable:rendered', {
      element,
      totalRows: state.originalRows.length,
      filteredRows: state.filteredRows.length,
      displayedRows: rowsToShow.length,
    });
  }

  _renderPagination(element, state) {
    const container = state.paginationContainer;
    const totalPages = Math.ceil(state.filteredRows.length / state.config.pageSize);

    container.innerHTML = '';

    if (totalPages <= 1) return;

    /* Previous button */
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        this._render(element, state);
      }
    });
    container.appendChild(prevBtn);

    /* Page numbers */
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.classList.toggle('active', i === state.currentPage);
      pageBtn.addEventListener('click', () => {
        state.currentPage = i;
        this._render(element, state);
      });
      container.appendChild(pageBtn);
    }

    /* Next button */
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        this._render(element, state);
      }
    });
    container.appendChild(nextBtn);
  }

  /**
   * Load data asynchronously from a URL
   * @param {HTMLElement} element - Table element
   * @param {string} url - URL to fetch data from
   * @param {Function} rowMapper - Function to convert data item to table row
   */
  async loadData(element, url, rowMapper) {
    const state = this.getState(element);
    if (!state) return;

    try {
      /* Set loading state */
      this.setState(element, ExtendedStates.LOADING);
      state.errorMessage = null;

      /* Fetch data */
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Response data must be an array');
      }

      /* Check for empty data */
      if (data.length === 0) {
        this.setState(element, 'empty');
        state.originalRows = [];
        state.filteredRows = [];
        this._render(element, state);
        this._dispatch(element, 'datatable:empty', { url });
        return;
      }

      /* Convert data to table rows using mapper function */
      const tbody = element.querySelector('tbody');
      tbody.innerHTML = '';

      const rows = data.map(item => rowMapper(item));
      state.originalRows = rows;
      state.filteredRows = [...rows];
      state.currentPage = 1;

      /* Set loaded state */
      this.setState(element, ExtendedStates.LOADED);

      /* Render the table */
      this._render(element, state);

      /* Dispatch success event */
      this._dispatch(element, 'datatable:loaded', {
        url,
        rowCount: data.length,
      });

      this.eventBus?.emit('datatable:loaded', {
        element,
        url,
        rowCount: data.length,
      });
    } catch (error) {
      /* Set error state */
      this.setState(element, ComponentStates.ERROR);
      this.setAttr(element, 'error-message', error.message);
      state.errorMessage = error.message;

      /* Dispatch error event */
      this._dispatch(element, 'datatable:error', {
        error,
        url,
        message: error.message,
      });

      this.eventBus?.emit('datatable:error', {
        element,
        error,
        url,
        message: error.message,
      });

      this.logger?.error('DataTable: Failed to load data', { error, url });
    }
  }

  /**
   * Clear error state and return to normal
   * @param {HTMLElement} element - Table element
   */
  clearError(element) {
    const state = this.getState(element);
    if (!state) return;

    state.errorMessage = null;
    this.removeAttr(element, 'error-message');
    this.setState(element, ComponentStates.MOUNTED);
  }

  // Public API methods
  sort(element, column, direction = 'asc') {
    const state = this.getState(element);
    if (!state) return;

    const header = element.querySelector(`th[data-sort="${column}"]`);
    if (header) {
      state.currentSort = { column, direction };
      this._handleSort(element, state, header);
    }
  }

  filter(element, searchTerm) {
    const state = this.getState(element);
    if (!state) return;

    this._handleFilter(element, state, searchTerm);
  }

  goToPage(element, page) {
    const state = this.getState(element);
    if (!state || !state.config.paginate) return;

    const totalPages = Math.ceil(state.filteredRows.length / state.config.pageSize);
    if (page >= 1 && page <= totalPages) {
      state.currentPage = page;
      this._render(element, state);
    }
  }

  static enhanceAll(selector = '[data-datatable]', options) {
    const instance = new DataTable(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export { DataTable, DataTable as default };
