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
    filterContainer.className = 'form__element form__element--sm datatable-filter';

    const label = document.createElement('label');
    label.className = 'form__label';
    label.textContent = 'Search:';
    label.htmlFor = `datatable-search-${Date.now()}`;

    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form__field';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search table...';
    searchInput.className = 'form__control datatable-search';
    searchInput.id = label.htmlFor;

    searchInput.addEventListener('input', e => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this._handleFilter(element, state, e.target.value);
      }, state.config.searchDelay);
    });

    fieldContainer.appendChild(searchInput);
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

export { DataTable, DataTable as default };
