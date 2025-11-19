import { TransitionManager } from '../managers/index.js';
import { default as PToasts } from './PToasts.js';

import styles from '../styles/framework/components/PSelect.scss';

/**
 * PSelect - Enhanced select/combobox web component
 *
 * A fully accessible, customizable select component that supports both local options
 * and remote data fetching. Uses <option> elements directly within the component.
 *
 * @example
 * <!-- Basic usage with option elements -->
 * <p-select name="country" placeholder="Choose a country">
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 *   <option value="uk" selected>United Kingdom</option>
 *   <option value="de" disabled>Germany (unavailable)</option>
 * </p-select>
 *
 * <!-- Remote data source with search -->
 * <p-select
 *   name="user"
 *   placeholder="Search users..."
 *   data-select-src="/api/users?q={q}"
 *   data-select-min="2"
 *   data-select-debounce="300">
 * </p-select>
 *
 * <!-- With form validation -->
 * <p-select name="priority" required placeholder="Select priority level">
 *   <option value="">-- Select Priority --</option>
 *   <option value="high">High Priority</option>
 *   <option value="medium" selected>Medium Priority</option>
 *   <option value="low">Low Priority</option>
 * </p-select>
 *
 * <!-- Disabled state -->
 * <p-select name="readonly-field" disabled>
 *   <option value="locked" selected>Locked Value</option>
 * </p-select>
 *
 * <!-- Grouped options -->
 * <p-select name="food" placeholder="Choose a food">
 *   <optgroup label="Fruits">
 *     <option value="apple">Apple</option>
 *     <option value="banana">Banana</option>
 *   </optgroup>
 *   <optgroup label="Vegetables">
 *     <option value="carrot">Carrot</option>
 *     <option value="lettuce">Lettuce</option>
 *   </optgroup>
 * </p-select>
 */
export default class PSelect extends HTMLElement {
  static formAssociated = true;

  constructor() {
    super();

    if (!this.attachInternals) {
      throw new Error('PSelect requires form-associated custom elements support');
    }

    this._internals = this.attachInternals();
    this.attachShadow({ mode: 'open' });
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
      openOnFocus: true,
      placeholder: this.getAttribute('placeholder') || 'Select…',
      disabled: false,
      required: false,
      loading: false,
      error: null,
    };

    this._abortController = null;
    this._searchTimeout = null;
    this._announcementRegion = null;

    this._render();
    this._setupEventListeners();
    this._initializeFromAttributes();
  }

  connectedCallback() {
    this._createAnnouncementRegion();
    this._parseOptionsFromDOM();

    if (this.state.src && this.state.min === 0) {
      this._fetchOptions('').catch(this._handleFetchError.bind(this));
    }
  }

  disconnectedCallback() {
    this._cancelPendingRequest();

    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
    }

    if (this._announcementRegion) {
      this._announcementRegion.remove();
    }
  }

  static get observedAttributes() {
    return ['value', 'placeholder', 'disabled', 'name', 'required'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this._updateValue(newValue);
        break;
      case 'placeholder':
        this.state.placeholder = newValue || 'Select…';
        this._updatePlaceholder();
        break;
      case 'disabled':
        this._updateDisabledState(newValue !== null);
        break;
      case 'name':
        this.name = newValue || '';
        break;
      case 'required':
        this._updateRequiredState(newValue !== null);
        break;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="root">
        <div
          class="control"
          role="combobox"
          aria-expanded="false"
          aria-haspopup="listbox"
        >
          <input
            class="input"
            type="text"
            autocomplete="off"
          />
          <span class="arrow" aria-hidden="true">▾</span>
        </div>

        <div class="menu" role="listbox" hidden></div>
      </div>
    `;

    this._els = {
      control: this.shadowRoot.querySelector('.control'),
      input: this.shadowRoot.querySelector('.input'),
      menu: this.shadowRoot.querySelector('.menu'),
      arrow: this.shadowRoot.querySelector('.arrow'),
    };

    this._updateDisplay();
  }

  _setupEventListeners() {
    // Prevent double-toggle issue by using mousedown instead of click
    this._els.control.addEventListener('mousedown', e => {
      if (e.target !== this._els.input) {
        e.preventDefault();
        this._els.input.focus();
        this.toggle();
      }
    });

    this._els.input.addEventListener('focus', () => {
      if (this.state.openOnFocus) {
        this.open();
      }
    });

    this._els.input.addEventListener('input', e => {
      this._handleInput(e);
    });

    this._els.input.addEventListener('keydown', e => {
      this._handleKeydown(e);
    });

    // Global click handler to close dropdown
    document.addEventListener('click', e => {
      if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
        this.close();
      }
    });
  }

  _initializeFromAttributes() {
    const d = this.dataset;
    this.state.src = d.selectSrc || null;
    this.state.debounce = Number(d.selectDebounce || 200);
    this.state.min = Number(d.selectMin || 0);
    this.state.openOnFocus = (d.selectOpenOnFocus ?? 'true') !== 'false';
    this.state.disabled = this.hasAttribute('disabled');
    this.state.required = this.hasAttribute('required');

    this.name = this.getAttribute('name') || '';
  }

  _createAnnouncementRegion() {
    this._announcementRegion = document.createElement('div');
    this._announcementRegion.setAttribute('aria-live', 'polite');
    this._announcementRegion.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
    document.body.appendChild(this._announcementRegion);
  }

  _announce(message) {
    if (this._announcementRegion) {
      this._announcementRegion.textContent = message;
    }
  }

  _parseOptionsFromDOM() {
    const options = [];
    const optionElements = this.querySelectorAll('option');

    optionElements.forEach((option, index) => {
      const disabled = option.hasAttribute('disabled');
      const selected = option.hasAttribute('selected');
      const value = option.value || option.textContent.trim();
      const label = option.textContent.trim();

      const optionData = {
        value,
        label,
        disabled,
        selected,
      };

      options.push(optionData);

      if (optionData.selected) {
        this.state.value = optionData.value;
      }

      // Hide the original option
      option.style.display = 'none';
    });

    if (options.length > 0) {
      this.setOptions(options);
      this._updateDisplay();
    }
  }

  _handleInput(e) {
    const query = e.target.value;

    if (this.state.src && query.length >= this.state.min) {
      this._cancelPendingRequest();
      this._searchTimeout = setTimeout(() => {
        this._fetchOptions(query).catch(this._handleFetchError.bind(this));
      }, this.state.debounce);
    } else {
      this._filterLocal(query);
    }
  }

  _handleKeydown(e) {
    if (!this.state.open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        this.open();
      }
      return;
    }

    const maxIndex = this.state.filtered.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.state.highlightedIndex = Math.min(maxIndex, this.state.highlightedIndex + 1);
        this._renderOptions();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.state.highlightedIndex = Math.max(0, this.state.highlightedIndex - 1);
        this._renderOptions();
        break;

      case 'Enter':
        e.preventDefault();
        if (
          this.state.highlightedIndex >= 0 &&
          this.state.highlightedIndex < this.state.filtered.length
        ) {
          const option = this.state.filtered[this.state.highlightedIndex];
          if (option && !option.disabled) {
            this.select(option.value);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  _cancelPendingRequest() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = null;
    }
  }

  async _fetchOptions(query) {
    // Implementation for remote data fetching
    this.state.loading = true;
    // ... rest of fetch logic
  }

  _handleFetchError(error) {
    this.state.error = error.message;
    this._announce(`Error: ${error.message}`);
  }

  _filterLocal(query) {
    const searchTerm = query.trim().toLowerCase();
    this.state.filtered = this.state.options.filter(option =>
      option.label.toLowerCase().includes(searchTerm)
    );

    // If no search query, highlight selected item; otherwise highlight first result
    if (!searchTerm && this.state.value) {
      const selectedIndex = this.state.filtered.findIndex(opt => opt.value === this.state.value);
      this.state.highlightedIndex = selectedIndex >= 0 ? selectedIndex : -1;
    } else {
      this.state.highlightedIndex = this.state.filtered.length > 0 ? 0 : -1;
    }

    this._renderOptions();
  }

  _updateDisplay() {
    if (this.state.value) {
      const selected = this.state.options.find(opt => opt.value === this.state.value);
      this._els.input.value = selected ? selected.label : '';
    } else {
      this._els.input.value = '';
      this._els.input.placeholder = this.state.placeholder;
    }
  }

  _updateValue(newValue) {
    this.state.value = newValue;
    this._updateDisplay();
  }

  _updatePlaceholder() {
    this._els.input.placeholder = this.state.placeholder;
  }

  _updateDisabledState(disabled) {
    this.state.disabled = disabled;
    this._els.input.disabled = disabled;
  }

  _updateRequiredState(required) {
    this.state.required = required;
    this._els.input.required = required;
  }

  // Public API
  open() {
    if (this.state.open || this.state.disabled) return;

    this.state.open = true;

    // Set highlighted index to currently selected item, or -1 if no selection
    if (this.state.value) {
      const selectedIndex = this.state.filtered.findIndex(opt => opt.value === this.state.value);
      this.state.highlightedIndex = selectedIndex >= 0 ? selectedIndex : -1;
    } else {
      this.state.highlightedIndex = -1;
    }

    this._els.control.setAttribute('aria-expanded', 'true');
    this._els.menu.hidden = false;
    this._renderOptions();

    this.tm.enter(this._els.menu);
    this.dispatchEvent(new CustomEvent('p-select:open', { bubbles: true }));
  }

  close() {
    if (!this.state.open) return;

    this.state.open = false;
    this._els.control.setAttribute('aria-expanded', 'false');

    this.tm.exit(this._els.menu).then(() => {
      this._els.menu.hidden = true;
    });

    this.dispatchEvent(new CustomEvent('p-select:close', { bubbles: true }));
  }

  toggle() {
    this.state.open ? this.close() : this.open();
  }

  select(value) {
    const option = this.state.options.find(opt => opt.value == value);
    if (!option || option.disabled) return;

    this.state.value = option.value;
    this._setFormValue(option.value, option.label);
    this._els.input.value = option.label;

    this.dispatchEvent(
      new CustomEvent('p-select:change', {
        detail: { value: option.value, label: option.label },
        bubbles: true,
      })
    );

    this.close();
  }

  setOptions(arr) {
    this.state.options = Array.isArray(arr) ? arr.slice() : [];
    this.state.filtered = this.state.options.slice();
    this._renderOptions();
  }

  getValue() {
    return this.state.value;
  }

  clear() {
    this.state.value = '';
    this._setFormValue('', '');
    this._els.input.value = '';
    this._els.input.placeholder = this.state.placeholder;
  }

  get value() {
    return this.state.value;
  }

  set value(val) {
    this._updateValue(val);
  }

  refreshOptions() {
    this._parseOptionsFromDOM();
  }

  debug() {
    // Debug information available via component inspection
    // Use browser dev tools to inspect this.state for debugging
    return {
      options: this.state.options,
      filtered: this.state.filtered,
      value: this.state.value,
      domOptions: this.querySelectorAll('option').length,
    };
  }

  _setFormValue(value, label) {
    if (this._internals?.setFormValue) {
      const formData = new FormData();
      if (this.name) {
        formData.set(this.name, value);
      }
      this._internals.setFormValue(formData, label);
    }
  }

  _renderOptions() {
    const menu = this._els.menu;
    menu.innerHTML = '';

    const options = this.state.filtered;

    if (options.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'noresults';
      noResultsDiv.textContent = 'No results found';
      menu.appendChild(noResultsDiv);
      return;
    }

    options.forEach((option, index) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'option';
      optionEl.setAttribute('role', 'option');
      // Only mark as selected if both values are truthy and equal (don't mark empty placeholder as selected)
      const isSelected = this.state.value && option.value === this.state.value;
      optionEl.setAttribute('aria-selected', String(isSelected));
      optionEl.textContent = option.label;

      // CRITICAL: Set aria-disabled attribute for disabled options
      if (option.disabled) {
        optionEl.setAttribute('aria-disabled', 'true');
      }

      if (index === this.state.highlightedIndex) {
        optionEl.setAttribute('aria-current', 'true');
      }

      if (!option.disabled) {
        optionEl.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.select(option.value);
        });
      }

      menu.appendChild(optionEl);
    });
  }
}

if (!customElements.get('p-select')) {
  customElements.define('p-select', PSelect);
}
