import '../components/PToasts.js';

/**
 * AlertManager - the programmatic API for toast notifications
 *
 * Shows toasts through the page's `p-toasts`, creating one in `container` (the body by default) when
 * the page has none, and finding it again if the one it used is removed. The Toast component and
 * `AlertManager.notify()` both go through it.
 */
export class AlertManager {
  constructor({ logger, eventBus, placement = 'top-right', container } = {}) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.placement = placement;
    this.container = container;
    this.toastElement = null;
    this._forwarding = null;
    this._connect();
    this.logger?.info('AlertManager initialized', { placement });
  }

  info(message, options = {}) {
    return this.toast({ message, type: 'info', ...options });
  }

  success(message, options = {}) {
    return this.toast({ message, type: 'success', ...options });
  }

  warn(message, options = {}) {
    return this.toast({ message, type: 'warning', ...options });
  }

  error(message, options = {}) {
    return this.toast({ message, type: 'error', ...options });
  }

  /**
   * Show a toast
   *
   * @param {Object} options `p-toasts` toast() options: message, type, title, timeout, dismissible
   * @returns {Function} Closes the toast
   */
  toast(options) {
    if (!this.toastElement?.isConnected) {
      this._connect();
    }
    const dismiss = this.toastElement.toast(options);
    this.logger?.info('Toast shown', options);
    return dismiss;
  }

  /**
   * Use the page's p-toasts, creating one when there is none, and forward its events
   */
  _connect() {
    let element = document.querySelector('p-toasts');
    if (!element) {
      element = document.createElement('p-toasts');
      element.setAttribute('placement', this.placement);
      (this.container ?? document.body).append(element);
      this.logger?.info('Created new p-toasts element');
    }
    if (element === this.toastElement) return;

    this.toastElement = element;
    this._forwarding?.abort();
    if (!this.eventBus) return;

    this._forwarding = new AbortController();
    for (const eventName of ['p-toasts:show', 'p-toasts:close']) {
      element.addEventListener(
        eventName,
        event => this.eventBus.emit(`alerts:${eventName.split(':')[1]}`, event.detail),
        { signal: this._forwarding.signal }
      );
    }
  }

  /**
   * Show a toast through a shared AlertManager, created on first use
   *
   * @param {string} message
   * @param {string} [type='info']
   * @param {Object} [options] Any other toast() options
   * @returns {Function} Closes the toast
   */
  static notify(message, type = 'info', options = {}) {
    if (!AlertManager._globalInstance) {
      AlertManager._globalInstance = new AlertManager();
    }
    return AlertManager._globalInstance.toast({ ...options, message, type });
  }
}
