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

  it.each([
    ['date', 'someday'],
    ['datetime', '14:30'],
    ['time', 'half past two'],
  ])('opens in %s mode with a value it cannot read, %s', (mode, value) => {
    const picker = renderPicker({ mode, value });

    expect(() => picker.open()).not.toThrow();
  });

  it('reads a plain HH:mm value in time mode as that time today', () => {
    const picker = renderPicker({ mode: 'time', value: '14:30' });

    picker.open();

    expect([
      shadow(picker, '[data-datetime-hour]').value,
      shadow(picker, '[data-datetime-minute]').value,
      shadow(picker, '[data-datetime-input]').textContent,
    ]).toEqual([
      '14',
      '30',
      new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
        new Date(2020, 0, 1, 14, 30)
      ),
    ]);
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

    it('disables every control that opens the panel inside a disabled fieldset', () => {
      const { picker } = renderForm(
        '<fieldset disabled><p-datetime name="checkIn" range range-to="checkOut" mode="date"></p-datetime></fieldset>'
      );

      const openers = [...picker.shadowRoot.querySelectorAll('[aria-haspopup="dialog"]')];
      expect(openers.map(control => control.disabled)).toEqual([true, true, true]);
    });

    it('closes its open panel when its fieldset becomes disabled', () => {
      const { form, picker } = renderForm(
        '<fieldset><p-datetime name="eventDate" mode="date"></p-datetime></fieldset>'
      );
      picker.open();

      form.querySelector('fieldset').disabled = true;

      expect(trigger(picker).getAttribute('aria-expanded')).toBe('false');
    });

    it('looks dimmed while disabled', () => {
      const { picker } = renderForm(
        '<p-datetime name="eventDate" mode="date" disabled></p-datetime>'
      );

      expect(getComputedStyle(picker).opacity).toBe('0.3');
    });

    it('does not add hidden inputs to the page', () => {
      const { form } = renderForm(
        '<p-datetime name="checkIn" range range-to="checkOut" mode="date" value="2025-03-10"></p-datetime>'
      );

      expect(form.querySelectorAll('input')).toHaveLength(0);
    });
  });

  describe('keyboard and screen readers', () => {
    const focused = picker => picker.shadowRoot.activeElement;
    const press = (picker, key, options = {}) =>
      (focused(picker) ?? picker).dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          composed: true,
          cancelable: true,
          ...options,
        })
      );
    const settle = async () => {
      await nextFrame();
      await nextFrame();
    };
    const ymd = (year, monthIndex, dayNumber) =>
      `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

    it('names its value field after its form label', () => {
      const form = document.createElement('form');
      form.innerHTML =
        '<label for="event-date">Event date:</label><p-datetime id="event-date" mode="date"></p-datetime>';
      document.body.append(form);

      const field = shadow(form.querySelector('p-datetime'), '[data-datetime-input]');
      expect(field.getAttribute('aria-label')).toBe('Event date: not set');
    });

    it('names its buttons and its panel', () => {
      const picker = renderPicker({ mode: 'date' });

      expect([
        trigger(picker).getAttribute('aria-label'),
        shadow(picker, '[data-datetime-nav-btn="prev"]').getAttribute('aria-label'),
        shadow(picker, '[data-datetime-nav-btn="next"]').getAttribute('aria-label'),
        panel(picker).getAttribute('role'),
      ]).toEqual(['Choose date', 'Previous month', 'Next month', 'dialog']);
    });

    it('shows its value in a button that opens the calendar on the selected day', async () => {
      const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
      const field = shadow(picker, '[data-datetime-input]');

      field.focus();
      field.click();
      await settle();

      expect([
        field.localName,
        focused(picker)?.dataset.date,
        field.getAttribute('aria-expanded'),
      ]).toEqual(['button', '2023-07-12', 'true']);
    });

    it('moves between days with arrow keys, Home and End, and between months with Page Up', async () => {
      const picker = renderPicker({ mode: 'date', value: '2023-07-31' });
      picker.open();
      await settle();

      const visited = [];
      for (const key of ['ArrowRight', 'PageUp', 'ArrowUp', 'End']) {
        press(picker, key);
        visited.push(focused(picker)?.dataset.date);
      }

      expect(visited).toEqual(['2023-08-01', '2023-07-01', '2023-06-24', '2023-06-25']);
    });

    it('draws a focus ring on the day the arrow keys move to after a pointer opened the calendar', async () => {
      const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
      shadow(picker, '[data-datetime-input]').click();
      await settle();

      press(picker, 'ArrowRight');
      const day = focused(picker);

      expect({
        date: day?.dataset.date,
        ring: getComputedStyle(day).outlineStyle !== 'none',
      }).toEqual({ date: '2023-07-13', ring: true });
    });

    it('picks the focused day with Enter and returns focus to the field', async () => {
      const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
      const field = shadow(picker, '[data-datetime-input]');
      field.focus();
      field.click();
      await settle();

      press(picker, 'ArrowRight');
      press(picker, 'Enter');

      expect([picker.value, focused(picker) === field]).toEqual(['2023-07-13', true]);
    });

    it('closes with Escape and returns focus to the field', async () => {
      const picker = renderPicker({ mode: 'date' });
      const field = shadow(picker, '[data-datetime-input]');
      field.focus();
      field.click();
      await settle();

      press(picker, 'Escape');
      await wait(200);

      expect([
        panel(picker).hidden,
        focused(picker) === field,
        field.getAttribute('aria-expanded'),
      ]).toEqual([true, true, 'false']);
    });

    it('closes when focus moves past its panel to the next control, leaving focus there', async () => {
      const picker = renderPicker({ mode: 'date' });
      const next = document.createElement('button');
      next.textContent = 'Continue';
      document.body.append(next);
      const field = shadow(picker, '[data-datetime-input]');
      field.focus();
      field.click();
      await settle();

      shadow(picker, '[data-datetime-action="apply"]').focus();
      next.focus();

      expect([field.getAttribute('aria-expanded'), document.activeElement === next]).toEqual([
        'false',
        true,
      ]);
    });

    it('stays open while focus moves between its panel controls and its field', async () => {
      const picker = renderPicker({ mode: 'date' });
      const field = shadow(picker, '[data-datetime-input]');
      field.focus();
      field.click();
      await settle();

      shadow(picker, '[data-datetime-action="clear"]').focus();
      shadow(picker, '[data-datetime-action="apply"]').focus();
      trigger(picker).focus();
      field.focus();

      expect([field.getAttribute('aria-expanded'), panel(picker).hidden]).toEqual(['true', false]);
    });

    it('stays open when focus leaves without a new target, as when the window loses focus', async () => {
      const picker = renderPicker({ mode: 'date' });
      picker.open();
      await settle();

      focused(picker).dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: null })
      );

      expect(trigger(picker).getAttribute('aria-expanded')).toBe('true');
    });

    it('moves between months with arrow keys, Home and End in the month view', async () => {
      const picker = renderPicker({ mode: 'date', value: '2023-07-12' });
      picker.open();
      await settle();
      shadow(picker, '[data-datetime-month-year]').click();
      shadow(picker, '[data-month][tabindex="0"]').focus();

      const visited = [focused(picker)?.dataset.month];
      for (const key of ['ArrowDown', 'ArrowRight', 'Home', 'End', 'ArrowUp']) {
        press(picker, key);
        visited.push(focused(picker)?.dataset.month);
      }

      expect({
        grid: shadow(picker, '[data-datetime-grid]').getAttribute('role'),
        visited,
      }).toEqual({ grid: 'grid', visited: ['6', '9', '10', '9', '11', '8'] });
    });

    it('describes the day grid, each day, today and the selection', () => {
      const now = new Date();
      const selectedDay = now.getDate() === 15 ? 16 : 15;
      const selected = ymd(now.getFullYear(), now.getMonth(), selectedDay);
      const today = ymd(now.getFullYear(), now.getMonth(), now.getDate());
      const picker = renderPicker({ mode: 'date', value: selected });

      picker.open();

      const selectedButton = shadow(picker, `[data-date="${selected}"]`);
      const headers = [...picker.shadowRoot.querySelectorAll('[role="columnheader"]')];
      const monday = new Date(2023, 6, 31);
      expect({
        grid: shadow(picker, '[data-datetime-grid]').getAttribute('role'),
        label: selectedButton?.getAttribute('aria-label'),
        selected: selectedButton?.closest('[role="gridcell"]')?.getAttribute('aria-selected'),
        today: shadow(picker, `[data-date="${today}"]`)?.getAttribute('aria-current'),
        headers: headers.length,
        firstHeader: headers[0]?.getAttribute('aria-label'),
      }).toEqual({
        grid: 'grid',
        label: new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(
          new Date(now.getFullYear(), now.getMonth(), selectedDay)
        ),
        selected: 'true',
        today: 'date',
        headers: 7,
        firstHeader: new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(monday),
      });
    });
  });
});
