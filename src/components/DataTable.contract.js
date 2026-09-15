const STATES = ['mounted', 'loading', 'loaded', 'empty', 'error'];
const LOAD_DETAIL = '{ url: string; rowCount: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'DataTable',
  kind: 'enhancement',
  selector: 'data-datatable',
  module: 'components/DataTable',
  stylesheet: 'styles/datatable.css',
  summary: 'Sorting, filtering and pagination for an existing table',
  description: `Sortable headers get a button and \`aria-sort\`, following the WAI-ARIA sortable table example. Values are read once when the table mounts: numbers are the first number in the cell, ignoring currency symbols, units and group separators, using the decimal separator of the table's \`lang\`, and negative after a minus sign or inside parentheses, dates are parsed, text is compared in natural order ("Item 2" before "Item 10"), and blank values always sort last.

Filtering keeps the current sort, pagination is a labelled navigation region with a window of page numbers, hidden while every row fits on one page, and a status message announces which rows are showing after each change. The pagination and status text can be translated through attributes. The original rows are moved rather than copied, and unmounting puts the table back as it was.`,
  states: STATES,
  attributes: [
    { name: 'data-datatable', type: 'flag', description: 'Marks the table' },
    {
      name: 'data-datatable-sortable',
      type: 'boolean',
      default: true,
      option: 'sortable',
      description: 'Sort by the headers marked data-sort',
    },
    {
      name: 'data-datatable-filterable',
      type: 'boolean',
      default: false,
      option: 'filterable',
      description: 'Add a search box above the table',
    },
    {
      name: 'data-datatable-paginate',
      type: 'string',
      description: 'A page size such as 10, or true to use data-datatable-page-size',
    },
    {
      name: 'data-datatable-page-size',
      type: 'number',
      default: 10,
      option: 'pageSize',
      description: 'Rows per page',
    },
    {
      name: 'data-datatable-search-delay',
      type: 'number',
      default: 300,
      option: 'searchDelay',
      description: 'Milliseconds to wait after typing before filtering',
    },
    {
      name: 'data-datatable-search-label',
      type: 'string',
      default: 'Search',
      option: 'searchLabel',
      description: "The search box's label",
    },
    {
      name: 'data-datatable-search-placeholder',
      type: 'string',
      default: 'Search table…',
      option: 'searchPlaceholder',
      description: "The search box's placeholder",
    },
    {
      name: 'data-datatable-empty-message',
      type: 'string',
      default: 'No matching rows',
      option: 'emptyMessage',
      description: 'The row shown when nothing matches',
    },
    {
      name: 'data-datatable-status-message',
      type: 'string',
      default: 'Showing {from}–{to} of {total} rows',
      option: 'statusMessage',
      description:
        'The status shown and announced after each change, with {from}, {to} and {total}',
    },
    {
      name: 'data-datatable-pagination-label',
      type: 'string',
      default: 'Table pagination',
      option: 'paginationLabel',
      description: "The pagination region's label",
    },
    {
      name: 'data-datatable-previous-text',
      type: 'string',
      default: 'Previous',
      option: 'previousText',
      description: "The previous page button's text",
    },
    {
      name: 'data-datatable-previous-label',
      type: 'string',
      default: 'Previous page',
      option: 'previousLabel',
      description: "The previous page button's label",
    },
    {
      name: 'data-datatable-next-text',
      type: 'string',
      default: 'Next',
      option: 'nextText',
      description: "The next page button's text",
    },
    {
      name: 'data-datatable-next-label',
      type: 'string',
      default: 'Next page',
      option: 'nextLabel',
      description: "The next page button's label",
    },
    {
      name: 'data-datatable-page-label',
      type: 'string',
      default: 'Page {page}',
      option: 'pageLabel',
      description: "Each page number button's label, with {page}",
    },
    {
      name: 'data-sort',
      type: 'string',
      on: 'a header',
      description: 'Makes the column sortable, naming its key',
    },
    {
      name: 'data-sort-type',
      type: 'enum',
      options: ['string', 'number', 'date'],
      default: 'string',
      on: 'a header',
      description: 'How the column compares',
    },
    {
      name: 'data-sort-value',
      type: 'string',
      on: 'a cell',
      description: 'The value to sort by instead of its text',
    },
    {
      name: 'data-datatable-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      description: 'The table state',
    },
    {
      name: 'data-datatable-error-message',
      type: 'string',
      readonly: true,
      description: 'Why the last loadData() failed',
    },
  ],
  methods: [
    {
      name: 'loadData',
      signature: '(element: HTMLTableElement, url: string) => Promise<void>',
      description: 'Replace the rows with JSON rows fetched from a URL',
    },
  ],
  events: [
    {
      name: 'datatable:mounted',
      channel: 'both',
      detail: '{ config: object }',
      description: 'The table was set up',
    },
    {
      name: 'datatable:rendered',
      channel: 'both',
      detail: '{ totalRows: number; filteredRows: number; displayedRows: number }',
      description: 'The visible rows changed',
    },
    {
      name: 'datatable:loaded',
      channel: 'both',
      detail: LOAD_DETAIL,
      description: 'loadData() finished with rows',
    },
    {
      name: 'datatable:empty',
      channel: 'both',
      detail: LOAD_DETAIL,
      description: 'loadData() finished without rows',
    },
    {
      name: 'datatable:error',
      channel: 'both',
      detail: '{ error: Error; url: string; message: string }',
      description: 'loadData() failed',
    },
  ],
  cssProperties: [
    { name: '--datatable-border-color', default: '#d1d5db', description: 'Borders' },
    {
      name: '--datatable-button-bg',
      default: 'transparent',
      description: 'Pagination button background',
    },
    { name: '--datatable-button-color', default: 'inherit', description: 'Pagination button text' },
    {
      name: '--datatable-button-hover-bg',
      default: 'rgba(128, 128, 128, 0.15)',
      description: 'Pagination button background on hover',
    },
    {
      name: '--datatable-button-hover-border-color',
      default: '#9ca3af',
      description: 'Pagination button border on hover',
    },
    { name: '--datatable-current-bg', default: '#1d4ed8', description: 'The current page button' },
    { name: '--datatable-current-color', default: '#ffffff', description: 'The current page text' },
    {
      name: '--datatable-header-hover-bg',
      default: 'rgba(128, 128, 128, 0.12)',
      description: 'Sortable header background on hover',
    },
    { name: '--datatable-muted-color', default: '#6b7280', description: 'Status and sort icons' },
  ],
  examples: [
    {
      id: 'bookings',
      title: 'Bookings',
      markup: `<table data-datatable data-datatable-filterable data-datatable-paginate="4">
  <thead>
    <tr>
      <th data-sort="name">Guest</th>
      <th data-sort="date" data-sort-type="date">Date</th>
      <th data-sort="party" data-sort-type="number">Party</th>
      <th data-sort="spend" data-sort-type="number">Spend</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Ada Lovelace</td><td data-sort-value="2026-10-02">2 October</td><td>4</td><td>$320</td></tr>
    <tr><td>Grace Hopper</td><td data-sort-value="2026-09-28">28 September</td><td>2</td><td>$140</td></tr>
    <tr><td>Katherine Johnson</td><td data-sort-value="2026-10-11">11 October</td><td>6</td><td>$1,210</td></tr>
    <tr><td>Alan Turing</td><td data-sort-value="2026-09-30">30 September</td><td>3</td><td>$265</td></tr>
    <tr><td>Hedy Lamarr</td><td data-sort-value="2026-10-05">5 October</td><td>2</td><td>$98</td></tr>
    <tr><td>Tim Berners-Lee</td><td data-sort-value="2026-10-19">19 October</td><td>8</td><td>$1,480</td></tr>
  </tbody>
</table>`,
      controls: [
        { attribute: 'data-datatable-sortable' },
        { attribute: 'data-datatable-filterable' },
        { attribute: 'data-datatable-paginate' },
      ],
    },
  ],
};
