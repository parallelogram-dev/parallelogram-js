/** TransitionManager (as in previous starter) */
class TransitionManager {
  constructor({
    root = document,
    defaultY = '1rem',
    defaultDur = 320,
    defaultEase = 'cubic-bezier(0.22,1,0.36,1)',
  } = {}) {
    this.root = root;
    this.defaults = { y: defaultY, dur: defaultDur, ease: defaultEase };
  }
  async enter(el) {
    const enterClass = el.dataset.transitionEnterClass;
    if (enterClass) return this._animateWithClass(el, enterClass);
    return this._animateWithJS(el, true);
  }
  async exit(el) {
    const exitClass = el.dataset.transitionExitClass;
    if (exitClass) return this._animateWithClass(el, exitClass);
    return this._animateWithJS(el, false);
  }
  _animateWithClass(el, cls) {
    return new Promise(resolve => {
      const done = () => {
        el.removeEventListener('animationend', done);
        resolve();
      };
      el.addEventListener('animationend', done, { once: true });
      el.classList.add(cls);
    });
  }
  _animateWithJS(el, isEnter) {
    const y = el.dataset.transitionY || this.defaults.y;
    const dur = Number(el.dataset.transitionDuration || this.defaults.dur);
    const ease = el.dataset.transitionEase || this.defaults.ease;
    el.style.transition = `opacity ${dur}ms ${ease}, transform ${dur}ms ${ease}`;
    if (isEnter) {
      el.style.opacity = 0;
      el.style.transform = `translateY(${y})`;
      el.getBoundingClientRect();
      el.style.opacity = 1;
      el.style.transform = 'translateY(0)';
    } else {
      el.style.opacity = 1;
      el.style.transform = 'translateY(0)';
      el.getBoundingClientRect();
      el.style.opacity = 0;
      el.style.transform = `translateY(${y})`;
    }
    return new Promise(resolve =>
      setTimeout(() => {
        el.style.transition = '';
        resolve();
      }, dur)
    );
  }
  async swap(container, nextNode) {
    const current = container.firstElementChild;
    if (current) await this.exit(current);
    container.innerHTML = '';
    if (nextNode) container.appendChild(nextNode);
    if (nextNode) await this.enter(nextNode);
  }
}

var css_248z = ":root{--surface-control-radius:0.25em;--surface-control-border-width:1px;--surface-control-border-color:rgba(0,0,0,.1);--surface-control-color-bg:#fff;--surface-control-color-text:currentColor;--surface-control-shadow:none;--surface-button-radius:0.25em;--surface-button-border-width:1px;--surface-button-shadow:none;--surface-panel-radius:0.5em;--surface-panel-border-width:1px;--surface-panel-border-color:rgba(0,0,0,.1);--surface-panel-color-bg:#fff;--surface-panel-color-text:currentColor;--surface-panel-shadow:0 4px 6px rgba(0,0,0,.12);--surface-dialog-radius:0.75em;--surface-dialog-border-width:1px;--surface-dialog-border-color:rgba(0,0,0,.1);--surface-dialog-color-bg:#fff;--surface-dialog-color-text:currentColor;--surface-dialog-shadow:0 1.25em 3em rgba(0,0,0,.5);--surface-dropdown-radius:0.25em;--surface-dropdown-border-width:1px;--surface-dropdown-border-color:rgba(0,0,0,.1);--surface-dropdown-color-bg:#fff;--surface-dropdown-color-text:currentColor;--surface-dropdown-shadow:0 4px 6px rgba(0,0,0,.12);--surface-dropdown-item-hover-bg:#f5f5f5;--surface-dropdown-item-selected-bg:rgba(59,130,246,.1);--surface-dropdown-item-current-bg:#f5f5f5;--surface-item-radius:0.25em;--surface-item-border-width:1px;--surface-item-border-color:rgba(0,0,0,.1);--surface-item-color-bg:transparent;--surface-item-color-text:currentColor;--surface-item-shadow:none;--surface-card-radius:0.125em;--surface-card-border-width:1px;--surface-card-border-color:#d4d4d4;--surface-card-color-bg:#fff;--surface-card-color-text:currentColor;--surface-card-shadow:none;--surface-touch-radius:0.125em;--surface-touch-border-width:1px;--surface-touch-border-color:#d4d4d4;--surface-touch-color-bg:#f5f5f5;--surface-touch-color-text:currentColor;--surface-touch-shadow:none;--surface-touch-hover-bg:#f5f5f5;--surface-touch-hover-border-color:rgba(59,130,246,.5);--form-control-padding-y:0.25em;--form-control-padding-x:0.75em;--form-control-padding-y-sm:0.125em;--form-control-padding-x-sm:0.5em;--form-control-padding-y-lg:0.5em;--form-control-padding-x-lg:1.25em;--form-control-border-width:var(--surface-control-border-width);--form-control-border-color:var(--surface-control-border-color);--form-control-border-radius:var(--surface-control-radius);--form-control-bg:var(--surface-control-color-bg);--form-control-color:var(--surface-control-color-text);--form-control-placeholder-color:rgba(0,0,0,.5);--form-control-focus-ring-width:2px;--form-control-focus-ring-color:#3b82f6;--form-control-focus-border-color:#3b82f6;--form-control-hover-border-color:#d4d4d4;--form-control-disabled-opacity:0.3;--form-control-disabled-bg:#f5f5f5;--form-control-font-size:0.875em;--form-control-font-size-sm:0.75em;--form-control-font-size-lg:1em;--form-control-font-family:inherit;--button-padding-y:0.25em;--button-padding-x:0.75em;--button-padding-y-sm:0.125em;--button-padding-x-sm:0.5em;--button-padding-y-lg:0.5em;--button-padding-x-lg:1.25em;--button-font-size:0.875em;--button-font-size-sm:0.75em;--button-font-size-lg:1em;--button-font-weight:600;--button-border-width:var(--surface-button-border-width);--button-border-radius:var(--surface-button-radius);--button-min-height:2.5em;--button-min-height-sm:2em;--button-min-height-lg:3em;--button-primary-bg:#3b82f6;--button-primary-color:#fff;--button-primary-border:#3b82f6;--button-primary-hover-bg:#2563eb;--button-primary-hover-border:#2563eb;--button-secondary-bg:transparent;--button-secondary-color:currentColor;--button-secondary-border:#d4d4d4;--button-secondary-hover-bg:#f5f5f5;--button-secondary-hover-border:#d4d4d4;--button-danger-bg:#ef4444;--button-danger-color:#fff;--button-danger-border:#ef4444;--button-danger-hover-bg:#dc2626;--button-danger-hover-border:#dc2626;--button-ghost-bg:transparent;--button-ghost-color:currentColor;--button-ghost-border:currentColor;--button-ghost-hover-bg:rgba(0,0,0,.05);--panel-bg:var(--surface-panel-color-bg);--panel-border-width:var(--surface-panel-border-width);--panel-border-color:var(--surface-panel-border-color);--panel-border-radius:var(--surface-panel-radius);--panel-color:var(--surface-panel-color-text);--panel-shadow:var(--surface-panel-shadow);--panel-padding:0.75em;--panel-padding-sm:0.5em;--panel-padding-lg:1.25em;--panel-header-padding:0.5em 0.75em;--panel-header-border:1px solid rgba(0,0,0,.1);--panel-footer-padding:0.5em 0.75em;--panel-footer-border:1px solid rgba(0,0,0,.1);--modal-bg:var(--surface-dialog-color-bg);--modal-border-width:var(--surface-dialog-border-width);--modal-border-color:var(--surface-dialog-border-color);--modal-border-radius:var(--surface-dialog-radius);--modal-color:var(--surface-dialog-color-text);--modal-shadow:var(--surface-dialog-shadow);--modal-backdrop-bg:rgba(0,0,0,.5)}@media (prefers-color-scheme:dark){:root{--form-control-bg:#171717;--form-control-color:#fff;--form-control-border-color:#525252;--form-control-placeholder-color:hsla(0,0%,100%,.5);--button-secondary-hover-bg:#525252;--panel-bg:#171717;--panel-border-color:#525252}}:host{box-sizing:border-box;display:inline-block;position:relative}:host{--select-border-color:var(--surface-control-border-color);--select-focus-color:#3b82f6;--select-bg:var(--surface-control-color-bg);--select-text:var(--surface-control-color-text);--select-placeholder:rgba(0,0,0,.5);--select-hover-bg:var(--surface-dropdown-item-hover-bg);--select-selected-bg:var(--surface-dropdown-item-selected-bg);--select-current-bg:var(--surface-dropdown-item-current-bg);--select-padding:0.45rem 0.6rem;--select-border-radius:var(--surface-control-radius);--select-border:var(--surface-control-border-width) solid var(--select-border-color);--select-focus-shadow:inset 0 0 0 3px rgba(59,130,246,.3);--menu-border-radius:var(--surface-dropdown-radius);--menu-border-color:var(--surface-dropdown-border-color);--menu-bg:var(--surface-dropdown-color-bg);--menu-shadow:var(--surface-dropdown-shadow)}@media (prefers-color-scheme:dark){:host{--select-placeholder:hsla(0,0%,100%,.5);--select-hover-bg:hsla(0,0%,100%,.1)}}.root{background:inherit;border:inherit;border-radius:inherit;color:inherit;font-family:inherit;font-size:inherit;height:100%;width:100%}.control,.root{box-sizing:border-box;left:0;padding:inherit;position:absolute;top:0}.control{align-items:center;bottom:0;cursor:pointer;display:flex;gap:.4rem;right:0;transition:border-color .2s ease,box-shadow .2s ease}.input{background:transparent;border:0;color:inherit;flex:1;font:inherit;min-width:2ch;outline:0;padding:0}.input::placeholder{color:inherit;opacity:.6}.arrow{flex-shrink:0;margin-left:auto;pointer-events:none;transition:transform .15s ease;user-select:none}.control[aria-expanded=true] .arrow{transform:rotate(180deg)}.menu{background:var(--menu-bg);border:var(--surface-dropdown-border-width,1px) solid var(--menu-border-color);border-radius:var(--menu-border-radius);box-shadow:var(--menu-shadow);color:var(--select-text);left:0;margin-top:.25rem;max-height:240px;overflow:auto;position:absolute;right:0;top:100%;z-index:10}.option{cursor:pointer;padding:.45rem .6rem;transition:background-color .15s ease}.option:hover{background:var(--select-hover-bg)}.option[aria-selected=true]{background:var(--select-selected-bg);font-weight:500}.option[aria-current=true]{background:var(--select-current-bg)}.option[aria-disabled=true]{background:transparent!important;cursor:not-allowed;opacity:.5}.noresults{font-style:italic;opacity:.6;padding:.6rem;text-align:center}";

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
class PSelect extends HTMLElement {
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
      <style>${css_248z}</style>

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

export { PSelect as default };
