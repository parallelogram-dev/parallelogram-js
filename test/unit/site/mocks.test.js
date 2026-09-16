import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMockApi } from '../../../site/src/mocks.js';

const originalFetch = window.fetch;
const optionsFrom = async path =>
  (await window.fetch(path).then(response => response.json())).options;

describe('site mock api', () => {
  beforeEach(() => {
    window.fetch = vi.fn(() => Promise.reject(new Error('went to the network')));
    installMockApi();
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it('answers the uploader with a success', async () => {
    const response = await window.fetch('/api/update', { method: 'POST' });

    expect(await response.json()).toEqual({ success: true });
  });

  it('sends every place back when nothing is typed', async () => {
    const options = await optionsFrom('/api/places?q=');

    expect([options.length > 90, options[0]]).toEqual([
      true,
      { value: 'sydney-nsw', label: 'Sydney, NSW' },
    ]);
  });

  it('narrows the places to the query, whatever its case', async () => {
    const options = await optionsFrom('/api/places?q=BENDI');

    expect(options).toEqual([{ value: 'bendigo-vic', label: 'Bendigo, VIC' }]);
  });

  it('searches the directory on the query', async () => {
    const options = await optionsFrom('/api/directory?q=nguyen');

    expect(options.every(option => option.label.includes('Nguyen'))).toBe(true);
  });

  it('gives each directory row an email and a role', async () => {
    const [row] = await optionsFrom('/api/directory?q=amelia nguyen');

    expect([row.secondary, typeof row.description, row.description.length > 0]).toEqual([
      'amelia.nguyen@example.com',
      'string',
      true,
    ]);
  });

  it('searches the directory on the email as well as the name', async () => {
    const options = await optionsFrom('/api/directory?q=noah.tran@');

    expect(options.map(option => option.secondary)).toEqual(['noah.tran@example.com']);
  });

  it('sends back no more than a page of rows', async () => {
    expect((await optionsFrom('/api/directory?q=a')).length).toBe(25);
  });

  it('gives the directory the same ids on every install', async () => {
    const first = await optionsFrom('/api/directory?q=amelia nguyen');
    const second = await optionsFrom('/api/directory?q=amelia nguyen');

    expect(first).toEqual(second);
  });

  it('sends back nothing when the directory has no match', async () => {
    expect(await optionsFrom('/api/directory?q=zzzz')).toEqual([]);
  });

  it('passes everything else to the network', async () => {
    await expect(window.fetch('/guides/index.html')).rejects.toThrow('went to the network');
  });
});
