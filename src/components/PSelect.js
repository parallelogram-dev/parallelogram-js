import { TransitionManager } from '../managers/TransitionManager.js';
import styles from '../styles/framework/components/PSelect.scss';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';

const DEFAULT_PLACEHOLDER = 'Select…';

/**
 * PSelect - a select that can be searched, built as an editable combobox with a listbox popup
 *
 * Follows the WAI-ARIA combobox pattern with list autocomplete. The text input carries the combobox
 * role, `aria-expanded`, `aria-controls` and `aria-activedescendant`, and is named after the host's
 * `aria-label` or its `<label for>`. Typing filters the options and announces how many match; the
 * arrow keys, Home and End move through them; Enter or Tab chooses the highlighted option; Escape
 * closes the list and puts the chosen label back. Focus passes from the host to the input.
 *
 * Options come from `<option>` and `<optgroup>` children, which are watched for changes, or from
 * `data-select-src`, a URL where `{q}` is replaced by the typed text. It must return JSON: an array
 * of `{ value, label, disabled?, group? }`, or an object with those in `options`.
 *
 * The element is form-associated: it submits its value under its `name`, supports `required`, and
 * restores its initially selected option when the form resets.
 *
 * @example
 * <label for="country">Country</label>
 * <p-select id="country" name="country" placeholder="Choose a country">
 *   <option value="us">United States</option>
 *   <option value="uk" selected>United Kingdom</option>
 *   <option value="de" disabled>Germany (unavailable)</option>
 * </p-select>
 *
 * <p-select name="user" aria-label="User" data-select-src="/api/users?q={q}" data-select-min="2"></p-select>
 *
 * @attributes
 * - name, value, placeholder, disabled, required: as for a native select
 * - aria-label: names the input when there is no label
 * - data-select-src: URL for remote options, with `{q}` replaced by the search text
 * - data-select-min: characters to type before a remote search (default 0)
 * - data-select-debounce: milliseconds to wait after typing before a remote search (default 200)
 * - data-select-open-on-focus: open the list when the input receives focus (default false)
 *
 * @events
 * - input, change: dispatched when the user chooses a different option
 * - p-select:change: with `{ value, label }`, when a different option is chosen
 * - p-select:open, p-select:close: when the list opens or closes
 *
 * @csspart input - the text input
 * @csspart listbox - the list of options
 */
export default class PSelect extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'value',
      'placeholder',
      'disabled',
      'required',
      'aria-label',
      'data-select-src',
      'data-select-min',
      'data-select-debounce',
      'data-select-open-on-focus',
    ];
  }

  constructor() {
    super();

    if (!this.attachInternals) {
      throw new Error('PSelect requires form-associated custom elements support');
    }

    this._internals = this.attachInternals();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.tm = new TransitionManager();

    this.state = {
      options: [],
      filtered: [],
      value: '',
      open: false,
      highlightedIndex: -1,
      src: null,
      debounce: 200,
      min: 0,
      openOnFocus: false,
      placeholder: DEFAULT_PLACEHOLDER,
      disabled: false,
      required: false,
      loading: false,
      error: null,
    };

    this._selectedOption = null;
    this._defaultValue = '';
    this._abortController = null;
    this._searchTimeout = null;
    this._optionObserver = null;
    this._parseQueued = false;

    this._render();
    this._setupEventListeners();
  }

  connectedCallback() {
    this._readConfig();
    this._parseOptionsFromDOM();
    this._updateName();

    this._optionObserver = new MutationObserver(() => this._queueParse());
    this._optionObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'selected', 'disabled'],
    });

    if (this.state.src && this.state.min === 0) {
      this._fetchOptions('');
    }
  }

  disconnectedCallback() {
    this._cancelPendingRequest();
    this._optionObserver?.disconnect();
    this._optionObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this._updateValue(newValue);
        break;
      case 'placeholder':
        this.state.placeholder = newValue || DEFAULT_PLACEHOLDER;
        this._els.input.placeholder = this.state.placeholder;
        break;
      case 'disabled':
        this._updateDisabledState(newValue !== null);
        break;
      case 'required':
        this._updateRequiredState(newValue !== null);
        break;
      case 'aria-label':
        this._updateName();
        break;
      default:
        this._readConfig();
    }
  }

  _render() {
    setStaticHTML(
      this.shadowRoot,
      `
      <div class="root">
        <div class="control">
          <input
            class="input"
            part="input"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="listbox"
          />
          <span class="arrow" aria-hidden="true">▾</span>
        </div>

        <div class="menu" id="listbox" part="listbox" role="listbox" aria-busy="false" tabindex="-1" hidden></div>
        <div class="live" role="status" aria-live="polite"></div>
      </div>
    `
    );
    adoptStyles(this.shadowRoot, styles);

    this._els = {
      control: this.shadowRoot.querySelector('.control'),
      input: this.shadowRoot.querySelector('.input'),
      menu: this.shadowRoot.querySelector('.menu'),
      arrow: this.shadowRoot.querySelector('.arrow'),
      live: this.shadowRoot.querySelector('.live'),
    };
    this._els.input.placeholder = this.state.placeholder;
  }

  _setupEventListeners() {
    const { control, input, menu } = this._els;

    /* Mousedown rather than click, so the list doesn't open and close again as focus moves */
    control.addEventListener('mousedown', event => {
      if (event.target !== input) {
        event.preventDefault();
        input.focus();
        this.toggle();
      }
    });

    input.addEventListener('click', () => this.open());
    input.addEventListener('focus', () => {
      if (this.state.openOnFocus) this.open();
    });
    input.addEventListener('input', event => this._handleInput(event));
    input.addEventListener('keydown', event => this._handleKeydown(event));

    /* Keep focus on the input while an option is pressed */
    menu.addEventListener('mousedown', event => event.preventDefault());
    menu.addEventListener('click', event => {
      const element = event.target.closest('[role="option"]');
      const option = element && this.state.filtered[Number(element.dataset.index)];
      if (option && !option.disabled) {
        this.select(option.value);
      }
    });

    this.addEventListener('focusout', event => {
      const next = event.relatedTarget;
      if (!next || (!this.contains(next) && !this.shadowRoot.contains(next))) {
        this.close();
      }
    });
  }

  _readConfig() {
    const data = this.dataset;
    this.state.src = data.selectSrc || null;
    this.state.debounce = Number(data.selectDebounce ?? 200) || 0;
    this.state.min = Number(data.selectMin ?? 0) || 0;
    this.state.openOnFocus =
      data.selectOpenOnFocus !== undefined && data.selectOpenOnFocus !== 'false';
  }

  /**
   * Name the input after the host's aria-label or the labels that point at the host
   */
  _updateName() {
    const labelText = [...(this._internals.labels ?? [])]
      .map(label => label.textContent.trim().replace(/\s*:$/, ''))
      .filter(Boolean)
      .join(' ');
    const name = this.getAttribute('aria-label') || labelText;

    if (name) {
      this._els.input.setAttribute('aria-label', name);
    } else {
      this._els.input.removeAttribute('aria-label');
    }
  }

  _queueParse() {
    if (this._parseQueued) return;
    this._parseQueued = true;
    queueMicrotask(() => {
      this._parseQueued = false;
      if (this.isConnected) this._parseOptionsFromDOM();
    });
  }

  _parseOptionsFromDOM() {
    if (this.state.src) return;

    const options = [];
    let defaultValue = null;

    for (const option of this.querySelectorAll('option')) {
      const parent = option.parentElement;
      const group = parent?.localName === 'optgroup' ? parent.label || null : null;
      options.push({
        value: option.value,
        label: option.label || option.textContent.trim(),
        disabled: option.disabled || Boolean(parent?.disabled),
        group,
      });
      if (option.hasAttribute('selected') && defaultValue === null) {
        defaultValue = option.value;
      }
    }

    this._defaultValue = defaultValue ?? '';
    const keep = options.some(option => option.value === this.state.value);
    if (!keep || (!this._selectedOption && defaultValue !== null)) {
      this.state.value = defaultValue ?? '';
    }

    this.setOptions(options);
  }

  _handleInput(event) {
    const query = event.target.value;
    this.open();

    if (this.state.src) {
      this._cancelPendingRequest();
      if (query.length < this.state.min) {
        this.state.filtered = [];
        this._renderOptions();
        return;
      }
      this._searchTimeout = setTimeout(() => this._fetchOptions(query), this.state.debounce);
      return;
    }

    this._filterLocal(query);
  }

  _handleKeydown(event) {
    const { key } = event;

    if (!this.state.open) {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        this.open();
        if (this.state.highlightedIndex < 0) {
          this._setHighlight(key === 'ArrowDown' ? 0 : this.state.filtered.length - 1);
        }
      }
      return;
    }

    const last = this.state.filtered.length - 1;
    const current = this.state.highlightedIndex;

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this._setHighlight(Math.min(last, current + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._setHighlight(Math.max(0, current - 1));
        break;
      case 'Home':
        event.preventDefault();
        this._setHighlight(0);
        break;
      case 'End':
        event.preventDefault();
        this._setHighlight(last);
        break;
      case 'Enter':
        event.preventDefault();
        this._chooseHighlighted();
        break;
      case 'Tab':
        this._chooseHighlighted();
        this.close();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  _chooseHighlighted() {
    const option = this.state.filtered[this.state.highlightedIndex];
    if (option && !option.disabled) {
      this.select(option.value);
    }
  }

  _cancelPendingRequest() {
    this._abortController?.abort();
    this._abortController = null;
    clearTimeout(this._searchTimeout);
    this._searchTimeout = null;
  }

  /**
   * Load options for a search from `data-select-src`
   */
  async _fetchOptions(query) {
    this._cancelPendingRequest();
    const controller = new AbortController();
    this._abortController = controller;
    const url = this.state.src.replaceAll('{q}', encodeURIComponent(query));

    this._setBusy(true);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.options ?? []);
      this.state.error = null;
      this.state.options = items.map(item => ({
        value: String(item.value ?? ''),
        label: String(item.label ?? item.value ?? ''),
        disabled: Boolean(item.disabled),
        group: item.group ?? null,
      }));
      this._filterLocal('', { announce: true });
    } catch (error) {
      if (error.name !== 'AbortError') {
        this._handleFetchError(error);
      }
    } finally {
      if (this._abortController === controller) {
        this._abortController = null;
        this._setBusy(false);
      }
    }
  }

  _setBusy(busy) {
    this.state.loading = busy;
    this._els.menu.setAttribute('aria-busy', String(busy));
  }

  _handleFetchError(error) {
    this.state.error = error.message;
    this._announce(`Error: ${error.message}`);
  }

  /**
   * Announce a message through the live region on the next frame
   */
  _announce(message) {
    const { live } = this._els;
    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  _filterLocal(query, { announce = Boolean(query) } = {}) {
    const searchTerm = query.trim().toLowerCase();
    this.state.filtered = searchTerm
      ? this.state.options.filter(option => option.label.toLowerCase().includes(searchTerm))
      : this.state.options.slice();

    this._renderOptions();

    const selectedIndex = this.state.filtered.findIndex(
      option => option.value === this.state.value
    );
    if (searchTerm) {
      this._setHighlight(this.state.filtered.length > 0 ? 0 : -1);
    } else {
      this._setHighlight(selectedIndex);
    }

    if (announce) {
      const count = this.state.filtered.length;
      this._announce(
        count === 0
          ? 'No results found'
          : `${count} ${count === 1 ? 'result' : 'results'} available`
      );
    }
  }

  _updateDisplay() {
    this._els.input.value =
      this.state.value === '' ? '' : (this._selectedOption?.label ?? this.state.value);
  }

  /**
   * Record a new value, submit it with the form and show its label, without dispatching events
   */
  _setValue(value) {
    this.state.value = value ?? '';
    this._selectedOption =
      this.state.options.find(option => option.value === this.state.value) ??
      (this._selectedOption?.value === this.state.value ? this._selectedOption : null);

    for (const element of this._els.menu.querySelectorAll('[role="option"]')) {
      const option = this.state.filtered[Number(element.dataset.index)];
      element.setAttribute('aria-selected', String(option?.value === this.state.value));
    }

    this._syncFormState();
    this._updateDisplay();
  }

  _updateValue(newValue) {
    this._setValue(newValue);
  }

  _updateDisabledState(disabled) {
    this.state.disabled = disabled;
    this._els.input.disabled = disabled;
    if (disabled) this.close();
  }

  _updateRequiredState(required) {
    this.state.required = required;
    this._syncFormState();
  }

  open() {
    if (this.state.open || this.state.disabled) return;

    this.state.open = true;
    this._els.input.setAttribute('aria-expanded', 'true');
    this._els.control.toggleAttribute('data-open', true);
    this._els.menu.hidden = false;
    this._filterLocal('');

    this.tm.enter(this._els.menu);
    dispatchComponentEvent(this, 'p-select:open');
  }

  close() {
    if (!this.state.open) return;

    this.state.open = false;
    this._els.input.setAttribute('aria-expanded', 'false');
    this._els.input.removeAttribute('aria-activedescendant');
    this._els.control.toggleAttribute('data-open', false);
    this._updateDisplay();

    this.tm.exit(this._els.menu).then(() => {
      if (!this.state.open) {
        this._els.menu.hidden = true;
      }
    });

    dispatchComponentEvent(this, 'p-select:close');
  }

  toggle() {
    this.state.open ? this.close() : this.open();
  }

  /**
   * Choose an option as the user would, dispatching input, change and p-select:change when the
   * value changes
   *
   * @param {string} value
   */
  select(value) {
    const option = this.state.options.find(item => String(item.value) === String(value));
    if (!option || option.disabled) return;

    if (option.value !== this.state.value) {
      this._setValue(option.value);

      this.dispatchEvent(new Event('input', { bubbles: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
      dispatchComponentEvent(this, 'p-select:change', { value: option.value, label: option.label });
    }

    this.close();
  }

  /**
   * Replace the options
   *
   * @param {Array<{value: string, label: string, disabled?: boolean, group?: string}>} options
   */
  setOptions(options) {
    this.state.options = Array.isArray(options) ? options.slice() : [];
    this.state.filtered = this.state.options.slice();
    this._renderOptions();
    this._setValue(this.state.value);
  }

  getValue() {
    return this.state.value;
  }

  clear() {
    this._setValue('');
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this._updateValue(value);
  }

  refreshOptions() {
    this._parseOptionsFromDOM();
  }

  debug() {
    return {
      options: this.state.options,
      filtered: this.state.filtered,
      value: this.state.value,
      domOptions: this.querySelectorAll('option').length,
    };
  }

  /**
   * Submit the current value with the form and report whether it is valid
   *
   * The host element's name attribute provides the field name.
   */
  _syncFormState() {
    const { value, required } = this.state;
    this._internals.setFormValue(value);

    if (required && value === '') {
      this._internals.setValidity(
        { valueMissing: true },
        'Please select an item in the list.',
        this._els.input
      );
    } else {
      this._internals.setValidity({});
    }
  }

  formResetCallback() {
    this._updateValue(this._defaultValue);
  }

  formDisabledCallback(disabled) {
    this._updateDisabledState(disabled);
  }

  formStateRestoreCallback(state) {
    this._updateValue(typeof state === 'string' ? state : '');
  }

  get form() {
    return this._internals.form;
  }

  get labels() {
    return this._internals.labels;
  }

  get validity() {
    return this._internals.validity;
  }

  get validationMessage() {
    return this._internals.validationMessage;
  }

  get willValidate() {
    return this._internals.willValidate;
  }

  checkValidity() {
    return this._internals.checkValidity();
  }

  reportValidity() {
    return this._internals.reportValidity();
  }

  get name() {
    return this.getAttribute('name') ?? '';
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get required() {
    return this.hasAttribute('required');
  }

  set required(value) {
    this.toggleAttribute('required', Boolean(value));
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  /**
   * Build the listbox for the filtered options, grouping them under their optgroup labels
   */
  _renderOptions() {
    const { menu } = this._els;
    menu.replaceChildren();
    this.state.highlightedIndex = -1;
    this._els.input.removeAttribute('aria-activedescendant');

    if (this.state.filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'noresults';
      empty.textContent = 'No results found';
      menu.append(empty);
      return;
    }

    let groupElement = null;
    let groupLabel = null;
    let groupCount = 0;

    this.state.filtered.forEach((option, index) => {
      if (option.group !== groupLabel) {
        groupLabel = option.group;
        groupElement = null;
        if (groupLabel) {
          groupCount += 1;
          groupElement = document.createElement('div');
          groupElement.className = 'group';
          groupElement.setAttribute('role', 'group');
          groupElement.setAttribute('aria-labelledby', `group-${groupCount}`);
          const heading = document.createElement('div');
          heading.className = 'group-label';
          heading.id = `group-${groupCount}`;
          heading.setAttribute('role', 'presentation');
          heading.textContent = groupLabel;
          groupElement.append(heading);
          menu.append(groupElement);
        }
      }

      const element = document.createElement('div');
      element.className = 'option';
      element.id = `option-${index}`;
      element.dataset.index = String(index);
      element.setAttribute('role', 'option');
      element.setAttribute('aria-selected', String(option.value === this.state.value));
      if (option.disabled) {
        element.setAttribute('aria-disabled', 'true');
      }
      element.textContent = option.label;
      (groupElement ?? menu).append(element);
    });
  }

  /**
   * Highlight an option by index, keeping the list's children as they are and scrolling it into view
   */
  _setHighlight(index) {
    const { menu, input } = this._els;
    const previous = menu.querySelector('[data-active]');
    previous?.removeAttribute('data-active');

    const element = index >= 0 ? menu.querySelector(`#option-${index}`) : null;
    this.state.highlightedIndex = element ? index : -1;

    if (!element) {
      input.removeAttribute('aria-activedescendant');
      return;
    }

    element.setAttribute('data-active', '');
    input.setAttribute('aria-activedescendant', element.id);

    const top = element.offsetTop;
    const bottom = top + element.offsetHeight;
    if (top < menu.scrollTop) {
      menu.scrollTop = top;
    } else if (bottom > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = bottom - menu.clientHeight;
    }
  }
}

if (!customElements.get('p-select')) {
  customElements.define('p-select', PSelect);
}
