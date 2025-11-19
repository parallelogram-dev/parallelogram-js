import styles from '../styles/framework/components/PModal.scss';

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
import { ExtendedStates } from '../core/ComponentStates.js';

export default class PModal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'data-modal-size', 'data-modal-closable'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    // Use BEM-style CSS with CSS custom properties for theming
    root.innerHTML = `
      <style>${styles}</style>

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

    // Initialize with closed state
    this.setAttribute('data-modal', ExtendedStates.CLOSED);
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
   * Open the modal with state management
   */
  open() {
    /* Set opening state */
    this.setAttribute('data-modal', ExtendedStates.OPENING);
    this.setAttribute('open', '');

    /* Transition to fully open after animation starts */
    requestAnimationFrame(() => {
      this.setAttribute('data-modal', ExtendedStates.OPEN);
    });
  }

  /**
   * Close the modal with state management
   */
  close() {
    /* Set closing state */
    this.setAttribute('data-modal', ExtendedStates.CLOSING);

    /* Wait for closing animation before removing open attribute */
    const duration =
      parseFloat(getComputedStyle(this).getPropertyValue('--modal-animation-duration') || '0.2') *
      1000;

    setTimeout(() => {
      this.removeAttribute('open');
      this.setAttribute('data-modal', ExtendedStates.CLOSED);
    }, duration);
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
