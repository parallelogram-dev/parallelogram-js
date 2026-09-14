import { BaseComponent } from '../core/BaseComponent.js';

/**
 * Scrollhide - hide an element while the page scrolls down and show it again on scrolling up
 *
 * The target gets the scrolled class while hidden, and the overlay class once the page has scrolled
 * past the overlay threshold. Both start from the scroll position the page already has when the
 * component mounts. Movements smaller than the tolerance are ignored, which avoids flicker from
 * elastic scrolling, and a hidden target is shown again when keyboard focus moves into it. One
 * passive scroll listener serves every element and updates once per frame.
 *
 * @example
 * <header data-scrollhide data-scrollhide-scroll-threshold="50" class="site-header">
 *   <nav>…</nav>
 * </header>
 *
 * import Scrollhide from '@parallelogram-js/core/components/Scrollhide';
 * Scrollhide.enhanceAll();
 *
 * @attributes
 * - data-scrollhide-target: selector for another element to hide (default the element itself)
 * - data-scrollhide-scroll-threshold: pixels scrolled before the target can hide (default 50)
 * - data-scrollhide-overlay-threshold: pixels scrolled before the overlay class is added (default 100)
 * - data-scrollhide-tolerance: smallest movement in pixels that hides or shows the target (default 5)
 * - data-scrollhide-scrolled-class, data-scrollhide-overlay-class: class names (default scrollhide and
 *   scrolloverlay)
 *
 * @events
 * - scrollhide:hidden, scrollhide:shown: with `{ target, scrollY, reason }`
 * - scrollhide:overlay-added, scrollhide:overlay-removed: with `{ target, scrollY }`
 */
export default class Scrollhide extends BaseComponent {
  static selector = 'data-scrollhide';

  static get defaults() {
    return {
      scrollThreshold: 50,
      overlayThreshold: 100,
      tolerance: 5,
      scrolledClass: 'scrollhide',
      overlayClass: 'scrolloverlay',
    };
  }

  constructor(options = {}) {
    super(options);
    this._scrollListener = null;
    this._frame = null;
  }

  _init(element) {
    const state = super._init(element);

    const targetSelector = this.getAttr(element, 'target');
    const target = targetSelector ? document.querySelector(targetSelector) : element;

    if (!target) {
      this.logger?.warn('Scrollhide: Target element not found', {
        selector: targetSelector,
        element,
      });
      return state;
    }

    const defaults = Scrollhide.defaults;
    Object.assign(state, {
      target,
      targetSelector,
      scrollThreshold: this.getNumberAttr(element, 'scroll-threshold', defaults.scrollThreshold),
      overlayThreshold: this.getNumberAttr(element, 'overlay-threshold', defaults.overlayThreshold),
      tolerance: this.getNumberAttr(element, 'tolerance', defaults.tolerance),
      scrolledClass: this.getAttr(element, 'scrolled-class', defaults.scrolledClass),
      overlayClass: this.getAttr(element, 'overlay-class', defaults.overlayClass),
      currentY: window.scrollY,
      lastY: window.scrollY,
    });

    this._applyOverlay(element, state, { emit: false });

    target.addEventListener('focusin', () => this._show(element, state, 'focus'), {
      signal: state.controller.signal,
    });

    element.setAttribute('data-scrollhide-enhanced', 'true');
    this._listen();

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      baseCleanup();
      target.classList.remove(state.scrolledClass, state.overlayClass);
      element.removeAttribute('data-scrollhide-enhanced');
      if (this.trackedElements().every(tracked => tracked === element)) {
        this._stopListening();
      }
    };

    this.eventBus?.emit('scrollhide:mount', {
      element,
      target,
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
      timestamp: performance.now(),
    });

    return state;
  }

  _listen() {
    if (this._scrollListener) return;

    this._scrollListener = new AbortController();
    window.addEventListener('scroll', () => this._requestUpdate(), {
      passive: true,
      signal: this._scrollListener.signal,
    });
  }

  _stopListening() {
    this._scrollListener?.abort();
    this._scrollListener = null;
    if (this._frame) {
      cancelAnimationFrame(this._frame);
      this._frame = null;
    }
  }

  /**
   * Update every element on the next frame, however many scroll events arrive before it
   */
  _requestUpdate() {
    if (this._frame) return;

    this._frame = requestAnimationFrame(() => {
      this._frame = null;
      const scrollY = window.scrollY;
      for (const element of this.trackedElements()) {
        const state = this.getState(element);
        if (state?.target) {
          this._onScroll(element, state, scrollY);
        }
      }
    });
  }

  _onScroll(element, state, scrollY) {
    state.currentY = scrollY;
    this._applyOverlay(element, state, { emit: true });

    if (scrollY <= 0) {
      this._show(element, state, 'top');
      state.lastY = scrollY;
      return;
    }

    /* Small movements add up until they pass the tolerance */
    const distance = scrollY - state.lastY;
    if (Math.abs(distance) < state.tolerance) return;

    const focusInside = state.target.contains(document.activeElement);
    if (distance > 0 && scrollY > state.scrollThreshold && !focusInside) {
      this._hide(element, state, 'scroll-down');
    } else if (distance < 0) {
      this._show(element, state, 'scroll-up');
    }
    state.lastY = scrollY;
  }

  _applyOverlay(element, state, { emit }) {
    const { target, currentY, overlayThreshold, overlayClass } = state;
    const active = currentY > overlayThreshold;
    if (active === target.classList.contains(overlayClass)) return;

    target.classList.toggle(overlayClass, active);
    if (emit) {
      this._emitStateChange(element, state, active ? 'overlay-added' : 'overlay-removed', {
        scrollY: currentY,
      });
    }
  }

  _hide(element, state, reason) {
    if (state.target.classList.contains(state.scrolledClass)) return;

    state.target.classList.add(state.scrolledClass);
    this._emitStateChange(element, state, 'hidden', { scrollY: state.currentY, reason });
  }

  _show(element, state, reason) {
    if (!state.target.classList.contains(state.scrolledClass)) return;

    state.target.classList.remove(state.scrolledClass);
    this._emitStateChange(element, state, 'shown', { scrollY: state.currentY, reason });
  }

  _emitStateChange(element, state, action, data) {
    this._dispatch(element, `scrollhide:${action}`, {
      target: state.target,
      timestamp: performance.now(),
      ...data,
    });
  }

  /**
   * Manually show the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  show(element) {
    const state = this.getState(element);
    if (state?.target) this._show(element, state, 'manual');
  }

  /**
   * Manually hide the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  hide(element) {
    const state = this.getState(element);
    if (state?.target) this._hide(element, state, 'manual');
  }

  /**
   * Toggle element visibility
   * @param {HTMLElement} element - Element with scrollhide
   */
  toggle(element) {
    if (this.isHidden(element)) {
      this.show(element);
    } else {
      this.hide(element);
    }
  }

  isHidden(element) {
    const state = this.getState(element);
    return state?.target ? state.target.classList.contains(state.scrolledClass) : false;
  }

  hasOverlay(element) {
    const state = this.getState(element);
    return state?.target ? state.target.classList.contains(state.overlayClass) : false;
  }

  getScrollPosition(element) {
    return this.getState(element)?.currentY ?? window.scrollY;
  }

  /**
   * Update thresholds dynamically
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} options - New threshold values
   * @param {number} [options.scrollThreshold] - New scroll threshold
   * @param {number} [options.overlayThreshold] - New overlay threshold
   */
  updateThresholds(element, { scrollThreshold, overlayThreshold }) {
    const state = this.getState(element);
    if (!state?.target) return;

    if (typeof scrollThreshold === 'number') {
      state.scrollThreshold = scrollThreshold;
    }
    if (typeof overlayThreshold === 'number') {
      state.overlayThreshold = overlayThreshold;
    }

    this._applyOverlay(element, state, { emit: true });
  }

  getStatus() {
    const elements = this.trackedElements().filter(element => this.getState(element)?.target);

    return {
      totalElements: elements.length,
      hiddenCount: elements.filter(element => this.isHidden(element)).length,
      overlayCount: elements.filter(element => this.hasOverlay(element)).length,
      currentScrollY: window.scrollY,
      defaults: Scrollhide.defaults,
    };
  }

  destroy() {
    super.destroy();
    this._stopListening();
  }

  static enhanceAll(selector = '[data-scrollhide]', options) {
    const instance = new Scrollhide(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
