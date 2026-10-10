import { DragComponent, labelOf } from '../utils/draggable/DragComponent.js';
import { Droppable as DroppableEngine } from '../utils/draggable/Droppable.js';
import { fill } from '../utils/text.js';

const ZONE = '[data-droppable-zone]';

/**
 * Droppable - drag items between dropzones that hold one item each
 *
 * The dropzones are the elements marked `data-droppable-zone` inside the container, and the items
 * are their children, or the elements `data-droppable-items` selects. An item dragged over an
 * empty dropzone moves into it; dragged back over its own, or let go outside every dropzone, it
 * goes home. From the keyboard, Space or Enter picks up the focused item, the arrow keys move it
 * to the previous or next free dropzone, Space or Enter drops it and Escape puts it back.
 * Containers with the same `data-droppable-group` share their dropzones.
 *
 * Each dropzone's state is in `data-droppable-zone-state`: `occupied`, `empty`, or `available`
 * for an empty one while a drag is in progress. A dropzone holding an item is occupied, so the
 * markup needs no marker for it. The container's state is in `data-droppable-state` (`idle`,
 * `active`, `over`), and the placeholder, the copy and an item just dropped carry
 * `data-droppable-item-state` (`placeholder`, `mirror`, `placed`). `data-droppable-disabled`
 * stops new drags from starting. Name a dropzone with `aria-label` for its announcement; one
 * without is announced by its `data-droppable-zone` value. Announcements are
 * `data-droppable-picked-up`, `data-droppable-keyboard-hint`, `data-droppable-moved`,
 * `data-droppable-dropped` and `data-droppable-cancelled`; the other options are
 * `data-droppable-handle`, `data-droppable-touch-delay`, `data-droppable-distance` and
 * `data-droppable-axis`.
 *
 * Built on a port of Shopify Draggable (MIT).
 *
 * @example
 * <div data-droppable>
 *   <div data-droppable-zone="inbox" aria-label="Inbox"><div>Invoice 42</div></div>
 *   <div data-droppable-zone="done" aria-label="Done"></div>
 * </div>
 */
export class Droppable extends DragComponent {
  static selector = 'data-droppable';

  static defaults = {
    group: null,
    items: null,
    handle: null,
    distance: 4,
    touchDelay: 100,
    axis: 'both',
    pickedUp: 'Picked up {item}.',
    keyboardHint: 'Arrow keys move it between dropzones, Space drops it, Escape cancels.',
    moved: 'In {zone}.',
    dropped: 'Dropped {item}.',
    cancelled: 'Cancelled. {item} is back where it started.',
  };

  static Engine = DroppableEngine;
  static relayed = ['droppable:start', 'droppable:dropped', 'droppable:returned', 'droppable:stop'];
  static changeEvent = 'droppable:change';

  _defaultItems() {
    return `${ZONE} > *`;
  }

  _engineOptions(config, group) {
    return {
      ...super._engineOptions(config, group),
      dropzone: () => [...group.elements].flatMap(element => [...element.querySelectorAll(ZONE)]),
    };
  }

  _moveMessage(event, group) {
    if (event.type !== 'droppable:dropped' && event.type !== 'droppable:returned') return '';
    const zone =
      event.type === 'droppable:returned' ? group.engine.initialDropzone : event.dropzone;
    return fill(group.config.moved, {
      item: labelOf(event.dragEvent.source),
      zone: zone?.getAttribute('aria-label') ?? zone?.getAttribute('data-droppable-zone') ?? '',
    });
  }

  _changed(detail) {
    return (
      !detail.reverted && Boolean(detail.dropzone) && detail.dropzone !== detail.initialDropzone
    );
  }

  /**
   * Mount on every matching element without the framework
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {Droppable}
   */
  static enhanceAll(selector = '[data-droppable]', options) {
    const instance = new Droppable(options);
    for (const element of document.querySelectorAll(selector)) instance.mount(element);
    return instance;
  }
}

export default Droppable;
