import styles from '../styles/framework/components/PModal.scss';
import { iconMarkup, x } from '../utils/icons.js';
import { deepActiveElement, getFocusableElements } from '../utils/dom-utils.js';
import { whenAnimationsFinish } from '../utils/motion.js';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';
import { followFocusSource } from '../utils/focus-source.js';
import { text } from '../utils/text.js';

/** Modals that are open, most recently opened last, shared by every p-modal on the page */
const openModals = [];

/** Page overflow to put back once the last modal closes */
let lockedOverflow = null;

/**
 * PModal - modal dialog web component built on the native `<dialog>` element
 *
 * Opening calls `showModal()`, so the dialog renders in the top layer, the rest of the page is inert
 * and focus stays inside it. The dialog is named after its title slot. Escape and the backdrop close
 * it unless its settings say otherwise, focus returns to the element that had it before opening once
 * no other modal is still open, and page scroll stays locked while any modal is open.
 *
 * @example
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal" data-modal-size="md">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * @attributes
 * - open: present while the modal is open; set or remove it, or call open() and close()
 * - data-modal-size: xs | sm | md (default) | lg | xl | fullscreen
 * - data-modal-closable: "false" hides the close button and ignores Escape and the backdrop;
 *   `[data-modal-close]` buttons still close the modal
 * - data-modal-backdrop-close: "false" keeps the modal open when the backdrop is clicked
 * - data-modal-keyboard: "false" ignores Escape
 * - data-modal-state: set by the component to closed, opening, open or closing
 *
 * @slots
 * - title: the title, which also names the dialog
 * - (default): the content
 * - secondary: a secondary action, held against the leading end of the footer, away from the rest
 * - actions: footer buttons; any element with `data-modal-close` closes the modal
 *
 * @events
 * Events bubble out of shadow roots.
 * - p-modal:open: dispatched when the modal opens, with `{ modal }`
 * - p-modal:close: dispatched once the modal has closed, with `{ modal }`
 *
 * @csspart panel - the `<dialog>`; style the dimmed page with `::part(panel)::backdrop`
 * @csspart header - the title row
 * @csspart title - the title container
 * @csspart close - the close button
 * @csspart content - the scrolling content area
 * @csspart footer - the actions row
 *
 * @cssprop --modal-animation-duration - length of the opening and closing animations (default 0.2s)
 * @cssprop --modal-backdrop-bg - colour of the page behind the modal (default the page surface at
 *   95%, `color-mix(in srgb, var(--color-surface) 95%, transparent)`)
 * @cssprop --modal-panel-bg, --modal-panel-color - panel background and text (defaults
 *   `var(--surface-dialog-color-bg)` and `var(--surface-dialog-color-text)`)
 */
export default class PModal extends HTMLElement {
  /** The text the modal shows: a site changes it here once, a page changes one with the attribute */
  static defaults = { closeLabel: 'Close' };

  static get observedAttributes() {
    return ['open', 'close-label'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    setStaticHTML(
      root,
      `
      <dialog class="modal__panel" data-modal-panel part="panel" tabindex="-1">
        <button type="button" class="modal__close" data-modal-close-btn aria-label="Close" part="close">${iconMarkup(x, { size: 'sm' })}</button>
        <header class="modal__header" data-modal-header part="header">
          <div class="modal__title" part="title"><slot name="title"></slot></div>
        </header>
        <section class="modal__content" data-modal-content part="content">
          <slot></slot>
        </section>
        <footer class="modal__footer" data-modal-footer part="footer">
          <div class="modal__actions"><slot name="secondary"></slot></div>
          <div class="modal__actions"><slot name="actions"></slot></div>
        </footer>
      </dialog>
    `
    );
    adoptStyles(root, styles);

    this._dialog = root.querySelector('dialog');
    this._closeButton = root.querySelector('[data-modal-close-btn]');
    this._titleSlot = root.querySelector('slot[name="title"]');
    this._actionsSlot = root.querySelector('slot[name="actions"]');
    this._secondarySlot = root.querySelector('slot[name="secondary"]');
    this._footer = root.querySelector('[data-modal-footer]');
    this._header = root.querySelector('[data-modal-header]');
    this._returnFocus = null;
    this._lastReturnFocus = null;
    this._pendingReturnFocus = undefined;
    this._closing = null;
  }

  connectedCallback() {
    followFocusSource(this);
    this._closeButton.setAttribute('aria-label', text(this, 'close-label'));
    /* Custom element constructors may not add attributes, so the initial state is set here */
    if (!this.hasAttribute('data-modal-state')) {
      this._setModalState('closed');
    }

    this._listeners = new AbortController();
    const { signal } = this._listeners;

    this._closeButton.addEventListener(
      'click',
      () => {
        if (this._isClosable()) this.close();
      },
      { signal }
    );

    this.addEventListener(
      'click',
      event => {
        /* A modal's own close buttons close it even when Escape and the backdrop can't */
        if (event.target.closest?.('[data-modal-close]')) {
          this.close();
        }
      },
      { signal }
    );

    this._dialog.addEventListener('click', event => this._onDialogClick(event), { signal });

    this._dialog.addEventListener(
      'cancel',
      event => {
        event.preventDefault();
        if (this._isKeyboardEnabled() && this._isClosable()) {
          this.close();
        }
      },
      { signal }
    );

    /* The browser can close a modal dialog itself without a cancel event, as Chromium does on a
       repeated Escape. A modal Escape can't close opens again; any other records that it closed. */
    this._dialog.addEventListener(
      'close',
      () => {
        if (!this.hasAttribute('open')) return;

        if (!this._closing && !(this._isKeyboardEnabled() && this._isClosable())) {
          this._dialog.showModal();
          this._focusInitial();
        } else {
          this.removeAttribute('open');
        }
      },
      { signal }
    );

    this._titleSlot.addEventListener(
      'slotchange',
      () => {
        this._updateName();
        this._updateHeader();
      },
      { signal }
    );
    this._actionsSlot.addEventListener('slotchange', () => this._updateFooter(), { signal });
    this._secondarySlot.addEventListener('slotchange', () => this._updateFooter(), { signal });
    this._updateName();
    this._updateHeader();
    this._updateFooter();

    this._upgradeOpenProperty();
    if (this.hasAttribute('open')) {
      this._onOpen();
    }
  }

  disconnectedCallback() {
    this._listeners?.abort();
    this._listeners = null;
    if (this._dialog.open) {
      this._dialog.close();
    }
    this._release();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (name === 'close-label') {
      this._closeButton.setAttribute('aria-label', text(this, 'close-label'));
      return;
    }

    if (newValue !== null) {
      this._onOpen();
    } else {
      this._onClose();
    }
  }

  /**
   * Record the modal's state in `data-modal-state`
   */
  _setModalState(value) {
    this.setAttribute('data-modal-state', value);
  }

  /**
   * Open the modal
   *
   * @param {Object} [options]
   * @param {HTMLElement|null} [options.returnFocus] Element to focus when the modal closes. Defaults
   *   to the element that had focus when it opened; null leaves focus alone.
   */
  open({ returnFocus } = {}) {
    if (returnFocus !== undefined) {
      this._pendingReturnFocus = returnFocus;
    }

    if (this._closing) {
      this._closing = null;
      this._setModalState('open');
      return;
    }

    this.setAttribute('open', '');
  }

  /**
   * Close the modal once its closing animation has finished
   */
  close() {
    if (!this.hasAttribute('open') || this._closing) return;

    if (!this._dialog.open) {
      this.removeAttribute('open');
      this._setModalState('closed');
      return;
    }

    const closing = {};
    this._closing = closing;
    this._setModalState('closing');

    whenAnimationsFinish(this._dialog).then(() => {
      if (this._closing === closing) {
        this.removeAttribute('open');
      }
    });
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

  _isClosable() {
    return this.getAttribute('data-modal-closable') !== 'false';
  }

  _isBackdropClosable() {
    return this._isClosable() && this.getAttribute('data-modal-backdrop-close') !== 'false';
  }

  _isKeyboardEnabled() {
    return this.getAttribute('data-modal-keyboard') !== 'false';
  }

  _onOpen() {
    if (this._dialog.open) return;

    this._returnFocus =
      this._pendingReturnFocus !== undefined ? this._pendingReturnFocus : deepActiveElement();
    this._pendingReturnFocus = undefined;
    this._closeButton.hidden = !this._isClosable();
    this._updateName();
    this._setModalState('opening');

    this._dialog.showModal();
    this._hold();
    this._focusInitial();

    dispatchComponentEvent(this, 'p-modal:open', { modal: this });

    whenAnimationsFinish(this._dialog).then(() => {
      if (this.hasAttribute('open') && !this._closing) {
        this._setModalState('open');
      }
    });
  }

  _onClose() {
    this._closing = null;
    if (this._dialog.open) {
      this._dialog.close();
    }
    this._setModalState('closed');

    const returnFocus = this._resolveReturnFocus(this._returnFocus);
    this._lastReturnFocus = this._returnFocus;
    this._returnFocus = null;
    const topModal = this._release();

    if (returnFocus?.isConnected && (!topModal || topModal._contains(returnFocus))) {
      returnFocus.focus({ preventScroll: true });
    } else if (topModal && !topModal._contains(deepActiveElement())) {
      topModal._focusInitial();
    }

    dispatchComponentEvent(this, 'p-modal:close', { modal: this });
  }

  /**
   * Close when the backdrop is clicked. Clicks on the backdrop target the dialog itself, outside its
   * box; keyboard activation (detail 0) never counts.
   */
  _onDialogClick(event) {
    if (event.target !== this._dialog || event.detail === 0 || !this._isBackdropClosable()) return;

    const box = this._dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) {
      this.close();
    }
  }

  /**
   * Focus the first `[autofocus]` or focusable element in the content, else the close button, else
   * the dialog
   */
  _focusInitial() {
    const target =
      this.querySelector('[autofocus]') ??
      getFocusableElements(this)[0] ??
      (this._closeButton.hidden ? this._dialog : this._closeButton);
    target.focus({ preventScroll: true });
  }

  /**
   * The element to return focus to: the one that opened this modal or, when that sits inside a modal
   * that has since closed, the element that modal returned focus to
   */
  _resolveReturnFocus(element) {
    const visited = new Set();
    let target = element;

    while (target && !visited.has(target)) {
      visited.add(target);
      const owner = target.closest?.('p-modal') ?? target.getRootNode?.().host;
      if (!(owner instanceof PModal) || owner === this || owner.hasAttribute('open')) {
        return target;
      }
      target = owner._lastReturnFocus;
    }

    return null;
  }

  _contains(element) {
    return Boolean(element) && (this.contains(element) || this.shadowRoot.contains(element));
  }

  /**
   * Name the dialog after the text of its title slot
   */
  _updateName() {
    const title = this._titleSlot
      .assignedNodes({ flatten: true })
      .map(node => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    this._dialog.setAttribute('aria-label', title || 'Dialog');
  }

  /**
   * Keep the header out of the dialog until the page slots a title into it
   *
   * The close button sits on the panel rather than in the header, so it is there either way.
   */
  _updateHeader() {
    this._header.hidden = this._titleSlot.assignedNodes().length === 0;
  }

  /**
   * Keep the footer out of the dialog until the page slots something into it
   */
  _updateFooter() {
    this._footer.hidden =
      this._actionsSlot.assignedNodes().length === 0 &&
      this._secondarySlot.assignedNodes().length === 0;
  }

  /**
   * Join the stack of open modals, locking page scroll for the first
   */
  _hold() {
    if (openModals.includes(this)) return;

    openModals.push(this);
    if (openModals.length === 1) {
      lockedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Leave the stack of open modals, unlocking page scroll after the last
   *
   * @returns {PModal|undefined} The modal now on top, if any
   */
  _release() {
    const index = openModals.indexOf(this);
    if (index !== -1) {
      openModals.splice(index, 1);
    }
    if (openModals.length === 0 && lockedOverflow !== null) {
      document.body.style.overflow = lockedOverflow;
      lockedOverflow = null;
    }
    return openModals.at(-1);
  }

  /**
   * Open the modal when `open` was set as a property before the element was defined, without
   * letting that property hide the open() method
   */
  _upgradeOpenProperty() {
    if (!Object.hasOwn(this, 'open')) return;

    const requested = this.open;
    delete this.open;
    if (requested && typeof requested !== 'function') {
      this.setAttribute('open', '');
    }
  }
}

if (!customElements.get('p-modal')) {
  customElements.define('p-modal', PModal);
}
