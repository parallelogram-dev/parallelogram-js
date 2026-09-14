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

const shadow = (picker, selector) => picker.shadowRoot.querySelector(selector);
const panel = picker => shadow(picker, '[data-datetime-panel]');
const trigger = picker => shadow(picker, '[data-datetime-trigger]');
const day = (picker, number) =>
  [...picker.shadowRoot.querySelectorAll('.day')].find(
    button => button.textContent.trim() === String(number)
  );
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

/**
 * The local calendar date a value stands for, whether it is stored as yyyy-mm-dd or an ISO instant
 */
const localDate = value => {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const record = (picker, type) => {
  const events = [];
  picker.addEventListener(type, event => events.push(event.detail));
  return events;
};

describe('p-datetime', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('opens from its trigger after being moved on the page', async () => {
    const picker = renderPicker({ mode: 'date' });
    picker.remove();
    document.body.append(picker);

    trigger(picker).click();
    await wait(250);

    expect(panel(picker).hidden).toBe(false);
  });

  it('can be imported a second time without throwing', async () => {
    await expect(import('../../../src/components/PDatetime.js?second-copy')).resolves.toBeDefined();
  });

  it('announces opening and closing, and whether the value changed', () => {
    const picker = renderPicker({ mode: 'date' });
    const opened = record(picker, 'p-datetime:open');
    const closed = record(picker, 'p-datetime:close');

    picker.open();
    picker.close();

    expect([opened.length, closed]).toEqual([1, [{ changed: false, value: '' }]]);
  });

  it('marks range change events as complete only once both ends are chosen', () => {
    const picker = renderPicker({ mode: 'date', range: '', 'range-to': 'to' });
    const changes = record(picker, 'change');

    trigger(picker).click();
    day(picker, 10).click();
    day(picker, 20).click();

    expect(changes.map(detail => detail.complete)).toEqual([false, true]);
  });

  it('opens on the month of its current value', () => {
    const picker = renderPicker({ mode: 'date', value: '2023-07-01' });

    picker.open();

    const month = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(
      new Date(2023, 6, 1)
    );
    expect([
      shadow(picker, '[data-slot="month"]').textContent,
      shadow(picker, '[data-slot="year"]').textContent,
    ]).toEqual([month, '2023']);
  });

  it('starts a new range when a complete range is picked again', () => {
    const picker = renderPicker({
      mode: 'date',
      range: '',
      'range-to': 'to',
      value: '2023-07-01',
      'range-to-value': '2023-08-15',
    });

    trigger(picker).click();
    day(picker, 10).click();
    day(picker, 20).click();

    expect([localDate(picker.value), localDate(picker.rangeToValue)]).toEqual([
      '2023-07-10',
      '2023-07-20',
    ]);
  });

  it('clears both ends of a range', () => {
    const picker = renderPicker({
      mode: 'date',
      range: '',
      'range-to': 'to',
      value: '2023-07-01',
      'range-to-value': '2023-08-15',
    });

    trigger(picker).click();
    shadow(picker, '[data-datetime-action="clear"]').click();

    expect([picker.value, picker.rangeToValue]).toEqual(['', '']);
  });

  it('leaves the host element’s attributes and styles alone', async () => {
    const picker = renderPicker({ mode: 'date' });

    await nextFrame();
    await nextFrame();

    expect([picker.hasAttribute('theme'), picker.getAttribute('style')]).toEqual([false, null]);
  });
});
