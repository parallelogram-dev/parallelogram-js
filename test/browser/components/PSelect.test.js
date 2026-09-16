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

  it('offers a clear button while it is open over a value, required or not', () => {
    const { select } = renderForm(COUNTRIES);
    const { select: required } = renderForm(PRIORITY);
    required.value = 'high';
    const clearOf = element => element.shadowRoot.querySelector('.clear').hidden;
    const closedOverAValue = clearOf(select);
    select.open();
    required.open();
    const openOverAValue = clearOf(select);
    select.value = '';

    expect([closedOverAValue, openOverAValue, clearOf(select), clearOf(required)]).toEqual([
      true,
      false,
      true,
      false,
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

  it('shows the search icon only while the list is open with nothing chosen', () => {
    const { select } = renderForm(COUNTRIES);
    const searchOf = () => select.shadowRoot.querySelector('.search').hidden;
    select.value = '';
    const closedAndEmpty = searchOf();
    select.open();
    const openAndEmpty = searchOf();
    select.value = 'uk';

    expect([closedAndEmpty, openAndEmpty, searchOf()]).toEqual([true, false, true]);
  });

  it('keeps the search icon away while the list is open over a value', () => {
    const { select } = renderForm(COUNTRIES);

    select.open();

    expect(select.shadowRoot.querySelector('.search').hidden).toBe(true);
  });

  it('puts the search icon exactly where the clear button was', () => {
    const { select } = renderForm(COUNTRIES);
    select.open();
    const clear = select.shadowRoot.querySelector('.clear').getBoundingClientRect();
    select.value = '';
    const search = select.shadowRoot.querySelector('.search').getBoundingClientRect();

    expect([search.left - clear.left, search.right - clear.right]).toEqual([0, 0]);
  });

  it('centres the chevron on the middle of the control', () => {
    const { select } = renderForm(COUNTRIES);
    const control = select.shadowRoot.querySelector('.control').getBoundingClientRect();
    const icon = select.shadowRoot.querySelector('.arrow svg').getBoundingClientRect();

    expect(Math.abs(icon.top + icon.height / 2 - (control.top + control.height / 2))).toBeLessThan(
      0.5
    );
  });

  it('leaves the chevron a padding width in from the trailing edge', () => {
    const { select } = renderForm(COUNTRIES);
    const control = select.shadowRoot.querySelector('.control');
    const icon = control.querySelector('.arrow svg').getBoundingClientRect();
    /* The chevron itself is drawn inside a quarter of the icon's box */
    const drawn = icon.right - icon.width / 4;
    const padding = parseFloat(getComputedStyle(control).paddingRight);

    expect(Math.abs(control.getBoundingClientRect().right - drawn - padding)).toBeLessThan(1);
  });

  it('shows a text cursor only where the input can be typed in', () => {
    const { select } = renderForm(COUNTRIES);
    const input = select.shadowRoot.querySelector('.input');
    const cursor = () => getComputedStyle(input).cursor;
    const closed = cursor();
    select.open();
    const openOverAValue = cursor();
    select.value = '';

    expect([closed, openOverAValue, cursor()]).toEqual(['pointer', 'pointer', 'text']);
  });

  it('lines the list up with the outside of the control', () => {
    const { select } = renderForm(COUNTRIES);
    select.open();

    const host = select.getBoundingClientRect();
    const menu = select.shadowRoot.querySelector('.menu').getBoundingClientRect();

    expect([menu.left - host.left, menu.right - host.right]).toEqual([0, 0]);
  });

  it('asks for a search before saying nothing was found', async () => {
    const { select } = renderForm(`
      <p-select name="customer" data-select-src="/api/people?q={q}" data-select-min="2"></p-select>
    `);
    const message = () => select.shadowRoot.querySelector('.noresults')?.textContent;

    select.open();
    const beforeTyping = message();
    const input = select.shadowRoot.querySelector('.input');
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect([beforeTyping, message()]).toEqual([
      'Type 2 or more characters to search',
      'Type 2 or more characters to search',
    ]);
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

  it('will not let a chosen value be typed over until it is cleared', async () => {
    const { select } = renderForm(COUNTRIES);
    const input = select.shadowRoot.querySelector('input');
    const readOnlyWithValue = input.readOnly;

    clickShadow(select, '.clear');

    expect([readOnlyWithValue, input.readOnly, select.value]).toEqual([true, false, '']);
  });

  it('searches again once a required select has been cleared', () => {
    const { select } = renderForm(PRIORITY);
    select.value = 'high';
    select.open();
    const offeredOnRequired = !select.shadowRoot.querySelector('.clear').hidden;

    clickShadow(select, '.clear');

    expect([
      offeredOnRequired,
      select.shadowRoot.querySelector('input').readOnly,
      select.shadowRoot.querySelector('.search').hidden,
    ]).toEqual([true, false, false]);
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

const PEOPLE = `
  <p-select name="owner" aria-label="Owner">
    <option
      value="ada"
      data-secondary="ada@example.com"
      data-description="Engineering"
      data-image="/avatars/ada.jpg"
    >
      Ada Lovelace
    </option>
    <option value="grace" data-secondary="grace@example.com">Grace Hopper</option>
    <option value="nobody">Unassigned</option>
  </p-select>
`;

const partsOf = option => ({
  label: option.querySelector('.label')?.textContent ?? option.textContent,
  secondary: option.querySelector('.secondary')?.textContent ?? null,
  description: option.querySelector('.description')?.textContent ?? null,
  image: option.querySelector('img')?.getAttribute('src') ?? null,
});

describe('p-select rich options', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('reads the secondary text, description and image from the option markup', () => {
    const select = mountSelect(PEOPLE);
    press(select, 'ArrowDown');

    expect(optionsOf(select).map(partsOf)).toEqual([
      {
        label: 'Ada Lovelace',
        secondary: 'ada@example.com',
        description: 'Engineering',
        image: '/avatars/ada.jpg',
      },
      { label: 'Grace Hopper', secondary: 'grace@example.com', description: null, image: null },
      { label: 'Unassigned', secondary: null, description: null, image: null },
    ]);
  });

  it('reads the same fields from remote JSON', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async () =>
      Response.json([
        {
          value: 'ada',
          label: 'Ada Lovelace',
          secondary: 'ada@example.com',
          description: 'Engineering',
          image: '/avatars/ada.jpg',
        },
      ])
    );
    const select = mountSelect(
      '<p-select name="owner" data-select-src="/api/people?q={q}" data-select-min="0"></p-select>'
    );

    await vi.waitFor(
      () =>
        expect(optionsOf(select).map(partsOf)).toEqual([
          {
            label: 'Ada Lovelace',
            secondary: 'ada@example.com',
            description: 'Engineering',
            image: '/avatars/ada.jpg',
          },
        ]),
      WAIT
    );
  });

  it('builds the thumbnail as a lazy, unnamed image of a fixed size', () => {
    const select = mountSelect(PEOPLE);
    press(select, 'ArrowDown');
    const image = optionsOf(select)[0].querySelector('img');
    const { width, height } = getComputedStyle(image);

    expect([image.alt, image.loading, width, height]).toEqual(['', 'lazy', '24px', '24px']);
  });

  it('keeps an option without an image as tall as one in a plain list', () => {
    const plain = mountSelect(COUNTRIES);
    const rich = mountSelect(PEOPLE);
    press(plain, 'ArrowDown');
    press(rich, 'ArrowDown');

    expect(optionsOf(rich).at(-1).offsetHeight).toBe(optionsOf(plain)[0].offsetHeight);
  });

  it('sizes the thumbnail from --select-image-size', () => {
    const select = mountSelect(PEOPLE);
    select.style.setProperty('--select-image-size', '40px');
    press(select, 'ArrowDown');

    expect(getComputedStyle(optionsOf(select)[0].querySelector('img')).width).toBe('40px');
  });

  it('matches typed text against the secondary text but not the description', () => {
    const select = mountSelect(PEOPLE);
    const labels = () => optionsOf(select).map(option => partsOf(option).label);

    typeInto(select, 'grace@');
    const byEmail = labels();
    typeInto(select, 'engineering');

    expect([byEmail, labels()]).toEqual([['Grace Hopper'], []]);
  });

  it('shows the label alone in the input once a rich option is chosen', () => {
    const select = mountSelect(PEOPLE);

    select.select('ada');

    expect(inputOf(select).value).toBe('Ada Lovelace');
  });

  it('adds the fields an option has to the p-select:change detail, and no others', () => {
    const select = mountSelect(PEOPLE);
    const details = [];
    select.addEventListener('p-select:change', event => details.push(event.detail));

    select.select('ada');
    select.select('grace');
    select.select('nobody');

    expect(details).toEqual([
      {
        value: 'ada',
        label: 'Ada Lovelace',
        secondary: 'ada@example.com',
        description: 'Engineering',
        image: '/avatars/ada.jpg',
      },
      { value: 'grace', label: 'Grace Hopper', secondary: 'grace@example.com' },
      { value: 'nobody', label: 'Unassigned' },
    ]);
  });

  it('chooses the option when its secondary text is clicked', () => {
    const select = mountSelect(PEOPLE);
    press(select, 'ArrowDown');

    optionsOf(select)[1].querySelector('.secondary').click();

    expect(select.value).toBe('grace');
  });

  it('gives a rich option a text of its label, secondary text and description, as words', () => {
    const select = mountSelect(PEOPLE);
    press(select, 'ArrowDown');

    expect(optionsOf(select)[0].textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Ada Lovelace ada@example.com Engineering'
    );
  });

  it('marks a rich option as the active descendant and disabled like any other', () => {
    const select = mountSelect(
      PEOPLE.replace('data-image="/avatars/ada.jpg"', 'data-image="/avatars/ada.jpg" disabled')
    );
    press(select, 'ArrowDown');
    const [ada] = optionsOf(select);

    press(select, 'Enter');

    expect([
      inputOf(select).getAttribute('aria-activedescendant'),
      ada.hasAttribute('data-active'),
      ada.getAttribute('aria-disabled'),
      select.value,
    ]).toEqual([ada.id, true, 'true', '']);
  });

  it('shows a changed data-secondary without being asked', async () => {
    const select = mountSelect(PEOPLE);
    select.querySelector('option[value="grace"]').dataset.secondary = 'hopper@example.com';

    await vi.waitFor(() => {
      press(select, 'ArrowDown');
      expect(partsOf(optionsOf(select)[1]).secondary).toBe('hopper@example.com');
    }, WAIT);
  });
});

/* A source of 30 rows in pages of whatever size the URL asks for, remembering what was asked */
const pagedSource = (total = 30) => {
  const calls = [];
  vi.spyOn(window, 'fetch').mockImplementation(async url => {
    const params = new URL(String(url), 'http://localhost').searchParams;
    const page = Number(params.get('page')) || 1;
    const limit = Number(params.get('limit')) || 10;
    calls.push({ q: params.get('q'), page, limit });
    const start = (page - 1) * limit;
    const rows = Array.from({ length: total }, (_, i) => ({ value: `r${i}`, label: `Row ${i}` }));
    return Response.json({
      options: rows.slice(start, start + limit),
      more: start + limit < total,
    });
  });
  return calls;
};

const pagedSelect = (src = '/api/rows?q={q}&page={page}&limit={limit}', limit = '10') =>
  mountSelect(
    `<p-select name="row" aria-label="Row" data-select-src="${src}" data-select-min="0" data-select-debounce="0" data-select-limit="${limit}"></p-select>`
  );

const scrollToEnd = select => {
  const menu = listboxOf(select);
  menu.scrollTop = menu.scrollHeight;
  menu.dispatchEvent(new Event('scroll'));
};

describe('p-select paging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('asks for the first page with the page size, and adds the next when the list is scrolled to its end', async () => {
    const calls = pagedSource();
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);

    scrollToEnd(select);

    await vi.waitFor(() => expect(optionsOf(select).length).toBe(20), WAIT);
    expect(calls).toEqual([
      { q: '', page: 1, limit: 10 },
      { q: '', page: 2, limit: 10 },
    ]);
  });

  it('adds the next page when the arrow keys reach the last option, and keeps the highlight there', async () => {
    pagedSource();
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);

    press(select, 'End');

    await vi.waitFor(() => expect(optionsOf(select).length).toBe(20), WAIT);
    expect(inputOf(select).getAttribute('aria-activedescendant')).toBe('option-9');
  });

  it('stops asking once the source says there is no more', async () => {
    const calls = pagedSource(15);
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    scrollToEnd(select);
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(15), WAIT);

    scrollToEnd(select);
    press(select, 'End');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(calls.map(call => call.page)).toEqual([1, 2]);
  });

  it('starts again from page 1 for a new search', async () => {
    const calls = pagedSource();
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    scrollToEnd(select);
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(20), WAIT);

    typeInto(select, 'Row 2');

    await vi.waitFor(() => expect(calls.at(-1)).toEqual({ q: 'Row 2', page: 1, limit: 10 }), WAIT);
  });

  it('treats a URL without {page} as a single page, whatever the response says', async () => {
    const calls = pagedSource();
    const select = pagedSelect('/api/rows?q={q}');
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);

    scrollToEnd(select);
    press(select, 'End');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect({
      laterPages: calls.filter(call => call.page > 1),
      options: optionsOf(select).length,
    }).toEqual({ laterPages: [], options: 10 });
  });

  it('tells a screen reader more is on the way while there is', async () => {
    pagedSource(15);
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    const live = select.shadowRoot.querySelector('[aria-live]');
    await vi.waitFor(
      () => expect(live.textContent).toBe('10 results available, more on the way'),
      WAIT
    );

    scrollToEnd(select);

    await vi.waitFor(() => expect(live.textContent).toBe('15 results available'), WAIT);
  });
});
