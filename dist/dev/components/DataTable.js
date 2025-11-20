function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,r){return function(e,n,r){const o=n.includes("-")?t(n):n,s=e.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,r)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,r);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...r){n||(t.apply(this,r),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const r=`${e}-view`,o=this.getAttr(t,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[r,o]of Object.entries(e)){const e=this.constructor.defaults?.[r];n[r]=this.getAttr(t,o,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const r=()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();};t.addEventListener("animationend",r,{once:true}),t.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const r=e(t);if(!r.length)return;const o=r[0],s=r[r.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const r=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?r.className=n:"style"===t&&"object"==typeof n?Object.assign(r.style,n):"dataset"===t&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(t,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(t,e,n)}_dispatch(t,e,n){const r=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(r),this.eventBus?.emit(e,{element:t,...n}),r}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const r=t.getAttribute(`${this._getSelector()}-${e}`);return null!==r?r:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
