import { afterEach, describe, expect, it } from 'vitest';
import { propertiesOf } from '../../../scripts/types/members.mjs';
import '../../../src/components/PModal.js';
import '../../../src/components/PToasts.js';
import '../../../src/components/PSelect.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PUploader.js';

/** Every custom element a contract describes, with its contract entry */
const elements = Object.values(
  import.meta.glob('../../../src/components/*.contract.js', { eager: true, import: 'default' })
)
  .filter(contract => contract.kind === 'element')
  .flatMap(contract => [contract, ...(contract.elements ?? [])])
  .map(item => [item.tag, item]);

/**
 * Put an element inside another element's shadow root, where only composed events reach the page
 */
const inShadow = element => {
  const host = document.createElement('div');
  host.attachShadow({ mode: 'open' }).append(element);
  document.body.append(host);
  return element;
};

const heard = (target, types) => {
  const events = [];
  for (const type of types) {
    target.addEventListener(type, () => events.push(type));
  }
  return events;
};

describe('web component contract', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('p-modal announces opening and closing to the page from inside a shadow root', () => {
    const modal = inShadow(document.createElement('p-modal'));
    const events = heard(document, ['p-modal:open', 'p-modal:close']);

    modal.open();
    modal.removeAttribute('open');

    expect(events).toEqual(['p-modal:open', 'p-modal:close']);
  });

  it('p-modal opens when open was set as a property before it was defined', () => {
    const template = document.createElement('template');
    template.innerHTML = '<p-modal></p-modal>';
    const modal = template.content.firstElementChild;
    modal.open = true;

    document.body.append(modal);

    expect([modal.hasAttribute('open'), typeof modal.open]).toEqual([true, 'function']);
  });

  it('p-toasts announces a toast shown and closed to the page from inside a shadow root', () => {
    const host = inShadow(document.createElement('p-toasts'));
    const events = heard(document, ['p-toasts:show', 'p-toasts:close']);

    host.toast({ message: 'Saved', timeout: 0 })();

    expect(events).toEqual(['p-toasts:show', 'p-toasts:close']);
  });

  it('p-select announces opening and closing to the page from inside a shadow root', () => {
    const select = document.createElement('p-select');
    select.innerHTML =
      '<option value="au">Australia</option><option value="nz">New Zealand</option>';
    inShadow(select);
    const events = heard(document, ['p-select:open', 'p-select:close']);

    select.open();
    select.close();

    expect(events).toEqual(['p-select:open', 'p-select:close']);
  });

  it('p-datetime reflects the range attribute as a range property', () => {
    const picker = document.body.appendChild(document.createElement('p-datetime'));

    picker.range = true;

    expect([picker.getAttribute('range'), picker.range]).toEqual(['', true]);
  });

  it.each(elements)(
    '%s starts out null only in properties whose declared type allows null',
    (tag, item) => {
      const element = document.createElement(tag);

      expect(
        propertiesOf(item)
          .filter(property => element[property.name] === null && !/\bnull\b/.test(property.type))
          .map(property => `${property.name}: ${property.type}`)
      ).toEqual([]);
    }
  );
});
