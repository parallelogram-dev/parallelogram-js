export class XModal extends HTMLElement {
  static get observedAttributes(){ return ['open']; }
  constructor(){
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{ display:none; }
        :host([open]){ display:block; position:fixed; inset:0; z-index:9999; }
        .backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.45); }
        .panel{ position:absolute; inset:auto; top:50%; left:50%; transform:translate(-50%,-50%);
                min-width: min(92vw, 640px); max-width: 92vw; max-height: 86vh; overflow:auto;
                background:#0f172a; color:#e5e7eb; border:1px solid rgba(255,255,255,.08); border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.5); }
        header{ display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.08); position:sticky; top:0; background:#0f172a; }
        header h2{ margin:0; font-size:18px; line-height:1.3; }
        .spacer{ flex:1; }
        button.icon{ all:unset; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; cursor:pointer; }
        section{ padding:14px; }
        footer{ padding:12px 14px; border-top:1px solid rgba(255,255,255,.08); display:flex; gap:8px; justify-content:flex-end; position:sticky; bottom:0; background:#0f172a; }
        ::slotted(.btn){ appearance:none; border:0; border-radius:10px; padding:10px 14px; background:#1f2937; color:#fff; cursor:pointer; }
        ::slotted(.btn.accent){ background:#60a5fa; color:#0b1020; font-weight:700; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="panel" part="panel" role="dialog" aria-modal="true">
        <header part="header">
          <slot name="title"><h2>Dialog</h2></slot>
          <div class="spacer"></div>
          <button class="icon" aria-label="Close" part="close">×</button>
        </header>
        <section part="content"><slot></slot></section>
        <footer part="footer"><slot name="actions"></slot></footer>
      </div>
    `;
    this._els = {
      backdrop: root.querySelector('.backdrop'),
      panel: root.querySelector('.panel'),
      close: root.querySelector('button.icon'),
    };
    this._onKeydown = this._onKeydown.bind(this);
    this._onFocus = this._onFocus.bind(this);
  }
  connectedCallback(){
    this._upgradeProperty('open');
    this._els.backdrop.addEventListener('click', ()=> this._closable() && this.close());
    this._els.close.addEventListener('click', ()=> this._closable() && this.close());
    document.addEventListener('keydown', this._onKeydown);
    this.addEventListener('focusin', this._onFocus);
  }
  disconnectedCallback(){
    document.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('focusin', this._onFocus);
  }
  attributeChangedCallback(name){
    if (name === 'open') {
      if (this.hasAttribute('open')) {
        this.dispatchEvent(new CustomEvent('open', { bubbles: true }));
        const f = this._firstFocusable();
        (f || this._els.close).focus({ preventScroll: true });
      } else {
        this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
      }
    }
  }
  open(){ this.setAttribute('open', ''); }
  close(){ this.removeAttribute('open'); }
  toggle(force){ if (force===true) this.open(); else if (force===false) this.close(); else this.hasAttribute('open') ? this.close() : this.open(); }
  _closable(){ return this.getAttribute('closable') !== 'false'; }
  _upgradeProperty(prop){ if (this.hasOwnProperty(prop)) { let v = this[prop]; delete this[prop]; this[prop] = v; } }
  _onKeydown(e){ if (!this.hasAttribute('open')) return; if (e.key === 'Escape' && this._closable()) { this.close(); } if (e.key === 'Tab'){ this._trapTab(e); } }
  _onFocus(){ if (!this.contains(document.activeElement)) { (this._firstFocusable() || this._els.close).focus({ preventScroll: true }); } }
  _focusables(){ const sel = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'].join(','); return [...this.querySelectorAll(sel)].filter(el => !el.hasAttribute('disabled')); }
  _firstFocusable(){ return this._focusables()[0]; }
  _trapTab(e){ const f = this._focusables(); if (!f.length) return; const first = f[0], last = f[f.length - 1]; const active = this.contains(document.activeElement) ? document.activeElement : null; if (e.shiftKey){ if (active === first || !active){ last.focus(); e.preventDefault(); } } else { if (active === last){ first.focus(); e.preventDefault(); } } }
}
if (!customElements.get('x-modal')) customElements.define('x-modal', XModal);
