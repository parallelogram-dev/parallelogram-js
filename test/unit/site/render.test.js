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
import PSelect from '../../../src/components/PSelect.contract.js';
import Toggle from '../../../src/components/Toggle.contract.js';

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

  it('sets the import and tag facts under the title, with the playground beside them', () => {
    const page = parse(componentPage(PSelect));
    const header = page.querySelector('.doc__columns > .doc__header');

    expect([
      header.querySelector('.doc__intro h1') !== null,
      header.querySelector('.doc__facts') !== null,
      page.querySelector('.doc__aside .doc__aside-title')?.textContent,
    ]).toEqual([true, true, 'Playground']);
  });

  it('leaves the playground out when an example has none to show', () => {
    const page = parse(componentPage({ ...PSelect, examples: [] }));

    expect([
      page.querySelector('.doc__aside'),
      page.querySelector('.doc__main #about') !== null,
    ]).toEqual([null, true]);
  });

  it('reads down the left column, with the playground beside all of it', () => {
    const page = parse(componentPage(PSelect));

    expect([
      page.querySelector('.doc__main #about') !== null,
      page.querySelector('.doc__main #usage') !== null,
      page.querySelector('.doc__main .doc__reference #attributes') !== null,
      page.querySelector('.doc__aside [data-example]') !== null,
    ]).toEqual([true, true, true, true]);
  });

  it('offers a control for every attribute an example can change, the named ones first', () => {
    const page = parse(componentPage(PSelect));
    const controls = [
      ...page.querySelectorAll('[data-example="PSelect:form"] [data-attribute]'),
    ].map(field => field.getAttribute('data-attribute'));

    expect([controls.slice(0, 4), new Set(controls)]).toEqual([
      ['placeholder', 'required', 'disabled', 'data-select-open-on-focus'],
      new Set(PSelect.attributes.map(attribute => attribute.name)),
    ]);
  });

  it('puts several examples in tabs and shows the first', () => {
    const tabs = parse(componentPage(PSelect)).querySelector('.doc__aside .playground');
    const list = tabs.querySelector('.playground__tabs');

    expect([
      [...list.children].map(tab => tab.textContent.trim()),
      tabs.querySelector('[data-tab-panel="active"] [data-example]')?.getAttribute('data-example'),
    ]).toEqual([PSelect.examples.map(example => example.title), 'PSelect:form']);
  });

  it('shows a lone example without tabs', () => {
    const page = parse(componentPage(CopyToClipboard));

    expect([
      page.querySelector('.playground') === null,
      page.querySelector('.doc__aside [data-example]') !== null,
    ]).toEqual([true, true]);
  });

  it('shows an example as Output and Markup tabs, so it stays short', () => {
    const views = parse(componentPage(PSelect)).querySelector(
      '[data-example="PSelect:form"] .example__views'
    );

    expect([
      [...views.querySelector('.example__tabs').children].map(tab => tab.textContent.trim()),
      views.querySelector('[data-tab-panel="active"] [data-example-stage]') !== null,
      views.querySelector('[data-example-code]') !== null,
    ]).toEqual([['Output', 'Markup', 'Events'], true, true]);
  });

  it('adds a State tab only for a component that writes state attributes', () => {
    const tabsOf = contract =>
      [...parse(componentPage(contract)).querySelector('.example__tabs').children].map(tab =>
        tab.textContent.trim()
      );

    expect([tabsOf(Tabs), tabsOf(PSelect)]).toEqual([
      ['Output', 'Markup', 'State', 'Events'],
      ['Output', 'Markup', 'Events'],
    ]);
  });

  it('keeps the controls out of the tabs, so they stay to hand', () => {
    const example = parse(componentPage(PSelect)).querySelector('[data-example="PSelect:form"]');

    expect(example.querySelector('.example__views [data-example-controls]')).toBe(null);
  });

  it('leaves the attribute that marks the component out of the controls', () => {
    const controls = [
      ...parse(componentPage(Toggle)).querySelectorAll('[data-example] [data-attribute]'),
    ].map(field => field.getAttribute('data-attribute'));

    expect([controls.includes('data-toggle'), controls.includes('data-toggle-capture')]).toEqual([
      false,
      true,
    ]);
  });

  it('says what a web component does before its module loads', () => {
    const page = parse(componentPage(PModal));
    const section = page.querySelector('#without-javascript')?.closest('section');

    expect([section !== null, section?.textContent.includes('script')]).toEqual([true, true]);
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
