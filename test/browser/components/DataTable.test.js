import { afterEach, describe, expect, it, vi } from 'vitest';
import DataTable from '../../../src/components/DataTable.js';
import { EventManager } from '../../../src/managers/EventManager.js';
import datatableStyles from '../../../src/styles/framework/components/datatable.scss';

const WAIT = { timeout: 2000 };

const build = (markup, attributes = '') => {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div class="holder"><table data-datatable ${attributes}>${markup}</table></div>`
  );
  return document.querySelector('.holder:last-of-type table');
};

const PEOPLE = `
  <thead><tr><th data-sort="name">Name</th><th data-sort="score" data-sort-type="number">Score</th></tr></thead>
  <tbody>
    <tr><td>Grace</td><td>$1,200</td></tr>
    <tr><td>Ada</td><td>900</td></tr>
    <tr><td>Katherine</td><td></td></tr>
    <tr><td>Radia</td><td>15</td></tr>
  </tbody>`;

const column = (table, index) =>
  [...table.tBodies[0].rows].map(row => row.cells[index]?.textContent.trim());
const sortButton = (table, key) => table.querySelector(`th[data-sort="${key}"] button`);

describe('DataTable', () => {
  let dataTable;

  const mount = (table, options = {}) => {
    dataTable = new DataTable(options);
    dataTable.mount(table);
    return table;
  };

  afterEach(() => {
    dataTable?.destroy();
    dataTable = null;
    document.body.replaceChildren();
  });

  it('sorts from a header button and reports the order with aria-sort', () => {
    const table = mount(build(PEOPLE));

    sortButton(table, 'name').click();
    const ascending = [column(table, 0), table.querySelector('th[data-sort="name"]').ariaSort];
    sortButton(table, 'name').click();

    expect([
      ascending,
      [column(table, 0), table.querySelector('th[data-sort="name"]').ariaSort],
      table.querySelector('th[data-sort="score"]').hasAttribute('aria-sort'),
    ]).toEqual([
      [['Ada', 'Grace', 'Katherine', 'Radia'], 'ascending'],
      [['Radia', 'Katherine', 'Grace', 'Ada'], 'descending'],
      false,
    ]);
  });

  it('sorts in the direction sort() is given', () => {
    const table = mount(build(PEOPLE));

    dataTable.sort(table, 'name', 'asc');
    const ascending = column(table, 0);
    dataTable.sort(table, 'name', 'desc');

    expect([ascending, column(table, 0)]).toEqual([
      ['Ada', 'Grace', 'Katherine', 'Radia'],
      ['Radia', 'Katherine', 'Grace', 'Ada'],
    ]);
  });

  it('sorts numbers written with currency and separators, and puts blanks last', () => {
    const table = mount(build(PEOPLE));

    dataTable.sort(table, 'score', 'asc');
    const ascending = column(table, 1);
    dataTable.sort(table, 'score', 'desc');

    expect([ascending, column(table, 1)]).toEqual([
      ['15', '900', '$1,200', ''],
      ['$1,200', '900', '15', ''],
    ]);
  });

  it('sorts text in natural order and uses data-sort-value when given', () => {
    const table = mount(
      build(`
        <thead><tr><th data-sort="item">Item</th><th data-sort="date" data-sort-type="date">Date</th></tr></thead>
        <tbody>
          <tr><td>Item 10</td><td data-sort-value="2024-03-01">1 March</td></tr>
          <tr><td>Item 2</td><td data-sort-value="2024-01-15">15 January</td></tr>
        </tbody>`)
    );

    dataTable.sort(table, 'item', 'asc');
    const items = column(table, 0);
    dataTable.sort(table, 'date', 'asc');

    expect([items, column(table, 1)]).toEqual([
      ['Item 2', 'Item 10'],
      ['15 January', '1 March'],
    ]);
  });

  it('finds the sorted column from the header row under a grouped heading', () => {
    const table = mount(
      build(`
        <thead>
          <tr><th colspan="2">Booking</th></tr>
          <tr><th>Seat</th><th data-sort="price" data-sort-type="number">Price</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">A1</th><td>30</td></tr>
          <tr><th scope="row">B4</th><td>12</td></tr>
        </tbody>`)
    );

    dataTable.sort(table, 'price', 'asc');

    expect(column(table, 1)).toEqual(['12', '30']);
  });

  it('keeps the sort while filtering and moves the original rows', async () => {
    const table = build(PEOPLE, 'data-datatable-filterable data-datatable-search-delay="0"');
    const graceRow = table.tBodies[0].rows[0];
    mount(table);
    dataTable.sort(table, 'name', 'desc');

    const search = document.querySelector('.holder input[type="search"]');
    search.value = 'a';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(
      () =>
        expect([column(table, 0), table.tBodies[0].contains(graceRow)]).toEqual([
          ['Radia', 'Katherine', 'Grace', 'Ada'],
          true,
        ]),
      WAIT
    );
  });

  it('labels its search box and shows a row when nothing matches', async () => {
    const table = mount(build(PEOPLE, 'data-datatable-filterable data-datatable-search-delay="0"'));
    const search = document.querySelector('.holder input[type="search"]');
    const label = document.querySelector('.holder label');

    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(() => {
      const rows = [...table.tBodies[0].rows];
      expect([
        label.control === search,
        rows.length,
        rows[0]?.cells[0]?.colSpan,
        rows[0]?.textContent.trim(),
      ]).toEqual([true, 1, 2, 'No matching rows']);
    }, WAIT);
  });

  it('announces which rows are showing after a change', async () => {
    const table = mount(build(PEOPLE, 'data-datatable-paginate="2"'));

    document.querySelector('.holder nav button[aria-label="Next page"]').click();

    await vi.waitFor(
      () =>
        expect(document.querySelector('.holder [role="status"]').textContent).toBe(
          'Showing 3–4 of 4 rows'
        ),
      WAIT
    );
    expect(column(table, 0)).toEqual(['Katherine', 'Radia']);
  });

  it('paginates with navigation buttons that never submit a surrounding form', () => {
    document.body.insertAdjacentHTML('beforeend', '<form class="booking"></form>');
    const form = document.querySelector('.booking');
    const holder = document.createElement('div');
    holder.className = 'holder';
    holder.innerHTML = `<table data-datatable data-datatable-paginate="2">${PEOPLE}</table>`;
    form.append(holder);
    const submitted = vi.fn(event => event.preventDefault());
    form.addEventListener('submit', submitted);
    const table = mount(holder.querySelector('table'));

    const nav = holder.querySelector('nav[aria-label="Table pagination"]');
    nav.querySelector('button[aria-label="Page 2"]').click();

    expect([
      submitted.mock.calls.length,
      [...nav.querySelectorAll('button')].every(button => button.type === 'button'),
      nav.querySelector('[aria-current="page"]')?.textContent,
      column(table, 0),
    ]).toEqual([0, true, '2', ['Katherine', 'Radia']]);
  });

  it('hides the empty pagination region from layout and assistive technology', () => {
    const style = document.createElement('style');
    style.textContent = datatableStyles;
    document.head.append(style);
    mount(build(PEOPLE, 'data-datatable-paginate="10"'));
    const nav = document.querySelector('.holder nav');
    const display = getComputedStyle(nav).display;
    style.remove();

    expect([nav.hidden, display]).toEqual([true, 'none']);
  });

  it('draws pagination buttons in the colours of the page around them', () => {
    const style = document.createElement('style');
    style.textContent = datatableStyles;
    document.head.append(style);
    const table = build(PEOPLE, 'data-datatable-paginate="2"');
    table.parentElement.style.cssText = 'background: rgb(17, 17, 17); color: rgb(240, 240, 240)';
    mount(table);
    const { color, backgroundColor } = getComputedStyle(
      document.querySelector('.holder nav button[aria-label="Page 2"]')
    );
    style.remove();

    expect([color, backgroundColor]).toEqual(['rgb(240, 240, 240)', 'rgba(0, 0, 0, 0)']);
  });

  it('shows a window of page numbers for long tables', () => {
    const rows = Array.from({ length: 100 }, (_, index) => `<tr><td>Guest ${index}</td></tr>`).join(
      ''
    );
    mount(
      build(
        `<thead><tr><th data-sort="name">Name</th></tr></thead><tbody>${rows}</tbody>`,
        'data-datatable-paginate="5"'
      )
    );

    const pages = [...document.querySelectorAll('.holder nav button[aria-label^="Page"]')].map(
      button => button.textContent
    );

    expect(pages).toEqual(['1', '2', '3', '20']);
  });

  it('shows the newest data when an earlier load finishes last, and reports it once', async () => {
    const eventBus = new EventManager();
    const loaded = [];
    eventBus.on('datatable:loaded', payload => loaded.push(payload.url));
    const table = mount(build(PEOPLE), { eventBus });
    let finishSlow;
    vi.spyOn(window, 'fetch').mockImplementation(url =>
      url === '/slow'
        ? new Promise(resolve => {
            finishSlow = () => resolve(Response.json([{ name: 'Old' }]));
          })
        : Promise.resolve(Response.json([{ name: 'New' }]))
    );
    const mapper = item => {
      const row = document.createElement('tr');
      row.insertCell().textContent = item.name;
      row.insertCell().textContent = '1';
      return row;
    };

    const slow = dataTable.loadData(table, '/slow', mapper);
    await dataTable.loadData(table, '/fast', mapper);
    finishSlow();
    await slow;

    expect([column(table, 0), loaded]).toEqual([['New'], ['/fast']]);
  });

  it('shows a load error in an alert row', async () => {
    const table = mount(build(PEOPLE));
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('Nope', { status: 503 }));

    await dataTable.loadData(table, '/guests', () => document.createElement('tr'));

    const cell = table.tBodies[0].rows[0]?.cells[0];
    expect([cell?.getAttribute('role'), cell?.colSpan, cell?.textContent]).toEqual([
      'alert',
      2,
      'HTTP 503',
    ]);
  });

  it('puts the table back as it was when unmounted', () => {
    const table = build(PEOPLE, 'data-datatable-filterable data-datatable-paginate="2"');
    const holder = table.parentElement;
    const before = holder.innerHTML;
    mount(table);
    dataTable.sort(table, 'name', 'desc');

    dataTable.unmount(table);

    expect(holder.innerHTML).toBe(before);
  });
});
