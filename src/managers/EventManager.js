export class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);
    listeners.add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const unsubscribe = this.on(event, payload => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    const listenersCopy = [...listeners];
    for (const callback of listenersCopy) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[EventManager] Error in listener for "${event}":`, error);
      }
    }
  }

  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
