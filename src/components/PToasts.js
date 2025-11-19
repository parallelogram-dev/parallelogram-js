import styles from '../styles/framework/components/PToasts.scss';

export default class PToasts extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    root.innerHTML = `
      <style>${styles}</style>  
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
