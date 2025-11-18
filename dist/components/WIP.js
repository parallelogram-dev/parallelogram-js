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

// ==========================================
// DataTable Component
// ==========================================


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

    // Get configuration
    const config = this._getConfiguration(element);

    // Store original data
    const rows = Array.from(element.querySelectorAll('tbody tr'));

    state.config = config;
    state.originalRows = rows;
    state.filteredRows = [...rows];
    state.currentSort = { column: null, direction: null };
    state.currentPage = 1;
    state.searchTerm = '';

    // Set up functionality
    if (config.sortable) this._setupSorting(element, state);
    if (config.filterable) this._setupFiltering(element, state);
    if (config.paginate) this._setupPagination(element, state);

    this._render(element, state);

    this.eventBus?.emit('datatable:mounted', { element, config });
    return state;
  }

  _getConfiguration(element) {
    return {
      sortable: this._getDataAttr(element, 'datatable-sortable', DataTable.defaults.sortable),
      filterable: this._getDataAttr(element, 'datatable-filterable', DataTable.defaults.filterable),
      paginate:
        parseInt(this._getDataAttr(element, 'datatable-paginate', DataTable.defaults.paginate)) ||
        false,
      pageSize: parseInt(
        this._getDataAttr(element, 'datatable-page-size', DataTable.defaults.pageSize)
      ),
      searchDelay: parseInt(
        this._getDataAttr(element, 'datatable-search-delay', DataTable.defaults.searchDelay)
      ),
    };
  }

  _setupSorting(element, state) {
    const headers = element.querySelectorAll('th[data-sort]');

    headers.forEach(header => {
      header.style.cursor = 'pointer';
      header.classList.add('sortable');

      const icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.textContent = DataTable.defaults.sortIcons.unsorted;
      header.appendChild(icon);

      header.addEventListener('click', () => {
        this._handleSort(element, state, header);
      });
    });
  }

  _setupFiltering(element, state) {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'datatable-filter';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search table...';
    searchInput.className = 'datatable-search';

    searchInput.addEventListener('input', e => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this._handleFilter(element, state, e.target.value);
      }, state.config.searchDelay);
    });

    filterContainer.appendChild(searchInput);
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

    // Sort the filtered rows
    state.filteredRows.sort((a, b) => {
      const aValue = this._getCellValue(a, column, sortType);
      const bValue = this._getCellValue(b, column, sortType);

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

  _getCellValue(row, column, sortType) {
    const headers = Array.from(row.closest('table').querySelectorAll('th'));
    const columnIndex = headers.findIndex(h => h.dataset.sort === column);
    const cell = row.cells[columnIndex];
    return cell ? cell.textContent.trim() : '';
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

    // Previous button
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

    // Page numbers
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

    // Next button
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

// ==========================================
// FormValidator Component
// ==========================================

/**
 * FormValidator Component - Real-time form validation
 *
 * @example
 * <form data-form-validator>
 *   <input data-validate="required|email"
 *          data-validate-message="Please enter a valid email"
 *          name="email">
 *   <div data-error-for="email"></div>
 * </form>
 */
class FormValidator extends BaseComponent {
  static get defaults() {
    return {
      validateOnInput: true,
      validateOnBlur: true,
      showErrorsImmediately: false,
      errorClass: 'error',
      validClass: 'valid',
      debounceMs: 300,
    };
  }

  static get rules() {
    return {
      required: value => value.trim().length > 0,
      email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      min: (value, param) => value.length >= parseInt(param),
      max: (value, param) => value.length <= parseInt(param),
      minnum: (value, param) => parseFloat(value) >= parseFloat(param),
      maxnum: (value, param) => parseFloat(value) <= parseFloat(param),
      number: value => !isNaN(parseFloat(value)) && isFinite(value),
      url: value => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      pattern: (value, param) => new RegExp(param).test(value),
    };
  }

  constructor(options = {}) {
    super(options);
    this.debounceTimers = new Map();
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const fields = this._getValidatedFields(element);

    state.config = config;
    state.fields = fields;
    state.errors = new Map();
    state.touched = new Set();

    // Set up event listeners
    fields.forEach(field => this._setupFieldValidation(field, state));

    // Form submission handler
    element.addEventListener('submit', e => {
      this._handleSubmit(e, element, state);
    });

    this.eventBus?.emit('form-validator:mounted', { element, fieldCount: fields.length });
    return state;
  }

  _getConfiguration(element) {
    return {
      validateOnInput: this._getDataAttr(
        element,
        'validate-on-input',
        FormValidator.defaults.validateOnInput
      ),
      validateOnBlur: this._getDataAttr(
        element,
        'validate-on-blur',
        FormValidator.defaults.validateOnBlur
      ),
      showErrorsImmediately: this._getDataAttr(
        element,
        'show-errors-immediately',
        FormValidator.defaults.showErrorsImmediately
      ),
      debounceMs: parseInt(
        this._getDataAttr(element, 'validate-debounce', FormValidator.defaults.debounceMs)
      ),
    };
  }

  _getValidatedFields(element) {
    return Array.from(element.querySelectorAll('[data-validate]'));
  }

  _setupFieldValidation(field, state) {
    const fieldName = field.name || field.id;

    if (state.config.validateOnInput) {
      field.addEventListener('input', () => {
        this._debounceValidation(field, state, fieldName);
      });
    }

    if (state.config.validateOnBlur) {
      field.addEventListener('blur', () => {
        state.touched.add(fieldName);
        this._validateField(field, state);
      });
    }

    field.addEventListener('focus', () => {
      this._clearFieldError(field, state);
    });
  }

  _debounceValidation(field, state, fieldName) {
    clearTimeout(this.debounceTimers.get(fieldName));

    this.debounceTimers.set(
      fieldName,
      setTimeout(() => {
        if (state.touched.has(fieldName) || state.config.showErrorsImmediately) {
          this._validateField(field, state);
        }
      }, state.config.debounceMs)
    );
  }

  _validateField(field, state) {
    const rules = field.dataset.validate.split('|');
    const value = field.value;
    const fieldName = field.name || field.id;

    for (const rule of rules) {
      const [ruleName, param] = rule.split(':');
      const validator = FormValidator.rules[ruleName];

      if (validator && !validator(value, param)) {
        const message = this._getErrorMessage(field, ruleName, param);
        this._showFieldError(field, state, message);
        state.errors.set(fieldName, message);
        return false;
      }
    }

    this._showFieldValid(field, state);
    state.errors.delete(fieldName);
    return true;
  }

  _getErrorMessage(field, ruleName, param) {
    // Custom message from data attribute
    const customMessage = field.dataset.validateMessage;
    if (customMessage) return customMessage;

    // Default messages
    const messages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      min: `Minimum ${param} characters required`,
      max: `Maximum ${param} characters allowed`,
      minnum: `Value must be at least ${param}`,
      maxnum: `Value must be no more than ${param}`,
      number: 'Please enter a valid number',
      url: 'Please enter a valid URL',
      pattern: 'Invalid format',
    };

    return messages[ruleName] || 'Invalid value';
  }

  _showFieldError(field, state, message) {
    field.classList.add(state.config.errorClass);
    field.classList.remove(state.config.validClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  _showFieldValid(field, state) {
    field.classList.remove(state.config.errorClass);
    field.classList.add(state.config.validClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  _clearFieldError(field, state) {
    field.classList.remove(state.config.errorClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  _getErrorContainer(field) {
    const fieldName = field.name || field.id;
    return document.querySelector(`[data-error-for="${fieldName}"]`);
  }

  _handleSubmit(e, element, state) {
    let isValid = true;

    // Validate all fields
    state.fields.forEach(field => {
      const fieldName = field.name || field.id;
      state.touched.add(fieldName);

      if (!this._validateField(field, state)) {
        isValid = false;
      }
    });

    if (!isValid) {
      e.preventDefault();

      this.eventBus?.emit('form-validator:submit-blocked', {
        element,
        errors: Array.from(state.errors.entries()),
      });
    } else {
      this.eventBus?.emit('form-validator:submit-valid', { element });
    }
  }

  // Public API
  validate(element) {
    const state = this.getState(element);
    if (!state) return false;

    let isValid = true;
    state.fields.forEach(field => {
      if (!this._validateField(field, state)) {
        isValid = false;
      }
    });

    return isValid;
  }

  getErrors(element) {
    const state = this.getState(element);
    return state ? Array.from(state.errors.entries()) : [];
  }

  static enhanceAll(selector = '[data-form-validator]', options) {
    const instance = new FormValidator(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

// ==========================================
// CopyToClipboard Component
// ==========================================

/**
 * CopyToClipboard Component - Copy text to clipboard
 *
 * @example
 * <button data-copy-to-clipboard data-copy-target="#code-block">Copy Code</button>
 * <pre id="code-block">logger?.info('Hello World');</pre>
 */
class CopyToClipboard extends BaseComponent {
  static get defaults() {
    return {
      successMessage: 'Copied!',
      errorMessage: 'Copy failed',
      successDuration: 2000,
      successClass: 'copy-success',
      errorClass: 'copy-error',
    };
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const target = this._getTarget(element);

    state.config = config;
    state.target = target;
    state.originalText = element.textContent;

    element.addEventListener('click', e => {
      e.preventDefault();
      this._handleCopy(element, state);
    });

    this.eventBus?.emit('copy-to-clipboard:mounted', { element, target });
    return state;
  }

  _getConfiguration(element) {
    return {
      successMessage: this._getDataAttr(
        element,
        'copy-success-message',
        CopyToClipboard.defaults.successMessage
      ),
      errorMessage: this._getDataAttr(
        element,
        'copy-error-message',
        CopyToClipboard.defaults.errorMessage
      ),
      successDuration: parseInt(
        this._getDataAttr(
          element,
          'copy-success-duration',
          CopyToClipboard.defaults.successDuration
        )
      ),
      successClass: this._getDataAttr(
        element,
        'copy-success-class',
        CopyToClipboard.defaults.successClass
      ),
      errorClass: this._getDataAttr(
        element,
        'copy-error-class',
        CopyToClipboard.defaults.errorClass
      ),
    };
  }

  _getTarget(element) {
    const targetSelector = element.dataset.copyTarget;
    const textContent = element.dataset.copyText;

    if (textContent) {
      return { type: 'text', content: textContent };
    } else if (targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        return { type: 'element', element: targetElement };
      }
    }

    return { type: 'text', content: element.textContent };
  }

  async _handleCopy(element, state) {
    try {
      let textToCopy = '';

      if (state.target.type === 'text') {
        textToCopy = state.target.content;
      } else if (state.target.type === 'element') {
        // Try to get text content, fallback to input value
        textToCopy = state.target.element.value || state.target.element.textContent;
      }

      if (!textToCopy) {
        throw new Error('No text to copy');
      }

      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        this._fallbackCopy(textToCopy);
      }

      this._showSuccess(element, state);

      this.eventBus?.emit('copy-to-clipboard:success', {
        element,
        text: textToCopy,
      });
    } catch (error) {
      this._showError(element, state);

      this.eventBus?.emit('copy-to-clipboard:error', {
        element,
        error: error.message,
      });
    }
  }

  _fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  _showSuccess(element, state) {
    element.textContent = state.config.successMessage;
    element.classList.add(state.config.successClass);
    element.disabled = true;

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.successClass);
      element.disabled = false;
    }, state.config.successDuration);
  }

  _showError(element, state) {
    element.textContent = state.config.errorMessage;
    element.classList.add(state.config.errorClass);

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.errorClass);
    }, state.config.successDuration);
  }

  static enhanceAll(selector = '[data-copy-to-clipboard]', options) {
    const instance = new CopyToClipboard(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

// ==========================================
// Lightbox Component
// ==========================================

/**
 * Lightbox Component - Image/media gallery viewer
 *
 * @example
 * <a data-lightbox="gallery" href="large1.jpg">
 *   <img src="thumb1.jpg" alt="Image 1">
 * </a>
 * <a data-lightbox="gallery" href="large2.jpg">
 *   <img src="thumb2.jpg" alt="Image 2">
 * </a>
 */
class Lightbox extends BaseComponent {
  static get defaults() {
    return {
      closeOnEscape: true,
      closeOnBackdrop: true,
      showCounter: true,
      showNavigation: true,
      keyNavigation: true,
      animationDuration: 300,
    };
  }

  constructor(options = {}) {
    super(options);
    this.lightboxElement = null;
    this.currentGallery = [];
    this.currentIndex = 0;
    this.isOpen = false;
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const gallery = element.dataset.lightbox;

    state.config = config;
    state.gallery = gallery;

    element.addEventListener('click', e => {
      e.preventDefault();
      this._openLightbox(element, state);
    });

    this.eventBus?.emit('lightbox:mounted', { element, gallery });
    return state;
  }

  _getConfiguration(element) {
    return {
      closeOnEscape: this._getDataAttr(
        element,
        'lightbox-close-escape',
        Lightbox.defaults.closeOnEscape
      ),
      closeOnBackdrop: this._getDataAttr(
        element,
        'lightbox-close-backdrop',
        Lightbox.defaults.closeOnBackdrop
      ),
      showCounter: this._getDataAttr(
        element,
        'lightbox-show-counter',
        Lightbox.defaults.showCounter
      ),
      showNavigation: this._getDataAttr(
        element,
        'lightbox-show-nav',
        Lightbox.defaults.showNavigation
      ),
      keyNavigation: this._getDataAttr(
        element,
        'lightbox-key-nav',
        Lightbox.defaults.keyNavigation
      ),
      animationDuration: parseInt(
        this._getDataAttr(
          element,
          'lightbox-animation-duration',
          Lightbox.defaults.animationDuration
        )
      ),
    };
  }

  _openLightbox(triggerElement, state) {
    if (this.isOpen) return;

    // Build gallery from all elements with same gallery name
    this.currentGallery = Array.from(
      document.querySelectorAll(`[data-lightbox="${state.gallery}"]`)
    );

    this.currentIndex = this.currentGallery.indexOf(triggerElement);

    this._createLightboxElement(state.config);
    this._showImage(this.currentIndex, state.config);
    this._setupEventListeners(state.config);

    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    this.eventBus?.emit('lightbox:opened', {
      gallery: state.gallery,
      index: this.currentIndex,
      total: this.currentGallery.length,
    });
  }

  _createLightboxElement(config) {
    this.lightboxElement = document.createElement('div');
    this.lightboxElement.className = 'lightbox-overlay';
    this.lightboxElement.innerHTML = `
            <div class="lightbox-container">
                <button class="lightbox-close" aria-label="Close">&times;</button>
                ${
                  config.showNavigation
                    ? `
                    <button class="lightbox-prev" aria-label="Previous">&larr;</button>
                    <button class="lightbox-next" aria-label="Next">&rarr;</button>
                `
                    : ''
                }
                <div class="lightbox-content">
                    <img class="lightbox-image" alt="">
                </div>
                ${config.showCounter ? '<div class="lightbox-counter"></div>' : ''}
            </div>
        `;

    document.body.appendChild(this.lightboxElement);

    // Setup button handlers
    this.lightboxElement.querySelector('.lightbox-close').addEventListener('click', () => {
      this._closeLightbox();
    });

    if (config.showNavigation) {
      this.lightboxElement.querySelector('.lightbox-prev').addEventListener('click', () => {
        this._previousImage(config);
      });

      this.lightboxElement.querySelector('.lightbox-next').addEventListener('click', () => {
        this._nextImage(config);
      });
    }

    if (config.closeOnBackdrop) {
      this.lightboxElement.addEventListener('click', e => {
        if (e.target === this.lightboxElement) {
          this._closeLightbox();
        }
      });
    }
  }

  _showImage(index, config) {
    const element = this.currentGallery[index];
    const imageUrl = element.href;
    const imageAlt = element.querySelector('img')?.alt || '';

    const img = this.lightboxElement.querySelector('.lightbox-image');
    img.src = imageUrl;
    img.alt = imageAlt;

    // Update counter
    if (config.showCounter) {
      const counter = this.lightboxElement.querySelector('.lightbox-counter');
      counter.textContent = `${index + 1} / ${this.currentGallery.length}`;
    }

    // Update navigation buttons
    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector('.lightbox-prev');
      const nextBtn = this.lightboxElement.querySelector('.lightbox-next');

      prevBtn.style.display = index > 0 ? 'block' : 'none';
      nextBtn.style.display = index < this.currentGallery.length - 1 ? 'block' : 'none';
    }
  }

  _previousImage(config) {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._showImage(this.currentIndex, config);
    }
  }

  _nextImage(config) {
    if (this.currentIndex < this.currentGallery.length - 1) {
      this.currentIndex++;
      this._showImage(this.currentIndex, config);
    }
  }

  _setupEventListeners(config) {
    if (config.closeOnEscape || config.keyNavigation) {
      this.keyHandler = e => {
        switch (e.key) {
          case 'Escape':
            if (config.closeOnEscape) this._closeLightbox();
            break;
          case 'ArrowLeft':
            if (config.keyNavigation) this._previousImage(config);
            break;
          case 'ArrowRight':
            if (config.keyNavigation) this._nextImage(config);
            break;
        }
        e.preventDefault();
      };

      document.addEventListener('keydown', this.keyHandler);
    }
  }

  _closeLightbox() {
    if (!this.isOpen) return;

    // Remove event listeners
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Remove lightbox element
    if (this.lightboxElement) {
      this.lightboxElement.remove();
      this.lightboxElement = null;
    }

    // Restore body scroll
    document.body.style.overflow = '';

    this.isOpen = false;
    this.currentGallery = [];
    this.currentIndex = 0;

    this.eventBus?.emit('lightbox:closed', {});
  }

  // Public API
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (state) {
      this._openLightbox(triggerElement, state);
    }
  }

  close() {
    this._closeLightbox();
  }

  next() {
    if (this.isOpen && this.lightboxElement) {
      const config = { showNavigation: true, keyNavigation: true }; // Use current config
      this._nextImage(config);
    }
  }

  previous() {
    if (this.isOpen && this.lightboxElement) {
      const config = { showNavigation: true, keyNavigation: true }; // Use current config
      this._previousImage(config);
    }
  }

  goTo(index) {
    if (this.isOpen && index >= 0 && index < this.currentGallery.length) {
      this.currentIndex = index;
      const config = { showCounter: true, showNavigation: true }; // Use current config
      this._showImage(this.currentIndex, config);
    }
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      currentIndex: this.currentIndex,
      gallerySize: this.currentGallery.length,
    };
  }

  static enhanceAll(selector = '[data-lightbox]', options) {
    const instance = new Lightbox(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export { CopyToClipboard, DataTable, FormValidator, Lightbox };
