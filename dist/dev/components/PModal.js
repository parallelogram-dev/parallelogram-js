var css_248z = "[hidden]{display:none!important}:host{--modal-text:currentColor;--modal-muted:rgba(0,0,0,.5);--modal-accent:#3b82f6;--modal-hover:rgba(0,0,0,.05);--modal-backdrop-bg:rgba(0,0,0,.45);--modal-panel-bg:#fff;--modal-panel-color:#1f2937;--modal-panel-border:rgba(0,0,0,.1);--modal-header-bg:#fff;--modal-header-border:rgba(0,0,0,.1);--modal-footer-bg:#fff;--modal-footer-border:rgba(0,0,0,.1);--modal-close-hover-bg:rgba(0,0,0,.08);--modal-btn-primary-bg:#3b82f6;--modal-btn-primary-color:#fff;--modal-btn-primary-hover-bg:#2563eb;--modal-btn-danger-bg:#dc2626;--modal-btn-danger-color:#fff;--modal-btn-danger-hover-bg:#b91c1c;--modal-btn-bg:#f3f4f6;--modal-btn-color:#1f2937;--modal-btn-hover-bg:#e5e7eb;--modal-placeholder-opacity:0.6;--modal-disabled-opacity:0.5;--modal-space-xs:0.125em;--modal-space-sm:0.25em;--modal-space-md:0.5em;--modal-space-lg:0.75em;--modal-space-xl:1em;--modal-padding-x:0.875em;--modal-padding-y:0.75em;--modal-gap:0.5em;--modal-radius:0.5em;--modal-radius-lg:0.625em;--modal-radius-xl:1em;--modal-border-width:1px;--modal-shadow-color:rgba(0,0,0,.5);--modal-shadow:0 1.25em 3.75em var(--modal-shadow-color);--modal-transition:0.2s ease;--modal-animation-duration:0.2s;--modal-animation-easing:ease-out;--modal-size-xs:18.75em;--modal-size-sm:25em;--modal-size-md:40em;--modal-size-lg:50em;--modal-size-xl:62.5em;--modal-max-width:92vw;--modal-max-height:86vh;--modal-fullscreen-inset:3em;--modal-close-size:1.75em;--modal-font-sm:0.875em;--modal-font-md:1.125em;--modal-btn-min-height:3.125em;box-sizing:border-box}.modal__panel{border:var(--modal-border-width) solid var(--modal-panel-border)}.modal__close,.modal__panel,::slotted(.btn){border-radius:var(--modal-radius-lg)}.modal__close,.modal__footer,.modal__header{align-items:center;display:flex}@media (prefers-reduced-motion:no-preference){.modal__backdrop{transition:opacity var(--modal-transition)}.modal__panel{transition:opacity var(--modal-transition),transform var(--modal-transition)}.modal__close{transition:background-color var(--modal-transition)}::slotted(.btn){transition:background-color var(--modal-transition),color var(--modal-transition),transform var(--modal-transition)}}:host{display:none}:host([open]){animation:modal-fade-in var(--modal-animation-duration) var(--modal-animation-easing);display:block;inset:0;position:fixed;z-index:9999}.modal__backdrop{animation:modal-backdrop-in var(--modal-animation-duration) var(--modal-animation-easing);background:var(--modal-backdrop-bg);inset:0;position:absolute}.modal__panel{animation:modal-panel-in var(--modal-animation-duration) var(--modal-animation-easing);background:var(--modal-panel-bg);box-shadow:var(--modal-shadow);color:var(--modal-panel-color);display:flex;flex-direction:column;left:50%;max-height:var(--modal-max-height);max-width:var(--modal-max-width);min-width:min(var(--modal-max-width),var(--modal-size-md));position:absolute;top:50%;transform:translate(-50%,-50%)}:host([data-modal-size=xs]) .modal__panel{min-width:min(var(--modal-max-width),var(--modal-size-xs))}:host([data-modal-size=sm]) .modal__panel{min-width:min(var(--modal-max-width),var(--modal-size-sm))}:host([data-modal-size=lg]) .modal__panel{min-width:min(var(--modal-max-width),var(--modal-size-lg))}:host([data-modal-size=xl]) .modal__panel{min-width:min(var(--modal-max-width),var(--modal-size-xl))}:host([data-modal-size=fullscreen]) .modal__panel{border-radius:var(--modal-radius-xl);height:calc(100vh - var(--modal-fullscreen-inset)*2);left:50%;max-height:calc(100vh - var(--modal-fullscreen-inset)*2);max-width:calc(100vw - var(--modal-fullscreen-inset)*2);top:50%;transform:translate(-50%,-50%);width:calc(100vw - var(--modal-fullscreen-inset)*2)}.modal__header{background:var(--modal-header-bg);border-bottom:var(--modal-border-width) solid var(--modal-panel-border);border-radius:var(--modal-radius) var(--modal-radius) 0 0;flex-shrink:0;gap:var(--modal-gap);padding:var(--modal-padding-y) var(--modal-padding-x)}.modal__header h2{font-size:var(--modal-font-md);font-weight:600;line-height:1.3;margin:0}.modal__spacer{flex:1}.modal__close{all:unset;align-items:center;border-radius:var(--modal-radius);cursor:pointer;display:inline-flex;font-size:var(--modal-font-md);font-weight:700;height:var(--modal-close-size);justify-content:center;width:var(--modal-close-size)}.modal__close:hover{background:var(--modal-close-hover-bg)}.modal__close:focus-visible{outline:2px solid currentColor;outline-offset:2px}.modal__content{flex:1 1 auto;overflow-x:hidden;overflow-y:auto;padding:var(--modal-padding-x);position:relative}.modal__footer{background:var(--modal-footer-bg);border-radius:0 0 var(--modal-radius) var(--modal-radius);border-top:var(--modal-border-width) solid var(--modal-panel-border);flex-shrink:0;gap:var(--modal-gap);justify-content:flex-end;padding:var(--modal-padding-y) var(--modal-padding-x)}::slotted(.btn){appearance:none;background:var(--modal-btn-bg);border:0;border-radius:var(--modal-radius-lg);color:var(--modal-btn-color);cursor:pointer;font-size:var(--modal-font-sm);font-weight:500;min-height:var(--modal-btn-min-height);padding:var(--modal-space-lg) var(--modal-padding-x);transition:all var(--modal-transition)}::slotted(.btn:hover){background:var(--modal-btn-hover-bg)}::slotted(.btn--primary){background:var(--modal-btn-primary-bg);color:var(--modal-btn-primary-color);font-weight:700}::slotted(.btn--primary:hover){background:var(--modal-btn-primary-hover-bg)}::slotted(.btn--danger){background:var(--modal-btn-danger-bg);color:var(--modal-btn-danger-color)}::slotted(.btn--danger:hover){background:var(--modal-btn-danger-hover-bg)}::slotted(.btn:disabled){cursor:not-allowed;opacity:var(--modal-disabled-opacity)}@keyframes modal-fade-in{0%{opacity:0}to{opacity:1}}@keyframes modal-backdrop-in{0%{opacity:0}to{opacity:1}}@keyframes modal-panel-in{0%{opacity:0;transform:translate(-50%,-50%) scale(.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}@media (prefers-reduced-motion:reduce){.modal__backdrop,.modal__close,.modal__panel,::slotted(.btn),:host([open]){animation:none;transition:none}}";

/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */


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
 * ComponentStates - Standard state values for component lifecycle
 *
 * These states are used in data attributes to track component initialization
 * and lifecycle. Each component uses its selector attribute (e.g., data-lazysrc)
 * to store its current state.
 *
 * @example
 * // Initial HTML
 * <img data-lazysrc data-lazysrc-src="/image.jpg">
 *
 * // After mounting
 * <img data-lazysrc="mounted" data-lazysrc-src="/image.jpg">
 *
 * // After loading
 * <img data-lazysrc="loaded" data-lazysrc-src="/image.jpg" src="/image.jpg">
 *
 * @example
 * // CSS Hooks
 * [data-lazysrc="loading"] { opacity: 0.5; }
 * [data-lazysrc="loaded"] { opacity: 1; }
 * [data-lazysrc="error"] { border: 2px solid red; }
 */


/**
 * Extended states for specific component behaviors
 * Components can use these in addition to core states
 */
const ExtendedStates = {
  // Interactive states (for Toggle, Modal, etc.)
  OPEN: 'open',
  CLOSED: 'closed',
  OPENING: 'opening',
  CLOSING: 'closing'};

class PModal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'data-modal-size', 'data-modal-closable'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    // Use BEM-style CSS with CSS custom properties for theming
    root.innerHTML = `
      <style>${css_248z}</style>

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

export { PModal as default };
