/**
 * Base class for every event the Draggable port emits.
 *
 * Mirrors Shopify Draggable's AbstractEvent: an event carries a `type`, a
 * plain `data` bag (exposed as read-only properties, so `event.source` works),
 * and — when the class is cancelable — `cancel()` / `canceled()`.
 */
export class AbstractEvent {
  static type = 'event';
  static cancelable = false;

  constructor(data = {}) {
    this._canceled = false;
    this.data = data;
    for (const key of Object.keys(data)) {
      if (!(key in this)) {
        Object.defineProperty(this, key, { get: () => this.data[key], enumerable: true });
      }
    }
  }

  get type() {
    return this.constructor.type;
  }

  get cancelable() {
    return this.constructor.cancelable;
  }

  cancel() {
    this._canceled = true;
  }

  canceled() {
    return this._canceled;
  }

  /** Copy of this event with some data overridden. */
  clone(data) {
    return new this.constructor({ ...this.data, ...data });
  }
}

/**
 * Define a concrete event class in one line.
 *
 * @param {string} type - Event name, e.g. 'drag:start'
 * @param {{ cancelable?: boolean, base?: typeof AbstractEvent }} [options]
 */
export function defineEvent(type, { cancelable = false, base = AbstractEvent } = {}) {
  return class extends base {
    static type = type;
    static cancelable = cancelable;
  };
}
