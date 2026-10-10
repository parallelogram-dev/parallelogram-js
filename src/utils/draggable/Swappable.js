import { Draggable } from './Draggable.js';
import {
  SwappableStartEvent,
  SwappableSwapEvent,
  SwappableSwappedEvent,
  SwappableStopEvent,
} from './events.js';

/**
 * Swappable engine: exchange the dragged element with the one it's dropped on.
 *
 * Events: swappable:start (cancelable), swappable:swap (cancelable),
 * swappable:swapped, swappable:stop.
 */
export class Swappable extends Draggable {
  constructor(containers = [], options = {}) {
    super(containers, options);

    this.lastOver = null;

    this.onSwappableDragStart = this.onSwappableDragStart.bind(this);
    this.onSwappableDragOver = this.onSwappableDragOver.bind(this);
    this.onSwappableDragStop = this.onSwappableDragStop.bind(this);

    this.on('drag:start', this.onSwappableDragStart)
      .on('drag:over', this.onSwappableDragOver)
      .on('drag:stop', this.onSwappableDragStop);
  }

  destroy() {
    super.destroy();
    this.off('drag:start', this.onSwappableDragStart)
      .off('drag:over', this.onSwappableDragOver)
      .off('drag:stop', this.onSwappableDragStop);
  }

  onSwappableDragStart(event) {
    const swappableStartEvent = new SwappableStartEvent({ dragEvent: event });
    this.trigger(swappableStartEvent);
    if (swappableStartEvent.canceled()) event.cancel();
  }

  onSwappableDragOver(event) {
    if (event.over === event.originalSource || event.over === event.source || event.canceled())
      return;

    const swappableSwapEvent = new SwappableSwapEvent({
      dragEvent: event,
      over: event.over,
      overContainer: event.overContainer,
    });
    this.trigger(swappableSwapEvent);
    if (swappableSwapEvent.canceled()) return;

    /* Undo the previous swap before making the new one. */
    if (this.lastOver && this.lastOver !== event.over) swap(this.lastOver, event.source);
    this.lastOver = this.lastOver === event.over ? null : event.over;
    swap(event.source, event.over);

    this.trigger(new SwappableSwappedEvent({ dragEvent: event, swappedElement: event.over }));
  }

  onSwappableDragStop(event) {
    const reverted = Boolean(event.sensorEvent?.revert) || event.canceled();
    if (reverted && this.lastOver) {
      swap(this.lastOver, event.source);
      this.lastOver = null;
    }
    this.trigger(new SwappableStopEvent({ dragEvent: event, swappedElement: this.lastOver }));
    this.lastOver = null;
  }
}

function swap(source, over) {
  const overParent = over.parentNode;
  const sourceParent = source.parentNode;
  const marker = document.createElement('div');
  sourceParent.insertBefore(marker, source);
  overParent.insertBefore(source, over);
  sourceParent.insertBefore(over, marker);
  marker.remove();
}

export default Swappable;
