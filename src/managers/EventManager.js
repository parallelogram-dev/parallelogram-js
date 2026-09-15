/**
 * EventManager - Publish/subscribe event bus shared by the framework
 *
 * Listeners run synchronously in subscription order, and a listener that throws
 * is reported without stopping the others. Subscriptions can be tied to an
 * AbortSignal, so a component or manager removes all of its listeners at once.
 */
export class EventManager {
  /**
   * @param {Object} [options]
   * @param {{ error: (...args: unknown[]) => void }} [options.logger] - Receives listener errors;
   *   console.error is used otherwise
   */
  constructor({ logger } = {}) {
    this.logger = logger;
    /** @type {Map<string, Set<(payload: any) => void>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   *
   * @param {string} event
   * @param {(payload: any) => void} callback - Called with the emitted payload
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal] - Removes the listener when aborted
   * @returns {() => void} Function that removes the listener
   */
  on(event, callback, { signal } = {}) {
    if (signal?.aborted) return () => {};

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    const unsubscribe = () => this.off(event, callback);
    signal?.addEventListener('abort', unsubscribe, { once: true });
    return unsubscribe;
  }

  /**
   * Subscribe to the next emission of an event only.
   *
   * @param {string} event
   * @param {(payload: any) => void} callback - Called with the emitted payload
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal] - Removes the listener when aborted
   * @returns {() => void} Function that removes the listener
   */
  once(event, callback, options) {
    const unsubscribe = this.on(
      event,
      payload => {
        unsubscribe();
        callback(payload);
      },
      options
    );
    return unsubscribe;
  }

  /**
   * Remove one listener, or every listener for the event when no callback is given.
   *
   * @param {string} event
   * @param {(payload: any) => void} [callback]
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    if (callback === undefined) {
      this.listeners.delete(event);
      return;
    }

    listeners.delete(callback);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Call every listener for an event with a payload.
   *
   * @param {string} event
   * @param {unknown} [payload]
   */
  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    for (const callback of [...listeners]) {
      try {
        callback(payload);
      } catch (error) {
        const report = this.logger ? this.logger.error.bind(this.logger) : console.error;
        report(`[EventManager] Error in listener for "${event}":`, error);
      }
    }
  }

  /**
   * The number of listeners subscribed to an event.
   *
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Remove every listener for an event, or for all events when none is given.
   *
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
