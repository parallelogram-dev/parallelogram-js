import { BaseComponent } from '../core/BaseComponent.js';
import { createElement, generateId } from '../utils/dom-utils.js';
import { arrowDown, arrowUp, iconElement, selector } from '../utils/icons.js';

/** Page numbers shown either side of the current page */
const PAGE_WINDOW = 2;

const childrenNamed = (parent, ...names) =>
  parent ? Array.from(parent.children).filter(child => names.includes(child.localName)) : [];

const rowsOf = section => childrenNamed(section, 'tr');

const cellsOf = row => childrenNamed(row, 'td', 'th');

/** The number of columns cells cover, counting their colspan */
const spanOf = cells => cells.reduce((total, cell) => total + (cell.colSpan || 1), 0);

/** Replace `{name}` placeholders with values */
const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);

/**
 * DataTable - sorting, filtering and pagination for an existing table
 *
 * Sortable headers (`th[data-sort]`) get a button and `aria-sort`, following the WAI-ARIA sortable
 * table example. Values are read once when the table mounts: numbers are the first number in the
 * cell, ignoring currency symbols, units and group separators, using the decimal separator of the
 * table's `lang`, and negative after a minus sign or inside parentheses, dates are parsed, text is
 * compared in natural order ("Item 2" before "Item 10"), a cell's `data-sort-value` overrides its text, and blank values always sort last. Filtering keeps
 * the current sort, pagination is a labelled navigation region with a window of page numbers, and a
 * status line below the table shows and announces which rows are showing after each change. The original row elements are
 * moved rather than copied, and unmounting puts the table back as it was.
 *
 * @example
 * <table data-datatable data-datatable-filterable data-datatable-paginate="10">
 *   <thead>
 *     <tr>
 *       <th data-sort="name">Name</th>
 *       <th data-sort="date" data-sort-type="date">Joined</th>
 *       <th data-sort="spend" data-sort-type="number">Spend</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr><td>Ada</td><td data-sort-value="2023-01-15">15 January 2023</td><td>$1,200</td></tr>
 *   </tbody>
 * </table>
 *
 * @attributes
 * - data-datatable-sortable: "false" turns sorting off (default true)
 * - data-datatable-filterable: adds a search box above the table (default false)
 * - data-datatable-paginate: a page size such as "10", or "true" to use data-datatable-page-size
 * - data-datatable-page-size: rows per page (default 10)
 * - data-datatable-search-delay: milliseconds to wait after typing before filtering (default 300)
 * - data-datatable-search-label, data-datatable-search-placeholder: the search box's label and
 *   placeholder
 * - data-datatable-empty-message: the row shown when nothing matches (default "No matching rows")
 * - data-datatable-status-message: the status after each change (default "Showing {from}–{to} of
 *   {total} rows")
 * - data-datatable-pagination-label: the pagination region's label (default "Table pagination")
 * - data-datatable-previous-text, data-datatable-next-text: the buttons' text (default "Previous"
 *   and "Next")
 * - data-datatable-previous-label, data-datatable-next-label: the buttons' labels (default
 *   "Previous page" and "Next page")
 * - data-datatable-page-label: each page number's label (default "Page {page}")
 * - data-sort, data-sort-type: on a header, the column key and string (default), number or date
 * - data-sort-value: on a cell, the value to sort by instead of its text
 * - data-datatable-state: set by the component to mounted, loading, loaded, empty or error
 *
 * @events
 * - datatable:mounted: with `{ config }`
 * - datatable:rendered: with `{ totalRows, filteredRows, displayedRows }`
 * - datatable:loaded, datatable:empty: with `{ url, rowCount }` after loadData()
 * - datatable:error: with `{ error, url, message }` when loadData() fails
 */
export class DataTable extends BaseComponent {
  static selector = 'data-datatable';

  static get defaults() {
    return {
      sortable: true,
      filterable: false,
      paginate: false,
      pageSize: 10,
      searchDelay: 300,
      searchLabel: 'Search',
      searchPlaceholder: 'Search table…',
      emptyMessage: 'No matching rows',
      statusMessage: 'Showing {from}–{to} of {total} rows',
      paginationLabel: 'Table pagination',
      previousText: 'Previous',
      previousLabel: 'Previous page',
      nextText: 'Next',
      nextLabel: 'Next page',
      pageLabel: 'Page {page}',
      /* Icons from the shared set; a page can pass text instead */
      sortIcons: {
        unsorted: selector,
        asc: arrowUp,
        desc: arrowDown,
      },
    };
  }

  constructor(options = {}) {
    super(options);
    this.sortIcons = { ...this.constructor.defaults.sortIcons, ...options.sortIcons };
  }

  _init(element) {
    const state = super._init(element);
    const [tbody] = childrenNamed(element, 'tbody');

    if (!tbody) {
      this.logger?.warn('DataTable: table has no tbody', element);
      return state;
    }

    state.config = this._getConfiguration(element);
    state.tbody = tbody;
    state.originalNodes = Array.from(tbody.childNodes);
    state.originalRows = rowsOf(tbody);
    state.columns = this._readColumns(element);
    state.decimal = this._decimalSeparator(element);
    state.columnCount =
      spanOf(cellsOf(rowsOf(childrenNamed(element, 'thead')[0]).at(-1))) ||
      spanOf(cellsOf(state.originalRows[0])) ||
      1;
    state.rows = this._buildRows(state.originalRows, state);
    state.filteredRows = [...state.originalRows];
    state.currentSort = { column: null, direction: null };
    state.currentPage = 1;
    state.searchTerm = '';
    state.errorMessage = null;
    state.loadController = null;
    state.searchTimer = null;
    state.injected = [];
    state.restore = [];

    this.setState(element, 'mounted');

    const { signal } = state.controller;
    if (state.config.sortable) this._setupSorting(element, state, signal);
    if (state.config.filterable) this._setupFiltering(element, state, signal);
    this._setupStatus(element, state);
    if (state.config.paginate) this._setupPagination(element, state, signal);

    this._update(element, state, { announce: false });

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      baseCleanup();
      clearTimeout(state.searchTimer);
      state.loadController?.abort();
      state.injected.forEach(node => node.remove());
      state.restore.forEach(undo => undo());
      state.tbody.replaceChildren(...state.originalNodes);
      element.removeAttribute('aria-busy');
      element.removeAttribute('data-datatable-state');
      this.removeAttr(element, 'error-message');
    };

    this._dispatch(element, 'datatable:mounted', { config: state.config });
    return state;
  }

  _getConfiguration(element) {
    /* data-datatable-paginate accepts a page size ("10") or a flag ("true") */
    const paginatePageSize = Number.parseInt(this.getAttr(element, 'paginate'), 10);
    const hasPaginatePageSize = Number.isInteger(paginatePageSize);
    const { defaults } = this.constructor;

    return {
      sortable: this.getBoolAttr(element, 'sortable', defaults.sortable),
      filterable: this.getBoolAttr(element, 'filterable', defaults.filterable),
      paginate: hasPaginatePageSize
        ? paginatePageSize > 0
        : this.getBoolAttr(element, 'paginate', defaults.paginate),
      pageSize: this.getNumberAttr(
        element,
        'page-size',
        paginatePageSize > 0 ? paginatePageSize : defaults.pageSize
      ),
      searchDelay: this.getNumberAttr(element, 'search-delay', defaults.searchDelay),
      searchLabel: this.getAttr(element, 'search-label', defaults.searchLabel),
      searchPlaceholder: this.getAttr(element, 'search-placeholder', defaults.searchPlaceholder),
      emptyMessage: this.getAttr(element, 'empty-message', defaults.emptyMessage),
      ...this._getConfigFromAttrs(element, {
        statusMessage: 'status-message',
        paginationLabel: 'pagination-label',
        previousText: 'previous-text',
        previousLabel: 'previous-label',
        nextText: 'next-text',
        nextLabel: 'next-label',
        pageLabel: 'page-label',
      }),
    };
  }

  /**
   * The sortable columns, taken from the header row that holds the `th[data-sort]` cells, with each
   * column's position counting the colspan of the header cells before it
   */
  _readColumns(element) {
    const headerRow = element.querySelector('th[data-sort]')?.parentElement;
    if (!headerRow) return [];

    const cells = cellsOf(headerRow);
    return cells
      .map((cell, position) => ({ cell, index: spanOf(cells.slice(0, position)) }))
      .filter(({ cell }) => cell.dataset.sort)
      .map(({ cell, index }) => ({
        cell,
        index,
        key: cell.dataset.sort,
        type: cell.dataset.sortType || 'string',
      }));
  }

  /**
   * Read each row's searchable text and sort values once
   */
  _buildRows(rows, state) {
    return rows.map(row => ({
      row,
      text: row.textContent.toLowerCase(),
      keys: Object.fromEntries(
        state.columns.map(column => [
          column.key,
          this._sortKey(cellsOf(row)[column.index], column.type, state.decimal),
        ])
      ),
    }));
  }

  /**
   * The decimal separator, "." or ",", of the table's language
   */
  _decimalSeparator(element) {
    try {
      const parts = new Intl.NumberFormat(
        element.closest('[lang]')?.lang || undefined
      ).formatToParts(1.1);
      return parts.find(part => part.type === 'decimal')?.value === ',' ? ',' : '.';
    } catch {
      return '.';
    }
  }

  /**
   * Numbers are the first run of digits and separators, negative after a minus sign or opening
   * parenthesis, with the other of "." and "," and spaces taken as group separators. A cell's
   * data-sort-value always uses "." as its decimal separator.
   *
   * @returns {string|number|null} null for a blank or unreadable value
   */
  _sortKey(cell, type, decimal = '.') {
    if (!cell) return null;

    const { sortValue } = cell.dataset;
    const raw = (sortValue ?? cell.textContent).trim();
    if (raw === '') return null;

    if (type === 'number') {
      if (sortValue !== undefined) decimal = '.';
      const match = /\d[\d., \u00a0\u202f]*/.exec(raw);
      if (!match) return null;
      const digits = match[0].replace(
        decimal === ',' ? /[. \u00a0\u202f]/g : /[, \u00a0\u202f]/g,
        ''
      );
      const number = Number(digits.replace(decimal, '.'));
      if (!Number.isFinite(number)) return null;
      /* A minus sign or opening parenthesis counts unless it joins a word, as in "Item-5" */
      const negative = /(^|[^\p{L}\p{N}])[-\u2212(][^\p{L}\p{N}]*$/u.test(
        raw.slice(0, match.index)
      );
      return negative ? -number : number;
    }
    if (type === 'date') {
      const time = Date.parse(raw);
      return Number.isNaN(time) ? null : time;
    }
    return raw;
  }

  _setupSorting(element, state, signal) {
    for (const column of state.columns) {
      const { cell } = column;
      const hadClass = cell.hasAttribute('class');
      const contents = [...cell.childNodes];

      const icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.setAttribute('aria-hidden', 'true');
      this._showSortIcon(icon, this.sortIcons.unsorted);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'datatable__sort';
      button.append(...contents, icon);
      cell.append(button);
      cell.classList.add('sortable');

      button.addEventListener('click', () => this._toggleSort(element, state, column.key), {
        signal,
      });

      state.restore.push(() => {
        cell.replaceChildren(...contents);
        cell.classList.remove('sortable');
        cell.removeAttribute('aria-sort');
        if (!hadClass && cell.classList.length === 0) {
          cell.removeAttribute('class');
        }
      });
    }
  }

  _setupFiltering(element, state, signal) {
    const id = generateId('datatable-search');
    const label = createElement(
      'label',
      { className: 'form__label', htmlFor: id },
      state.config.searchLabel
    );
    const input = createElement('input', {
      type: 'search',
      id,
      autocomplete: 'off',
      placeholder: state.config.searchPlaceholder,
      className: 'form__control datatable-search',
    });
    const field = createElement('div', { className: 'form__field' });
    const container = createElement('div', {
      className: 'form__element form__element--sm datatable-filter',
    });

    field.append(input);
    container.append(label, field);
    element.before(container);
    state.injected.push(container);
    state.searchInput = input;

    input.addEventListener(
      'input',
      () => {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(
          () => this._applyFilter(element, state, input.value),
          state.config.searchDelay
        );
      },
      { signal }
    );
  }

  _setupStatus(element, state) {
    const status = createElement('div', { className: 'datatable__status', role: 'status' });
    element.after(status);
    state.injected.push(status);
    state.status = status;
  }

  _setupPagination(element, state, signal) {
    const nav = createElement('nav', {
      className: 'datatable__pagination',
      'aria-label': state.config.paginationLabel,
    });
    state.status.after(nav);
    state.injected.push(nav);
    state.paginationContainer = nav;

    nav.addEventListener(
      'click',
      event => {
        const button = event.target.closest('button[data-page]');
        if (!button || button.disabled) return;
        state.currentPage = Number(button.dataset.page);
        this._update(element, state);
      },
      { signal }
    );
  }

  _toggleSort(element, state, column) {
    const { currentSort } = state;
    const direction =
      currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
    this._applySort(element, state, column, direction);
  }

  _applySort(element, state, column, direction) {
    state.currentSort = { column, direction };
    this._showSort(state);
    state.currentPage = 1;
    this._update(element, state);
  }

  /**
   * Mark the sorted header with aria-sort and update every header's icon
   */
  _showSort(state) {
    const { column, direction } = state.currentSort;

    for (const { cell, key } of state.columns) {
      const active = key === column && direction;
      const icon = cell.querySelector('.sort-icon');
      if (icon) {
        this._showSortIcon(icon, active ? this.sortIcons[direction] : this.sortIcons.unsorted);
      }
      if (active && state.config.sortable) {
        cell.setAttribute('aria-sort', direction === 'desc' ? 'descending' : 'ascending');
      } else {
        cell.removeAttribute('aria-sort');
      }
    }
  }

  _applyFilter(element, state, searchTerm) {
    state.searchTerm = String(searchTerm ?? '')
      .trim()
      .toLowerCase();
    state.currentPage = 1;
    this._update(element, state);
  }

  _compare(state) {
    const { column, direction } = state.currentSort;
    const factor = direction === 'desc' ? -1 : 1;
    this._collator ??= new Intl.Collator(document.documentElement.lang || undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return (a, b) => {
      const first = a.keys[column];
      const second = b.keys[column];
      if (first === null || second === null) {
        return first === second ? 0 : first === null ? 1 : -1;
      }
      const result =
        typeof first === 'string' ? this._collator.compare(first, second) : first - second;
      return result * factor;
    };
  }

  /**
   * Filter, sort and paginate the rows, then show them
   */
  _update(element, state, { announce = true } = {}) {
    const { config } = state;

    let rows = state.searchTerm
      ? state.rows.filter(entry => entry.text.includes(state.searchTerm))
      : state.rows;
    if (state.currentSort.column) {
      rows = rows.slice().sort(this._compare(state));
    }

    state.filteredRows = rows.map(entry => entry.row);
    const total = rows.length;
    const pageCount = config.paginate ? Math.max(1, Math.ceil(total / config.pageSize)) : 1;
    state.currentPage = Math.min(Math.max(1, state.currentPage), pageCount);
    const start = config.paginate ? (state.currentPage - 1) * config.pageSize : 0;
    const visible = config.paginate ? rows.slice(start, start + config.pageSize) : rows;

    if (total === 0) {
      state.tbody.replaceChildren(this._messageRow(state, config.emptyMessage));
    } else {
      state.tbody.replaceChildren(...visible.map(entry => entry.row));
    }

    if (config.paginate) {
      this._renderPagination(state, pageCount);
    }

    if (announce) {
      this._announce(
        state,
        total === 0
          ? config.emptyMessage
          : fill(config.statusMessage, { from: start + 1, to: start + visible.length, total })
      );
    }

    this._dispatch(element, 'datatable:rendered', {
      totalRows: state.rows.length,
      filteredRows: total,
      displayedRows: visible.length,
    });
  }

  _messageRow(state, text, role = null) {
    const row = document.createElement('tr');
    row.className = 'datatable__message';
    const cell = document.createElement('td');
    cell.setAttribute('colspan', String(state.columnCount));
    row.append(cell);
    if (role) {
      cell.setAttribute('role', role);
    }
    cell.textContent = text;
    return row;
  }

  _announce(state, message) {
    state.status.textContent = '';
    requestAnimationFrame(() => {
      state.status.textContent = message;
    });
  }

  _renderPagination(state, pageCount) {
    const nav = state.paginationContainer;
    const focusedLabel = nav.contains(document.activeElement)
      ? document.activeElement.getAttribute('aria-label')
      : null;
    const { config, currentPage: current } = state;
    nav.replaceChildren();
    /* Hide an empty region so screen readers don't list it as a landmark */
    nav.hidden = pageCount <= 1;
    if (nav.hidden) return;

    const button = (page, text, label, { disabled = false, isCurrent = false } = {}) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.dataset.page = String(page);
      element.textContent = text;
      element.setAttribute('aria-label', label);
      element.disabled = disabled;
      if (isCurrent) {
        element.setAttribute('aria-current', 'page');
        element.classList.add('active');
      }
      return element;
    };

    nav.append(
      button(current - 1, config.previousText, config.previousLabel, { disabled: current === 1 })
    );

    let previousPage = 0;
    for (let page = 1; page <= pageCount; page++) {
      const shown = page === 1 || page === pageCount || Math.abs(page - current) <= PAGE_WINDOW;
      if (!shown) continue;
      if (page - previousPage > 1) {
        const gap = document.createElement('span');
        gap.className = 'datatable__gap';
        gap.setAttribute('aria-hidden', 'true');
        gap.textContent = '…';
        nav.append(gap);
      }
      nav.append(
        button(page, String(page), fill(config.pageLabel, { page }), {
          isCurrent: page === current,
        })
      );
      previousPage = page;
    }

    nav.append(
      button(current + 1, config.nextText, config.nextLabel, { disabled: current === pageCount })
    );

    /* Re-rendering replaces the buttons, so keep focus on the one that was pressed */
    if (focusedLabel) {
      const same = nav.querySelector(`button[aria-label="${CSS.escape(focusedLabel)}"]`);
      (same && !same.disabled ? same : nav.querySelector('[aria-current="page"]'))?.focus();
    }
  }

  /**
   * Replace the rows with data loaded from a URL
   *
   * A newer call cancels an older one that hasn't finished.
   *
   * @param {HTMLElement} element - Table element
   * @param {string} url - URL returning a JSON array
   * @param {Function} rowMapper - Turns one item into a `<tr>`
   */
  async loadData(element, url, rowMapper) {
    const state = this.getState(element);
    if (!state?.tbody) return;

    state.loadController?.abort();
    const controller = new AbortController();
    state.loadController = controller;

    this.setState(element, 'loading');
    element.setAttribute('aria-busy', 'true');
    state.errorMessage = null;
    this.removeAttr(element, 'error-message');

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        throw new Error(
          response.statusText
            ? `HTTP ${response.status}: ${response.statusText}`
            : `HTTP ${response.status}`
        );
      }

      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!Array.isArray(data)) {
        throw new Error('Response data must be an array');
      }

      const rows = data.map(item => rowMapper(item));
      state.rows = this._buildRows(rows, state);
      state.currentSort = { column: null, direction: null };
      state.currentPage = 1;
      this._showSort(state);

      this.setState(element, rows.length > 0 ? 'loaded' : 'empty');
      this._update(element, state);
      this._dispatch(element, rows.length > 0 ? 'datatable:loaded' : 'datatable:empty', {
        url,
        rowCount: rows.length,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      this.setState(element, 'error');
      this.setAttr(element, 'error-message', error.message);
      state.errorMessage = error.message;
      state.tbody.replaceChildren(this._messageRow(state, error.message, 'alert'));

      this._dispatch(element, 'datatable:error', { error, url, message: error.message });
      this.logger?.error('DataTable: Failed to load data', { error, url });
    } finally {
      if (state.loadController === controller) {
        state.loadController = null;
        element.removeAttribute('aria-busy');
      }
    }
  }

  /**
   * Clear the error state and show the rows again
   * @param {HTMLElement} element - Table element
   */
  clearError(element) {
    const state = this.getState(element);
    if (!state?.tbody) return;

    state.errorMessage = null;
    this.removeAttr(element, 'error-message');
    this.setState(element, 'mounted');
    this._update(element, state, { announce: false });
  }

  /**
   * Sort by a column
   *
   * @param {HTMLElement} element - Table element
   * @param {string} column - The header's data-sort key
   * @param {'asc'|'desc'} [direction='asc']
   */
  /**
   * Put a sort icon in its cell: path data from the icon set is drawn, anything else is shown as text
   *
   * @param {HTMLElement} icon
   * @param {string[]|string} value
   */
  _showSortIcon(icon, value) {
    if (Array.isArray(value)) {
      icon.replaceChildren(iconElement(value, { size: 'xs' }));
    } else {
      icon.textContent = value;
    }
  }

  sort(element, column, direction = 'asc') {
    const state = this.getState(element);
    if (!state?.tbody || !state.columns.some(item => item.key === column)) return;

    this._applySort(element, state, column, direction === 'desc' ? 'desc' : 'asc');
  }

  filter(element, searchTerm) {
    const state = this.getState(element);
    if (!state?.tbody) return;

    if (state.searchInput) {
      state.searchInput.value = searchTerm;
    }
    this._applyFilter(element, state, searchTerm);
  }

  goToPage(element, page) {
    const state = this.getState(element);
    if (!state?.tbody || !state.config.paginate) return;

    const pageCount = Math.max(1, Math.ceil(state.filteredRows.length / state.config.pageSize));
    if (page >= 1 && page <= pageCount) {
      state.currentPage = page;
      this._update(element, state);
    }
  }

  static enhanceAll(selector = '[data-datatable]', options) {
    const instance = new DataTable(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default DataTable;
