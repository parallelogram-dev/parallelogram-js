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

const STAFF = `
  <p-select name="staff" multiple>
    <option value="ada">Ada Lovelace</option>
    <option value="grace">Grace Hopper</option>
    <option value="mary">Mary Somerville</option>
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

/* Long enough that a loaded runner doesn't give up on a request that is still on its way */
const WAIT = { timeout: 5000 };

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

  it('stops asking for pages once it is taken off the page', async () => {
    const calls = pagedSource();
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    scrollToEnd(select);
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(20), WAIT);

    select.remove();
    scrollToEnd(select);
    press(select, 'End');
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(calls.map(call => call.page)).toEqual([1, 2]);
  });

  it('shows the label for a value chosen before its options arrive', async () => {
    pagedSource();
    const select = mountSelect(
      '<p-select name="row" aria-label="Row" value="r5" data-select-src="/api/rows?q={q}&page={page}&limit={limit}" data-select-min="0" data-select-debounce="0" data-select-limit="10"></p-select>'
    );

    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);

    expect(inputOf(select).value).toBe('Row 5');
  });

  it('takes a new search back to the top of the list', async () => {
    pagedSource();
    const select = pagedSelect();
    select.open();
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    scrollToEnd(select);
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(20), WAIT);
    const scrolled = listboxOf(select).scrollTop;

    typeInto(select, 'Row 2');

    await vi.waitFor(() => expect(optionsOf(select).length).toBe(10), WAIT);
    expect([scrolled > 0, listboxOf(select).scrollTop]).toEqual([true, 0]);
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

describe('p-select disabled', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('looks disabled, not only unusable', () => {
    const select = mountSelect(
      '<p-select aria-label="Area" disabled><option value="bar">Bar</option></p-select>'
    );

    expect(Number(getComputedStyle(select).opacity)).toBeLessThan(1);
  });
});

describe('p-select from the keyboard alone', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('clears a chosen value and searches again without a pointer', async () => {
    const select = mountSelect(
      `<p-select name="fruit" aria-label="Fruit"><option value="a">Apple</option><option value="b">Banana</option></p-select>`
    );
    const input = inputOf(select);

    input.focus();
    press(select, 'ArrowDown');
    await vi.waitFor(() => expect(optionsOf(select).length).toBe(2), WAIT);
    press(select, 'Enter');

    expect([select.value, input.readOnly]).toEqual(['a', true]);

    press(select, 'Backspace');

    expect([select.value, input.readOnly, input.value]).toEqual(['', false, '']);
  });

  it('names its clear button, and lets a page or a site rename it', () => {
    const label = select => select.shadowRoot.querySelector('.clear').getAttribute('aria-label');
    const plain = document.createElement('p-select');
    const page = document.createElement('p-select');
    page.setAttribute('clear-label', 'Effacer');
    document.body.append(plain, page);
    page.setAttribute('clear-label', 'Borrar');

    PSelect.defaults.clearLabel = 'Auswahl löschen';
    const site = document.createElement('p-select');
    document.body.append(site);
    try {
      expect([label(plain), label(page), label(site)]).toEqual([
        'Clear the selection',
        'Borrar',
        'Auswahl löschen',
      ]);
    } finally {
      PSelect.defaults.clearLabel = 'Clear the selection';
    }
  });

  it("shows the site's placeholder when the page set none", () => {
    PSelect.defaults.placeholder = 'Choisir…';
    const select = document.createElement('p-select');
    document.body.append(select);
    try {
      expect(select.shadowRoot.querySelector('input').placeholder).toBe('Choisir…');
    } finally {
      PSelect.defaults.placeholder = 'Select…';
    }
  });

  it('asks for a search, or says nothing was found, in the words the page or the site chose', () => {
    PSelect.defaults.noResults = 'Aucun résultat';
    try {
      renderForm(`
        <p-select name="customer" data-select-src="/api/people?q={q}" data-select-min="2" search-min-hint="Tapez {min} caractères"></p-select>
        <p-select name="country"><option value="fr">France</option></p-select>
      `);
      const [remote, local] = document.querySelectorAll('p-select');
      const message = select => select.shadowRoot.querySelector('.noresults')?.textContent;
      remote.open();
      local.open();
      const input = local.shadowRoot.querySelector('.input');
      input.value = 'zzz';
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

      expect([message(remote), message(local)]).toEqual(['Tapez 2 caractères', 'Aucun résultat']);
    } finally {
      PSelect.defaults.noResults = 'No results found';
    }
  });
});

describe('p-select, choosing more than one', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('submits one entry per chosen value under the one name', async () => {
    const { form, select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');

    select.value = ['ada', 'mary'];

    /* A set of values is not a joined string: the form carries the name once per value, which is
       what a server reads as a list */
    expect(new FormData(form).getAll('staff')).toEqual(['ada', 'mary']);
  });

  it('reads its value as a list, and takes one from the attribute', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple value="grace,mary">
        <option value="ada">Ada Lovelace</option>
        <option value="grace">Grace Hopper</option>
        <option value="mary">Mary Somerville</option>
      </p-select>`);
    await customElements.whenDefined('p-select');

    expect(select.value).toEqual(['grace', 'mary']);
  });

  it('adds a value that is chosen and takes back one chosen again', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    const changes = [];
    select.addEventListener('change', () => changes.push([...select.value]));

    select.select('ada');
    select.select('grace');
    select.select('ada');

    /* Choosing is a toggle when more than one is allowed, so the same gesture puts a value in
       and takes it back out */
    expect({ value: select.value, changes }).toEqual({
      value: ['grace'],
      changes: [['ada'], ['ada', 'grace'], ['grace']],
    });
  });

  it('keeps the values in the options\u2019 order, not the order they were chosen', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');

    select.select('mary');
    select.select('ada');

    expect(select.value).toEqual(['ada', 'mary']);
  });

  it('is satisfied by one value when it is required', async () => {
    const { form, select } = renderForm(`
      <p-select name="staff" multiple required>
        <option value="ada">Ada Lovelace</option>
      </p-select>`);
    await customElements.whenDefined('p-select');
    const empty = form.checkValidity();

    select.select('ada');

    expect({ empty, filled: form.checkValidity() }).toEqual({ empty: false, filled: true });
  });

  it('puts the values back as they were when the form is reset', async () => {
    const { form, select } = renderForm(`
      <p-select name="staff" multiple value="ada">
        <option value="ada">Ada Lovelace</option>
        <option value="grace">Grace Hopper</option>
      </p-select>`);
    await customElements.whenDefined('p-select');
    select.select('grace');

    form.reset();

    expect(select.value).toEqual(['ada']);
  });
});

describe('p-select, what it shows once several are chosen', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const selections = select =>
    [...select.shadowRoot.querySelectorAll('.selection')].map(
      node => node.querySelector('.selection__name').textContent
    );

  it('shows every chosen value in the control, in the options\u2019 order', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');

    select.value = ['mary', 'ada'];

    /* Nothing is counted away behind "and 2 more": what was chosen is what is shown */
    expect(selections(select)).toEqual(['Ada Lovelace', 'Mary Somerville']);
  });

  it('takes a value back out from its own remove button', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];
    const changed = [];
    select.addEventListener('change', () => changed.push([...select.value]));

    clickShadow(select, '.selection [part="selection-remove"]');

    expect({ left: selections(select), changed }).toEqual({
      left: ['Grace Hopper'],
      changed: [['grace']],
    });
  });

  it('marks no row as the arrow keys\u2019 place when the list opens holding several', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];

    select.open();

    /* Holding several there is no one current value to mark, and marking the first of them drew
       that row in the deeper accent, which read as a row the pointer had already landed on */
    expect(select.shadowRoot.querySelectorAll('.option[data-active]').length).toBe(0);
  });

  it('still opens onto the chosen row when only one may be chosen', async () => {
    const { select } = renderForm(COUNTRIES);
    await customElements.whenDefined('p-select');

    select.open();

    /* One chosen value is the current one, which is where the arrow keys should carry on from */
    expect(select.shadowRoot.querySelector('.option[data-active]')?.textContent.trim()).toBe(
      'United Kingdom'
    );
  });

  it('enters the list at the first row from the keyboard while several are held', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];
    select.shadowRoot.querySelector('.input').focus();

    await userEvent.keyboard('{ArrowDown}');

    expect(select.shadowRoot.querySelector('.option[data-active]')?.textContent.trim()).toBe(
      'Ada Lovelace'
    );
  });

  it('leaves the list closed when a value is taken back out', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];
    const root = select.shadowRoot;

    clickShadow(select, '.selection [part="selection-remove"]');

    /* The remove button sits inside a control that opens the list on mousedown */
    expect({ left: selections(select), open: !root.querySelector('.menu').hidden }).toEqual({
      left: ['Grace Hopper'],
      open: false,
    });
  });

  it('names every part a page can style', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada'];
    const part = selector => select.shadowRoot.querySelector(selector)?.getAttribute('part');

    expect({
      selections: part('.selections'),
      selection: part('.selection'),
      remove: part('.selection [part]'),
    }).toEqual({
      selections: 'selections',
      selection: 'selection',
      remove: 'selection-remove',
    });
  });

  it('carries a second line on each selection when asked for two rows', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple selection-rows="2">
        <option value="ada" data-secondary="Duty manager">Ada Lovelace</option>
      </p-select>`);
    await customElements.whenDefined('p-select');

    select.value = ['ada'];

    /* A selection says what a row says: the same two lines, not the name alone */
    expect([
      select.shadowRoot.querySelector('.selection__name').textContent,
      select.shadowRoot.querySelector('.selection__sub').textContent,
    ]).toEqual(['Ada Lovelace', 'Duty manager']);
  });

  it('shows the placeholder while nothing is chosen, and no selections', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');

    expect([selections(select), select.shadowRoot.querySelector('.input').placeholder]).toEqual([
      [],
      'Select…',
    ]);
  });
});

describe('p-select, the list when several may be chosen', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const open = async select => {
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    return select.shadowRoot;
  };

  it('stays open as values are chosen, and marks each chosen row', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    const root = await open(select);

    clickShadow(select, '.option[data-index="0"]');
    clickShadow(select, '.option[data-index="2"]');

    /* Picking five people is five clicks and no reopening */
    expect({
      open: !root.querySelector('.menu').hidden,
      marked: [...root.querySelectorAll('.option')].map(o => o.getAttribute('aria-selected')),
      value: select.value,
    }).toEqual({
      open: true,
      marked: ['true', 'false', 'true'],
      value: ['ada', 'mary'],
    });
  });

  it('takes a chosen row back out when it is chosen again', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    await open(select);
    clickShadow(select, '.option[data-index="0"]');

    clickShadow(select, '.option[data-index="0"]');

    expect(select.value).toEqual([]);
  });

  it('toggles the highlighted row on Enter and leaves the list open', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    const root = await open(select);
    root.querySelector('.input').focus();

    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect({ value: select.value, open: !root.querySelector('.menu').hidden }).toEqual({
      value: ['ada'],
      open: true,
    });
  });

  it('keeps the input a search box while values are chosen', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    const root = await open(select);

    clickShadow(select, '.option[data-index="0"]');

    /* With one value a single select goes read-only and offers a clear button; holding several
       the input has to stay typeable, because typing is how the list is narrowed */
    expect({
      readOnly: root.querySelector('.input').readOnly,
      clearHidden: root.querySelector('.clear').hidden,
    }).toEqual({ readOnly: false, clearHidden: false });
  });

  it('clears every value from the clear button', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    await open(select);
    select.value = ['ada', 'grace'];

    clickShadow(select, '.clear');

    expect(select.value).toEqual([]);
  });
});

describe('p-select, how a chosen row looks', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const openAndRead = async select => {
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    const chosen =
      select.shadowRoot.querySelector('.option[aria-selected="true"]:not([data-active])') ??
      select.shadowRoot.querySelector('.option[aria-selected="true"]');
    return {
      background: getComputedStyle(chosen).backgroundColor,
      tick: Boolean(chosen.querySelector('.option__tick')),
    };
  };

  it('paints a chosen row and ticks it where several may be chosen', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'mary'];

    /* A filled row with a tick at its trailing edge, rather than a box at the leading one. Read
       from a row the keyboard is not on, since that one carries the hover shade */
    expect(await openAndRead(select)).toEqual({ background: 'rgb(37, 99, 235)', tick: true });
  });

  it('leaves a single select\u2019s chosen row as the tint it has always been', async () => {
    const { select } = renderForm(COUNTRIES);
    await customElements.whenDefined('p-select');

    expect(await openAndRead(select)).toEqual({
      background: 'rgba(59, 130, 246, 0.1)',
      tick: false,
    });
  });
});

describe('p-select, taking the whole list at once', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const openBulk = async select => {
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    return {
      all: select.shadowRoot.querySelector('[data-bulk="all"]'),
      none: select.shadowRoot.querySelector('[data-bulk="none"]'),
    };
  };

  const BULK = `
    <p-select name="staff" multiple select-all>
      <option value="ada">Ada Lovelace</option>
      <option value="grace">Grace Hopper</option>
      <option value="mary">Mary Somerville</option>
    </p-select>
  `;

  it('offers the bar only where it is asked for and several may be chosen', async () => {
    const { select: plain } = renderForm(STAFF);
    document.body.append(document.createElement('div'));
    const { select: asked } = renderForm(BULK);
    await customElements.whenDefined('p-select');

    const without = await openBulk(plain);
    const with_ = await openBulk(asked);

    expect([Boolean(without.all), Boolean(with_.all)]).toEqual([false, true]);
  });

  it('takes every option, and gives them all back', async () => {
    const { select } = renderForm(BULK);
    await customElements.whenDefined('p-select');
    const { all, none } = await openBulk(select);

    all.click();
    const taken = select.value;
    none.click();

    expect({ taken, left: select.value }).toEqual({
      taken: ['ada', 'grace', 'mary'],
      left: [],
    });
  });

  it('acts on what the search narrowed to, not the whole list', async () => {
    const { select } = renderForm(BULK);
    await customElements.whenDefined('p-select');
    await openBulk(select);
    select.shadowRoot.querySelector('.input').focus();

    await userEvent.keyboard('gr');
    await vi.waitFor(() => expect(select.shadowRoot.querySelectorAll('.option').length).toBe(1));
    select.shadowRoot.querySelector('[data-bulk="all"]').click();

    /* The bar says what it will do, and does only that */
    expect(select.value).toEqual(['grace']);
  });

  it('counts what it would take, and what is held', async () => {
    const { select } = renderForm(BULK);
    await customElements.whenDefined('p-select');
    const { all } = await openBulk(select);
    const before = all.textContent;

    select.value = ['ada'];

    expect({
      before,
      after: select.shadowRoot.querySelector('[data-bulk="all"]').textContent,
    }).toEqual({ before: 'Select all (3)', after: 'Select all (3)' });
  });

  it('leaves a disabled option alone', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple select-all>
        <option value="ada">Ada Lovelace</option>
        <option value="grace" disabled>Grace Hopper</option>
      </p-select>`);
    await customElements.whenDefined('p-select');
    const { all } = await openBulk(select);

    all.click();

    expect(select.value).toEqual(['ada']);
  });
});

describe('p-select, how tall the list and its rows are', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const openList = async select => {
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    return select.shadowRoot.querySelector('.menu');
  };

  const MANY = Array.from(
    { length: 40 },
    (_, i) => `<option value="v${i}" data-secondary="Role ${i}">Person ${i}</option>`
  ).join('');

  it('keeps the secondary text on the label\u2019s line by default', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple>
        <option value="ada" data-secondary="Duty manager">Ada Lovelace</option>
      </p-select>`);
    await customElements.whenDefined('p-select');
    await openList(select);

    expect(getComputedStyle(select.shadowRoot.querySelector('.secondary')).display).toBe('inline');
  });

  it('puts the secondary text on its own line where two rows are asked for', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple list-rows="2">
        <option value="ada" data-secondary="Duty manager">Ada Lovelace</option>
      </p-select>`);
    await customElements.whenDefined('p-select');
    await openList(select);

    expect(getComputedStyle(select.shadowRoot.querySelector('.secondary')).display).toBe('block');
  });

  it('caps the list and scrolls it, by default', async () => {
    const { select } = renderForm(`<p-select name="staff" multiple>${MANY}</p-select>`);
    await customElements.whenDefined('p-select');
    const menu = await openList(select);

    expect(menu.scrollHeight > menu.clientHeight).toBe(true);
  });

  it('lets the list fit its content when the page asks for no cap', async () => {
    const { select } = renderForm(
      `<p-select name="staff" multiple style="--select-menu-max-height: none">${MANY}</p-select>`
    );
    await customElements.whenDefined('p-select');
    const menu = await openList(select);

    /* A menu of a handful should not scroll inside a box of a fixed height; a page that knows
       its list is short says so, and the list grows to what is in it */
    expect(menu.scrollHeight > menu.clientHeight).toBe(false);
  });
});

describe('p-select, where the icons sit once the field grows', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const middles = select => {
    const root = select.shadowRoot;
    const box = node => {
      const rect = node.getBoundingClientRect();
      return Math.round(rect.top + rect.height / 2);
    };
    return {
      arrow: box(root.querySelector('.arrow')),
      first: box(root.querySelector('.selection')),
    };
  };

  it('keeps the arrow on the first row as the field grows', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.style.width = '14rem';

    select.value = ['ada', 'grace', 'mary'];
    await vi.waitFor(() => expect(select.shadowRoot.querySelectorAll('.selection').length).toBe(3));

    /* Three rows of selections, and the arrow is still level with the first, not floating in
       the middle of a field that has grown under it */
    const { arrow, first } = middles(select);
    expect(arrow).toBe(first);
  });

  it('follows the taller row when a selection carries two lines', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple selection-rows="2" style="width: 14rem">
        <option value="ada" data-secondary="Duty manager">Ada Lovelace</option>
        <option value="grace" data-secondary="Rear admiral">Grace Hopper</option>
      </p-select>`);
    await customElements.whenDefined('p-select');

    select.value = ['ada', 'grace'];
    await vi.waitFor(() => expect(select.shadowRoot.querySelectorAll('.selection').length).toBe(2));

    const { arrow, first } = middles(select);
    expect(arrow).toBe(first);
  });
});

describe('p-select, reaching the chosen values from the keyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the remove buttons out of the tab order, as the clear button is', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');

    select.value = ['ada', 'grace', 'mary'];

    /* Otherwise tabbing into a field holding twenty values stops twenty times before the input */
    expect(
      [...select.shadowRoot.querySelectorAll('.selection__remove')].map(button =>
        button.getAttribute('tabindex')
      )
    ).toEqual(['-1', '-1', '-1']);
  });

  it('takes the last value back on Backspace in an empty input', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    select.shadowRoot.querySelector('.input').focus();

    await userEvent.keyboard('{Backspace}');

    /* The way back out without a pointer, and the way a token field has always behaved */
    expect(select.value).toEqual(['ada']);
  });

  it('leaves the values alone while there is something typed to delete', async () => {
    const { select } = renderForm(STAFF);
    await customElements.whenDefined('p-select');
    select.value = ['ada', 'grace'];
    select.open();
    await vi.waitFor(() => expect(select.shadowRoot.querySelector('.menu').hidden).toBe(false));
    select.shadowRoot.querySelector('.input').focus();

    await userEvent.keyboard('ma{Backspace}');

    expect(select.value).toEqual(['ada', 'grace']);
  });
});

describe('p-select, a label that is markup', () => {
  afterEach(() => {
    document.body.replaceChildren();
    delete window.__pselectInjected;
  });

  it('shows a chosen value whose label is markup as text', async () => {
    const { select } = renderForm(`
      <p-select name="staff" multiple selection-rows="2">
        <option value="ada" data-secondary="&lt;img src=x onerror=&quot;window.__pselectInjected = true&quot;&gt;">
          &lt;img src=x onerror="window.__pselectInjected = true"&gt;
        </option>
      </p-select>`);
    await customElements.whenDefined('p-select');

    select.value = ['ada'];
    await new Promise(resolve => setTimeout(resolve, 50));

    /* A label and its second line are somebody's data: they are read, never run */
    const root = select.shadowRoot;
    expect({
      injected: Boolean(window.__pselectInjected),
      images: root.querySelectorAll('.selection img').length,
      text: root.querySelector('.selection__name').textContent.includes('<img'),
    }).toEqual({ injected: false, images: 0, text: true });
  });
});
