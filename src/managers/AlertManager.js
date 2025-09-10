import { XToasts } from '../components/XToasts.js';

export class AlertManager {
  constructor({ logger, eventBus, placement = 'top-right', container } = {}) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.toastElement = this._getOrCreateToastElement(placement, container);
    this._setupEventForwarding();
    this.logger?.info('AlertManager initialized', { placement });
  }

  info(message, options = {}) {
    return this.toast({ message, type: 'info', ...options });
  }

  success(message, options = {}) {
    return this.toast({ message, type: 'success', ...options });
  }

  warn(message, options = {}) {
    return this.toast({ message, type: 'warn', ...options });
  }

  error(message, options = {}) {
    return this.toast({ message, type: 'error', timeout: 6000, ...options });
  }

  toast(options) {
    const dismiss = this.toastElement.toast(options);
    this.logger?.info('Toast shown', options);
    return dismiss;
  }

  _getOrCreateToastElement(placement, container = document.body) {
    let toastElement = document.querySelector('x-toasts');
    if (!toastElement) {
      toastElement = document.createElement('x-toasts');
      container.appendChild(toastElement);
      this.logger?.info('Created new x-toasts element');
    }
    toastElement.setAttribute('placement', placement);
    return toastElement;
  }

  _setupEventForwarding() {
    if (!this.eventBus) return;
    const events = ['toast:show', 'toast:close', 'toast:action'];
    events.forEach(eventName => {
      this.toastElement.addEventListener(eventName, (event) => {
        this.eventBus.emit(`alerts:${eventName.split(':')[1]}`, event.detail);
      });
    });
  }

  static notify(message, type = 'info', options = {}) {
    if (!AlertManager._globalInstance) {
      AlertManager._globalInstance = new AlertManager();
    }
    return AlertManager._globalInstance.toast({ message, type, ...options });
  }
}