import { TransitionManager } from '../managers/TransitionManager.js';
import styles from '../styles/framework/components/PSelect.scss';
import { chevronDown, iconMarkup, search, x } from '../utils/icons.js';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';
import { followFocusSource } from '../utils/focus-source.js';
import { text } from '../utils/text.js';

/** How many options Page Up and Page Down move by */
const PAGE_SIZE = 10;
/* Pixels from the end of the list at which the next page is asked for */
const LOAD_MORE_MARGIN = 48;

/**
 * The optional fields an option may carry beyond its label: muted text after it, a smaller line
 * beneath it, and the URL of a thumbnail before it
 */
const RICH_FIELDS = ['secondary', 'description', 'image'];

/**
 * The rich fields of an option, read from a dataset or a JSON item, as strings or null
 *
 * @param {object} source
 */
const richFields = source =>
  Object.fromEntries(
    RICH_FIELDS.map(field => [field, source[field] ? String(source[field]) : null])
  );

const span = (className, text) => {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
};

/**
 * Build the contents of an option that has more than a label: a thumbnail, then the label with the
 * secondary text on its line and the description beneath. Everything is set through DOM properties,
 * so no markup is parsed. The thumbnail has an empty alt, since the text is the option's name, and
 * the parts are separated by spaces so that name reads as words
 *
 * @param {{ label: string, secondary?: string, description?: string, image?: string }} option
 * @returns {Node[]}
 */
const richOptionContent = ({ label, secondary, description, image }) => {
  const text = span('text', '');
  text.append(span('label', label));
  if (secondary) text.append(' ', span('secondary', secondary));
  if (description) text.append(' ', span('description', description));
  if (!image) return [text];

  const thumbnail = document.createElement('img');
  thumbnail.className = 'image';
  thumbnail.src = image;
  thumbnail.alt = '';
  thumbnail.loading = 'lazy';
  return [thumbnail, text];
};

/**
 * PSelect - a select that can be searched, built as an editable combobox with a listbox popup
 *
 * Follows the WAI-ARIA combobox pattern with list autocomplete. The text input carries the combobox
 * role, `aria-expanded`, `aria-controls` and `aria-activedescendant`, and is named after the host's
 * `aria-label` or its `<label for>`. Typing filters the options and announces how many match; the
 * arrow keys, Home and End move through them, and Page Up and Page Down move ten at a time; Enter
 * or Tab chooses the highlighted option; Alt+Down Arrow opens the list without moving the highlight
 * and Alt+Up Arrow chooses the highlighted option and closes it; Escape closes the list and puts the
 * chosen label back. Focus passes from the host to the input.
 *
 * Options come from `<option>` and `<optgroup>` children, which are watched for changes, or from
 * `data-select-src`, a URL where `{q}` is replaced by the typed text. It must return JSON: an array
 * of `{ value, label, disabled?, group?, secondary?, description?, image? }`, or an object with
 * those in `options`. A URL with `{page}` in it is paged: the list asks for page 1, and while the
 * object answers `more: true` it asks for the next page when the list is scrolled to its end or the
 * arrow keys reach the last option, adding what comes back. `{limit}` is replaced by
 * `data-select-limit`, the page size. An option may carry a `secondary` text, shown muted after its label, a
 * `description`, shown smaller beneath, and an `image` URL, shown as a round thumbnail before the
 * text; in markup they are the `data-secondary`, `data-description` and `data-image` attributes.
 * Typing matches the label and the secondary text, so an email finds its person.
 *
 * The element is form-associated: it submits its value under its `name`, supports `required`, and
 * restores its `value` attribute, or else its selected option, when the form resets.
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
 * <p-select name="owner" aria-label="Owner">
 *   <option value="ada" data-secondary="ada@example.com" data-description="Engineering" data-image="/avatars/ada.jpg">Ada Lovelace</option>
 * </p-select>
 *
 * @attributes
 * - name, value, placeholder, disabled, required: as for a native select
 * - aria-label: names the input when there is no label
 * - data-select-src: URL for remote options, with `{q}` replaced by the search text
 * - data-select-min: characters to type before a remote search (default 0)
 * - data-select-debounce: milliseconds to wait after typing before a remote search (default 200)
 * - data-select-limit: rows per page, replacing `{limit}` in the URL (default 25)
 * - data-select-open-on-focus: open the list when the input receives focus (default false)
 *
 * @events
 * - input, change: dispatched when the user chooses a different option; they bubble out of shadow
 *   roots, as a native select's do
 * - p-select:change: with `{ value, label }`, and the option's `secondary`, `description` and
 *   `image` when it has them, when a different option is chosen
 * - p-select:open, p-select:close: when the list opens or closes
 *
 * @csspart input - the text input
 * @csspart listbox - the list of options
 */
export default class PSelect extends HTMLElement {
  static formAssociated = true;

  /** The text the select shows: a site changes it here once, a page changes one with the attribute */
  static defaults = {
    placeholder: 'Select…',
    searchLabel: 'Search',
    searchClearLabel: 'Clear the search',
    selectAllLabel: 'Select all ({count})',
    selectNoneLabel: 'None',
    searchHint: 'Type to search',
    searchMinHint: 'Type {min} or more characters to search',
    noResults: 'No results found',
  };

  static get observedAttributes() {
    return [
      'value',
      'multiple',
      'selection-rows',
      'list-rows',
      'searchable',
      'search-label',
      'search-clear-label',
      'select-all',
      'select-all-label',
      'select-none-label',
      'placeholder',
      'search-hint',
      'search-min-hint',
      'no-results',
      'disabled',
      'required',
      'aria-label',
      'data-select-src',
      'data-select-min',
      'data-select-debounce',
      'data-select-limit',
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
      multiple: false,
      values: [],
      selectionRows: 1,
      searchable: false,
      selectAll: false,
      open: false,
      highlightedIndex: -1,
      src: null,
      query: '',
      debounce: 200,
      min: 0,
      openOnFocus: false,
      placeholder: this.constructor.defaults.placeholder,
      disabled: false,
      required: false,
      loading: false,
      error: null,
      limit: 25,
      page: 1,
      more: false,
    };

    this._selectedOption = null;
    this._defaultValue = '';
    this._abortController = null;
    this._requestedPage = 0;
    this._searchTimeout = null;
    this._optionObserver = null;
    this._parseQueued = false;

    this._render();
    this._setupEventListeners();
  }

  connectedCallback() {
    followFocusSource(this);
    this._readConfig();
    this._parseOptionsFromDOM();
    this._updateName();

    this._optionObserver = new MutationObserver(() => this._queueParse());
    this._optionObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'value',
        'label',
        'selected',
        'disabled',
        'data-secondary',
        'data-description',
        'data-image',
      ],
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
      case 'multiple':
        this.state.multiple = newValue !== null;
        this._setValue(this.state.multiple ? this.state.values : this.state.value);
        break;
      case 'selection-rows':
        this.state.selectionRows = Number(newValue) === 2 ? 2 : 1;
        this._renderSelections();
        break;
      case 'searchable':
        this.state.searchable = newValue !== null;
        this._updateControls();
        break;
      case 'select-all':
        this.state.selectAll = newValue !== null;
        this._renderOptions();
        break;
      case 'placeholder':
        this.state.placeholder = newValue || this.constructor.defaults.placeholder;
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
        <div
          class="control"
          part="control"
          role="combobox"
          tabindex="0"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls="listbox"
        >
          <span class="selections" part="selections" hidden></span>
          <span class="arrow" aria-hidden="true">${iconMarkup(chevronDown, { size: 'sm' })}</span>
        </div>

        <div class="menu" part="menu" hidden>
          <div class="search" part="search" hidden>
            <input
              class="input"
              part="input"
              type="search"
              tabindex="-1"
              autocomplete="off"
              aria-autocomplete="list"
              aria-controls="listbox"
            />
            <button type="button" class="search__clear" part="search-clear" tabindex="-1" hidden>${iconMarkup(x, { size: 'xs' })}</button>
            <span class="search__icon" aria-hidden="true">${iconMarkup(search, { size: 'xs' })}</span>
          </div>
          <div class="options" id="listbox" part="listbox" role="listbox" aria-busy="false" tabindex="-1"></div>
        </div>
        <div class="live" role="status" aria-live="polite"></div>
      </div>
    `
    );
    adoptStyles(this.shadowRoot, styles);

    this._els = {
      control: this.shadowRoot.querySelector('.control'),
      selections: this.shadowRoot.querySelector('.selections'),
      options: this.shadowRoot.querySelector('.options'),
      input: this.shadowRoot.querySelector('.input'),
      menu: this.shadowRoot.querySelector('.menu'),
      arrow: this.shadowRoot.querySelector('.arrow'),
      search: this.shadowRoot.querySelector('.search'),
      searchClear: this.shadowRoot.querySelector('.search__clear'),
      searchIcon: this.shadowRoot.querySelector('.search__icon'),
      live: this.shadowRoot.querySelector('.live'),
    };
    this._els.input.placeholder = this.state.placeholder;
    this._updateControls();
  }

  _setupEventListeners() {
    this._els.menu.addEventListener('mousedown', event => {
      if (event.target.closest('[data-bulk]')) event.preventDefault();
    });
    this._els.menu.addEventListener('click', event => {
      const button = event.target.closest('[data-bulk]');
      if (!button) return;
      event.stopPropagation();
      this._bulkChoose(button.dataset.bulk === 'all');
    });

    this._els.selections.addEventListener('mousedown', event => {
      event.preventDefault();
      /* The remove buttons sit inside the control, so they must not open the list as well */
      if (event.target.closest('[data-value]')) event.stopPropagation();
    });
    this._els.selections.addEventListener('click', event => {
      const button = event.target.closest('[data-value]');
      if (!button) return;
      event.stopPropagation();
      const option = this.state.options.find(item => item.value === button.dataset.value);
      this._choose(button.dataset.value, option ?? null);
    });

    const { control, input, menu } = this._els;

    /* Mousedown rather than click, so the list doesn't open and close again as focus moves */
    control.addEventListener('mousedown', event => {
      event.preventDefault();
      control.focus();
      this.toggle();
    });

    this._els.searchClear.addEventListener('mousedown', event => event.preventDefault());
    this._els.searchClear.addEventListener('click', () => this._clearSearch());
    this._els.searchClear.setAttribute('aria-label', text(this, 'search-clear-label'));

    control.addEventListener('keydown', event => this._handleKeydown(event));
    control.addEventListener('focus', () => {
      if (this.state.openOnFocus) this.open();
    });
    input.addEventListener('input', event => this._handleInput(event));
    input.addEventListener('keydown', event => this._handleKeydown(event));

    /* Keep focus where it is while an option is pressed, but let the search box take it */
    menu.addEventListener('mousedown', event => {
      if (this._els.search.contains(event.target)) return;
      event.preventDefault();
    });
    this._els.options.addEventListener('scroll', () => {
      const list = this._els.options;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - LOAD_MORE_MARGIN) {
        this._loadMore();
      }
    });
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
    this.state.limit = Number(data.selectLimit ?? 25) || 25;
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
      this._els.control.setAttribute('aria-label', name);
    } else {
      this._els.control.removeAttribute('aria-label');
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
    let selectedValue = null;

    for (const option of this.querySelectorAll('option')) {
      const parent = option.parentElement;
      const group = parent?.localName === 'optgroup' ? parent.label || null : null;
      options.push({
        value: option.value,
        label: option.label || option.textContent.trim(),
        disabled: option.disabled || Boolean(parent?.disabled),
        group,
        ...richFields(option.dataset),
      });
      if (option.hasAttribute('selected') && selectedValue === null) {
        selectedValue = option.value;
      }
    }

    /* The value attribute is the default when it names an option, as it does for a native input */
    const attribute = this.getAttribute('value');
    if (this.state.multiple) {
      const named = this._asList(attribute).filter(item =>
        options.some(option => option.value === item)
      );
      const selected = [...this.querySelectorAll('option[selected]')].map(option => option.value);
      this._defaultValue = named.length ? named : selected;
      const keepAll = this.state.values.every(item =>
        options.some(option => option.value === item)
      );
      if (!keepAll || !this.state.values.length) this.state.values = [...this._defaultValue];
    } else {
      const defaultValue = options.some(option => option.value === attribute)
        ? attribute
        : selectedValue;
      this._defaultValue = defaultValue ?? '';
      const keep = options.some(option => option.value === this.state.value);
      if (!keep || (!this._selectedOption && defaultValue !== null)) {
        this.state.value = defaultValue ?? '';
      }
    }

    this.setOptions(options);
  }

  /**
   * The slot at the trailing edge of the search bar holds the way to take back what was typed when
   * there is something to take back, and the search icon when there is not, so neither swap moves
   * the other and both stay in the chevron's column
   */
  _syncSearchSlot() {
    const typed = this._els.input.value !== '';
    this._els.searchClear.hidden = !typed;
    this._els.searchIcon.hidden = typed;
  }

  _clearSearch() {
    this._els.input.value = '';
    this._filterLocal('');
    this._syncSearchSlot();
    this._els.input.focus();
  }

  _handleInput(event) {
    /* Without a search box there is nothing to type into, so nothing narrows the list */
    if (!this.state.searchable) {
      this._els.input.value = '';
      return;
    }

    this._syncSearchSlot();
    const query = event.target.value;
    this.state.query = query;
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
      if (key === 'ArrowDown' || (key === 'ArrowUp' && !event.altKey)) {
        event.preventDefault();
        this.open();
        if (!event.altKey && this.state.highlightedIndex < 0) {
          this._setHighlight(key === 'ArrowDown' ? 0 : this.state.filtered.length - 1);
        }
      } else if (this._clearsValue(key)) {
        event.preventDefault();
        this._clearForSearch();
      }
      return;
    }

    const last = this.state.filtered.length - 1;
    const current = this.state.highlightedIndex;

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!event.altKey) this._setHighlight(Math.min(last, current + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) {
          this._chooseHighlighted();
          this.close();
        } else {
          this._setHighlight(Math.max(0, current - 1));
        }
        break;
      case 'PageDown':
        event.preventDefault();
        this._setHighlight(Math.min(last, current + PAGE_SIZE));
        break;
      case 'PageUp':
        event.preventDefault();
        this._setHighlight(Math.max(0, current - PAGE_SIZE));
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
      case 'Backspace':
      case 'Delete':
        if (this._clearsValue(key)) {
          event.preventDefault();
          this._clearForSearch();
        }
        break;
      case 'Escape':
        event.preventDefault();
        /* Escape abandons the search: it is the key that takes back what was typed, since nothing
           else does that on its own any more */
        if (this._els.input.value !== '') {
          this._els.input.value = '';
          this._filterLocal('');
          this._syncSearchSlot();
        }
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

  _clearsValue(key) {
    if (key !== 'Backspace' && key !== 'Delete') return false;
    if (this.state.disabled) return false;
    if (!this.state.multiple) return this.state.value !== '';
    /* The input stays typeable while values are held, so a keypress deleting what was typed is
       not a keypress taking a value back */
    return this.state.values.length > 0 && this._els.input.value === '';
  }

  /**
   * Clear a chosen value from the keyboard and put the input back to searching
   *
   * Choosing a value makes the input read-only, and the clear button that undoes that is hidden
   * until the list is open and is not in the tab order, so without this there is no way back to the
   * search for someone not using a pointer. Clearing runs the same search an emptied input would,
   * so a remote source is asked again rather than answering out of the last query's page.
   */
  _clearForSearch() {
    if (this.state.multiple) {
      /* The last one in is the one taken back, which is how a token field has always behaved */
      const last = this.state.values.at(-1);
      const option = this.state.options.find(item => item.value === last);
      this._choose(last, option ?? null);
      return;
    }
    this._choose('');
    this._els.input.value = '';
    this._handleInput({ target: this._els.input });
  }

  _cancelPendingRequest() {
    this._abortController?.abort();
    this._abortController = null;
    clearTimeout(this._searchTimeout);
    this._searchTimeout = null;
  }

  /**
   * Ask for the next page of the current search, while the source says there is one and the
   * element is still on the page
   */
  _loadMore() {
    const next = this.state.page + 1;
    if (
      this.isConnected &&
      this.state.more &&
      !this.state.loading &&
      this.state.open &&
      next > this._requestedPage
    ) {
      this._fetchOptions(this.state.query, next);
    }
  }

  /**
   * Load options for a search from `data-select-src`; page 1 replaces the list, a later page
   * adds to it
   */
  async _fetchOptions(query, page = 1) {
    if (!this.isConnected) return;
    this._cancelPendingRequest();
    const controller = new AbortController();
    this._abortController = controller;
    /* A page is asked for once; a fresh search forgets the pages that came before it */
    this._requestedPage = page;
    if (page === 1) {
      this.state.page = 1;
      this.state.more = false;
    }
    const url = this.state.src
      .replaceAll('{q}', encodeURIComponent(query))
      .replaceAll('{page}', String(page))
      .replaceAll('{limit}', String(this.state.limit));

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
      const options = items.map(item => ({
        value: String(item.value ?? ''),
        label: String(item.label ?? item.value ?? ''),
        disabled: Boolean(item.disabled),
        group: item.group ?? null,
        ...richFields(item),
      }));
      this.state.options = page > 1 ? this.state.options.concat(options) : options;
      this.state.page = page;
      this.state.more = this.state.src.includes('{page}') && Boolean(data?.more);
      const highlighted = this.state.highlightedIndex;
      this._filterLocal('', { announce: true, keepScroll: page > 1 });
      if (page > 1) this._setHighlight(highlighted);
      /* A value set before its options arrived is shown as the bare value, since there was nothing
         to take a label from. Resolve it now the rows are here, but only for a fetch of the empty
         query: while someone is searching, the input is theirs and must keep what they typed. */
      if (query === '' && this.state.value !== '' && !this._selectedOption) {
        this._setValue(this.state.value);
      }
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
    this._els.options.setAttribute('aria-busy', String(busy));
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

  _filterLocal(query, { announce = Boolean(query), keepScroll = false } = {}) {
    const searchTerm = query.trim().toLowerCase();
    /* The secondary text is searched as well, so an email finds its person; the description isn't */
    this.state.filtered = searchTerm
      ? this.state.options.filter(
          option =>
            option.label.toLowerCase().includes(searchTerm) ||
            option.secondary?.toLowerCase().includes(searchTerm)
        )
      : this.state.options.slice();

    this._renderOptions({ keepScroll });

    const selectedIndex = this.state.filtered.findIndex(
      option => option.value === this.state.value
    );
    if (searchTerm) {
      this._setHighlight(this.state.filtered.length > 0 ? 0 : -1);
    } else {
      /* Holding several values there is no one current value to open onto: the first of them is an
         arbitrary pick, and marking it drew that row in the deeper accent, which reads as a row the
         pointer has already landed on. The arrow keys enter at the first row from nothing marked */
      this._setHighlight(this.state.multiple ? -1 : selectedIndex);
    }

    if (announce) {
      const count = this.state.filtered.length;
      this._announce(
        count === 0
          ? this._emptyMessage()
          : `${count} ${count === 1 ? 'result' : 'results'} available${this.state.more ? ', more on the way' : ''}`
      );
    }
  }

  _updateDisplay() {
    /* What was typed stays until it is cleared. Blanked on every redraw, the box emptied itself as
       a value was chosen while the list stayed narrowed to what had been typed, so the rows the
       search had put aside never came back and nothing on screen said why */
    /* The placeholder speaks for an empty field; once something is chosen the selections do, and
       a search box says what it is for instead of sitting there blank */
    this._els.input.placeholder = this.state.values.length
      ? this.state.searchable
        ? text(this, 'search-label')
        : ''
      : this.state.placeholder;
    this._renderSelections();
    this._updateControls();
  }

  /**
   * Every chosen value in the control, in the options' order. One value or twenty are drawn the
   * same way through this one path: the difference between the modes is what the stylesheet makes
   * of a lone selection, not what is built. Nothing is counted away behind "and 2 more"
   */
  _renderSelections() {
    const box = this._els.selections;
    if (!box) return;

    const two = this.state.selectionRows === 2;
    box.hidden = this.state.values.length === 0;
    box.classList.toggle('selections--two', two);
    box.replaceChildren(
      ...this.state.values.map(value => {
        const option = this.state.options.find(item => item.value === value);
        const label = option?.label ?? value;
        const chip = document.createElement('span');
        chip.className = two ? 'selection selection--two' : 'selection';
        chip.setAttribute('part', 'selection');

        const body = document.createElement('span');
        body.className = 'selection__body';
        const name = document.createElement('span');
        name.className = 'selection__name';
        name.textContent = label;
        body.append(name);
        if (two && option?.secondary) {
          const sub = document.createElement('span');
          sub.className = 'selection__sub';
          sub.textContent = option.secondary;
          body.append(sub);
        }

        chip.append(body);
        return chip;
      })
    );
  }

  /**
   * Show the search bar only where the page asked to be able to search. Nothing else in the control
   * comes and goes: a value is taken back out by choosing its row again, or with Backspace
   */
  _updateControls() {
    this._els.search.hidden = !this.state.searchable;
  }

  /**
   * A thin bar above the options, holding still while they scroll, that takes or gives back
   * everything the search has narrowed to rather than the whole list
   */
  _renderBulk() {
    if (!this.state.multiple || !this.state.selectAll) return;
    const bar = document.createElement('div');
    bar.className = 'bulk';
    bar.setAttribute('part', 'bulk');
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'bulk__action';
    all.setAttribute('part', 'bulk-all');
    all.dataset.bulk = 'all';
    all.textContent = text(this, 'select-all-label', { count: this._bulkOptions().length });

    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'bulk__action';
    none.setAttribute('part', 'bulk-none');
    none.dataset.bulk = 'none';
    none.textContent = text(this, 'select-none-label');

    bar.append(all, none);
    this._els.options.append(bar);
  }

  /** The options the bar would act on: what the search left, minus any that cannot be chosen */
  _bulkOptions() {
    return this.state.filtered.filter(option => !option.disabled);
  }

  /** Take or give back everything the search narrowed to, saying so as one change */
  _bulkChoose(take) {
    const touched = this._bulkOptions().map(option => option.value);
    if (!touched.length) return;
    const held = new Set(this.state.values);
    for (const value of touched) {
      if (take) held.add(value);
      else held.delete(value);
    }
    this._setValue([...held]);
    this._announceChange({ value: '', label: '' }, null);
  }

  /** Take every value back out at once, saying so as one change */
  _clearAll() {
    if (!this.state.values.length) return;
    this._setValue([]);
    this._announceChange({ value: '', label: '' }, null);
  }

  /**
   * Record a new value, submit it with the form and show its label, without dispatching events
   */
  /**
   * A value, or several where `multiple` is set. A list is held in the options' own order rather
   * than the order it was chosen, so the field reads as a filtered copy of the list and does not
   * reshuffle while someone works
   *
   * @param {string|string[]|null} value
   */
  _setValue(value) {
    if (this.state.multiple) {
      const wanted = new Set(this._asList(value));
      const known = this.state.options.filter(option => wanted.has(option.value));
      const rest = [...wanted].filter(item => !known.some(option => option.value === item));
      this.state.values = [...known.map(option => option.value), ...rest];
      this.state.value = this.state.values[0] ?? '';
    } else {
      this.state.value = value ?? '';
      this.state.values = this.state.value === '' ? [] : [this.state.value];
    }

    this._selectedOption =
      this.state.options.find(option => option.value === this.state.value) ??
      (this._selectedOption?.value === this.state.value ? this._selectedOption : null);

    for (const element of this._els.options.querySelectorAll('[role="option"]')) {
      const option = this.state.filtered[Number(element.dataset.index)];
      element.setAttribute('aria-selected', String(this._holds(option?.value)));
    }

    this._syncFormState();
    this._updateDisplay();
  }

  /** Whether a value is among those chosen */
  _holds(value) {
    return value !== undefined && this.state.values.includes(value);
  }

  /** A value attribute, a property or an array read as a list of values */
  _asList(value) {
    if (Array.isArray(value)) return value.map(String).filter(item => item !== '');
    if (value === null || value === undefined || value === '') return [];
    return String(value)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  _updateValue(newValue) {
    this._setValue(newValue);
  }

  _updateDisabledState(disabled) {
    this.state.disabled = disabled;
    this._els.input.disabled = disabled;
    this._els.control.tabIndex = disabled ? -1 : 0;
    if (disabled) this.close();
    this._updateControls();
  }

  _updateRequiredState(required) {
    this.state.required = required;
    this._syncFormState();
    this._updateControls();
  }

  open() {
    if (this.state.open || this.state.disabled) return;

    this.state.open = true;
    this._els.control.setAttribute('aria-expanded', 'true');
    this._els.control.toggleAttribute('data-open', true);
    this._els.menu.hidden = false;
    this._updateControls();
    this._filterLocal('');

    this.tm.enter(this._els.menu);
    /* The search box is in the list, so opening is what puts the keyboard in it */
    if (this.state.searchable) this._els.input.focus();
    dispatchComponentEvent(this, 'p-select:open');
  }

  close() {
    if (!this.state.open) return;

    /* Read before anything is redrawn: the list is where the search box lives, and by the time it
       has been taken down the keyboard has nowhere to go back to */
    const keyboardWasInTheList = this._els.menu.contains(this.shadowRoot.activeElement);
    this.state.open = false;
    this._els.control.setAttribute('aria-expanded', 'false');
    this._els.control.removeAttribute('aria-activedescendant');
    this._els.input.removeAttribute('aria-activedescendant');
    this._els.control.toggleAttribute('data-open', false);
    this._updateDisplay();
    if (keyboardWasInTheList) this._els.control.focus();

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

    this._choose(option.value, option);
    if (!this.state.multiple) this.close();
  }

  /**
   * Record a value the user chose, dispatching input, change and p-select:change when it changes
   *
   * @param {string} value
   * @param {{ label: string, secondary?: string, description?: string, image?: string }} [option] - the option chosen, whose label and rich fields go in the detail
   */
  _choose(value, option = null) {
    if (this.state.multiple) {
      /* The same gesture puts a value in and takes it back out */
      const held = this._holds(value);
      this._setValue(
        held ? this.state.values.filter(item => item !== value) : [...this.state.values, value]
      );
      this._announceChange({ value, label: option?.label ?? '', chosen: !held }, option);
      return;
    }
    if (value === this.state.value) return;
    this._setValue(value);

    const detail = { value, label: option?.label ?? '' };
    for (const field of RICH_FIELDS) {
      if (option?.[field]) detail[field] = option[field];
    }

    this._announceChange(detail, option);
  }

  /** Say a value changed, the way a form control does, and then in this element's own words */
  _announceChange(detail, option) {
    for (const field of RICH_FIELDS) {
      if (option?.[field] && !(field in detail)) detail[field] = option[field];
    }
    if (this.state.multiple) detail.values = [...this.state.values];

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    dispatchComponentEvent(this, 'p-select:change', detail);
  }

  /**
   * Replace the options
   *
   * @param {Array<{value: string, label: string, disabled?: boolean, group?: string, secondary?: string, description?: string, image?: string}>} options
   */
  setOptions(options) {
    this.state.options = Array.isArray(options) ? options.slice() : [];
    this.state.filtered = this.state.options.slice();
    this._renderOptions();
    this._setValue(this.state.multiple ? this.state.values : this.state.value);
  }

  getValue() {
    return this.value;
  }

  clear() {
    this._setValue(this.state.multiple ? [] : '');
  }

  /** A string, or the list of values where `multiple` is set */
  get value() {
    return this.state.multiple ? [...this.state.values] : this.state.value;
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
    const { value, values, multiple, required } = this.state;
    if (multiple) {
      /* One entry per value under the one name, which is what a server reads as a list */
      const data = new FormData();
      for (const item of values) data.append(this.name || '', item);
      this._internals.setFormValue(values.length ? data : null);
    } else {
      this._internals.setFormValue(value);
    }

    const empty = multiple ? values.length === 0 : value === '';
    if (required && empty) {
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
   * What the list says when it has nothing to show: a search that hasn't started yet is not the
   * same as a search that found nothing
   *
   * @returns {string}
   */
  _emptyMessage() {
    const { src, min, query } = this.state;
    if (src && query.length < min) {
      return text(this, min === 1 ? 'search-hint' : 'search-min-hint', { min });
    }
    return text(this, 'no-results');
  }

  /**
   * Build the listbox for the filtered options, grouping them under their optgroup labels
   */
  /**
   * Draw the options the search left, from the top unless a further page was just added to them
   *
   * A list left scrolled at its end would otherwise stay there when new results replace it, and
   * the scroll handler would read that as a call for the next page of a search that just started.
   */
  _renderOptions({ keepScroll = false } = {}) {
    const menu = this._els.options;
    menu.replaceChildren();
    this._renderBulk();
    if (!keepScroll) menu.scrollTop = 0;
    this.state.highlightedIndex = -1;
    this._els.control.removeAttribute('aria-activedescendant');
    this._els.input.removeAttribute('aria-activedescendant');

    if (this.state.filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'noresults';
      empty.textContent = this._emptyMessage();
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
      element.setAttribute('aria-selected', String(this._holds(option.value)));
      if (option.disabled) {
        element.setAttribute('aria-disabled', 'true');
      }
      if (option.secondary || option.description || option.image) {
        element.append(...richOptionContent(option));
      } else {
        element.textContent = option.label;
      }
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
      this._els.control.removeAttribute('aria-activedescendant');
      return;
    }

    element.setAttribute('data-active', '');
    input.setAttribute('aria-activedescendant', element.id);
    this._els.control.setAttribute('aria-activedescendant', element.id);
    if (index === this.state.filtered.length - 1) this._loadMore();

    const list = this._els.options;
    const top = element.offsetTop;
    const bottom = top + element.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }
}

if (!customElements.get('p-select')) {
  customElements.define('p-select', PSelect);
}
