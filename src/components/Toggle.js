import { BaseComponent } from '../core/BaseComponent.js';
import { ExtendedStates } from '../core/ComponentStates.js';
import { whenAnimationsFinish } from '../utils/motion.js';

const deepActiveElement = () => {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
};

/** Elements that may use Escape themselves, so a toggle outside them leaves it alone */
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, dialog, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/** Whether a node sits inside a container, following shadow roots out to their hosts */
const containsComposed = (container, node) => {
  for (let current = node; current; current = current.parentNode ?? current.host) {
    if (current === container) return true;
  }
  return false;
};

/**
 * Toggle - show and hide a target element from one or more trigger buttons
 *
 * This is the disclosure pattern: triggers get `aria-expanded` and an `aria-controls` link to the
 * target, which is given an id when it has none. The target's state is written to
 * `data-toggle-state` (closed, opening, open or closing) and it has the `open` class while open. The
 * shipped stylesheet hides closed targets and animates the change, and Toggle waits for those
 * animations instead of a fixed delay, so the duration lives only in CSS.
 *
 * Toggles are independent unless they share a `data-toggle-group`, in which case opening one closes
 * the others in the group. A capture toggle, such as a dropdown, also closes when the user clicks or
 * moves focus outside it. Escape closes the open toggle that holds focus and returns focus to its
 * trigger; when focus rests on the page instead, as it does in Safari after clicking a button, Escape
 * closes the toggle opened last. Following a page link inside an open target closes it. Manual targets only close from
 * a trigger or their group.
 *
 * For new dropdowns consider `<button popovertarget>` with `popover`, and for accordions
 * `<details name="…">`; both work without JavaScript.
 *
 * @example
 * <button data-toggle data-toggle-target="#site-menu">Menu</button>
 * <nav id="site-menu">
 *   <a href="/pricing">Pricing</a>
 * </nav>
 *
 * <!-- Dropdown that closes on an outside click or when focus leaves it -->
 * <button data-toggle data-toggle-target="#account-menu" data-toggle-capture>Account</button>
 * <div id="account-menu">…</div>
 *
 * <!-- Accordion with one answer open at a time -->
 * <button data-toggle data-toggle-target="#refunds" data-toggle-group="faq">Refunds</button>
 * <div id="refunds">…</div>
 * <button data-toggle data-toggle-target="#delivery" data-toggle-group="faq">Delivery</button>
 * <div id="delivery">…</div>
 *
 * @attributes
 * - data-toggle: on the trigger
 * - data-toggle-target: selector for the element the trigger shows and hides
 * - data-toggle-group: toggles that share a group name close each other
 * - data-toggle-capture: close on a click or focus outside the trigger and target (default false)
 * - data-toggle-close-navigation: close when a page link inside the target is followed (default true)
 * - data-toggle-close-escape: close with Escape while focus is in the trigger or target, or rests on
 *   the page (default true)
 * - data-toggle-manual: on the trigger or target, close only from a trigger or group (default false)
 * - data-toggle-animate: "false" switches state without waiting for animations (default true)
 * - data-toggle-state: set on the target to closed, opening, open or closing
 *
 * @events
 * - toggle:show: dispatched on the trigger with `{ target, trigger }`
 * - toggle:hide: dispatched on the trigger with `{ target, trigger }`
 *
 * @cssprop --toggle-transition-duration - length of the open and close animations (default 0.75s)
 * @cssprop --toggle-transition-easing - easing of the open and close animations
 */
export default class Toggle extends BaseComponent {
  static selector = 'data-toggle';

  static get defaults() {
    return {
      openClass: 'open',
      capture: false,
      manual: false,
      animateToggle: true,
      closeOnEscape: true,
      closeOnNavigation: true,
    };
  }

  constructor(options = {}) {
    super(options);

    /** Open targets in the order they opened, each with the trigger that opened it */
    this._open = new Map();

    /** A token per target, replaced by each transition so an older one cannot finish it */
    this._transitions = new WeakMap();

    this._documentListeners = null;
  }

  _init(element) {
    const state = super._init(element);

    const targetSelector = this.getAttr(element, 'target');
    if (!targetSelector) {
      this.logger?.warn('Toggle: No data-toggle-target attribute found', element);
      return state;
    }

    let target = null;
    try {
      target = document.querySelector(targetSelector);
    } catch {
      target = null;
    }
    if (!target) {
      this.logger?.warn('Toggle: Target element not found', { selector: targetSelector, element });
      return state;
    }

    state.target = target;
    state.targetSelector = targetSelector;
    state.group = this.getAttr(element, 'group');
    state.capture = this.getBoolAttr(element, 'capture', Toggle.defaults.capture);
    state.manual =
      this.getBoolAttr(target, 'manual', false) ||
      this.getBoolAttr(element, 'manual', Toggle.defaults.manual);
    state.animateToggle = this.getBoolAttr(element, 'animate', Toggle.defaults.animateToggle);
    state.closeOnNavigation = this.getBoolAttr(
      element,
      'close-navigation',
      Toggle.defaults.closeOnNavigation
    );
    state.closeOnEscape = this.getBoolAttr(element, 'close-escape', Toggle.defaults.closeOnEscape);

    const isOpen = this._open.has(target) || target.classList.contains(Toggle.defaults.openClass);
    if (isOpen && !this._open.has(target)) {
      this._open.set(target, element);
    }
    state.isOpen = isOpen;

    const firstTrigger = !this._triggersFor(target).some(trigger => trigger !== element);
    if (firstTrigger) {
      this._setTargetState(target, isOpen ? ExtendedStates.OPEN : ExtendedStates.CLOSED);
    }

    if (!target.id) {
      target.id = this._generateId('toggle-target');
    }
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', target.id);
    }
    element.setAttribute('aria-expanded', String(isOpen));
    element.setAttribute('data-toggle-enhanced', 'true');

    element.addEventListener(
      'click',
      event => {
        event.preventDefault();
        this.toggle(element);
      },
      { signal: state.controller.signal }
    );

    this._listenToDocument();

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      if (this._open.get(target) === element) {
        const other = this._triggersFor(target).find(trigger => trigger !== element);
        if (other) {
          this._open.set(target, other);
        } else {
          this._open.delete(target);
        }
      }
      element.removeAttribute('data-toggle-enhanced');
      baseCleanup();
    };

    this.eventBus?.emit('toggle:mount', {
      element,
      target,
      isOpen,
      timestamp: performance.now(),
    });

    return state;
  }

  /**
   * Listen once, at the document, for the clicks, keys and focus changes that close toggles
   */
  _listenToDocument() {
    if (this._documentListeners) return;

    this._documentListeners = new AbortController();
    const { signal } = this._documentListeners;

    document.addEventListener('click', event => this._onDocumentClick(event), {
      capture: true,
      signal,
    });
    document.addEventListener('keydown', event => this._onKeydown(event), { signal });
    document.addEventListener('focusout', event => this._onFocusOut(event), { signal });
  }

  _triggersFor(target) {
    return this.trackedElements().filter(trigger => this.getState(trigger)?.target === target);
  }

  _touches(target, path) {
    return (
      path.includes(target) || this._triggersFor(target).some(trigger => path.includes(trigger))
    );
  }

  /**
   * Close capture toggles on a click outside them, and any toggle when a page link inside it is
   * followed
   */
  _onDocumentClick(event) {
    const path = event.composedPath();

    for (const [target, opener] of [...this._open]) {
      const state = this.getState(opener);
      if (!state || state.manual) continue;

      if (path.includes(target)) {
        if (state.closeOnNavigation && this._isNavigationLink(path)) {
          this.hide(opener, { returnFocus: false });
        }
      } else if (state.capture && !this._touches(target, path)) {
        this.hide(opener, { returnFocus: false });
      }
    }
  }

  /**
   * Close the most recently opened toggle that holds focus, unless something else handled Escape
   *
   * When focus rests on the page rather than a control, the most recently opened toggle closes
   * instead, since Safari doesn't focus a button when it is clicked.
   */
  _onKeydown(event) {
    if (event.key !== 'Escape' || event.defaultPrevented) return;

    const path = event.composedPath();
    const closable = [...this._open].reverse().filter(([, opener]) => {
      const state = this.getState(opener);
      return state && !state.manual && state.closeOnEscape;
    });

    const holdingFocus = closable.find(([target]) => this._touches(target, path));
    const [target, opener] = holdingFocus ?? (this._focusRests() ? (closable[0] ?? []) : []);
    if (!opener) return;

    event.preventDefault();
    this.hide(opener, { returnFocus: !holdingFocus || path.includes(target) });
  }

  /**
   * Whether focus is on the page itself rather than on something that may use Escape
   */
  _focusRests() {
    const active = deepActiveElement();
    return !active || active === document.body || !active.matches(INTERACTIVE);
  }

  /**
   * Close capture toggles when focus moves from inside them to somewhere outside
   */
  _onFocusOut(event) {
    const next = event.relatedTarget;
    if (!next) return;

    const path = event.composedPath();
    for (const [target, opener] of [...this._open]) {
      const state = this.getState(opener);
      if (!state || state.manual || !state.capture || !this._touches(target, path)) continue;

      const stays =
        containsComposed(target, next) ||
        this._triggersFor(target).some(trigger => containsComposed(trigger, next));
      if (!stays) {
        this.hide(opener, { returnFocus: false });
      }
    }
  }

  /**
   * Toggle the open/closed state
   * @param {HTMLElement} element - Trigger element
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state?.target) return;

    if (this._isTargetOpen(state.target)) {
      this.hide(element);
    } else {
      this.show(element);
    }
  }

  /**
   * Show/open the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  show(element) {
    const state = this.getState(element);
    if (!state?.target || this._isTargetOpen(state.target)) return;

    const { target } = state;
    if (state.group) {
      this._closeGroup(state.group, target);
    }

    this._open.delete(target);
    this._open.set(target, element);
    this._syncTriggers(target, true);
    target.classList.add(Toggle.defaults.openClass);
    this._transition(target, state, ExtendedStates.OPENING, ExtendedStates.OPEN);

    this._dispatch(element, 'toggle:show', {
      target,
      trigger: element,
      timestamp: performance.now(),
    });
  }

  /**
   * Hide/close the toggle target
   *
   * @param {HTMLElement} element - Trigger element
   * @param {Object} [options]
   * @param {boolean} [options.returnFocus=true] Move focus to the trigger when it was inside the
   *   target, so it isn't lost when the target is hidden
   */
  hide(element, { returnFocus = true } = {}) {
    const state = this.getState(element);
    if (!state?.target || !this._isTargetOpen(state.target)) return;

    const { target } = state;
    if (returnFocus && containsComposed(target, deepActiveElement())) {
      const opener = this._open.get(target) ?? element;
      const trigger = [opener, ...this._triggersFor(target)].find(
        candidate => candidate.isConnected && !containsComposed(target, candidate)
      );
      trigger?.focus({ preventScroll: true });
    }

    this._open.delete(target);
    this._syncTriggers(target, false);
    target.classList.remove(Toggle.defaults.openClass);
    this._transition(target, state, ExtendedStates.CLOSING, ExtendedStates.CLOSED);

    this._dispatch(element, 'toggle:hide', {
      target,
      trigger: element,
      timestamp: performance.now(),
    });
  }

  /**
   * Hide all non-manual toggles
   */
  hideAll() {
    for (const [, opener] of [...this._open]) {
      const state = this.getState(opener);
      if (state && !state.manual) {
        this.hide(opener, { returnFocus: false });
      }
    }
  }

  /**
   * Check if a toggle is currently open
   * @param {HTMLElement} element - Trigger element
   * @returns {boolean} Whether the toggle is open
   */
  isOpen(element) {
    const state = this.getState(element);
    return state?.target ? this._isTargetOpen(state.target) : false;
  }

  _isTargetOpen(target) {
    const value = this._getTargetState(target);
    return value === ExtendedStates.OPEN || value === ExtendedStates.OPENING;
  }

  _closeGroup(group, except) {
    for (const [target, opener] of [...this._open]) {
      if (target !== except && this.getState(opener)?.group === group) {
        this.hide(opener, { returnFocus: false });
      }
    }
  }

  _syncTriggers(target, isOpen) {
    for (const trigger of this._triggersFor(target)) {
      trigger.setAttribute('aria-expanded', String(isOpen));
      this.getState(trigger).isOpen = isOpen;
    }
  }

  /**
   * Move a target into a transitional state, then into its final state once its animations finish
   *
   * A later transition on the same target replaces the token, so an earlier one never overwrites it.
   */
  _transition(target, state, during, after) {
    const token = {};
    this._transitions.set(target, token);

    if (!state.animateToggle) {
      this._setTargetState(target, after);
      return;
    }

    this._setTargetState(target, during);
    whenAnimationsFinish(target).then(() => {
      if (this._transitions.get(target) === token) {
        this._setTargetState(target, after);
      }
    });
  }

  /**
   * Record a target's open state in `data-toggle-state`
   *
   * A target that is not a toggle itself also gets the deprecated copy in `data-toggle-target`, which
   * stops in 0.6.0. On a toggle that attribute holds its own target selector, so it is left alone.
   */
  _setTargetState(target, value) {
    this.setAttr(target, 'state', value);
    if (!target.hasAttribute(this._getSelector())) {
      this.setAttr(target, 'target', value);
    }
  }

  _getTargetState(target) {
    return this.getAttr(target, 'state') ?? this.getAttr(target, 'target');
  }

  /**
   * Whether a click path went through a link that leaves the current view
   */
  _isNavigationLink(path) {
    const link = path.find(node => node.localName === 'a' && node.hasAttribute('href'));
    if (!link) return false;

    const href = link.getAttribute('href');
    return (
      !href.startsWith('#') &&
      !href.startsWith('javascript:') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('tel:') &&
      !link.hasAttribute('download') &&
      link.getAttribute('target') !== '_blank'
    );
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const states = this.trackedElements()
      .map(trigger => this.getState(trigger))
      .filter(state => state?.target);

    return {
      totalTriggers: states.length,
      openCount: states.filter(state => this._isTargetOpen(state.target)).length,
      captureCount: states.filter(state => state.capture).length,
      manualCount: states.filter(state => state.manual).length,
      defaults: Toggle.defaults,
    };
  }

  destroy() {
    super.destroy();
    this._documentListeners?.abort();
    this._documentListeners = null;
    this._open.clear();
  }

  /**
   * Enhance all toggle triggers on the page
   * @param {string} selector - CSS selector for toggle triggers
   * @param {Object} options - Component options
   * @returns {Toggle} Component instance
   */
  static enhanceAll(selector = '[data-toggle]', options) {
    const instance = new Toggle(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
