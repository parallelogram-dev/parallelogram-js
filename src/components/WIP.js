// ==========================================
// DataTable Component
// ==========================================

import { BaseComponent } from '@peptolab/parallelogram';

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
export class DataTable extends BaseComponent {
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
export class FormValidator extends BaseComponent {
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
export class CopyToClipboard extends BaseComponent {
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
export class Lightbox extends BaseComponent {
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
