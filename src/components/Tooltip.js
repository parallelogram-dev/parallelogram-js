import { BaseComponent } from '../core/BaseComponent.js';
import { whenAnimationsFinish } from '../utils/motion.js';
import { placeBeside } from '../utils/position.js';

const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
/** Room to leave between a tooltip and the edge of the viewport */
const MARGIN = 8;

/**
 * Tooltip - a short description of a control, shown beside it while the pointer rests on it or it
 * has keyboard focus
 *
 * The tooltip is the text of `data-tooltip`, or the content of the element `data-tooltip-target`
 * names when the text is empty. It appears after a short delay under the pointer and at once on
 * focus, and goes when the pointer leaves, focus moves, the control is pressed or Escape is
 * pressed. It is a description rather than a name, linked from the control by `aria-describedby`
 * while shown. It sits on the side asked for and flips when there is no room; the triangle keeps
 * pointing at the control. Touch gets nothing: a tooltip under a finger has nowhere to be.
 *
 * @example
 * <button type="button" data-tooltip="Copies the booking reference">Copy reference</button>
 *
 * @example
 * <button type="button" data-tooltip="Delete" data-tooltip-placement="bottom" data-tooltip-arrow="false">🗑</button>
 */
export class Tooltip extends BaseComponent {
  static selector = 'data-tooltip';

  static defaults = {
    placement: 'top',
    arrow: true,
    delay: 150,
    offset: 8,
  };

  _init(element) {
    const state = super._init(element);
    const config = this._getConfigFromAttrs(element, {
      placement: 'placement',
      arrow: 'arrow',
      delay: 'delay',
      offset: 'offset',
    });
    const targetSelector = this.getAttr(element, 'target');
    const source = targetSelector ? document.querySelector(targetSelector) : null;
    const text = element.getAttribute('data-tooltip') ?? '';
    if (!text && !source) {
      this.logger?.warn('Tooltip: nothing to show', { element });
      return state;
    }

    Object.assign(state, {
      config: {
        ...Tooltip.defaults,
        ...config,
        placement: PLACEMENTS.includes(config.placement) ? config.placement : 'top',
      },
      text,
      source,
      tip: null,
      timer: null,
      open: false,
      reposition: () => this._position(element, state),
      escape: event => {
        if (event.key === 'Escape') this._hide(element, state);
      },
    });
    this.setAttr(element, 'state', 'closed');

    const { signal } = state.controller;
    element.addEventListener(
      'pointerenter',
      event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(state.timer);
        state.timer = setTimeout(() => this._show(element, state), state.config.delay);
      },
      { signal }
    );
    element.addEventListener('pointerleave', () => this._hide(element, state), { signal });
    element.addEventListener('pointerdown', () => this._hide(element, state), { signal });
    element.addEventListener('focus', () => this._show(element, state), { signal });
    element.addEventListener('blur', () => this._hide(element, state), { signal });

    state.cleanup = () => {
      clearTimeout(state.timer);
      this._unwatch(state);
      state.tip?.remove();
      this._describe(element, state, false);
      this.removeAttr(element, 'state');
    };

    this.eventBus?.emit('tooltip:mount', { element, timestamp: performance.now() });
    return state;
  }

  /**
   * Show the tooltip for a control
   *
   * @param {HTMLElement} element
   */
  show(element) {
    const state = this._requireState(element, 'show');
    if (state?.config) this._show(element, state);
  }

  /**
   * Hide the tooltip for a control
   *
   * @param {HTMLElement} element
   */
  hide(element) {
    const state = this._requireState(element, 'hide');
    if (state?.config) this._hide(element, state);
  }

  _show(element, state) {
    clearTimeout(state.timer);
    if (state.open) return;
    const tip = state.tip ?? this._build(element, state);
    state.open = true;

    /* Shown first and positioned, then opened a frame later in effect: the reflow between the two
       is what lets the fade and the move run from the closed values */
    tip.hidden = false;
    this._position(element, state);
    void tip.offsetWidth;
    tip.dataset.tooltipState = 'open';
    this.setAttr(element, 'state', 'open');
    this._describe(element, state, true);

    window.addEventListener('scroll', state.reposition, { capture: true, passive: true });
    window.addEventListener('resize', state.reposition, { passive: true });
    document.addEventListener('keydown', state.escape);
    this._dispatch(element, 'tooltip:show', {
      tooltip: tip,
      placement: tip.dataset.tooltipPlacement,
    });
  }

  _hide(element, state) {
    clearTimeout(state.timer);
    if (!state.open) return;
    const { tip } = state;
    state.open = false;
    tip.dataset.tooltipState = 'closed';
    this.setAttr(element, 'state', 'closed');
    this._describe(element, state, false);
    this._unwatch(state);

    whenAnimationsFinish(tip).then(() => {
      if (!state.open) tip.hidden = true;
    });
    this._dispatch(element, 'tooltip:hide', {
      tooltip: tip,
      placement: tip.dataset.tooltipPlacement,
    });
  }

  _unwatch(state) {
    window.removeEventListener('scroll', state.reposition, { capture: true });
    window.removeEventListener('resize', state.reposition);
    document.removeEventListener('keydown', state.escape);
  }

  /**
   * Link or unlink the control from its tooltip, keeping any description it already had
   */
  _describe(element, state, on) {
    const id = state.tip?.id;
    if (!id) return;
    const ids = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    const next = on ? [...new Set([...ids, id])] : ids.filter(each => each !== id);
    if (next.length) element.setAttribute('aria-describedby', next.join(' '));
    else element.removeAttribute('aria-describedby');
  }

  /**
   * Create the tooltip element once, at the end of the body so no ancestor clips or transforms it
   */
  _build(element, state) {
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.id = this._generateId('tooltip');
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    tip.dataset.tooltipState = 'closed';
    tip.dataset.tooltipPlacement = state.config.placement;
    if (!state.config.arrow) tip.dataset.tooltipArrow = 'false';

    if (state.text) {
      tip.textContent = state.text;
    } else {
      /* A copy, with its ids dropped so the page keeps the only element with each */
      const copy = state.source.cloneNode(true);
      for (const node of copy.querySelectorAll('[id]')) node.removeAttribute('id');
      tip.append(...copy.childNodes);
    }

    document.body.append(tip);
    state.tip = tip;
    return tip;
  }

  /**
   * Put the tooltip beside the control on the side asked for, or the opposite side when that one
   * has no room, kept inside the viewport with the triangle still pointing at the control
   */
  _position(element, state) {
    const { tip, config } = state;
    if (!tip || tip.hidden) return;
    const { side, left, top, arrow } = placeBeside(
      element.getBoundingClientRect(),
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { placement: config.placement, offset: config.offset, margin: MARGIN }
    );
    tip.dataset.tooltipPlacement = side;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    /* Where the triangle sits along the tooltip, so it points at the control's centre even when
       the tooltip itself was moved to stay on screen */
    tip.style.setProperty('--tooltip-arrow-offset', `${arrow}px`);
  }

  /**
   * Mount on every matching element without the framework
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {Tooltip}
   */
  static enhanceAll(selector = '[data-tooltip]', options) {
    const instance = new Tooltip(options);
    for (const element of document.querySelectorAll(selector)) instance.mount(element);
    return instance;
  }
}

export default Tooltip;
