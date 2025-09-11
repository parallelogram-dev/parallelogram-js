import { TransitionManager } from '../managers/index.js';

export class PSelect extends HTMLElement {
  static formAssociated = true;
  constructor() {
    super();
    this._internals = this.attachInternals?.();
    this.attachShadow({ mode: 'open' });
    this.tm = new TransitionManager();
    this.state = {
      options: [], filtered: [], value: '', open: false, highlightedIndex: -1,
      src: null, debounce: 200, min: 0, openOnFocus: true,
      placeholder: this.getAttribute('placeholder') || 'Select…'
    };
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:inline-block}
        .root{position:relative;min-width:260px}
        .control{display:flex;align-items:center;gap:.4rem;padding:.45rem .6rem;border-radius:10px;border:1px solid #e2e8f0;background:#fff}
        .control:focus-within{outline:none;box-shadow:0 0 0 3px rgba(59,130,246,.35);border-color:#93c5fd}
        .input{border:0;outline:0;flex:1;min-width:2ch;background:transparent}
        .placeholder{color:#64748b}
        .arrow{pointer-events:none}
        .menu{position:absolute;z-index:10;left:0;right:0;margin-top:.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-height:240px;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.08)}
        .option{padding:.45rem .6rem;cursor:pointer}
        .option[aria-selected="true"]{background:#eff6ff}
        .option[aria-current="true"]{background:#e2e8f0}
        .noresults{padding:.6rem;color:#64748b}
      </style>
      <div class="root" part="root">
        <div class="control" part="control" role="combobox" aria-expanded="false" aria-haspopup="listbox">
          <input class="input" part="input" type="text" autocomplete="off" />
          <span class="arrow" aria-hidden>▾</span>
        </div>
        <div class="menu" part="menu" role="listbox" hidden></div>
      </div>
    `;
  }
  connectedCallback() {
    const d = this.dataset;
    this.state.src = d.selectSrc || null;
    this.state.debounce = Number(d.selectDebounce || 200);
    this.state.min = Number(d.selectMin || 0);
    this.state.openOnFocus = (d.selectOpenOnFocus ?? 'true') !== 'false';

    if (d.select) {
      const sel = document.getElementById(d.select);
      if (sel) {
        this.name ||= sel.name;
        this._buildFromSelect(sel);
        sel.hidden = true;
      }
    }
    this.name ||= this.getAttribute('name') || '';

    this._els = {
      control: this.shadowRoot.querySelector('.control'),
      input: this.shadowRoot.querySelector('.input'),
      menu: this.shadowRoot.querySelector('.menu')
    };

    const initialLabel = this.getAttribute('value-label') || '';
    if (!initialLabel) {
      this._els.input.placeholder = this.state.placeholder;
      this._els.input.classList.add('placeholder');
    } else {
      this._els.input.value = initialLabel;
    }

    this._els.input.addEventListener('focus', () => { if (this.state.openOnFocus) this.open(); });
    this._els.input.addEventListener('input', (e) => this._onSearch(e));
    this._els.input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._els.control.addEventListener('click', () => this.toggle());
    document.addEventListener('click', (e) => { if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) this.close(); });

    if (this.state.src && this.state.min === 0) this._fetchOptions('');
  }
  _buildFromSelect(sel) {
    const opts = [...sel.options].map(o => ({ value: o.value, label: o.textContent, disabled: o.disabled }));
    this.setOptions(opts);
    this.value = sel.value;
  }
  open() {
    if (this.state.open) return;
    this.state.open = true;
    this._els.control.setAttribute('aria-expanded', 'true');
    this._els.menu.hidden = false;
    this._render();
    this.tm.enter(this._els.menu);
    this.dispatchEvent(new CustomEvent('cn-select:open', { bubbles: true }));
  }
  close() {
    if (!this.state.open) return;
    this.state.open = false;
    this._els.control.setAttribute('aria-expanded', 'false');
    this.tm.exit(this._els.menu).then(() => { this._els.menu.hidden = true; });
    this.dispatchEvent(new CustomEvent('cn-select:close', { bubbles: true }));
  }
  toggle() { this.state.open ? this.close() : this.open(); }
  select(value) {
    const opt = this.state.options.find(o => o.value == value);
    if (!opt) return;
    this.state.value = opt.value;
    this._setFormValue(opt.value, opt.label);
    this._els.input.value = opt.label;
    this._els.input.classList.remove('placeholder');
    this.dispatchEvent(new CustomEvent('cn-select:change', { detail: { value: opt.value, label: opt.label }, bubbles: true }));
    this.close();
  }
  setOptions(arr) {
    this.state.options = Array.isArray(arr) ? arr.slice() : [];
    this.state.filtered = this.state.options;
    this._render();
  }
  getValue() { return this.state.value; }
  clear() {
    this.state.value = '';
    this._setFormValue('', '');
    this._els.input.value = '';
    this._els.input.placeholder = this.state.placeholder;
    this._els.input.classList.add('placeholder');
  }
  destroy() { this.remove(); }
  _setFormValue(value, label) {
    if (this._internals?.setFormValue) {
      const formData = new FormData();
      if (this.name) formData.set(this.name, value);
      this._internals.setFormValue(formData);
    }
    const selId = this.dataset.select;
    if (selId) {
      const sel = document.getElementById(selId);
      if (sel) sel.value = value;
    }
  }
  _onSearch(e) {
    const q = e.target.value;
    this.dispatchEvent(new CustomEvent('cn-select:search', { detail: { q }, bubbles: true }));
    if (this.state.src && q.length >= this.state.min) {
      clearTimeout(this._t);
      this._t = setTimeout(() => this._fetchOptions(q), this.state.debounce);
    } else {
      this._filterLocal(q);
    }
  }
  _filterLocal(q) {
    const s = q.trim().toLowerCase();
    this.state.filtered = this.state.options.filter(o => o.label.toLowerCase().includes(s));
    this._render();
  }
  async _fetchOptions(q) {
    const url = this.state.src.replace('{q}', encodeURIComponent(q));
    const res = await fetch(url, { headers: { 'accept': 'application/json' }});
    if (!res.ok) return;
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    this.setOptions(items);
  }
  _onKeydown(e) {
    if (!this.state.open && (e.key === 'ArrowDown' || e.key === 'Enter')) { this.open(); return; }
    if (!this.state.open) return;
    const max = this.state.filtered.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.state.highlightedIndex = Math.min(max, this.state.highlightedIndex + 1); this._render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.state.highlightedIndex = Math.max(0, this.state.highlightedIndex - 1); this._render(); }
    if (e.key === 'Enter') { e.preventDefault(); const o = this.state.filtered[this.state.highlightedIndex]; if (o) this.select(o.value); }
    if (e.key === 'Escape') { this.close(); }
  }
  _render() {
    const m = this._els.menu;
    m.innerHTML = '';
    const list = this.state.filtered;
    if (!list.length) {
      const div = document.createElement('div');
      div.className = 'noresults';
      div.textContent = 'No results';
      m.appendChild(div);
      return;
    }
    list.forEach((o, i) => {
      const li = document.createElement('div');
      li.className = 'option';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(o.value === this.state.value));
      if (i === this.state.highlightedIndex) li.setAttribute('aria-current', 'true');
      li.textContent = o.label;
      if (!o.disabled) li.addEventListener('click', () => this.select(o.value));
      m.appendChild(li);
    });
  }
}
customElements.define('p-select', PSelect);
