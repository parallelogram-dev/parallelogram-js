import { closest, distance } from '../dom.js';
import { Sensor } from './Sensor.js';
import { DragStartSensorEvent, DragMoveSensorEvent, DragStopSensorEvent } from '../events.js';

/** Movement (px) a touch may jitter during the hold delay without being read as a scroll. */
const TOUCH_SLOP = 4;

/* Touch scrolling can only be stopped from a non-passive touchmove listener;
   Pointer Events alone can't do it once the gesture has begun. */
let preventScrolling = false;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'touchmove',
    event => {
      if (preventScrolling) event.preventDefault();
    },
    { passive: false }
  );
}

/**
 * PointerSensor — replaces Shopify Draggable's MouseSensor, TouchSensor and
 * ForceTouchSensor with a single Pointer Events implementation covering
 * mouse, touch and pen.
 *
 * Honours the same options: `draggable`, `handle`, `delay` (per pointer type)
 * and `distance` (mouse and pen only). Touch drags start after a short hold
 * (default 100ms); moving more than a few pixels during the hold is treated
 * as a scroll and abandons the drag.
 *
 * As in the original, `distance: 0` makes every press a drag, which swallows
 * clicks on links or buttons inside items; set a few pixels if items hold any.
 */
export class PointerSensor extends Sensor {
  constructor(containers, options, draggable) {
    super(containers, options, draggable);
    this.pointerId = null;
    this.pointerType = null;
    this.downTimeout = null;
    this.clientX = 0;
    this.clientY = 0;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onDistanceChange = this.onDistanceChange.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
  }

  attach() {
    document.addEventListener('pointerdown', this.onPointerDown, true);
    return this;
  }

  detach() {
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    this.reset();
    return this;
  }

  onPointerDown(event) {
    if (this.pointerId !== null || !event.isPrimary) return;
    if (event.pointerType === 'mouse' && (event.button !== 0 || event.ctrlKey || event.metaKey))
      return;

    /* The event is retargeted to the outermost shadow host by the time it reaches the document,
       so a handle inside an item's shadow root is found from where the press really began */
    const origin = event.composedPath?.()[0] ?? event.target;
    const container = closest(origin, this.containers);
    if (!container) return;
    if (this.options.handle && !closest(origin, this.options.handle)) return;

    const originalSource = closest(origin, this.options.draggable);
    if (!originalSource || !container.contains(originalSource)) return;

    this.pointerId = event.pointerId;
    this.pointerType = event.pointerType || 'mouse';
    this.startEvent = event;
    this.origin = origin;
    this.downAt = Date.now();
    this.currentContainer = container;
    this.originalSource = originalSource;
    this.clientX = event.clientX;
    this.clientY = event.clientY;

    document.addEventListener('pointermove', this.onDistanceChange);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerCancel);
    document.addEventListener('dragstart', preventDefault);
    if (this.pointerType === 'touch') container.addEventListener('contextmenu', preventDefault);

    const delay = this.delayFor();
    this.downTimeout = window.setTimeout(() => {
      this.onDistanceChange({
        pointerId: this.pointerId,
        clientX: this.clientX,
        clientY: this.clientY,
      });
    }, delay);
  }

  delayFor() {
    return this.delay[this.pointerType] ?? this.delay.mouse;
  }

  onDistanceChange(event) {
    if (event.pointerId !== this.pointerId || !this.startEvent) return;

    this.clientX = event.clientX;
    this.clientY = event.clientY;

    const { startEvent } = this;
    const elapsed = Date.now() - this.downAt;
    const travelled = distance(startEvent.clientX, startEvent.clientY, this.clientX, this.clientY);

    if (elapsed < this.delayFor()) {
      /* Moved before the hold delay ran out: a scroll or a flick, not a drag. */
      const slop = this.pointerType === 'touch' ? TOUCH_SLOP : 0;
      if (travelled > slop) this.reset();
      return;
    }

    /* Touch commits by holding still for the delay; requiring distance on top
       would mean moving while the browser is already scrolling the page. */
    const required = this.pointerType === 'touch' ? 0 : this.options.distance || 0;
    if (travelled >= required) {
      clearTimeout(this.downTimeout);
      document.removeEventListener('pointermove', this.onDistanceChange);
      this.startDrag();
    }
  }

  startDrag() {
    const { startEvent, currentContainer: container, originalSource } = this;
    const dragStartEvent = new DragStartSensorEvent({
      clientX: startEvent.clientX,
      clientY: startEvent.clientY,
      target: this.origin,
      container,
      originalSource,
      originalEvent: startEvent,
      pointerType: this.pointerType,
    });
    this.trigger(container, dragStartEvent);
    this.dragging = !dragStartEvent.canceled();

    if (!this.dragging) {
      this.reset();
      return;
    }

    preventScrolling = true;
    window.getSelection?.()?.removeAllRanges();
    document.addEventListener('contextmenu', preventDefault, true);
    document.addEventListener('pointermove', this.onPointerMove);
  }

  onPointerMove(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    const dragMoveEvent = new DragMoveSensorEvent({
      clientX: event.clientX,
      clientY: event.clientY,
      target: document.elementFromPoint(event.clientX, event.clientY),
      container: this.currentContainer,
      originalEvent: event,
      pointerType: this.pointerType,
    });
    this.trigger(this.currentContainer, dragMoveEvent);
  }

  onPointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.stop(event);
  }

  onPointerCancel(event) {
    if (event.pointerId !== this.pointerId) return;
    /* The browser took the gesture over (e.g. began scrolling). Drop in place
       at the last known position, as Shopify's touchcancel handling does. */
    this.stop({
      clientX: this.clientX,
      clientY: this.clientY,
      type: event.type,
      target: event.target,
    });
  }

  stop(event) {
    if (this.dragging) {
      const dragStopEvent = new DragStopSensorEvent({
        clientX: event.clientX,
        clientY: event.clientY,
        target: document.elementFromPoint(event.clientX, event.clientY),
        container: this.currentContainer,
        originalEvent: event,
        pointerType: this.pointerType,
      });
      this.trigger(this.currentContainer, dragStopEvent);
      /* A mouse drag that ends over a link or button would otherwise "click" it. */
      suppressNextClick();
    }
    this.reset();
  }

  reset() {
    clearTimeout(this.downTimeout);
    preventScrolling = false;
    document.removeEventListener('pointermove', this.onDistanceChange);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerCancel);
    document.removeEventListener('dragstart', preventDefault);
    document.removeEventListener('contextmenu', preventDefault, true);
    this.currentContainer?.removeEventListener('contextmenu', preventDefault);
    this.dragging = false;
    this.pointerId = null;
    this.pointerType = null;
    this.startEvent = null;
    this.origin = null;
    this.currentContainer = null;
    this.originalSource = null;
  }
}

function preventDefault(event) {
  event.preventDefault();
}

function suppressNextClick() {
  const swallow = event => {
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener('click', swallow, { capture: true, once: true });
  /* If no click follows (pointer released over a different element), stop waiting. */
  setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 0);
}
