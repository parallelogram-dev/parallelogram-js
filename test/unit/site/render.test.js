import { describe, expect, it } from 'vitest';
import {
  componentPage,
  controlField,
  inline,
  sidebar,
  slugFor,
} from '../../../site/build/render.js';
import Tabs from '../../../src/components/Tabs.contract.js';
import PModal from '../../../src/components/PModal.contract.js';
import CopyToClipboard from '../../../src/components/CopyToClipboard.contract.js';

const parse = html => {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html.replace(/<(\/?)p-/g, '<$1x-inert-p-');
  return doc.body;
};

describe('documentation site rendering', () => {
  it('escapes text and turns backticks into code', () => {
    expect(inline('Open `<p-modal>` & focus')).toBe(
      'Open <code>&lt;p-modal&gt;</code> &amp; focus'
    );
  });

  it('names pages after tags and kebab-cased class names', () => {
    expect([slugFor(PModal), slugFor(CopyToClipboard), slugFor(Tabs)]).toEqual([
      'p-modal',
      'copy-to-clipboard',
      'tabs',
    ]);
  });

  it('marks the current page in the sidebar', () => {
    const nav = parse(sidebar([Tabs, PModal], 'tabs'));

    expect(
      [...nav.querySelectorAll('[aria-current="page"]')].map(link => link.textContent)
    ).toEqual(['Tabs']);
  });

  it('lists guides in the sidebar after the overview', () => {
    const nav = parse(
      sidebar([Tabs, PModal], 'upgrading', [{ slug: 'upgrading', title: 'Upgrading' }])
    );

    expect(
      [...nav.querySelectorAll('.sidebar__heading')].map(heading => heading.textContent)
    ).toEqual(['Start', 'Guides', 'Web components', 'Enhancements']);
  });

  it('lists attributes with their allowed values and defaults', () => {
    const page = parse(componentPage(Tabs));
    const row = [...page.querySelectorAll('#attributes ~ .table-wrap tbody tr')].find(
      tr => tr.querySelector('th code')?.textContent === 'data-tabs-activation'
    );

    expect([...row.querySelectorAll('td')].slice(0, 2).map(cell => cell.textContent)).toEqual([
      'auto | manual',
      'auto',
    ]);
  });

  it('shows example markup as text beside the live example', () => {
    const page = parse(componentPage(Tabs));
    const example = page.querySelector('[data-example="Tabs:links"]');

    expect([
      example.querySelector('[data-example-stage] [data-tabs]') !== null,
      example.querySelector('[data-example-code]').textContent.startsWith('<div data-tabs>'),
    ]).toEqual([true, true]);
  });

  it('adds a state panel only for components that write state attributes', () => {
    const withState = parse(componentPage(Tabs));
    const withoutState = parse(componentPage(CopyToClipboard));

    expect([
      withState.querySelector('[data-example-state]') !== null,
      withoutState.querySelector('[data-example-state]') === null,
    ]).toEqual([true, false]);
  });

  it('offers a control suited to each attribute type', () => {
    const control = (type, extra = {}) =>
      parse(
        controlField(
          'x',
          { attribute: 'data-a' },
          { name: 'data-a', type, description: 'A', ...extra }
        )
      ).querySelector('[data-attribute]');

    expect([
      control('flag').type,
      [...control('boolean').options].map(option => option.value),
      [...control('enum', { options: ['sm', 'lg'], default: 'sm' }).options].map(
        option => option.textContent
      ),
      control('number').type,
    ]).toEqual(['checkbox', ['', 'true', 'false'], ['not set (sm)', 'sm', 'lg'], 'number']);
  });
});
