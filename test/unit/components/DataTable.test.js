import { afterEach, describe, expect, it } from 'vitest';
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
  return dataTable.getState(table).config;
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
    expect(mountTable(attributes)).toMatchObject(expected);
  });

  it('turns features on and off from "true" and "false"', () => {
    expect(mountTable({ sortable: 'false', filterable: 'true' })).toMatchObject({
      sortable: false,
      filterable: true,
    });
  });
});
