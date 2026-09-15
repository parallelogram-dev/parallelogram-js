import { BaseComponent } from '../core/BaseComponent.js';
import { prefersReducedMotion } from '../utils/motion.js';

const DEFAULT_DURATION = 300;

/**
 * Milliseconds from a CSS time such as `0.3s` or `300ms`, or null when it isn't one
 */
const toMilliseconds = value => {
  const match = /^([\d.]+)(ms|s)$/.exec(value.trim());
  return match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : null;
};

/**
 * Accordion - animate native `<details>` elements as they open and close
 *
 * The markup is plain `<details>` and `<summary>`, so without JavaScript every item still opens and
 * closes from the keyboard or pointer, and find in page can open a closed one. Accordion takes over
 * the summary's click to animate the height of the details element instead of snapping it open or
 * shut, and writes `data-accordion-state` (closed, opening, open or closing) for styles. Details that
 * share a `name` stay exclusive: opening one closes the others with the same animation, including in
 * browsers that don't support `name` on details yet. An item opened or closed another way, such as by
 * find in page or a script setting `open`, changes at once.
 *
 * The animation length and easing come from the `--accordion-duration` and `--accordion-easing`
 * custom properties, and it is skipped when the user prefers reduced motion.
 *
 * Wrap each item's content in one element after the summary, such as a `<div>`. The stylesheet gives
 * that element the padding and contains its children's margins, so the animation ends exactly at the
 * item's height instead of jumping.
 *
 * @example
 * <details data-accordion name="faq">
 *   <summary>Can I change my order?</summary>
 *   <div>
 *     <p>Yes, until it leaves the warehouse.</p>
 *   </div>
 * </details>
 * <details data-accordion name="faq">
 *   <summary>How long does delivery take?</summary>
 *   <div>
 *     <p>Two working days.</p>
 *   </div>
 * </details>
 *
 * @attributes
 * - data-accordion: on each details element
 * - data-accordion-state: set by the component to closed, opening, open or closing
 *
 * @events
 * - accordion:show: an item started opening, or was opened another way
 * - accordion:hide: an item started closing, or was closed another way
 *
 * @cssprop --accordion-duration - length of the open and close animation
 * @cssprop --accordion-easing - easing of the open and close animation
 */
export default class Accordion extends BaseComponent {
  static selector = 'data-accordion';

  _init(element) {
    const state = super._init(element);

    if (element.localName !== 'details') {
      this.logger?.warn('Accordion: data-accordion belongs on a details element', { element });
      return state;
    }
    const summary = element.querySelector(':scope > summary');
    if (!summary) {
      this.logger?.warn('Accordion: the details element has no summary', { element });
      return state;
    }

    state.summary = summary;
    state.animation = null;
    state.opening = element.open;
    state.name = null;
    this.setAttr(element, 'state', element.open ? 'open' : 'closed');

    const { signal } = state.controller;
    summary.addEventListener('click', event => this._onSummaryClick(element, event), { signal });
    element.addEventListener('toggle', () => this._onToggle(element, state), { signal });

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      if (state.animation) {
        state.animation.cancel();
        this._settle(element, state);
      }
      this.removeAttr(element, 'state');
      baseCleanup();
    };

    return state;
  }

  /**
   * Open an item, closing the others that share its name
   *
   * @param {HTMLElement} element - The details element
   */
  show(element) {
    const state = this.getState(element);
    if (!state?.summary || this._isOpen(element, state)) return;

    this._closeOthers(element, state);
    this._run(element, state, true);
    this._dispatch(element, 'accordion:show', { element });
  }

  /**
   * Close an item
   *
   * @param {HTMLElement} element - The details element
   */
  hide(element) {
    const state = this.getState(element);
    if (!state?.summary || !this._isOpen(element, state)) return;

    this._run(element, state, false);
    this._dispatch(element, 'accordion:hide', { element });
  }

  /**
   * Open a closed item or close an open one
   *
   * @param {HTMLElement} element - The details element
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state?.summary) return;

    if (this._isOpen(element, state)) {
      this.hide(element);
    } else {
      this.show(element);
    }
  }

  /**
   * Whether an item is open or opening
   */
  _isOpen(element, state) {
    return state.animation ? state.opening : element.open;
  }

  _onSummaryClick(element, event) {
    if (event.defaultPrevented) return;

    event.preventDefault();
    this.toggle(element);
  }

  /**
   * Record a change Accordion didn't make, such as find in page opening an item
   */
  _onToggle(element, state) {
    if (state.animation || state.changing) return;

    const value = element.open ? 'open' : 'closed';
    if (this.getAttr(element, 'state') === value) return;

    state.opening = element.open;
    this.setAttr(element, 'state', value);
    this._dispatch(element, element.open ? 'accordion:show' : 'accordion:hide', { element });
  }

  /**
   * Close the other open details with the same name, animating the ones Accordion manages
   */
  _closeOthers(element, state) {
    const name = state.name ?? element.getAttribute('name');
    if (!name) return;

    const others = [...element.getRootNode().querySelectorAll('details[name]')].filter(
      other => other !== element && other.open && other.getAttribute('name') === name
    );
    for (const other of others) {
      if (this.getState(other)?.summary) {
        this.hide(other);
      } else {
        other.open = false;
      }
    }
  }

  /**
   * Animate an item's height towards open or closed, starting from wherever it is now
   */
  _run(element, state, opening) {
    const start = element.getBoundingClientRect().height;
    state.animation?.cancel();
    state.animation = null;
    state.opening = opening;

    const duration = this._duration(element);
    if (duration === 0 || typeof element.animate !== 'function') {
      this._settle(element, state);
      return;
    }

    if (opening) {
      this._setOpen(element, state, true);
    } else if (state.name === null && element.hasAttribute('name')) {
      /* Without its name the item stays open while it closes, even when an item with the same name
         opens, since the browser would otherwise close it at once */
      state.name = element.getAttribute('name');
      element.removeAttribute('name');
    }

    const end = opening
      ? element.getBoundingClientRect().height
      : this._closedHeight(element, state);
    this.setAttr(element, 'state', opening ? 'opening' : 'closing');

    const frame = height => ({
      height: `${height}px`,
      overflow: 'hidden',
      boxSizing: 'border-box',
    });
    const animation = element.animate([frame(start), frame(end)], {
      duration,
      easing: getComputedStyle(element).getPropertyValue('--accordion-easing').trim() || 'ease',
    });
    state.animation = animation;
    animation.finished.then(
      () => {
        if (state.animation === animation) this._settle(element, state);
      },
      () => {}
    );
  }

  /**
   * Change `open` without treating the resulting toggle event as a change made another way, whether
   * the browser fires it straight away or later
   */
  _setOpen(element, state, open) {
    state.changing = true;
    try {
      element.open = open;
    } finally {
      state.changing = false;
    }
  }

  /**
   * Finish an item in the state it was heading for
   */
  _settle(element, state) {
    state.animation = null;
    this._setOpen(element, state, state.opening);
    if (state.name !== null) {
      element.setAttribute('name', state.name);
      state.name = null;
    }
    this.setAttr(element, 'state', state.opening ? 'open' : 'closed');
  }

  /**
   * The height of an item showing only its summary
   */
  _closedHeight(element, state) {
    const sum = (target, properties) => {
      const style = getComputedStyle(target);
      return properties.reduce((total, name) => total + (parseFloat(style[name]) || 0), 0);
    };

    return (
      state.summary.getBoundingClientRect().height +
      sum(state.summary, ['marginTop', 'marginBottom']) +
      sum(element, ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'])
    );
  }

  _duration(element) {
    if (prefersReducedMotion()) return 0;

    const value = getComputedStyle(element).getPropertyValue('--accordion-duration');
    return toMilliseconds(value) ?? DEFAULT_DURATION;
  }
}
