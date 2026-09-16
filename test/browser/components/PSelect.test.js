import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import PSelect from '../../../src/components/PSelect.js';

const clickShadow = (host, selector) => {
  const target = host.shadowRoot.querySelector(selector);
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
  target.click();
};

const renderForm = markup => {
  const form = document.createElement('form');
  form.innerHTML = markup;
  document.body.append(form);
  return { form, select: form.querySelector('p-select') };
};

const COUNTRIES = `
  <p-select name="country">
    <option value="us">United States</option>
    <option value="uk" selected>United Kingdom</option>
  </p-select>
`;

const PRIORITY = `
  <p-select name="priority" required>
    <option value="">-- Select priority --</option>
    <option value="high">High</option>
  </p-select>
`;

describe('p-select', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('offers a clear button only when there is a value the user is allowed to remove', () => {
    const { select } = renderForm(COUNTRIES);
    const { select: required } = renderForm(PRIORITY);
    required.value = 'high';
    const clearOf = element => element.shadowRoot.querySelector('.clear');
    const withValue = clearOf(select).hidden;
    select.value = '';

    expect([withValue, clearOf(select).hidden, clearOf(required).hidden]).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('clears the value from the clear button, and reports the change', async () => {
    const { select } = renderForm(COUNTRIES);
    const changes = [];
    select.addEventListener('change', () => changes.push(select.value));

    clickShadow(select, '.clear');

    expect([select.value, changes, select.shadowRoot.querySelector('.input').value]).toEqual([
      '',
      [''],
      '',
    ]);
  });

  it('shows the search icon while the list is open, since the input filters then', () => {
    const { select } = renderForm(COUNTRIES);
    const icon = select.shadowRoot.querySelector('.search');
    const closed = icon.hidden;

    select.open();

    expect([closed, icon.hidden]).toEqual([true, false]);
  });

  it('lines the list up with the outside of the control', () => {
    const { select } = renderForm(COUNTRIES);
    select.open();

    const host = select.getBoundingClientRect();
    const menu = select.shadowRoot.querySelector('.menu').getBoundingClientRect();

    expect([menu.left - host.left, menu.right - host.right]).toEqual([0, 0]);
  });

  it('is a form-associated custom element', () => {
    const { form, select } = renderForm(COUNTRIES);

    expect(select).toBeInstanceOf(PSelect);
    expect(select.form).toBe(form);
  });

  it('submits the option that is selected in markup', () => {
    const { form } = renderForm(COUNTRIES);

    expect(new FormData(form).get('country')).toBe('uk');
  });

  it('submits a value set through the value property', () => {
    const { form, select } = renderForm(COUNTRIES);

    select.value = 'us';

    expect(new FormData(form).get('country')).toBe('us');
  });

  it('submits a value set through the value attribute', () => {
    const { form, select } = renderForm(COUNTRIES);

    select.setAttribute('value', 'us');

    expect(new FormData(form).get('country')).toBe('us');
  });

  it('keeps an empty placeholder option empty', () => {
    const { form, select } = renderForm(PRIORITY);

    select.select('');

    expect(new FormData(form).get('priority')).toBe('');
  });

  it('blocks form submission when required and nothing is chosen', () => {
    const { form, select } = renderForm(PRIORITY);

    expect(form.checkValidity()).toBe(false);
    expect(select.validity.valueMissing).toBe(true);
  });

  it('becomes valid once a required value is chosen', () => {
    const { form, select } = renderForm(PRIORITY);

    select.select('high');

    expect(form.checkValidity()).toBe(true);
  });

  it('restores the selection from markup when the form is reset', () => {
    const { form, select } = renderForm(COUNTRIES);
    select.select('us');

    form.reset();

    expect(select.value).toBe('uk');
    expect(new FormData(form).get('country')).toBe('uk');
  });

  it('restores its value attribute when the form is reset', () => {
    const { form, select } = renderForm(`
      <p-select name="country" value="us">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
      </p-select>
    `);
    select.select('uk');

    form.reset();

    expect([select.value, new FormData(form).get('country')]).toEqual(['us', 'us']);
  });

  it('prefers its value attribute to a selected option', () => {
    const { select } = renderForm(COUNTRIES.replace('name="country"', 'name="country" value="us"'));

    expect(select.value).toBe('us');
  });

  it('disables its text input inside a disabled fieldset', () => {
    const { select } = renderForm(`<fieldset disabled>${COUNTRIES}</fieldset>`);

    expect(select.shadowRoot.querySelector('.input').disabled).toBe(true);
  });

  it('keeps the menu open when it is reopened while closing', async () => {
    const { select } = renderForm(COUNTRIES);

    select.open();
    select.close();
    select.open();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(select.shadowRoot.querySelector('[role="listbox"]').hidden).toBe(false);
  });
});

const WAIT = { timeout: 2000 };

const mountSelect = (markup, container = document.body) => {
  container.insertAdjacentHTML('beforeend', markup);
  return container.querySelector('p-select:last-of-type');
};

const inputOf = select => select.shadowRoot.querySelector('input');
const listboxOf = select => select.shadowRoot.querySelector('[role="listbox"]');
const optionsOf = select => [...select.shadowRoot.querySelectorAll('[role="option"]')];
const press = (select, key, options = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...options,
  });
  inputOf(select).dispatchEvent(event);
  return event;
};
const typeInto = (select, text) => {
  const input = inputOf(select);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

describe('p-select combobox', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('puts the combobox role and state on the input it focuses', () => {
    const select = mountSelect(COUNTRIES);
    const input = inputOf(select);

    press(select, 'ArrowDown');

    expect({
      role: input.getAttribute('role'),
      controls: input.getAttribute('aria-controls'),
      listboxId: listboxOf(select).id,
      expanded: input.getAttribute('aria-expanded'),
      autocomplete: input.getAttribute('aria-autocomplete'),
      wrapperRole: select.shadowRoot.querySelector('.control').getAttribute('role'),
    }).toEqual({
      role: 'combobox',
      controls: listboxOf(select).id,
      listboxId: listboxOf(select).id,
      expanded: 'true',
      autocomplete: 'list',
      wrapperRole: null,
    });
  });

  it('points aria-activedescendant at the highlighted option without rebuilding the list', () => {
    const select = mountSelect(COUNTRIES);
    press(select, 'ArrowDown');
    const [first, second] = optionsOf(select);

    press(select, 'ArrowDown');
    press(select, 'ArrowDown');

    expect([
      Boolean(first.id),
      inputOf(select).getAttribute('aria-activedescendant'),
      optionsOf(select)[1] === second,
    ]).toEqual([true, second.id, true]);
  });

  it('names its input from a label for the element or its own aria-label', () => {
    document.body.insertAdjacentHTML('beforeend', '<label for="country">Country</label>');
    const labelled = mountSelect(
      `<p-select id="country" name="country">${'<option value="uk">UK</option>'}</p-select>`
    );
    const named = mountSelect(
      '<p-select aria-label="Seat class"><option value="economy">Economy</option></p-select>'
    );

    expect([
      inputOf(labelled).getAttribute('aria-label'),
      inputOf(named).getAttribute('aria-label'),
    ]).toEqual(['Country', 'Seat class']);
  });

  it('leaves the trailing colon of a label out of the input name', () => {
    document.body.insertAdjacentHTML('beforeend', '<label for="seat">Seat class:</label>');
    const select = mountSelect(
      '<p-select id="seat"><option value="economy">Economy</option></p-select>'
    );

    expect(inputOf(select).getAttribute('aria-label')).toBe('Seat class');
  });

  it('moves to the first and last options with Home and End', () => {
    const select = mountSelect(COUNTRIES);
    press(select, 'ArrowDown');
    const active = () => inputOf(select).getAttribute('aria-activedescendant');

    press(select, 'End');
    const afterEnd = active();
    press(select, 'Home');

    expect([afterEnd, active()]).toEqual([optionsOf(select).at(-1).id, optionsOf(select)[0].id]);
  });

  it('moves ten options at a time with Page Down and Page Up', () => {
    const many = Array.from(
      { length: 30 },
      (_, index) => `<option value="${index}">Seat ${index}</option>`
    ).join('');
    const select = mountSelect(`<p-select name="seat">${many}</p-select>`);
    press(select, 'ArrowDown');
    const active = () => inputOf(select).getAttribute('aria-activedescendant');

    press(select, 'PageDown');
    const afterPageDown = active();
    press(select, 'PageUp');

    expect([afterPageDown, active()]).toEqual([optionsOf(select)[10].id, optionsOf(select)[0].id]);
  });

  it('opens with Alt+Down Arrow and chooses the highlighted option with Alt+Up Arrow', () => {
    const select = mountSelect(COUNTRIES);

    press(select, 'ArrowDown', { altKey: true });
    const opened = [
      inputOf(select).getAttribute('aria-expanded'),
      inputOf(select).getAttribute('aria-activedescendant'),
    ];
    press(select, 'Home');
    press(select, 'ArrowUp', { altKey: true });

    expect([opened, select.value, inputOf(select).getAttribute('aria-expanded')]).toEqual([
      ['true', optionsOf(select)[1].id],
      'us',
      'false',
    ]);
  });

  it('keeps the highlighted option scrolled into view', () => {
    const many = Array.from(
      { length: 30 },
      (_, index) => `<option value="${index}">Seat ${index}</option>`
    ).join('');
    const select = mountSelect(`<p-select name="seat">${many}</p-select>`);
    press(select, 'ArrowDown');

    press(select, 'End');

    expect(listboxOf(select).scrollTop).toBeGreaterThan(0);
  });

  it('chooses the highlighted option and closes when Tab moves on', () => {
    const select = mountSelect(COUNTRIES);
    press(select, 'ArrowDown');
    press(select, 'Home');

    const tab = press(select, 'Tab');

    expect([
      select.value,
      inputOf(select).getAttribute('aria-expanded'),
      tab.defaultPrevented,
    ]).toEqual(['us', 'false', false]);
  });

  it('moves on to the next control when Tab is pressed, not into its list', async () => {
    const select = mountSelect(COUNTRIES);
    document.body.insertAdjacentHTML('beforeend', '<input id="next" aria-label="Next">');
    const next = document.getElementById('next');
    inputOf(select).focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');

    await userEvent.tab();

    const listbox = listboxOf(select);
    await vi.waitFor(
      () =>
        expect({
          nextFocused: document.activeElement === next,
          shadowFocus:
            select.shadowRoot.activeElement?.id ??
            select.shadowRoot.activeElement?.className ??
            null,
          listboxHidden: listbox.hidden,
          listboxDisplay: getComputedStyle(listbox).display,
        }).toEqual({
          nextFocused: true,
          shadowFocus: null,
          listboxHidden: true,
          listboxDisplay: 'none',
        }),
      { timeout: 2000 }
    );
  });

  it('puts the chosen label back when Escape abandons a search', () => {
    const select = mountSelect(COUNTRIES);
    typeInto(select, 'uni');

    press(select, 'Escape');

    expect([inputOf(select).value, inputOf(select).getAttribute('aria-expanded')]).toEqual([
      'United Kingdom',
      'false',
    ]);
  });

  it('closes when focus moves somewhere else', async () => {
    const select = mountSelect(COUNTRIES);
    document.body.insertAdjacentHTML('beforeend', '<button id="next" type="button">Next</button>');
    inputOf(select).focus();
    press(select, 'ArrowDown');

    document.getElementById('next').focus();

    await vi.waitFor(
      () => expect(inputOf(select).getAttribute('aria-expanded')).toBe('false'),
      WAIT
    );
  });

  it('stays closed when it receives focus and passes host focus to its input', () => {
    const select = mountSelect(COUNTRIES);

    select.focus();

    expect([
      select.shadowRoot.activeElement,
      inputOf(select).getAttribute('aria-expanded'),
    ]).toEqual([inputOf(select), 'false']);
  });

  it('shows option groups with their labels', () => {
    const select = mountSelect(`
      <p-select name="food">
        <optgroup label="Fruits"><option value="apple">Apple</option></optgroup>
        <optgroup label="Vegetables"><option value="carrot">Carrot</option></optgroup>
      </p-select>`);
    press(select, 'ArrowDown');

    const groups = [...select.shadowRoot.querySelectorAll('[role="group"]')].map(group => [
      select.shadowRoot.getElementById(group.getAttribute('aria-labelledby'))?.textContent,
      [...group.querySelectorAll('[role="option"]')].map(option => option.textContent),
    ]);
    expect(groups).toEqual([
      ['Fruits', ['Apple']],
      ['Vegetables', ['Carrot']],
    ]);
  });

  it('dispatches change and input events that leave the shadow root', () => {
    const select = mountSelect(COUNTRIES);
    const seen = [];
    for (const type of ['input', 'change', 'p-select:change']) {
      document.addEventListener(type, event => event.target === select && seen.push(type));
    }
    press(select, 'ArrowDown');

    optionsOf(select)[0].click();

    expect(seen).toEqual(['input', 'change', 'p-select:change']);
  });

  it('dispatches input and change events that cross an enclosing shadow root', () => {
    const outer = document.createElement('div');
    document.body.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    root.innerHTML = COUNTRIES;
    const select = root.querySelector('p-select');
    const seen = [];
    for (const type of ['input', 'change']) {
      outer.addEventListener(type, () => seen.push(type));
    }
    press(select, 'ArrowDown');

    optionsOf(select)[0].click();

    expect(seen).toEqual(['input', 'change']);
  });

  it('clears its value when its text is deleted and the list closes', async () => {
    const { select } = renderForm(COUNTRIES);
    const input = select.shadowRoot.querySelector('input');
    const changes = [];
    select.addEventListener('change', () => changes.push(select.value));

    await userEvent.click(input);
    await userEvent.clear(input);
    select.close();

    expect([select.value, input.value, changes]).toEqual(['', '', ['']]);
  });

  it('restores the chosen option when its text is deleted while it is required', async () => {
    const { select } = renderForm(`
      <p-select name="size" required>
        <option value="s" selected>Small</option>
        <option value="m">Medium</option>
      </p-select>
    `);
    const input = select.shadowRoot.querySelector('input');

    await userEvent.click(input);
    await userEvent.clear(input);
    select.close();

    expect([select.value, input.value]).toEqual(['s', 'Small']);
  });

  it('dispatches no change events when Tab leaves the option that was already chosen', () => {
    const select = mountSelect(COUNTRIES);
    const seen = [];
    for (const type of ['input', 'change', 'p-select:change']) {
      select.addEventListener(type, () => seen.push(type));
    }
    press(select, 'ArrowDown');

    press(select, 'Tab');

    expect(seen).toEqual([]);
  });

  it('announces how many options match inside its own shadow root', async () => {
    const select = mountSelect(COUNTRIES);

    typeInto(select, 'united');

    await vi.waitFor(
      () =>
        expect(select.shadowRoot.querySelector('[role="status"]')?.textContent).toMatch(
          /2 results/
        ),
      WAIT
    );
    expect(document.body.querySelector('[aria-live]')).toBeNull();
  });

  it('picks up options added after it connects', async () => {
    const select = mountSelect(COUNTRIES);

    const france = document.createElement('option');
    france.value = 'fr';
    france.textContent = 'France';
    select.append(france);

    await vi.waitFor(() => {
      select.select('fr');
      expect(select.value).toBe('fr');
    }, WAIT);
  });

  it('loads options from data-select-src once enough has been typed', async () => {
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockImplementation(async () => Response.json([{ value: 'ada', label: 'Ada Lovelace' }]));
    const select = document.createElement('p-select');
    select.setAttribute('name', 'user');
    document.body.append(select);
    select.setAttribute('data-select-src', '/api/users?q={q}');
    select.setAttribute('data-select-min', '2');
    select.setAttribute('data-select-debounce', '0');

    typeInto(select, 'a');
    await new Promise(resolve => setTimeout(resolve, 50));
    const callsBelowMinimum = fetchSpy.mock.calls.length;
    typeInto(select, 'ad');

    await vi.waitFor(
      () =>
        expect([
          callsBelowMinimum,
          String(fetchSpy.mock.calls.at(-1)?.[0]),
          optionsOf(select).map(option => option.textContent),
          listboxOf(select).getAttribute('aria-busy'),
        ]).toEqual([0, '/api/users?q=ad', ['Ada Lovelace'], 'false']),
      WAIT
    );
  });
});
