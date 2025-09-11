import {BaseComponent} from "./BaseComponent.js";

/**
 * QueuedComponentProxy - Placeholder component for async loading
 */
export class QueuedComponentProxy extends BaseComponent {
  constructor(onMount, onUnmount) {
    // Provide minimal services for proxy
    super({
      eventBus: { on() {}, emit() {} },
      logger: { info() {}, error() {}, enabled: false },
      router: null
    });
    this._onMount = onMount;
    this._onUnmount = onUnmount;
  }

  mount(element) {
    this._onMount(element);
  }

  unmount(element) {
    this._onUnmount(element);
  }
}