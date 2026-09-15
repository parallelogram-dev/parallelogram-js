import { afterEach, describe, expect, it, vi } from 'vitest';
import DataTable from '../../../src/components/DataTable.js';

const mountTable = (attributes = {}) => {
  const table = document.createElement('table');
  table.setAttribute('data-datatable', '');
  for (const [name, value] of Object.entries(attributes)) {
    table.setAttribute(`data-datatable-${name}`, value);
  }
  const head = table.createTHead().insertRow();
  const heading = document.createElement('th');
  heading.dataset.sort = 'name';
  heading.textContent = 'Name';
  head.append(heading);
  const body = table.createTBody();
  for (const name of ['Ada', 'Grace', 'Katherine', 'Margaret', 'Radia', 'Barbara', 'Frances']) {
    body.insertRow().insertCell().textContent = name;
  }
  document.body.append(table);

  const dataTable = new DataTable();
  dataTable.mount(table);
  return { dataTable, table, config: dataTable.getState(table).config };
};

const paginationOf = table => table.nextElementSibling.nextElementSibling;

const sortNumbers = (values, { lang, sortValues = false } = {}) => {
  const wrapper = document.createElement('div');
  if (lang) wrapper.lang = lang;
  const table = document.createElement('table');
  table.setAttribute('data-datatable', '');
  const heading = document.createElement('th');
  heading.dataset.sort = 'value';
  heading.dataset.sortType = 'number';
  table.createTHead().insertRow().append(heading);
  const body = table.createTBody();
  for (const value of values) {
    const cell = body.insertRow().insertCell();
    cell.textContent = value;
    if (sortValues) cell.dataset.sortValue = value;
  }
  wrapper.append(table);
  document.body.append(wrapper);

  new DataTable().mount(table);
  heading.querySelector('button').click();
  return Array.from(body.querySelectorAll('td'), cell => cell.textContent);
};

describe('DataTable', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each([
    ['a page size', { paginate: '5' }, { paginate: true, pageSize: 5 }],
    ['"true"', { paginate: 'true' }, { paginate: true, pageSize: 10 }],
    ['"false"', { paginate: 'false' }, { paginate: false }],
    ['"0"', { paginate: '0' }, { paginate: false }],
    [
      'a page size and page-size',
      { paginate: '5', 'page-size': '3' },
      { paginate: true, pageSize: 3 },
    ],
  ])('reads data-datatable-paginate set to %s', (_case, attributes, expected) => {
    expect(mountTable(attributes).config).toMatchObject(expected);
  });

  it('turns features on and off from "true" and "false"', () => {
    expect(mountTable({ sortable: 'false', filterable: 'true' }).config).toMatchObject({
      sortable: false,
      filterable: true,
    });
  });

  it('labels its pagination from the translation attributes', () => {
    const { table } = mountTable({
      paginate: '3',
      'pagination-label': 'Seiten',
      'previous-text': 'Zurück',
      'previous-label': 'Vorherige Seite',
      'next-text': 'Weiter',
      'next-label': 'Nächste Seite',
      'page-label': 'Seite {page}',
    });
    const nav = paginationOf(table);

    expect([
      nav.getAttribute('aria-label'),
      ...[...nav.querySelectorAll('button')].map(button => [
        button.textContent,
        button.getAttribute('aria-label'),
      ]),
    ]).toEqual([
      'Seiten',
      ['Zurück', 'Vorherige Seite'],
      ['1', 'Seite 1'],
      ['2', 'Seite 2'],
      ['3', 'Seite 3'],
      ['Weiter', 'Nächste Seite'],
    ]);
  });

  it('announces the status message with its placeholders filled in', async () => {
    const { dataTable, table } = mountTable({
      paginate: '3',
      'status-message': 'Zeilen {from} bis {to} von {total}',
    });

    dataTable.goToPage(table, 3);

    await vi.waitFor(() =>
      expect(table.nextElementSibling.textContent).toBe('Zeilen 7 bis 7 von 7')
    );
  });

  it('hides the pagination region while every row fits on one page', () => {
    const { table } = mountTable({ paginate: '10' });

    expect(paginationOf(table).hidden).toBe(true);
  });

  it('shows the pagination region again when the rows need more than one page', () => {
    const { dataTable, table } = mountTable({ paginate: '5', filterable: 'true' });
    dataTable.filter(table, 'zzz');

    dataTable.filter(table, '');

    expect(paginationOf(table).hidden).toBe(false);
  });

  it.each([
    [
      'words after them',
      ['12 users', '5 users', '100 users'],
      ['5 users', '12 users', '100 users'],
    ],
    ['units', ['5 minutes', '3 minutes', '10 GB'], ['3 minutes', '5 minutes', '10 GB']],
    ['currency and group separators', ['$1,200', '$900', '$15'], ['$15', '$900', '$1,200']],
    ['a range, by its first number', ['10-20', '3-4', '7'], ['3-4', '7', '10-20']],
  ])('sorts numbers written with %s', (_case, values, expected) => {
    expect(sortNumbers(values)).toEqual(expected);
  });

  it('sorts numbers in parentheses and after minus signs as negative', () => {
    expect(sortNumbers(['2', '(1,200)', '\u22125', '-3'])).toEqual([
      '(1,200)',
      '\u22125',
      '-3',
      '2',
    ]);
  });

  it('reads a hyphen joined to a word as part of the word rather than a minus sign', () => {
    expect(sortNumbers(['Item-5', 'Item-2', '-1'])).toEqual(['-1', 'Item-2', 'Item-5']);
  });

  it.each([
    ['de', ['1.234,56', '99,5', '1.000'], ['99,5', '1.000', '1.234,56']],
    ['en', ['1,234.56', '99.5', '1,000'], ['99.5', '1,000', '1,234.56']],
  ])('reads decimal separators in the table language %s', (lang, values, expected) => {
    expect(sortNumbers(values, { lang })).toEqual(expected);
  });

  it('reads data-sort-value with a "." decimal separator in any table language', () => {
    expect(sortNumbers(['1234.5', '99.5', '1000'], { lang: 'de', sortValues: true })).toEqual([
      '99.5',
      '1000',
      '1234.5',
    ]);
  });
});
