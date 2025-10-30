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

import { getFocusableElements, trapFocus } from '../utils/dom-utils.js';

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
        /* Global Hidden Rule */
        [hidden] {
          display: none !important;
        }

        /* Host & Core Properties */
        :host {
          display: none;
          box-sizing: border-box;

          /* Colors (matching PDatetime for consistency) */
          --modal-text: currentColor;
          --modal-muted: rgba(0, 0, 0, 0.5);
          --modal-accent: #3b82f6;
          --modal-hover: rgba(0, 0, 0, 0.05);
          --modal-backdrop-bg: rgba(0, 0, 0, 0.45);
          --modal-panel-bg: #ffffff;
          --modal-panel-color: #1f2937;
          --modal-panel-border: rgba(0, 0, 0, 0.1);
          --modal-header-bg: #ffffff;
          --modal-header-border: rgba(0, 0, 0, 0.1);
          --modal-footer-bg: #ffffff;
          --modal-footer-border: rgba(0, 0, 0, 0.1);
          --modal-close-hover-bg: rgba(0, 0, 0, 0.08);
          --modal-btn-primary-bg: #3b82f6;
          --modal-btn-primary-color: #ffffff;
          --modal-btn-primary-hover-bg: #2563eb;
          --modal-btn-danger-bg: #dc2626;
          --modal-btn-danger-color: #ffffff;
          --modal-btn-danger-hover-bg: #b91c1c;
          --modal-btn-bg: #f3f4f6;
          --modal-btn-color: #1f2937;
          --modal-btn-hover-bg: #e5e7eb;

          /* Opacity */
          --modal-placeholder-opacity: 0.6;
          --modal-disabled-opacity: 0.5;

          /* Spacing (em-based for scalability) */
          --modal-space-xs: 0.125em;    /* 2px at 16px base */
          --modal-space-sm: 0.25em;     /* 4px */
          --modal-space-md: 0.5em;      /* 8px */
          --modal-space-lg: 0.75em;     /* 12px */
          --modal-space-xl: 1em;        /* 16px */
          --modal-padding-x: 0.875em;   /* 14px */
          --modal-padding-y: 0.75em;    /* 12px */
          --modal-gap: 0.5em;           /* 8px */

          /* Border Radius */
          --modal-radius: 0.5em;        /* 8px */
          --modal-radius-lg: 0.625em;   /* 10px */
          --modal-radius-xl: 1em;       /* 16px */

          /* Borders */
          --modal-border-width: 1px;

          /* Shadows */
          --modal-shadow-color: rgba(0, 0, 0, 0.5);
          --modal-shadow: 0 1.25em 3.75em var(--modal-shadow-color);

          /* Timing */
          --modal-transition: 0.2s ease;
          --modal-animation-duration: 0.2s;
          --modal-animation-easing: ease-out;

          /* Sizes */
          --modal-size-xs: 18.75em;     /* 300px */
          --modal-size-sm: 25em;        /* 400px */
          --modal-size-md: 40em;        /* 640px - default */
          --modal-size-lg: 50em;        /* 800px */
          --modal-size-xl: 62.5em;      /* 1000px */
          --modal-max-width: 92vw;
          --modal-max-height: 86vh;
          --modal-fullscreen-inset: 3em; /* 48px */
          --modal-close-size: 1.75em;   /* 28px */
          --modal-font-sm: 0.875em;     /* 14px */
          --modal-font-md: 1.125em;     /* 18px */
          --modal-btn-min-height: 3.125em; /* 50px */
        }

        /* Shared - Border Properties */
        .modal__panel {
          border: var(--modal-border-width) solid var(--modal-panel-border);
        }

        /* Shared - Border Radius */
        .modal__panel,
        .modal__close,
        ::slotted(.btn) {
          border-radius: var(--modal-radius-lg);
        }

        /* Shared - Flex Center Layout */
        .modal__close,
        .modal__header,
        .modal__footer {
          display: flex;
          align-items: center;
        }

        /* Shared - Transitions (only for users who prefer motion) */
        @media (prefers-reduced-motion: no-preference) {
          .modal__backdrop {
            transition: opacity var(--modal-transition);
          }

          .modal__panel {
            transition: opacity var(--modal-transition),
                        transform var(--modal-transition);
          }

          .modal__close {
            transition: background-color var(--modal-transition);
          }

          ::slotted(.btn) {
            transition: background-color var(--modal-transition),
                        color var(--modal-transition),
                        transform var(--modal-transition);
          }
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
          display: flex;
          flex-direction: column;
          min-width: min(var(--modal-max-width), var(--modal-size-md));
          max-width: var(--modal-max-width);
          max-height: var(--modal-max-height);
          background: var(--modal-panel-bg);
          color: var(--modal-panel-color);
          box-shadow: var(--modal-shadow);
          animation: modal-panel-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Panel size modifiers */
        :host([data-modal-size="xs"]) .modal__panel {
          min-width: min(var(--modal-max-width), var(--modal-size-xs));
        }

        :host([data-modal-size="sm"]) .modal__panel {
          min-width: min(var(--modal-max-width), var(--modal-size-sm));
        }

        :host([data-modal-size="lg"]) .modal__panel {
          min-width: min(var(--modal-max-width), var(--modal-size-lg));
        }

        :host([data-modal-size="xl"]) .modal__panel {
          min-width: min(var(--modal-max-width), var(--modal-size-xl));
        }

        :host([data-modal-size="fullscreen"]) .modal__panel {
          width: calc(100vw - calc(var(--modal-fullscreen-inset) * 2));
          height: calc(100vh - calc(var(--modal-fullscreen-inset) * 2));
          max-width: calc(100vw - calc(var(--modal-fullscreen-inset) * 2));
          max-height: calc(100vh - calc(var(--modal-fullscreen-inset) * 2));
          border-radius: var(--modal-radius-xl);
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
        }

        /* Element: Modal header */
        .modal__header {
          flex-shrink: 0;
          gap: var(--modal-gap);
          padding: var(--modal-padding-y) var(--modal-padding-x);
          background: var(--modal-header-bg);
          border-bottom: var(--modal-border-width) solid var(--modal-panel-border);
          border-radius: var(--modal-radius) var(--modal-radius) 0 0;
        }

        .modal__header h2 {
          margin: 0;
          font-size: var(--modal-font-md);
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
          width: var(--modal-close-size);
          height: var(--modal-close-size);
          border-radius: var(--modal-radius);
          cursor: pointer;
          font-size: var(--modal-font-md);
          font-weight: bold;
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
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          padding: var(--modal-padding-x);
        }

        /* Element: Modal footer */
        .modal__footer {
          flex-shrink: 0;
          padding: var(--modal-padding-y) var(--modal-padding-x);
          gap: var(--modal-gap);
          justify-content: flex-end;
          background: var(--modal-footer-bg);
          border-top: var(--modal-border-width) solid var(--modal-panel-border);
          border-radius: 0 0 var(--modal-radius) var(--modal-radius);
        }

        /* Slotted button styles (BEM classes) */
        ::slotted(.btn) {
          appearance: none;
          border: 0;
          border-radius: var(--modal-radius-lg);
          padding: var(--modal-space-lg) var(--modal-padding-x);
          background: var(--modal-btn-bg);
          color: var(--modal-btn-color);
          cursor: pointer;
          font-size: var(--modal-font-sm);
          font-weight: 500;
          min-height: var(--modal-btn-min-height);
          transition: all var(--modal-transition);
        }

        ::slotted(.btn:hover) {
          background: var(--modal-btn-hover-bg);
        }

        ::slotted(.btn--primary) {
          background: var(--modal-btn-primary-bg);
          color: var(--modal-btn-primary-color);
          font-weight: 700;
        }

        ::slotted(.btn--primary:hover) {
          background: var(--modal-btn-primary-hover-bg);
        }

        ::slotted(.btn--danger) {
          background: var(--modal-btn-danger-bg);
          color: var(--modal-btn-danger-color);
        }

        ::slotted(.btn--danger:hover) {
          background: var(--modal-btn-danger-hover-bg);
        }

        ::slotted(.btn:disabled) {
          opacity: var(--modal-disabled-opacity);
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
      </style>

      <div class="modal__backdrop" data-modal-backdrop part="backdrop"></div>
      <div class="modal__panel" data-modal-panel part="panel" role="dialog" aria-modal="true">
        <header class="modal__header" data-modal-header part="header">
          <slot name="title"><h2>Dialog</h2></slot>
          <div class="modal__spacer"></div>
          <button class="modal__close" data-modal-close-btn aria-label="Close" part="close">×</button>
        </header>
        <section class="modal__content" data-modal-content part="content">
          <slot></slot>
        </section>
        <footer class="modal__footer" data-modal-footer part="footer">
          <slot name="actions"></slot>
        </footer>
      </div>
    `;

    // Store element references using data attributes (following PDatetime pattern)
    this._elements = {
      backdrop: root.querySelector('[data-modal-backdrop]'),
      panel: root.querySelector('[data-modal-panel]'),
      close: root.querySelector('[data-modal-close-btn]'),
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

    // Handle slotted buttons with data-modal-close attribute
    this.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-modal-close') && this._isClosable()) {
        this.close();
      }
    });

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
    return getFocusableElements(this);
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
    trapFocus(this, event);
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
