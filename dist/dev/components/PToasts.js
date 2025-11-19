var css_248z = ":host{display:grid;gap:8px;inset:auto auto auto 0;padding:12px;pointer-events:none;position:fixed;z-index:2147483647}:host([placement=top-left]){left:0;top:0}:host([placement=top-right]){left:auto;right:0;top:0}:host([placement=bottom-right]){bottom:0;left:auto;right:0}:host([placement=bottom-left]){bottom:0;left:0}.toast{animation:toast-in .18s ease-out forwards;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);color:#fff;cursor:pointer;font:14px/1.4 system-ui,-apple-system,sans-serif;min-width:300px;opacity:0;outline:none;padding:10px 12px;pointer-events:auto;transform:translateY(-6px)}.toast.info{background:#111827}.toast.success{background:#065f46}.toast.warning{background:#7c2d12}.toast.error{background:#7f1d1d}@keyframes toast-in{to{opacity:1;transform:none}}.row{align-items:center;display:flex;gap:8px}.msg{flex:1;white-space:pre-wrap}.btn.close{all:unset;align-items:center;background:hsla(0,0%,100%,.1);border-radius:6px;cursor:pointer;display:inline-flex;font-weight:700;height:24px;justify-content:center;min-height:24px;width:24px}.btn.close:hover{background:hsla(0,0%,100%,.2)}";

class PToasts extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>${css_248z}</style>  
      <div id="container" role="region" aria-live="polite"></div>
    `;

    this._container = root.getElementById('container');
    this._idCounter = 0;
    this._toasts = new Map();
  }

  toast({ message, type = 'info', timeout = 4000, allowHTML = false }) {
    const id = ++this._idCounter;

    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.setAttribute('role', type === 'warn' || type === 'error' ? 'alert' : 'status');

    const row = document.createElement('div');
    row.className = 'row';

    const messageElement = document.createElement('span');
    messageElement.className = 'msg';
    if (allowHTML) {
      messageElement.innerHTML = message;
    } else {
      messageElement.textContent = message;
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'btn close';
    closeButton.setAttribute('aria-label', 'Dismiss notification');
    closeButton.textContent = '×';

    row.appendChild(messageElement);
    row.appendChild(closeButton);
    element.appendChild(row);
    this._container.appendChild(element);

    let isRemoved = false;
    const dismiss = () => {
      if (isRemoved) return;
      isRemoved = true;

      element.style.animation = 'toast-out 0.15s ease-in forwards';
      setTimeout(() => element.remove(), 150);
      this._toasts.delete(id);

      this.dispatchEvent(
        new CustomEvent('toast:close', {
          detail: { id, type, message },
          bubbles: true,
        })
      );
    };

    closeButton.addEventListener('click', dismiss);

    if (timeout > 0) {
      setTimeout(dismiss, timeout);
    }

    this._toasts.set(id, { element, type, dismiss });

    this.dispatchEvent(
      new CustomEvent('toast:show', {
        detail: { id, type, message },
        bubbles: true,
      })
    );

    return dismiss;
  }
}

if (!customElements.get('p-toasts')) {
  customElements.define('p-toasts', PToasts);
}

export { PToasts as default };
