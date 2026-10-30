import { closest } from '../dom.js';

/**
 * The containers of every attached sensor, with how many sensors hold each, so a sensor can tell
 * whether the nearest container around an element is its own or another engine's
 *
 * @type {Map<Element, number>}
 */
const attachedContainers = new Map();

const register = containers => {
  for (const container of containers) {
    attachedContainers.set(container, (attachedContainers.get(container) ?? 0) + 1);
  }
};

const unregister = containers => {
  for (const container of containers) {
    const count = (attachedContainers.get(container) ?? 0) - 1;
    if (count > 0) attachedContainers.set(container, count);
    else attachedContainers.delete(container);
  }
};

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
 *
 * A container inside another engine's item, such as a list of images inside a
 * block of a sortable list, takes the presses made in it: a sensor starts a
 * drag only when the nearest container of any attached sensor is its own.
 * Subclasses call `super.attach()` and `super.detach()`.
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
    this.attached = false;
  }

  attach() {
    if (!this.attached) register(this.containers);
    this.attached = true;
    return this;
  }

  detach() {
    if (this.attached) unregister(this.containers);
    this.attached = false;
    return this;
  }

  addContainer(...containers) {
    this.containers = [...this.containers, ...containers];
    if (this.attached) register(containers);
  }

  removeContainer(...containers) {
    const removed = this.containers.filter(container => containers.includes(container));
    this.containers = this.containers.filter(container => !containers.includes(container));
    if (this.attached) unregister(removed);
  }

  /**
   * The container of this sensor's that a press on `element` belongs to: the nearest container
   * around it of any attached sensor, when that one is this sensor's
   *
   * @param {Node|null} element
   * @returns {HTMLElement|null}
   */
  containerFor(element) {
    const nearest = closest(element, [...attachedContainers.keys()]);
    return nearest && this.containers.includes(nearest) ? nearest : null;
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
