import { afterEach, describe, expect, it } from 'vitest';
import PDatetime from '../../../src/components/PDatetime.js';

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

const partsOf = picker =>
  [...picker.shadowRoot.querySelectorAll('[part]')].flatMap(element =>
    element.getAttribute('part').split(/\s+/)
  );

describe('p-datetime', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('exposes the parts a page needs to restyle the calendar', async () => {
    const picker = renderPicker();
    trigger(picker).click();
    await nextFrame();
    await wait(20);

    /* Without these a page can reach the host and nothing inside it, so "make the days circular"
       means forking the component */
    const parts = partsOf(picker);
    expect(
      ['panel', 'grid', 'day', 'time-select', 'action'].filter(name => !parts.includes(name))
    ).toEqual([]);
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

  it('keeps its time options and quick dates when a day is picked', () => {
    const picker = renderPicker({ mode: 'datetime', 'show-quick-dates': '' });
    picker.open();
    const hour = shadow(picker, '[data-datetime-hour] option');
    const preset = shadow(picker, '.preset');

    day(picker, 10).click();

    expect([
      shadow(picker, '[data-datetime-hour] option') === hour,
      shadow(picker, '.preset') === preset,
    ]).toEqual([true, true]);
  });

  it.each([
    ['the next month button', '[data-datetime-nav-btn="next"]'],
    ['the month and year button', '[data-datetime-month-year]'],
    ['a quick date', '.preset'],
    ['a day', '.day'],
    ['the hour select', '[data-datetime-hour]'],
  ])('stays open in datetime mode after a click on %s', async (_, selector) => {
    const picker = renderPicker({ mode: 'datetime', 'show-quick-dates': '' });
    trigger(picker).click();
    await nextFrame();

    shadow(picker, selector).click();
    await wait(200);

    expect([panel(picker).hidden, trigger(picker).getAttribute('aria-expanded')]).toEqual([
      false,
      'true',
    ]);
  });

  it('stays open when the time changes', async () => {
    const picker = renderPicker({ mode: 'time' });
    picker.open();
    await nextFrame();
    const hour = shadow(picker, '[data-datetime-hour]');

    hour.focus();
    hour.value = '14';
    hour.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(200);

    expect(panel(picker).hidden).toBe(false);
  });

  it('opens below its field when the panel fits neither below nor above it', async () => {
    const picker = renderPicker();
    trigger(picker).click();
    await nextFrame();
    const height = panel(picker).getBoundingClientRect().height;
    picker.close();
    await wait(200);

    picker.style.cssText = `position: fixed; left: 0; top: ${Math.min(height - 40, innerHeight - 80)}px`;
    trigger(picker).click();
    await nextFrame();

    expect(panel(picker).classList.contains('panel--above')).toBe(false);
  });

  it('stays open when focus moves to its panel, as Safari does for a click on a button', async () => {
    const container = document.createElement('main');
    container.tabIndex = -1;
    document.body.append(container);
    const picker = renderPicker({ mode: 'date' });
    container.append(picker);
    picker.open();
    await nextFrame();

    panel(picker).focus();
    await wait(200);

    expect([picker.shadowRoot.activeElement, panel(picker).hidden]).toEqual([panel(picker), false]);
  });

  it('closes after a click outside it', async () => {
    const picker = renderPicker({ mode: 'date' });
    const outside = document.createElement('p');
    outside.textContent = 'Elsewhere';
    document.body.append(outside);
    picker.open();
    await nextFrame();

    outside.click();
    await wait(200);

    expect(panel(picker).hidden).toBe(true);
  });

  it('shows the first hour and minute again when the value is cleared', () => {
    const picker = renderPicker({ mode: 'datetime', value: '2023-07-12T14:30:00' });
    picker.open();

    shadow(picker, '[data-datetime-action="clear"]').click();

    expect([
      shadow(picker, '[data-datetime-hour]').value,
      shadow(picker, '[data-datetime-minute]').value,
    ]).toEqual(['0', '0']);
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

    const chooseTime = (picker, hour, minute) => {
      shadow(picker, '[data-datetime-hour]').value = String(hour);
      shadow(picker, '[data-datetime-minute]').value = String(minute);
      shadow(picker, '[data-datetime-minute]').dispatchEvent(new Event('change'));
    };

    it('stores and submits a picked date and time as the local yyyy-mm-ddThh:mm', () => {
      const { form, picker } = renderForm(
        '<p-datetime name="starts" mode="datetime" value="2024-01-15T08:00"></p-datetime>'
      );
      picker.open();

      shadow(picker, '[data-date="2024-01-16"]').click();
      chooseTime(picker, 9, 30);

      expect([picker.value, new FormData(form).get('starts')]).toEqual([
        '2024-01-16T09:30',
        '2024-01-16T09:30',
      ]);
    });

    it('stores and submits a picked time as hh:mm', () => {
      const { form, picker } = renderForm('<p-datetime name="opens" mode="time"></p-datetime>');
      picker.open();

      chooseTime(picker, 9, 30);

      expect([picker.value, new FormData(form).get('opens')]).toEqual(['09:30', '09:30']);
    });

    it('submits both ends of a datetime range as local dates and times', () => {
      const { form, picker } = renderForm(
        '<p-datetime name="starts" range range-to="ends" mode="datetime" value="2024-01-08T09:00"></p-datetime>'
      );
      picker.open();

      shadow(picker, '[data-date="2024-01-10"]').click();
      shadow(picker, '[data-date="2024-01-12"]').click();
      chooseTime(picker, 17, 15);

      const data = new FormData(form);
      expect([data.get('starts'), data.get('ends')]).toEqual([
        '2024-01-10T09:00',
        '2024-01-12T17:15',
      ]);
    });

    it('reads an ISO instant as the local date and time it stands for', () => {
      const instant = '2024-01-15T22:30:00.000Z';
      const date = new Date(instant);
      const pad = number => String(number).padStart(2, '0');
      const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      const local = `${localDate(instant)}T${time}`;
      const { form } = renderForm(
        `<p-datetime name="starts" mode="datetime" value="${instant}"></p-datetime>
         <p-datetime name="opens" mode="time" value="${instant}"></p-datetime>`
      );

      const data = new FormData(form);
      expect([data.get('starts'), data.get('opens')]).toEqual([local, time]);
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
  it('names months and weekdays in the language of the nearest lang, not the browser', async () => {
    const french = renderPicker({ value: '2026-03-15', lang: 'fr' });
    const german = document.createElement('div');
    german.lang = 'de';
    document.body.append(german);
    const inherited = document.createElement('p-datetime');
    inherited.setAttribute('value', '2026-03-15');
    german.append(inherited);
    trigger(french).click();
    await nextFrame();
    trigger(inherited).click();
    await nextFrame();

    expect([
      shadow(french, '[data-slot="month"]').textContent,
      shadow(inherited, '[data-slot="month"]').textContent,
    ]).toEqual(['mars', 'März']);
  });

  it('uses the words the page chose, in the order the page wrote them', () => {
    const picker = renderPicker({
      'date-noun': 'fecha',
      placeholder: 'Elige {what}…',
      'choose-label': 'Elegir {what}',
      'apply-label': 'Aplicar',
      'empty-value': 'sin valor',
      'value-label': '{value} — {label}',
    });
    const field = shadow(picker, '[data-datetime-input]');

    /* The noun feeds the placeholder and the trigger, and the field label's fallback is the same
       noun capitalised, so one word set in the page's language reaches every sentence that names it */
    expect([
      field.getAttribute('data-placeholder'),
      trigger(picker).getAttribute('aria-label'),
      shadow(picker, '[data-datetime-action="apply"]').textContent,
      field.getAttribute('aria-label'),
    ]).toEqual(['Elige fecha…', 'Elegir fecha', 'Aplicar', 'sin valor — Fecha']);
  });

  it('lets a site change a word for every picker at once', () => {
    PDatetime.defaults.clearLabel = 'Effacer';
    try {
      const picker = renderPicker();

      expect(shadow(picker, '[data-datetime-action="clear"]').textContent).toBe('Effacer');
    } finally {
      PDatetime.defaults.clearLabel = 'Clear';
    }
  });

  it('reports a missing value in the words the page chose', async () => {
    const picker = renderPicker({ required: '', 'required-message': '{what} requis' });
    await nextFrame();

    expect(picker.validationMessage).toBe('date requis');
  });
});
