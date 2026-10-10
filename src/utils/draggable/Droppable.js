import { Draggable } from './Draggable.js';
import { closest } from './dom.js';
import {
  DroppableStartEvent,
  DroppableStopEvent,
  DroppableDroppedEvent,
  DroppableReturnedEvent,
} from './events.js';

export const defaultOptions = {
  dropzone: '.draggable-droppable',
};

/**
 * Droppable engine: move an element into one of a set of dropzones, each holding at most one
 *
 * A dropzone counts as occupied when it holds a draggable element, so markup needs no marker for
 * it, unlike Shopify's original. Each dropzone's state is written to `<attribute>-zone-state`:
 * `occupied`, `empty`, or `available` for an empty one while a drag is in progress.
 *
 * Events: droppable:start (cancelable), droppable:dropped (cancelable), droppable:returned
 * (cancelable), droppable:stop.
 */
export class Droppable extends Draggable {
  constructor(containers = [], options = {}) {
    super(containers, { ...defaultOptions, ...options });

    this.dropzones = null;
    this.lastDropzone = null;
    this.initialDropzone = null;

    this.onDroppableDragStart = this.onDroppableDragStart.bind(this);
    this.onDroppableDragMove = this.onDroppableDragMove.bind(this);
    this.onDroppableDragStop = this.onDroppableDragStop.bind(this);

    this.on('drag:start', this.onDroppableDragStart)
      .on('drag:move', this.onDroppableDragMove)
      .on('drag:stop', this.onDroppableDragStop);
    this.refreshZones();
  }

  destroy() {
    super.destroy();
    this.off('drag:start', this.onDroppableDragStart)
      .off('drag:move', this.onDroppableDragMove)
      .off('drag:stop', this.onDroppableDragStop);
  }

  /** Whether a dropzone holds a draggable element, other than the one being dragged */
  isOccupied(zone) {
    return [...zone.querySelectorAll(this.options.draggable)].some(
      element => element !== this.originalSource && element !== this.mirror
    );
  }

  /** Write every dropzone's `<attribute>-zone-state` */
  refreshZones() {
    const name = `${this.options.attribute}-zone-state`;
    for (const zone of this.getDropzones()) {
      const state = this.isOccupied(zone) ? 'occupied' : this.dragging ? 'available' : 'empty';
      zone.setAttribute(name, state);
    }
  }

  /** Keyboard: step to the previous or next dropzone that is free, or is where the drag began */
  getKeyboardTarget(source, direction) {
    const zones = [...this.getDropzones()];
    const current = closest(source, zones);
    for (let i = zones.indexOf(current) + direction; i >= 0 && i < zones.length; i += direction) {
      const zone = zones[i];
      if (zone === this.initialDropzone || !this.isOccupied(zone)) return zone;
    }
    return null;
  }

  onDroppableDragStart(event) {
    if (event.canceled()) return;

    this.dropzones = [...this.getDropzones()];
    const dropzone = closest(event.sensorEvent.target, this.dropzones);
    if (!dropzone) {
      event.cancel();
      return;
    }

    const droppableStartEvent = new DroppableStartEvent({ dragEvent: event, dropzone });
    this.trigger(droppableStartEvent);
    if (droppableStartEvent.canceled()) {
      event.cancel();
      return;
    }

    this.initialDropzone = dropzone;
    /* The engine sets `dragging` once every drag:start listener has run */
    queueMicrotask(() => this.refreshZones());
  }

  onDroppableDragMove(event) {
    if (event.canceled() || !this.dropzones) return;

    const { sensorEvent } = event;
    const dropzone = closest(sensorEvent.target, this.dropzones);
    const isKeyboardStep = sensorEvent.pointerType === 'keyboard' && !sensorEvent.target;

    if (dropzone === this.initialDropzone || (!dropzone && !isKeyboardStep)) {
      /* Back over its own dropzone, or outside every one: the element goes home, as in the
         original. KeyboardSensor's in-between "over nothing" step is exempt. */
      if (this.lastDropzone) {
        this.returnToOriginalDropzone(event);
        this.lastDropzone = null;
      }
    } else if (dropzone && dropzone !== this.lastDropzone && !this.isOccupied(dropzone)) {
      if (this.dropInDropzone(event, dropzone)) this.lastDropzone = dropzone;
    }
  }

  onDroppableDragStop(event) {
    if (!this.dropzones) return;

    if ((event.sensorEvent?.revert || event.canceled()) && this.lastDropzone) {
      this.lastDropzone = null;
    }

    this.trigger(
      new DroppableStopEvent({
        dragEvent: event,
        dropzone: this.lastDropzone || this.initialDropzone,
        initialDropzone: this.initialDropzone,
      })
    );

    this.dropzones = null;
    this.lastDropzone = null;
    this.initialDropzone = null;
    /* After the engine has put the element in place and cleared `dragging` */
    queueMicrotask(() => this.refreshZones());
  }

  dropInDropzone(event, dropzone) {
    const droppableDroppedEvent = new DroppableDroppedEvent({ dragEvent: event, dropzone });
    this.trigger(droppableDroppedEvent);
    if (droppableDroppedEvent.canceled()) return false;

    dropzone.appendChild(event.source);
    this.refreshZones();
    return true;
  }

  returnToOriginalDropzone(event) {
    const droppableReturnedEvent = new DroppableReturnedEvent({
      dragEvent: event,
      dropzone: this.lastDropzone,
    });
    this.trigger(droppableReturnedEvent);
    if (droppableReturnedEvent.canceled()) return;

    this.initialDropzone.appendChild(event.source);
    this.refreshZones();
  }

  getDropzones() {
    const { dropzone } = this.options;
    if (typeof dropzone === 'string') return document.querySelectorAll(dropzone);
    if (dropzone instanceof NodeList || Array.isArray(dropzone)) return dropzone;
    if (typeof dropzone === 'function') return dropzone();
    return [];
  }
}

export default Droppable;
