import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import '../../../src/components/PDatetime.js';

/**
 * p-datetime values in a timezone 11 hours ahead of UTC in January, where a UTC instant would name a
 * different day and time from the one the user picked
 */
const originalTimezone = process.env.TZ;

/**
 * happy-dom has no ElementInternals, so this stand-in records the form value and validity the picker
 * reports
 */
class FakeInternals {
  formValue = null;
  validity = {};
  setFormValue(value) {
    this.formValue = value;
  }
  setValidity(flags) {
    this.validity = { ...flags };
  }
}

const render = markup => {
  const form = document.createElement('form');
  form.innerHTML = markup;
  document.body.append(form);
  return form.querySelector('p-datetime');
};

const shadow = (picker, selector) => picker.shadowRoot.querySelector(selector);

const chooseTime = (picker, hour, minute) => {
  shadow(picker, '[data-datetime-hour]').value = String(hour);
  shadow(picker, '[data-datetime-minute]').value = String(minute);
  shadow(picker, '[data-datetime-minute]').dispatchEvent(new Event('change'));
};

const submitted = (picker, name) => {
  const { formValue } = picker._internals;
  return formValue instanceof FormData ? formValue.get(name) : formValue;
};

describe('p-datetime in a timezone ahead of UTC', () => {
  beforeAll(() => {
    process.env.TZ = 'Australia/Sydney';
    HTMLElement.prototype.attachInternals = () => new FakeInternals();
  });

  afterAll(() => {
    delete HTMLElement.prototype.attachInternals;
    if (originalTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimezone;
    }
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('runs 11 hours ahead of UTC in January', () => {
    expect(new Date(2024, 0, 15).getTimezoneOffset()).toBe(-660);
  });

  it('stores and submits a picked date and time as the local yyyy-mm-ddThh:mm', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" value="2024-01-15T08:00"></p-datetime>'
    );
    picker.open();

    shadow(picker, '[data-date="2024-01-16"]').click();
    chooseTime(picker, 9, 30);

    expect([picker.value, picker.getAttribute('value'), submitted(picker)]).toEqual([
      '2024-01-16T09:30',
      '2024-01-16T09:30',
      '2024-01-16T09:30',
    ]);
  });

  it('stores and submits a picked time as hh:mm', () => {
    const picker = render('<p-datetime name="opens" mode="time"></p-datetime>');
    picker.open();

    chooseTime(picker, 9, 30);

    expect([picker.value, submitted(picker)]).toEqual(['09:30', '09:30']);
  });

  it('keeps the time of day when a day is picked with the keyboard', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" value="2024-01-15T14:30"></p-datetime>'
    );
    picker.open();
    shadow(picker, '[data-date="2024-01-15"]').focus();

    for (const key of ['ArrowRight', 'Enter']) {
      picker.shadowRoot.activeElement.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true })
      );
    }

    expect(picker.value).toBe('2024-01-16T14:30');
  });

  it('sends the local value in change events', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" value="2024-01-15T08:00"></p-datetime>'
    );
    const values = [];
    picker.addEventListener('change', event => values.push(event.detail.value));
    picker.open();

    chooseTime(picker, 23, 45);

    expect(values).toEqual(['2024-01-15T23:45']);
  });

  it.each([
    ['datetime', '2024-01-15T22:30:00.000Z', '2024-01-16T09:30'],
    ['datetime', '2024-01-16T09:30:00+11:00', '2024-01-16T09:30'],
    ['time', '2024-01-15T22:30:00.000Z', '09:30'],
    ['time', '2024-01-15T09:30:00-05:00', '01:30'],
    ['date', '2024-01-15T22:30:00.000Z', '2024-01-16'],
  ])('reads a %s value given as the ISO instant %s as the local %s', (mode, value, local) => {
    const picker = render(`<p-datetime name="when" mode="${mode}" value="${value}"></p-datetime>`);

    expect([picker.value, submitted(picker)]).toEqual([local, local]);
  });

  it('keeps the seconds of a value that has them', () => {
    const picker = render(
      '<p-datetime name="when" mode="time" value="2024-01-15T22:30:15Z"></p-datetime>'
    );

    expect(picker.value).toBe('09:30:15');
  });

  it('submits both ends of a datetime range as local times', () => {
    const picker = render(
      '<p-datetime name="starts" range range-to="ends" mode="datetime" value="2024-01-08T09:00"></p-datetime>'
    );
    picker.open();

    shadow(picker, '[data-date="2024-01-10"]').click();
    shadow(picker, '[data-date="2024-01-12"]').click();
    chooseTime(picker, 17, 15);

    expect([submitted(picker, 'starts'), submitted(picker, 'ends')]).toEqual([
      '2024-01-10T09:00',
      '2024-01-12T17:15',
    ]);
  });

  it('formats the submitted value from the local date and time', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" format="iso-tz" value="2024-01-16T09:30"></p-datetime>'
    );

    expect(submitted(picker)).toBe('2024-01-16T09:30:00+1100');
  });

  it('sets a quick date to 09:00 local time on that day', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" show-quick-dates quick-dates="tomorrow"></p-datetime>'
    );
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');
    picker.open();

    shadow(picker, '.preset').click();

    expect(picker.value).toBe(`${day}T09:00`);
  });

  it.each([
    ['a local date and time', '2024-01-10T18:00'],
    ['an ISO instant on that local day', '2024-01-09T20:00:00Z'],
  ])('disables the days before a min given as %s', (_, min) => {
    const picker = render(
      `<p-datetime name="starts" mode="datetime" min="${min}" value="2024-01-15T09:00"></p-datetime>`
    );
    picker.open();

    expect([
      shadow(picker, '[data-date="2024-01-09"]').getAttribute('aria-disabled'),
      shadow(picker, '[data-date="2024-01-10"]').getAttribute('aria-disabled'),
    ]).toEqual(['true', null]);
  });

  it('reports a local date and time before min as too early', () => {
    const picker = render(
      '<p-datetime name="starts" mode="datetime" min="2024-01-10" value="2024-01-09T23:30"></p-datetime>'
    );

    expect(picker.validity.rangeUnderflow).toBe(true);
  });

  it('limits its days by a linked p-datetime holding a local date and time', () => {
    render(`
      <p-datetime name="starts" mode="datetime" value="2024-01-12T22:00"></p-datetime>
      <p-datetime name="ends" mode="datetime" min-from-field="starts" value="2024-01-15T09:00"></p-datetime>
    `);
    const ends = document.querySelector('[name="ends"]');
    ends.open();

    expect([
      shadow(ends, '[data-date="2024-01-11"]').getAttribute('aria-disabled'),
      shadow(ends, '[data-date="2024-01-12"]').getAttribute('aria-disabled'),
    ]).toEqual(['true', null]);
  });
});
