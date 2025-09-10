export class BaseComponent {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.elements = new WeakMap();
    this._elementKeys = new Set();
  }

  mount(element) {
    if (this.elements.has(element)) {
      return this.update(element);
    }
    try {
      const state = this._init(element);
      this.elements.set(element, state);
      this._elementKeys.add(element);
      this.logger?.info('Component mounted', element);
    } catch (error) {
      this.logger?.error('Failed to mount component', error);
    }
  }

  update(element) {
    const state = this.elements.get(element);
    if (!state) return;
    this.logger?.info('Component updated', element);
  }

  unmount(element) {
    const state = this.elements.get(element);
    if (!state) return;
    try {
      state.cleanup();
      this.elements.delete(element);
      this._elementKeys.delete(element);
    } catch (error) {
      this.logger?.error('Failed to unmount component', error);
    }
  }

  getState(element) {
    return this.elements.get(element);
  }

  _init(element) {
    const controller = new AbortController();
    return { cleanup: () => controller.abort(), controller };
  }

  _getDataAttr(element, name, defaultValue) {
    const value = element.getAttribute(`data-${name}`);
    if (value === null) return defaultValue;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === '') return true;
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) return numValue;
    return value;
  }

  _dispatch(element, eventName, detail, bubbles = true) {
    const event = new CustomEvent(eventName, { detail, bubbles, cancelable: true });
    return element.dispatchEvent(event);
  }
}