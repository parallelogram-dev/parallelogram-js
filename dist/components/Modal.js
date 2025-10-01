import { BaseComponent } from '@peptolab/parallelogram';

/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */


/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusableElements(container = document) {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
  ];
  return Array.from(container.querySelectorAll(selectors.join(',')));
}

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 * @param {HTMLElement} container - Container to trap focus within
 * @param {KeyboardEvent} event - Tab key event
 */
function trapFocus(container, event) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.contains(document.activeElement) ? document.activeElement : null;

  if (event.shiftKey && (active === first || !active)) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && active === last) {
    first.focus();
    event.preventDefault();
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Text content or child element
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }

  return element;
}

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


class PModal extends HTMLElement {
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

/**
 * Modal - Modal dialog enhancement component
 * Works with PModal web component and data attributes for modal triggers
 * Follows new naming conventions: data-modal-* attributes
 *
 * @example
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal"
 *          data-modal-size="large"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * JavaScript (standalone):
 * import { Modal } from './components/Modal.js';
 * const modals = new Modal();
 * document.querySelectorAll('[data-modal]')
 *   .forEach(trigger => modals.mount(trigger));
 */


class Modal extends BaseComponent {
  /**
   * Default options for modal enhancement
   */
  static get defaults() {
    return {
      size: 'md', // Modal size: xs, sm, md, lg, xl, fullscreen
      closable: true, // Whether modal can be closed
      backdropClose: true, // Close on backdrop click
      keyboard: true, // Enable keyboard navigation
      focus: true, // Auto-focus when opened
      multiple: false, // Allow multiple modals
      appendTo: 'body', // Where to append modal elements
    };
  }

  /**
   * Initialize modal enhancement for a trigger element
   * @protected
   * @param {HTMLElement} element - Trigger element to enhance
   * @returns {import('../core/BaseComponent.js').ComponentState} Component state
   */
  _init(element) {
    const state = super._init(element);

    // Get configuration from data attributes
    const target = this._getDataAttr(element, 'modal-target');
    const size = this._getDataAttr(element, 'modal-size', Modal.defaults.size);
    const closable = this._getDataAttr(element, 'modal-closable', Modal.defaults.closable);
    const backdropClose = this._getDataAttr(
      element,
      'modal-backdrop-close',
      Modal.defaults.backdropClose
    );
    const keyboard = this._getDataAttr(element, 'modal-keyboard', Modal.defaults.keyboard);
    const focus = this._getDataAttr(element, 'modal-focus', Modal.defaults.focus);
    const multiple = this._getDataAttr(element, 'modal-multiple', Modal.defaults.multiple);

    if (!target) {
      this.logger?.warn('Modal: No data-modal-target attribute found', element);
      return state;
    }

    // Find or create target modal
    let modalElement = document.querySelector(target);
    if (!modalElement) {
      this.logger?.warn('Modal: Target modal not found', { target, element });
      return state;
    }

    // Ensure it's an p-modal element
    if (modalElement.tagName.toLowerCase() !== 'p-modal') {
      this.logger?.warn('Modal: Target is not an p-modal element', { target, element });
      return state;
    }

    // Configure modal attributes
    this._configureModal(modalElement, {
      size,
      closable,
      backdropClose,
      keyboard,
    });

    // Store state
    state.target = target;
    state.modalElement = modalElement;
    state.size = size;
    state.closable = closable;
    state.backdropClose = backdropClose;
    state.keyboard = keyboard;
    state.focus = focus;
    state.multiple = multiple;

    // Set up event listeners
    element.addEventListener('click', this._handleTriggerClick.bind(this, element), {
      signal: state.controller.signal,
    });

    // Listen for modal events
    modalElement.addEventListener('modal:open', this._handleModalOpen.bind(this, element), {
      signal: state.controller.signal,
    });

    modalElement.addEventListener('modal:close', this._handleModalClose.bind(this, element), {
      signal: state.controller.signal,
    });

    // Set up ARIA attributes
    element.setAttribute('aria-haspopup', 'dialog');
    element.setAttribute('aria-expanded', 'false');
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', target.replace('#', ''));
    }

    this.logger?.info('Modal trigger initialized', {
      element,
      target,
      size,
      closable,
    });

    return state;
  }

  /**
   * Open a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Close other modals if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherModals(state.modalElement);
    }

    // Store the trigger element for focus restoration
    state.modalElement._triggerElement = triggerElement;

    // Open the modal - wait for custom element to be defined if needed
    if (typeof state.modalElement.open === 'function') {
      state.modalElement.open();
    } else {
      // Fallback: wait for custom element to be fully defined
      customElements.whenDefined('p-modal').then(() => {
        if (typeof state.modalElement.open === 'function') {
          state.modalElement.open();
        } else {
          this.logger?.error('PModal open method not available', state.modalElement);
        }
      });
    }
  }

  /**
   * Close a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  close(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (typeof state.modalElement.close === 'function') {
      state.modalElement.close();
    } else {
      this.logger?.error('PModal close method not available', state.modalElement);
    }
  }

  /**
   * Toggle a modal
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(triggerElement, force) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (force === true) {
      this.open(triggerElement);
    } else if (force === false) {
      this.close(triggerElement);
    } else {
      if (state.modalElement.hasAttribute('open')) {
        this.close(triggerElement);
      } else {
        this.open(triggerElement);
      }
    }
  }

  /**
   * Check if a modal is open
   * @param {HTMLElement} triggerElement - Trigger element
   * @returns {boolean} Whether modal is open
   */
  isOpen(triggerElement) {
    const state = this.getState(triggerElement);
    return state?.modalElement?.hasAttribute('open') || false;
  }

  /**
   * Configure modal element with data attributes
   * @private
   * @param {PModal} modalElement - Modal element
   * @param {Object} config - Configuration object
   */
  _configureModal(modalElement, config) {
    if (config.size) {
      modalElement.setAttribute('data-modal-size', config.size);
    }

    if (config.closable !== undefined) {
      modalElement.setAttribute('data-modal-closable', String(config.closable));
    }

    if (config.backdropClose !== undefined) {
      modalElement.setAttribute('data-modal-backdrop-close', String(config.backdropClose));
    }

    if (config.keyboard !== undefined) {
      modalElement.setAttribute('data-modal-keyboard', String(config.keyboard));
    }
  }

  /**
   * Handle trigger click
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Event} event - Click event
   */
  _handleTriggerClick(triggerElement, event) {
    event.preventDefault();
    this.open(triggerElement);
  }

  /**
   * Handle modal open event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal open event
   */
  _handleModalOpen(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'true');

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal opened', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Handle modal close event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal close event
   */
  _handleModalClose(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'false');

    // Restore focus to trigger
    const state = this.getState(triggerElement);
    if (state?.focus && event.detail.modal._triggerElement) {
      requestAnimationFrame(() => {
        event.detail.modal._triggerElement.focus();
      });
    }

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal closed', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Close other open modals
   * @private
   * @param {PModal} currentModal - Current modal to keep open
   */
  _closeOtherModals(currentModal) {
    const openModals = document.querySelectorAll('p-modal[open]');
    openModals.forEach(modal => {
      if (modal !== currentModal) {
        modal.close();
      }
    });
  }

  /**
   * Update modal configuration
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Object} newConfig - New configuration
   */
  updateConfig(triggerElement, newConfig) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Update state
    Object.assign(state, newConfig);

    // Update modal element
    this._configureModal(state.modalElement, newConfig);

    this.logger?.info('Modal configuration updated', { triggerElement, newConfig });
  }

  /**
   * Static method to enhance all modal triggers on the page
   * @param {string} [selector='[data-modal][data-modal-target]'] - CSS selector
   * @param {Object} [options] - Component options
   * @returns {Modal} Modal instance
   */
  static enhanceAll(selector = '[data-modal][data-modal-target]', options) {
    const instance = new Modal(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }

  /**
   * Static method to create a modal programmatically
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string} config.content - Modal content (HTML)
   * @param {Array} [config.actions] - Action buttons
   * @param {string} [config.size] - Modal size
   * @param {Object} [config.options] - Additional options
   * @returns {Promise<PModal>} Modal element
   */
  static async create({ title, content, actions = [], size = 'medium', options = {} }) {
    // Create modal element
    const modal = document.createElement('p-modal');
    modal.id = generateId('modal');

    // Configure attributes
    modal.setAttribute('data-modal-size', size);
    Object.entries(options).forEach(([key, value]) => {
      modal.setAttribute(`data-modal-${key}`, String(value));
    });

    // Create title
    if (title) {
      const titleElement = createElement('h2', { slot: 'title' }, title);
      modal.appendChild(titleElement);
    }

    // Create content
    if (content) {
      const contentElement = document.createElement('div');
      contentElement.innerHTML = content;
      modal.appendChild(contentElement);
    }

    // Create actions
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.slot = 'actions';

      actions.forEach(action => {
        const button = createElement(
          'button',
          {
            className: `btn btn--${action.type || 'secondary'}`,
            'data-modal-close': action.close !== false ? '' : undefined,
          },
          action.label
        );

        if (action.onClick) {
          button.addEventListener('click', action.onClick);
        }

        actionsContainer.appendChild(button);
      });

      modal.appendChild(actionsContainer);
    }

    // Append to document
    document.body.appendChild(modal);
  }
}

export { Modal as default };
