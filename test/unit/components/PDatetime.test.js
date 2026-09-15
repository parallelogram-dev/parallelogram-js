import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/PDatetime.js';

const renderPicker = (attributes = {}) => {
  const picker = document.createElement('p-datetime');
  for (const [name, value] of Object.entries(attributes)) {
    picker.setAttribute(name, value);
  }
  document.body.append(picker);
  return picker;
};

const day = (picker, date) => picker.shadowRoot.querySelector(`[data-date="${date}"]`);
const dates = (picker, selector) =>
  [...picker.shadowRoot.querySelectorAll(selector)].map(button => button.dataset.date);
const focused = picker => picker.shadowRoot.activeElement?.dataset.date;
const press = (picker, key) =>
  picker.shadowRoot.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true })
  );
const afterRender = () => new Promise(resolve => queueMicrotask(resolve));

describe('p-datetime day grid', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps its day buttons when a day in the month shown is picked', () => {
    const picker = renderPicker({ mode: 'datetime', value: '2023-07-12T09:00:00' });
    picker.open();
    const button = day(picker, '2023-07-20');

    button.click();

    expect(day(picker, '2023-07-20')).toBe(button);
  });

  it('moves the selection and the roving tabindex to the picked day', () => {
    const picker = renderPicker({ mode: 'datetime', value: '2023-07-12T09:00:00' });
    picker.open();

    day(picker, '2023-07-20').click();

    expect({
      selected: dates(picker, '[aria-selected="true"] .day'),
      marked: dates(picker, '.day.selected'),
      tabbable: dates(picker, '.day[tabindex="0"]'),
    }).toEqual({ selected: ['2023-07-20'], marked: ['2023-07-20'], tabbable: ['2023-07-20'] });
  });

  it('marks the ends of a picked range and the days between them', () => {
    const picker = renderPicker({ mode: 'date', range: '', value: '2023-07-01' });
    picker.open();

    day(picker, '2023-07-10').click();
    day(picker, '2023-07-13').click();

    expect({
      start: dates(picker, '.range-start'),
      end: dates(picker, '.range-end'),
      between: dates(picker, '.in-range'),
      selected: dates(picker, '[aria-selected="true"] .day'),
    }).toEqual({
      start: ['2023-07-10'],
      end: ['2023-07-13'],
      between: ['2023-07-11', '2023-07-12'],
      selected: ['2023-07-10', '2023-07-13'],
    });
  });

  it('unmarks the old day when the value moves to another day in the same month', async () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
    picker.open();

    picker.value = '2023-07-05';
    await afterRender();

    expect(dates(picker, '.day.selected')).toEqual(['2023-07-05']);
  });

  it('moves focus between days of the month shown without replacing them', () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
    picker.open();
    day(picker, '2023-07-12').focus();
    const next = day(picker, '2023-07-13');

    press(picker, 'ArrowRight');

    expect([picker.shadowRoot.activeElement === next, next.tabIndex]).toEqual([true, 0]);
  });

  it('builds the next month and focuses its day when the arrow keys leave the month', () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-31' });
    picker.open();
    day(picker, '2023-07-31').focus();

    press(picker, 'ArrowRight');

    expect([focused(picker), day(picker, '2023-07-31')]).toEqual(['2023-08-01', null]);
  });

  it('disables days again when min changes', async () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-20' });
    picker.open();

    picker.min = '2023-07-15';
    await afterRender();

    expect(dates(picker, '[aria-disabled="true"]')).toEqual(
      Array.from({ length: 14 }, (_, index) => `2023-07-${String(index + 1).padStart(2, '0')}`)
    );
  });

  it('shows the day grid again after choosing the same month in the month view', () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
    picker.open();

    picker.shadowRoot.querySelector('[data-datetime-month-year]').click();
    picker.shadowRoot.querySelector('[data-month="6"]').click();

    expect({
      days: picker.shadowRoot.querySelectorAll('.day').length,
      months: picker.shadowRoot.querySelectorAll('[data-month]').length,
      selected: dates(picker, '.day.selected'),
    }).toEqual({ days: 31, months: 0, selected: ['2023-07-12'] });
  });
});
