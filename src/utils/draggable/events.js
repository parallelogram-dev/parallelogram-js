import { AbstractEvent, defineEvent } from './AbstractEvent.js';

/* ---- Sensor events: raw input normalised by a sensor ------------------- */

export class SensorEvent extends AbstractEvent {
  static type = 'sensor';
}
export const DragStartSensorEvent = defineEvent('drag:start', {
  cancelable: true,
  base: SensorEvent,
});
export const DragMoveSensorEvent = defineEvent('drag:move', { base: SensorEvent });
export const DragStopSensorEvent = defineEvent('drag:stop', { base: SensorEvent });

/* ---- Draggable lifecycle ------------------------------------------------ */

export const DraggableInitializedEvent = defineEvent('draggable:initialize');
export const DraggableDestroyEvent = defineEvent('draggable:destroy');

/* ---- Drag events: what Draggable itself emits --------------------------- */

export class DragEvent extends AbstractEvent {
  static type = 'drag';

  get originalEvent() {
    return this.data.sensorEvent?.originalEvent ?? null;
  }
}
const drag = (type, cancelable = false) => defineEvent(type, { cancelable, base: DragEvent });

export const DragStartEvent = drag('drag:start', true);
export const DragMoveEvent = drag('drag:move');
export const DragOverEvent = drag('drag:over', true);
export const DragOverContainerEvent = drag('drag:over:container');
export const DragOutEvent = drag('drag:out');
export const DragOutContainerEvent = drag('drag:out:container');
export const DragStopEvent = drag('drag:stop', true);
export const DragStoppedEvent = drag('drag:stopped');

/* ---- Mirror plugin ------------------------------------------------------ */

export const MirrorCreateEvent = defineEvent('mirror:create', { cancelable: true });
export const MirrorCreatedEvent = defineEvent('mirror:created');
export const MirrorAttachedEvent = defineEvent('mirror:attached');
export const MirrorMoveEvent = defineEvent('mirror:move', { cancelable: true });
export const MirrorMovedEvent = defineEvent('mirror:moved');
export const MirrorDestroyEvent = defineEvent('mirror:destroy', { cancelable: true });

/* ---- Sortable ----------------------------------------------------------- */

export const SortableStartEvent = defineEvent('sortable:start', { cancelable: true });
export const SortableSortEvent = defineEvent('sortable:sort', { cancelable: true });
export const SortableSortedEvent = defineEvent('sortable:sorted');
export const SortableStopEvent = defineEvent('sortable:stop');

/* ---- Swappable ---------------------------------------------------------- */

export const SwappableStartEvent = defineEvent('swappable:start', { cancelable: true });
export const SwappableSwapEvent = defineEvent('swappable:swap', { cancelable: true });
export const SwappableSwappedEvent = defineEvent('swappable:swapped');
export const SwappableStopEvent = defineEvent('swappable:stop');

/* ---- Droppable ---------------------------------------------------------- */

export const DroppableStartEvent = defineEvent('droppable:start', { cancelable: true });
export const DroppableDroppedEvent = defineEvent('droppable:dropped', { cancelable: true });
export const DroppableReturnedEvent = defineEvent('droppable:returned', { cancelable: true });
export const DroppableStopEvent = defineEvent('droppable:stop', { cancelable: true });
