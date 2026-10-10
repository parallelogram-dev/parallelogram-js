import { DragComponent, labelOf } from '../utils/draggable/DragComponent.js';
import { Sortable as SortableEngine } from '../utils/draggable/Sortable.js';
import { fill } from '../utils/text.js';

/**
 * Sortable - reorder a list by dragging its items, with a mouse, a finger or the keyboard
 *
 * The container's children are the items, or the elements `data-sortable-items` selects. A drag
 * starts after the pointer has moved a few pixels, or after a short hold on touch, so a click on a
 * link or button inside an item still works; `data-sortable-handle` limits it to a part of each
 * item. A copy follows the pointer while a placeholder shows where the item will land, and the
 * page scrolls near its edges. From the keyboard, Space or Enter picks up the focused item, the
 * arrow keys move it, Space or Enter drops it and Escape puts it back. Containers with the same
 * `data-sortable-group` share their items. Each move is announced to screen readers.
 *
 * The container's state is in `data-sortable-state`: `idle`, `active` while a drag in its group is
 * in progress, and `over` while the dragged item is over it. The placeholder, the copy and an item
 * just dropped carry `data-sortable-item-state`: `placeholder`, `mirror` and `placed`.
 * `data-sortable-disabled` stops new drags from starting in a container.
 *
 * Announcements are `data-sortable-picked-up`, `data-sortable-keyboard-hint`,
 * `data-sortable-moved`, `data-sortable-dropped` and `data-sortable-cancelled`; the other options
 * are `data-sortable-touch-delay`, `data-sortable-distance` and `data-sortable-axis`.
 *
 * Built on a port of Shopify Draggable (MIT).
 *
 * @example
 * <ul data-sortable>
 *   <li>Write the brief</li>
 *   <li>Review</li>
 *   <li>Publish</li>
 * </ul>
 *
 * @example
 * <div data-sortable data-sortable-group="board" data-sortable-handle=".card__handle">…</div>
 * <div data-sortable data-sortable-group="board" data-sortable-handle=".card__handle">…</div>
 */
export class Sortable extends DragComponent {
  static selector = 'data-sortable';

  static defaults = {
    group: null,
    items: null,
    handle: null,
    distance: 4,
    touchDelay: 100,
    axis: 'both',
    pickedUp: 'Picked up {item}.',
    keyboardHint: 'Arrow keys move it, Space drops it, Escape cancels.',
    moved: 'Position {position} of {total}.',
    dropped: 'Dropped {item}.',
    cancelled: 'Cancelled. {item} is back where it started.',
  };

  static Engine = SortableEngine;
  static relayed = ['sortable:start', 'sortable:sort', 'sortable:sorted', 'sortable:stop'];
  static changeEvent = 'sortable:change';

  _moveMessage(event, group) {
    if (event.type !== 'sortable:sorted') return '';
    const items = group.engine.getSortableElementsForContainer(event.newContainer);
    return fill(group.config.moved, {
      item: labelOf(event.dragEvent.source),
      position: event.newIndex + 1,
      total: items.length,
    });
  }

  _changed(detail) {
    return (
      !detail.reverted &&
      (detail.oldContainer !== detail.newContainer || detail.oldIndex !== detail.newIndex)
    );
  }

  /**
   * Mount on every matching element without the framework
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {Sortable}
   */
  static enhanceAll(selector = '[data-sortable]', options) {
    const instance = new Sortable(options);
    for (const element of document.querySelectorAll(selector)) instance.mount(element);
    return instance;
  }
}

export default Sortable;
