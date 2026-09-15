import styles from '../styles/framework/components/PToasts.scss';
import { whenAnimationsFinish } from '../utils/motion.js';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';
import { getOpenModal } from '../utils/modal.js';

/** Alternative type names, normalised to the four styled types */
const TYPE_ALIASES = { warn: 'warning', danger: 'error' };

/** Types announced straight away rather than when the user is idle */
const ASSERTIVE_TYPES = new Set(['warning', 'error']);

const DEFAULT_TIMEOUT = 4000;

/** How long an announcement stays in its live region */
const ANNOUNCEMENT_LIFETIME = 5000;

/**
 * PToasts - a stack of toast notifications
 *
 * Toasts are announced through two live regions that exist from the moment the element is created:
 * info and success messages politely, warnings and errors straight away. Toasts close after a
 * timeout, except errors, which stay until dismissed, and every timer waits while the pointer or
 * keyboard focus is on the stack. Where popovers are supported the element shows itself as a manual
 * popover and moves to the top of the top layer with each new toast. Everything outside an open
 * modal dialog is inert, so while a `p-modal` or modal `<dialog>` is open the element moves inside
 * it to show a toast, and returns to its place when that modal closes.
 *
 * @example
 * <p-toasts placement="bottom-center"></p-toasts>
 *
 * document.querySelector('p-toasts').toast({ message: 'Booking saved', type: 'success' });
 *
 * @attributes
 * - placement: top-right (default), top-left, top-center, bottom-right, bottom-left or bottom-center
 *
 * @events
 * Events bubble out of shadow roots.
 * - p-toasts:show: with `{ id, type, message }`
 * - p-toasts:close: with `{ id, type, message }`
 * - toast:show, toast:close: the same events under their names before 0.5.0; deprecated, and no
 *   longer dispatched from 0.6.0
 *
 * @csspart stack - the element holding the toasts
 * @csspart toast - each toast
 * @csspart title - a toast's title
 * @csspart close - a toast's dismiss button
 *
 * @cssprop --toast-bg-info, --toast-bg-success, --toast-bg-warning, --toast-bg-error - backgrounds
 * @cssprop --toast-text-color - text colour
 * @cssprop --toast-border-radius, --toast-shadow - toast surface
 * @cssprop --toast-padding, --toast-gap, --toast-item-padding - spacing around and between toasts
 * @cssprop --toast-min-width, --toast-max-width - toast width limits
 * @cssprop --toast-font - toast font shorthand
 * @cssprop --toast-animation-duration - length of the enter and leave animations
 * @cssprop --toast-z-index - stacking order where popovers aren't supported
 */
export default class PToasts extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });

    setStaticHTML(
      root,
      `
      <div class="stack" part="stack"></div>
      <div class="live" role="status" aria-live="polite" aria-atomic="false"></div>
      <div class="live" role="alert" aria-live="assertive" aria-atomic="false"></div>
    `
    );
    adoptStyles(root, styles);

    this._stack = root.querySelector('.stack');
    this._politeRegion = root.querySelector('[role="status"]');
    this._assertiveRegion = root.querySelector('[role="alert"]');
    this._idCounter = 0;
    this._toasts = new Map();
    this._holds = new Set();
    this._modal = null;
    this._home = null;

    this._stack.addEventListener('pointerenter', () => this._hold('pointer'));
    this._stack.addEventListener('pointerleave', () => this._release('pointer'));
    this._stack.addEventListener('focusin', () => this._hold('focus'));
    this._stack.addEventListener('focusout', event => {
      if (!this._stack.contains(event.relatedTarget)) {
        this._release('focus');
      }
    });
  }

  connectedCallback() {
    if (typeof this.showPopover === 'function' && !this.hasAttribute('popover')) {
      this.setAttribute('popover', 'manual');
    }
    this._raise();
  }

  /**
   * Show a toast
   *
   * @param {Object} options
   * @param {string} options.message
   * @param {string} [options.type='info'] info, success, warning or error; warn and danger are
   *   aliases
   * @param {string} [options.title]
   * @param {number} [options.timeout] Milliseconds before the toast closes, or 0 to keep it until it
   *   is dismissed. Defaults to 4000, and to 0 for errors. `duration` is accepted as an alias.
   * @param {boolean} [options.dismissible=true] Whether the toast has a dismiss button
   * @param {boolean} [options.allowHTML=false] Treat the message as trusted HTML
   * @returns {Function} Closes the toast
   */
  toast(options = {}) {
    const { message = '', title = '', dismissible = true, allowHTML = false } = options;
    const type = TYPE_ALIASES[options.type] ?? options.type ?? 'info';
    const timeout = options.timeout ?? options.duration ?? (type === 'error' ? 0 : DEFAULT_TIMEOUT);
    const id = ++this._idCounter;
    this._followModal();

    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.setAttribute('part', 'toast');

    const body = document.createElement('div');
    body.className = 'body';
    if (title) {
      const heading = document.createElement('strong');
      heading.className = 'title';
      heading.setAttribute('part', 'title');
      heading.textContent = title;
      body.append(heading);
    }

    const messageElement = document.createElement('span');
    messageElement.className = 'msg';
    if (allowHTML) {
      messageElement.innerHTML = message;
    } else {
      messageElement.textContent = message;
    }
    body.append(messageElement);

    const row = document.createElement('div');
    row.className = 'row';
    row.append(body);
    element.append(row);

    const entry = { element, type, message, timeout, remaining: timeout, started: 0, timer: null };
    entry.dismiss = () => this._dismiss(id);

    if (dismissible) {
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'btn close';
      closeButton.setAttribute('part', 'close');
      closeButton.setAttribute('aria-label', 'Dismiss notification');
      closeButton.textContent = '×';
      closeButton.addEventListener('click', entry.dismiss);
      row.append(closeButton);
    }

    this._stack.append(element);
    this._toasts.set(id, entry);
    this._raise();
    this._startTimer(entry);

    const spoken = title ? `${title}: ${messageElement.textContent}` : messageElement.textContent;
    this._announce(spoken, ASSERTIVE_TYPES.has(type));

    dispatchComponentEvent(this, 'p-toasts:show', { id, type, message }, { legacy: 'toast:show' });

    return entry.dismiss;
  }

  _dismiss(id) {
    const entry = this._toasts.get(id);
    if (!entry) return;

    clearTimeout(entry.timer);
    this._toasts.delete(id);
    entry.element.setAttribute('data-state', 'leaving');
    whenAnimationsFinish(entry.element).then(() => entry.element.remove());

    dispatchComponentEvent(
      this,
      'p-toasts:close',
      { id, type: entry.type, message: entry.message },
      { legacy: 'toast:close' }
    );
  }

  _startTimer(entry) {
    if (entry.timeout <= 0 || entry.timer || this._holds.size > 0) return;

    entry.started = performance.now();
    entry.timer = setTimeout(entry.dismiss, entry.remaining);
  }

  /**
   * Stop every timer while something needs the toasts to stay, remembering the time left
   */
  _hold(reason) {
    if (this._holds.size === 0) {
      for (const entry of this._toasts.values()) {
        if (!entry.timer) continue;
        clearTimeout(entry.timer);
        entry.timer = null;
        entry.remaining = Math.max(1, entry.remaining - (performance.now() - entry.started));
      }
    }
    this._holds.add(reason);
  }

  _release(reason) {
    if (!this._holds.delete(reason) || this._holds.size > 0) return;

    for (const entry of this._toasts.values()) {
      this._startTimer(entry);
    }
  }

  /**
   * Add a message to a live region on the next frame, so it is announced as a new addition
   */
  _announce(text, assertive) {
    const region = assertive ? this._assertiveRegion : this._politeRegion;
    const announcement = document.createElement('p');

    requestAnimationFrame(() => {
      announcement.textContent = text;
      region.append(announcement);
      setTimeout(() => announcement.remove(), ANNOUNCEMENT_LIFETIME);
    });
  }

  /**
   * Move inside the most recently opened modal, where the toasts can be announced and dismissed
   */
  _followModal() {
    const modal = getOpenModal();
    if (!modal || modal === this._modal || modal.contains(this)) return;

    if (!this._modal) {
      this._home = { parent: this.parentNode, next: this.nextSibling };
    }
    this._modal = modal;
    modal.append(this);
    modal.addEventListener(
      modal.localName === 'p-modal' ? 'p-modal:close' : 'close',
      () => this._goHome(modal),
      {
        once: true,
      }
    );
  }

  /**
   * Return to where the element was before it followed a modal
   */
  _goHome(modal) {
    if (this._modal !== modal) return;

    const { parent, next } = this._home;
    this._modal = null;
    this._home = null;
    if (parent?.isConnected) {
      parent.insertBefore(this, next?.parentNode === parent ? next : null);
    } else {
      document.body.append(this);
    }
  }

  /**
   * Move the element to the top of the top layer, above any dialog opened since it last showed
   */
  _raise() {
    if (!this.isConnected || this.getAttribute('popover') !== 'manual') return;

    if (this.matches(':popover-open')) {
      this.hidePopover();
    }
    this.showPopover();
  }
}

if (!customElements.get('p-toasts')) {
  customElements.define('p-toasts', PToasts);
}
