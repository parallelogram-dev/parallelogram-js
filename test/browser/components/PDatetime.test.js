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

  describe('in a form', () => {
    const renderForm = markup => {
      const form = document.createElement('form');
      form.innerHTML = markup;
      document.body.append(form);
      return { form, picker: form.querySelector('p-datetime') };
    };

    const thisMonthDay = number => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(number).padStart(2, '0')}`;
    };

    it('is a form-associated custom element', () => {
      const { form, picker } = renderForm('<p-datetime name="eventDate" mode="date"></p-datetime>');

      expect(picker.form).toBe(form);
    });

    it('stores and submits a picked date as yyyy-mm-dd', () => {
      const { form, picker } = renderForm('<p-datetime name="eventDate" mode="date"></p-datetime>');

      trigger(picker).click();
      day(picker, 10).click();

      expect([picker.value, new FormData(form).get('eventDate')]).toEqual([
        thisMonthDay(10),
        thisMonthDay(10),
      ]);
    });

    it('submits the value set through its value property', () => {
      const { form, picker } = renderForm('<p-datetime name="eventDate" mode="date"></p-datetime>');

      picker.value = '2025-03-10';

      expect(new FormData(form).get('eventDate')).toBe('2025-03-10');
    });

    it('submits both ends of a range under their own names', () => {
      const { form, picker } = renderForm(
        '<p-datetime name="checkIn" range range-to="checkOut" mode="date"></p-datetime>'
      );

      picker.value = '2025-03-10';
      picker.rangeToValue = '2025-03-14';

      const data = new FormData(form);
      expect([data.get('checkIn'), data.get('checkOut')]).toEqual(['2025-03-10', '2025-03-14']);
    });

    it('shows a yyyy-mm-dd value as that calendar date', () => {
      const { picker } = renderForm(
        '<p-datetime name="eventDate" mode="date" value="2024-01-15"></p-datetime>'
      );

      const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
        new Date(2024, 0, 15)
      );
      expect(shadow(picker, '[data-datetime-input]').textContent.trim()).toBe(expected);
    });

    it('reports a missing required date', () => {
      const { form, picker } = renderForm(
        '<p-datetime name="eventDate" mode="date" required></p-datetime>'
      );

      expect([form.checkValidity(), picker.validity.valueMissing]).toEqual([false, true]);
    });

    it('returns to its initial value when the form is reset', () => {
      const { form, picker } = renderForm(
        '<p-datetime name="eventDate" mode="date" value="2024-01-15"></p-datetime>'
      );

      trigger(picker).click();
      day(picker, 20).click();
      form.reset();

      expect(picker.value).toBe('2024-01-15');
    });

    it('does not open inside a disabled fieldset', async () => {
      const { picker } = renderForm(
        '<fieldset disabled><p-datetime name="eventDate" mode="date"></p-datetime></fieldset>'
      );

      trigger(picker).click();
      await wait(50);

      expect(panel(picker).hidden).toBe(true);
    });

    it('does not add hidden inputs to the page', () => {
      const { form } = renderForm(
        '<p-datetime name="checkIn" range range-to="checkOut" mode="date" value="2025-03-10"></p-datetime>'
      );

      expect(form.querySelectorAll('input')).toHaveLength(0);
    });
  });
});
