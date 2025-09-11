export class PToasts extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>  
        :host {
          position: fixed;
          inset: auto auto auto 0;
          padding: 12px;
          z-index: 2147483647;
          display: grid;
          gap: 8px;
          pointer-events: none;
        }
        
        :host([placement="top-left"]) { top: 0; left: 0; }
        :host([placement="top-right"]) { top: 0; right: 0; left: auto; }
        :host([placement="bottom-right"]) { bottom: 0; right: 0; left: auto; }
        :host([placement="bottom-left"]) { bottom: 0; left: 0; }
        
        .toast {
          padding: 10px 12px;
          border-radius: 8px;
          color: #fff;
          box-shadow: 0 6px 20px rgba(0,0,0,.25);
          opacity: 0;
          transform: translateY(-6px);
          animation: toast-in 0.18s ease-out forwards;
          cursor: pointer;
          font: 14px/1.4 system-ui, -apple-system, sans-serif;
          outline: none;
          pointer-events: auto;
          min-width: 300px;
        }
        
        .toast.info { background: #111827; }
        .toast.success { background: #065f46; }
        .toast.warn { background: #7c2d12; }
        .toast.error { background: #7f1d1d; }
        
        @keyframes toast-in { 
          to { opacity: 1; transform: none; } 
        }
        
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .msg {
          white-space: pre-wrap;
          flex: 1;
        }
        
        button.close {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          font-weight: 700;
          background: rgba(255,255,255,0.1);
        }
        
        button.close:hover {
          background: rgba(255,255,255,0.2);
        }
      </style>  
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
    closeButton.className = 'close';
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

      this.dispatchEvent(new CustomEvent('toast:close', {
        detail: { id, type, message },
        bubbles: true
      }));
    };

    closeButton.addEventListener('click', dismiss);

    if (timeout > 0) {
      setTimeout(dismiss, timeout);
    }

    this._toasts.set(id, { element, type, dismiss });

    this.dispatchEvent(new CustomEvent('toast:show', {
      detail: { id, type, message },
      bubbles: true
    }));

    return dismiss;
  }
}

if (!customElements.get('p-toasts')) {
  customElements.define('p-toasts', PToasts);
}