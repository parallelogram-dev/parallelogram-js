import '../components/PToasts.js';

/**
 * @typedef {'info'|'success'|'warning'|'error'} ToastType
 */

/**
 * The options `p-toasts` toast() takes
 *
 * @typedef {Object} ToastOptions
 * @property {string} message
 * @property {ToastType|'warn'|'danger'} [type='info'] - `warn` and `danger` are read as `warning`
 *   and `error`
 * @property {string} [title]
 * @property {number} [timeout]
 * @property {boolean} [dismissible]
 * @property {boolean} [allowHTML]
 */

/**
 * AlertManager - the programmatic API for toast notifications
 *
 * Shows toasts through the page's `p-toasts`, creating one in `container` (the body by default) when
 * the page has none, and finding it again if the one it used is removed. The Toast component and
 * `AlertManager.notify()` both go through it.
 */
export class AlertManager {
  /**
   * @param {Object} [options]
   * @param {import('../core/DevLogger.js').DevLogger} [options.logger]
   * @param {import('./EventManager.js').EventManager} [options.eventBus] - Receives `alerts:show`
   *   and `alerts:close` for the toasts shown
   * @param {'top-right'|'top-left'|'top-center'|'bottom-right'|'bottom-left'|'bottom-center'} [options.placement='top-right'] -
   *   The placement of a `p-toasts` it creates
   * @param {HTMLElement} [options.container] - Where it creates a `p-toasts`; the body by default
   */
  constructor({ logger, eventBus, placement = 'top-right', container } = {}) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.placement = placement;
    this.container = container;
    /** @type {import('../components/PToasts.js').default | null} */
    this.toastElement = null;
    /** @internal */
    this._forwarding = null;
    this._connect();
    this.logger?.info('AlertManager initialized', { placement });
  }

  /**
   * @param {string} message
   * @param {Omit<ToastOptions, 'message'|'type'>} [options]
   * @returns {() => void} Closes the toast
   */
  info(message, options = {}) {
    return this.toast({ message, type: 'info', ...options });
  }

  /**
   * @param {string} message
   * @param {Omit<ToastOptions, 'message'|'type'>} [options]
   * @returns {() => void} Closes the toast
   */
  success(message, options = {}) {
    return this.toast({ message, type: 'success', ...options });
  }

  /**
   * @param {string} message
   * @param {Omit<ToastOptions, 'message'|'type'>} [options]
   * @returns {() => void} Closes the toast
   */
  warn(message, options = {}) {
    return this.toast({ message, type: 'warning', ...options });
  }

  /**
   * @param {string} message
   * @param {Omit<ToastOptions, 'message'|'type'>} [options]
   * @returns {() => void} Closes the toast
   */
  error(message, options = {}) {
    return this.toast({ message, type: 'error', ...options });
  }

  /**
   * Show a toast
   *
   * @param {ToastOptions} options
   * @returns {() => void} Closes the toast
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
   *
   * @internal
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
   * @param {ToastType} [type='info']
   * @param {Omit<ToastOptions, 'message'|'type'>} [options] Any other toast() options
   * @returns {() => void} Closes the toast
   */
  static notify(message, type = 'info', options = {}) {
    if (!AlertManager._globalInstance) {
      AlertManager._globalInstance = new AlertManager();
    }
    return AlertManager._globalInstance.toast({ ...options, message, type });
  }
}
