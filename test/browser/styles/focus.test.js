import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PSelect.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PModal.js';
import datatableStyles from '../../../src/styles/framework/components/datatable.scss';
import mixinStyles from '../fixtures/focus-mixins.scss';

const outlineOf = element => {
  const style = getComputedStyle(element);
  return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
};

const visible = ({ style, width }) => style !== 'none' && width >= 2;

const addStyles = css => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  return style;
};

describe('focus indicators', () => {
  const cleanups = [];

  afterEach(() => {
    cleanups.splice(0).forEach(cleanup => cleanup());
    document.body.replaceChildren();
  });

  it('outlines a p-select while its input has focus', () => {
    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'));
    document.body.append(select);

    select.shadowRoot.querySelector('.input').focus();

    expect(visible(outlineOf(select.shadowRoot.querySelector('.control')))).toBe(true);
  });

  it('outlines the p-datetime time selects on focus', () => {
    const datetime = document.createElement('p-datetime');
    datetime.setAttribute('mode', 'datetime');
    document.body.append(datetime);
    datetime.open();

    const hour = datetime.shadowRoot.querySelector('.time-select');
    hour.focus();

    expect(visible(outlineOf(hour))).toBe(true);
  });

  it('outlines a p-modal panel that takes focus because nothing inside it can', () => {
    const modal = document.createElement('p-modal');
    modal.setAttribute('data-modal-closable', 'false');
    modal.innerHTML = '<h2 slot="title">Saving</h2><p>Please wait.</p>';
    document.body.append(modal);
    cleanups.push(() => {
      modal.remove();
      document.body.style.overflow = '';
    });

    modal.open();

    const panel = modal.shadowRoot.querySelector('dialog');
    expect([modal.shadowRoot.activeElement, visible(outlineOf(panel))]).toEqual([panel, true]);
  });

  it('outlines the DataTable search box on focus', () => {
    const style = addStyles(datatableStyles);
    cleanups.push(() => style.remove());
    document.body.innerHTML = '<input class="datatable-search" type="search">';
    const search = document.querySelector('.datatable-search');

    search.focus();

    expect(visible(outlineOf(search))).toBe(true);
  });

  it('keeps an outline in the design-system focus, button reset and form control mixins', () => {
    const style = addStyles(mixinStyles);
    cleanups.push(() => style.remove());
    document.body.innerHTML = `
      <button class="ring" type="button">Ring</button>
      <button class="reset" type="button">Reset</button>
      <input class="control" type="text">`;

    const results = ['.ring', '.reset', '.control'].map(selector => {
      const element = document.querySelector(selector);
      element.focus();
      return [selector, visible(outlineOf(element))];
    });

    expect(results).toEqual([
      ['.ring', true],
      ['.reset', true],
      ['.control', true],
    ]);
  });
});
