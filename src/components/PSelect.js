import { TransitionManager } from '../managers/index.js';
import { default as PToasts } from './PToasts.js';

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
      <style>
        :host {
          display: inline-block;
          position: relative;
          box-sizing: border-box;
        }

        /* CSS custom properties with fallbacks to parent/theme colors */
        :host {
          --select-border-color: var(--border-color, var(--color-border, #e2e8f0));
          --select-focus-color: var(--accent-color, var(--color-primary, #3b82f6));
          --select-bg: var(--background-color, var(--color-surface, #fff));
          --select-text: var(--text-color, var(--color-text, currentColor));
          --select-placeholder: var(--text-muted, var(--color-text-secondary, #64748b));
          --select-hover-bg: var(--hover-bg, var(--color-surface-hover, rgba(0,0,0,0.05)));
          --select-selected-bg: var(--selected-bg, var(--color-surface-active, rgba(59, 130, 246, 0.1)));
          --select-current-bg: var(--current-bg, var(--color-surface-focus, rgba(0,0,0,0.1)));
          --select-padding: 0.45rem 0.6rem;
          --select-border-radius: 6px;
          --select-border: 1px solid var(--select-border-color);
          --select-focus-shadow: 0 0 0 3px var(--focus-shadow-color, rgba(59, 130, 246, 0.1));
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          :host {
            --select-border-color: var(--border-color, var(--color-border, #374151));
            --select-bg: var(--background-color, var(--color-surface, #1f2937));
            --select-text: var(--text-color, var(--color-text, #f9fafb));
            --select-placeholder: var(--text-muted, var(--color-text-secondary, #9ca3af));
            --select-hover-bg: var(--hover-bg, var(--color-surface-hover, rgba(255,255,255,0.1)));
            --select-selected-bg: var(--selected-bg, var(--color-surface-active, rgba(59, 130, 246, 0.2)));
            --select-current-bg: var(--current-bg, var(--color-surface-focus, rgba(255,255,255,0.1)));
          }
        }

        .root {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          background: inherit;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          border: inherit;
          border-radius: inherit;
          padding: inherit;
        }

        .control {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          padding: inherit;
        }

        .input {
          border: 0;
          outline: 0;
          flex: 1;
          min-width: 2ch;
          background: transparent;
          color: inherit;
          font: inherit;
          padding: 0;
        }

        .input::placeholder {
          color: inherit;
          opacity: 0.6;
        }

        .arrow {
          pointer-events: none;
          transition: transform 0.15s ease;
          user-select: none;
          flex-shrink: 0;
          margin-left: auto;
        }

        .control[aria-expanded="true"] .arrow {
          transform: rotate(180deg);
        }

        .menu {
          position: absolute;
          z-index: 10;
          left: 0;
          right: 0;
          top: 100%;
          margin-top: 0.25rem;
          background: var(--select-bg);
          color: var(--select-text);
          border: 1px solid var(--select-border-color);
          border-radius: 10px;
          max-height: 240px;
          overflow: auto;
          box-shadow: 0 10px 30px var(--shadow-color, rgba(0, 0, 0, 0.08));
        }

        .option {
          padding: 0.45rem 0.6rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .option:hover {
          background: var(--select-hover-bg);
        }

        .option[aria-selected="true"] {
          background: var(--select-selected-bg);
          font-weight: 500;
        }

        .option[aria-current="true"] {
          background: var(--select-current-bg);
        }

        .option[aria-disabled="true"] {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent !important;
        }

        .noresults {
          padding: 0.6rem;
          font-style: italic;
          text-align: center;
          opacity: 0.6;
        }
      </style>
      
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
    this.state.highlightedIndex = this.state.filtered.length > 0 ? 0 : -1;
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
    this.state.highlightedIndex = 0;

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
    console.log('PSelect Debug:', {
      options: this.state.options,
      filtered: this.state.filtered,
      value: this.state.value,
      domOptions: this.querySelectorAll('option').length,
    });
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
      optionEl.setAttribute('aria-selected', String(option.value === this.state.value));
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
