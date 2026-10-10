const defaultDelay = {
  mouse: 0,
  pen: 0,
  touch: 100,
};

/**
 * Base sensor. A sensor turns raw input into `drag:start` / `drag:move` /
 * `drag:stop` DOM events (carrying a SensorEvent in `event.detail`), which
 * Draggable listens for on `document`.
 *
 * Unlike Shopify Draggable, sensors also receive the Draggable instance, so
 * the keyboard sensor can find the element currently being dragged.
 */
export class Sensor {
  constructor(containers = [], options = {}, draggable = null) {
    this.containers = [...containers];
    this.options = { ...options };
    this.draggable = draggable;
    this.dragging = false;
    this.currentContainer = null;
    this.originalSource = null;
    this.startEvent = null;
    this.delay = calcDelay(options.delay);
  }

  attach() {
    return this;
  }

  detach() {
    return this;
  }

  addContainer(...containers) {
    this.containers = [...this.containers, ...containers];
  }

  removeContainer(...containers) {
    this.containers = this.containers.filter(container => !containers.includes(container));
  }

  /** Dispatch a sensor event as a bubbling, cancelable DOM event on `element`. */
  trigger(element, sensorEvent) {
    const event = new CustomEvent(sensorEvent.type, {
      bubbles: true,
      cancelable: true,
      detail: sensorEvent,
    });
    element.dispatchEvent(event);
    this.lastEvent = sensorEvent;
    return sensorEvent;
  }
}

/**
 * `delay` may be a number (applies to every pointer type) or an object keyed
 * by pointer type: `{ mouse: 0, touch: 150, pen: 0 }`.
 */
function calcDelay(optionsDelay) {
  if (optionsDelay === undefined || optionsDelay === null) return { ...defaultDelay };
  if (typeof optionsDelay === 'number') {
    return Object.fromEntries(Object.keys(defaultDelay).map(key => [key, optionsDelay]));
  }
  return { ...defaultDelay, ...optionsDelay };
}
