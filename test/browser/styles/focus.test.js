import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PSelect.js';
import '../../../src/components/PDatetime.js';
import '../../../src/components/PModal.js';
import datatableStyles from '../../../src/styles/framework/components/datatable.scss';
import frameworkStyles from '../../../src/styles/framework/index.scss';
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

  it('outlines a p-select while it has focus', () => {
    const select = document.createElement('p-select');
    select.append(new Option('Canada', 'ca'));
    document.body.append(select);

    select.shadowRoot.querySelector('.control').focus();

    expect(visible(outlineOf(select.shadowRoot.querySelector('.control')))).toBe(true);
  });

  it('keeps a p-select outlined while its search box has focus', () => {
    const select = document.createElement('p-select');
    select.setAttribute('searchable', '');
    select.append(new Option('Canada', 'ca'));
    document.body.append(select);

    select.shadowRoot.querySelector('.control').focus();
    select.open();

    /* The search box is in the list rather than in the control, so a field that watched only
       itself went unlit at the moment it was being typed into */
    expect([
      select.shadowRoot.activeElement?.className,
      visible(outlineOf(select.shadowRoot.querySelector('.control'))),
    ]).toEqual(['input', true]);
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

  it('hides the close button ring on a modal opened by pointer', () => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Booking confirmed</h2><p>Table 12 is held.</p>';
    document.body.append(modal);
    cleanups.push(() => {
      modal.remove();
      document.body.style.overflow = '';
    });
    /* The tracker records the last real input, so a pointer press is what makes it pointer */
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    modal.open();

    const close = modal.shadowRoot.querySelector('[data-modal-close-btn]');
    expect([modal.shadowRoot.activeElement, visible(outlineOf(close))]).toEqual([close, false]);
  });

  it('outlines the close button on a modal opened by keyboard', () => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Booking confirmed</h2><p>Table 12 is held.</p>';
    document.body.append(modal);
    cleanups.push(() => {
      modal.remove();
      document.body.style.overflow = '';
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    modal.open();

    const close = modal.shadowRoot.querySelector('[data-modal-close-btn]');
    expect(visible(outlineOf(close))).toBe(true);
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

  it('hides the ring on its own elements after pointer input, and leaves the page alone', () => {
    const style = addStyles(frameworkStyles);
    cleanups.push(() => style.remove());
    const pageStyle = addStyles('.page-button:focus { outline: 3px solid green }');
    cleanups.push(() => pageStyle.remove());
    const table = document.createElement('table');
    table.setAttribute('data-datatable', '');
    const inside = document.createElement('button');
    table.append(inside);
    const page = document.createElement('button');
    page.className = 'page-button';
    document.body.append(table, page);
    document.documentElement.dataset.focusSource = 'pointer';
    cleanups.push(() => {
      delete document.documentElement.dataset.focusSource;
    });

    inside.focus();
    const frameworkRing = visible(outlineOf(inside));
    page.focus();

    expect([frameworkRing, visible(outlineOf(page))]).toEqual([false, true]);
  });
});
