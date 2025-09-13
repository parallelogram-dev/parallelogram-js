/**
 * PModal - Modal dialog web component
 * Can be used standalone without the framework
 * Follows new naming conventions: data-modal-* attributes and BEM CSS classes
 *
 * @example
 * import './components/PModal.js';
 *
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal"
 *          data-modal-closable="true"
 *          data-modal-backdrop-close="true"
 *          data-modal-keyboard="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 */

export default class PModal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'data-modal-size', 'data-modal-closable'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    // Use BEM-style CSS with CSS custom properties for theming
    root.innerHTML = `
      <style>
        :host {
          --modal-backdrop-bg: rgba(0, 0, 0, 0.45);
          --modal-panel-bg: #0f172a;
          --modal-panel-color: #e5e7eb;
          --modal-panel-border: rgba(255, 255, 255, 0.08);
          --modal-panel-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          --modal-panel-radius: 16px;
          --modal-header-bg: #0f172a;
          --modal-footer-bg: #0f172a;
          --modal-close-hover-bg: rgba(255, 255, 255, 0.1);
          --modal-animation-duration: 0.2s;
          --modal-animation-easing: ease-out;
        }

        /* Host states */
        :host {
          display: none;
        }

        :host([open]) {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 9999;
          animation: modal-fade-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Block: Modal backdrop */
        .modal__backdrop {
          position: absolute;
          inset: 0;
          background: var(--modal-backdrop-bg);
          animation: modal-backdrop-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Block: Modal panel */
        .modal__panel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          min-width: min(92vw, 640px);
          max-width: 92vw;
          max-height: 86vh;
          overflow: auto;
          background: var(--modal-panel-bg);
          color: var(--modal-panel-color);
          border: 1px solid var(--modal-panel-border);
          border-radius: var(--modal-panel-radius);
          box-shadow: var(--modal-panel-shadow);
          animation: modal-panel-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Panel size modifiers */
        :host([data-modal-size="sm"]) .modal__panel {
          min-width: min(92vw, 400px);
        }

        :host([data-modal-size="lg"]) .modal__panel {
          min-width: min(92vw, 800px);
        }

        :host([data-modal-size="xs"]) .modal__panel {
          min-width: min(92vw, 300px);
        }

        :host([data-modal-size="xl"]) .modal__panel {
          min-width: min(92vw, 1000px);
        }

        :host([data-modal-size="fullscreen"]) .modal__panel {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          border-radius: 0;
          transform: none;
          top: 0;
          left: 0;
        }

        /* Element: Modal header */
        .modal__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--modal-panel-border);
          position: sticky;
          top: 0;
          background: var(--modal-header-bg);
          z-index: 1;
        }

        .modal__header h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 600;
        }

        /* Element: Header spacer */
        .modal__spacer {
          flex: 1;
        }

        /* Element: Close button */
        .modal__close {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background-color var(--modal-animation-duration) ease;
        }

        .modal__close:hover {
          background: var(--modal-close-hover-bg);
        }

        .modal__close:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* Element: Modal content */
        .modal__content {
          padding: 14px;
        }

        /* Element: Modal footer */
        .modal__footer {
          padding: 12px 14px;
          border-top: 1px solid var(--modal-panel-border);
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: var(--modal-footer-bg);
          z-index: 1;
        }

        /* Slotted button styles (BEM classes) */
        ::slotted(.btn) {
          appearance: none;
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          background: #1f2937;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          min-height: 3.125rem;
          transition: all var(--modal-animation-duration) ease;
        }

        ::slotted(.btn:hover) {
          background: #374151;
        }

        ::slotted(.btn--primary) {
          background: #60a5fa;
          color: #0b1020;
          font-weight: 700;
        }

        ::slotted(.btn--primary:hover) {
          background: #3b82f6;
        }

        ::slotted(.btn--danger) {
          background: #dc2626;
          color: white;
        }

        ::slotted(.btn--danger:hover) {
          background: #b91c1c;
        }

        ::slotted(.btn:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Animations */
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-panel-in {
          from { 
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          :host([open]),
          .modal__backdrop,
          .modal__panel,
          .modal__close,
          ::slotted(.btn) {
            animation: none;
            transition: none;
          }
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: light) {
          :host {
            --modal-panel-bg: white;
            --modal-panel-color: #1f2937;
            --modal-panel-border: rgba(0, 0, 0, 0.1);
            --modal-header-bg: white;
            --modal-footer-bg: white;
            --modal-close-hover-bg: rgba(0, 0, 0, 0.1);
          }

          ::slotted(.btn) {
            background: #f3f4f6;
            color: #1f2937;
          }

          ::slotted(.btn:hover) {
            background: #e5e7eb;
          }
        }
      </style>
      
      <div class="modal__backdrop" part="backdrop"></div>
      <div class="modal__panel" part="panel" role="dialog" aria-modal="true">
        <header class="modal__header" part="header">
          <slot name="title"><h2>Dialog</h2></slot>
          <div class="modal__spacer"></div>
          <button class="modal__close" aria-label="Close" part="close">×</button>
        </header>
        <section class="modal__content" part="content">
          <slot></slot>
        </section>
        <footer class="modal__footer" part="footer">
          <slot name="actions"></slot>
        </footer>
      </div>
    `;

    // Store element references using BEM naming
    this._elements = {
      backdrop: root.querySelector('.modal__backdrop'),
      panel: root.querySelector('.modal__panel'),
      close: root.querySelector('.modal__close'),
    };

    // Bind event handlers
    this._onKeydown = this._onKeydown.bind(this);
    this._onFocus = this._onFocus.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('open');

    // Set up event listeners
    this._elements.backdrop.addEventListener('click', () => {
      if (this._isBackdropClosable()) {
        this.close();
      }
    });

    this._elements.close.addEventListener('click', () => {
      if (this._isClosable()) {
        this.close();
      }
    });

    // Global event listeners
    document.addEventListener('keydown', this._onKeydown);
    this.addEventListener('focusin', this._onFocus);

    // Set ARIA attributes
    this._elements.panel.setAttribute('aria-labelledby', this._getTitleId());
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('focusin', this._onFocus);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (this.hasAttribute('open')) {
        this._onOpen();
      } else {
        this._onClose();
      }
    }
  }

  /**
   * Open the modal
   */
  open() {
    this.setAttribute('open', '');
  }

  /**
   * Close the modal
   */
  close() {
    this.removeAttribute('open');
  }

  /**
   * Toggle modal open/closed state
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(force) {
    if (force === true) {
      this.open();
    } else if (force === false) {
      this.close();
    } else {
      this.hasAttribute('open') ? this.close() : this.open();
    }
  }

  /**
   * Check if modal can be closed
   * @private
   * @returns {boolean}
   */
  _isClosable() {
    return this.getAttribute('data-modal-closable') !== 'false';
  }

  /**
   * Check if modal can be closed by clicking backdrop
   * @private
   * @returns {boolean}
   */
  _isBackdropClosable() {
    return this._isClosable() && this.getAttribute('data-modal-backdrop-close') !== 'false';
  }

  /**
   * Check if keyboard navigation is enabled
   * @private
   * @returns {boolean}
   */
  _isKeyboardEnabled() {
    return this.getAttribute('data-modal-keyboard') !== 'false';
  }

  /**
   * Handle modal opening
   * @private
   */
  _onOpen() {
    // Dispatch open event
    this.dispatchEvent(
      new CustomEvent('modal:open', {
        bubbles: true,
        detail: { modal: this },
      })
    );

    // Focus management
    requestAnimationFrame(() => {
      const firstFocusable = this._getFirstFocusable();
      const focusTarget = firstFocusable || this._elements.close;
      focusTarget.focus({ preventScroll: true });
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Handle modal closing
   * @private
   */
  _onClose() {
    // Dispatch close event
    this.dispatchEvent(
      new CustomEvent('modal:close', {
        bubbles: true,
        detail: { modal: this },
      })
    );

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} event
   */
  _onKeydown(event) {
    if (!this.hasAttribute('open') || !this._isKeyboardEnabled()) return;

    if (event.key === 'Escape' && this._isClosable()) {
      event.preventDefault();
      this.close();
    }

    if (event.key === 'Tab') {
      this._trapTab(event);
    }
  }

  /**
   * Handle focus events for focus trapping
   * @private
   */
  _onFocus() {
    if (!this.contains(document.activeElement)) {
      const focusTarget = this._getFirstFocusable() || this._elements.close;
      focusTarget.focus({ preventScroll: true });
    }
  }

  /**
   * Get all focusable elements within the modal
   * @private
   * @returns {HTMLElement[]}
   */
  _getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ];

    return [...this.querySelectorAll(selectors.join(','))];
  }

  /**
   * Get the first focusable element
   * @private
   * @returns {HTMLElement|null}
   */
  _getFirstFocusable() {
    return this._getFocusableElements()[0] || null;
  }

  /**
   * Trap tab navigation within the modal
   * @private
   * @param {KeyboardEvent} event
   */
  _trapTab(event) {
    const focusableElements = this._getFocusableElements();
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.contains(document.activeElement) ? document.activeElement : null;

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement || !activeElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Get title element ID for ARIA labeling
   * @private
   * @returns {string}
   */
  _getTitleId() {
    const titleSlot = this.querySelector('[slot="title"]');
    if (titleSlot && titleSlot.id) {
      return titleSlot.id;
    }
    return 'modal-title';
  }

  /**
   * Upgrade property for proper web component behavior
   * @private
   * @param {string} prop
   */
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }
}

// Auto-register the web component if not already registered
if (!customElements.get('p-modal')) {
  customElements.define('p-modal', PModal);
}
