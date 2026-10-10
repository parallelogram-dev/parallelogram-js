import { DragComponent, labelOf } from '../utils/draggable/DragComponent.js';
import { Swappable as SwappableEngine } from '../utils/draggable/Swappable.js';
import { fill } from '../utils/text.js';

/**
 * Swappable - drag one item onto another to exchange their places
 *
 * Works as Sortable does, with a mouse, a finger or the keyboard, except that dropping an item on
 * another swaps the two rather than shifting the ones between. The container's children are the
 * items, or the elements `data-swappable-items` selects; `data-swappable-handle` limits where a
 * drag can start and containers with the same `data-swappable-group` swap with each other.
 *
 * The container's state is in `data-swappable-state` (`idle`, `active`, `over`), and the
 * placeholder, the copy and an item just dropped carry `data-swappable-item-state`
 * (`placeholder`, `mirror`, `placed`). `data-swappable-disabled` stops new drags from starting.
 * Announcements are `data-swappable-picked-up`, `data-swappable-keyboard-hint`,
 * `data-swappable-moved`, `data-swappable-dropped` and `data-swappable-cancelled`; the other
 * options are `data-swappable-touch-delay`, `data-swappable-distance` and `data-swappable-axis`.
 *
 * Built on a port of Shopify Draggable (MIT).
 *
 * @example
 * <div data-swappable class="tiles">
 *   <div>One</div><div>Two</div><div>Three</div>
 * </div>
 */
export class Swappable extends DragComponent {
  static selector = 'data-swappable';

  static defaults = {
    group: null,
    items: null,
    handle: null,
    distance: 4,
    touchDelay: 100,
    axis: 'both',
    pickedUp: 'Picked up {item}.',
    keyboardHint: 'Arrow keys move it, Space drops it, Escape cancels.',
    moved: 'Swapped with {other}.',
    dropped: 'Dropped {item}.',
    cancelled: 'Cancelled. {item} is back where it started.',
  };

  static Engine = SwappableEngine;
  static relayed = ['swappable:start', 'swappable:swap', 'swappable:swapped', 'swappable:stop'];
  static changeEvent = 'swappable:change';

  _moveMessage(event, group) {
    if (event.type !== 'swappable:swapped') return '';
    return fill(group.config.moved, {
      item: labelOf(event.dragEvent.source),
      other: labelOf(event.swappedElement),
    });
  }

  _changed(detail) {
    return !detail.reverted && Boolean(detail.swappedElement);
  }

  /**
   * Mount on every matching element without the framework
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {Swappable}
   */
  static enhanceAll(selector = '[data-swappable]', options) {
    const instance = new Swappable(options);
    for (const element of document.querySelectorAll(selector)) instance.mount(element);
    return instance;
  }
}

export default Swappable;
