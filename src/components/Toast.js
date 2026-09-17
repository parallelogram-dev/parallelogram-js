import { BaseComponent } from '../core/BaseComponent.js';
import { AlertManager } from '../managers/AlertManager.js';

/**
 * Toast - show a toast when a trigger is clicked
 *
 * A small bridge from markup to AlertManager. Clicking a `[data-toast-trigger]` element shows its
 * message through the page's `p-toasts`, which AlertManager creates when the page has none. The
 * attributes are read on each click, so a page can change the message before it is shown.
 *
 * @example
 * <button data-toast-trigger="success" data-toast-message="Booking saved" data-toast-title="Done">
 *   Save
 * </button>
 *
 * @attributes
 * - data-toast-trigger: the toast type, info (default), success, warning or error; warn and danger
 *   are aliases
 * - data-toast-message: the message
 * - data-toast-title: an optional title
 * - data-toast-duration: milliseconds before the toast closes, or 0 to keep it; defaults to 4000,
 *   and error toasts stay until dismissed
 * - data-toast-dismissible: "false" leaves out the dismiss button
 *
 * @events
 * - toast:shown: dispatched on the trigger with `{ message, type, title, duration, dismissible }`
 */
export default class Toast extends BaseComponent {
  static selector = 'data-toast';

  static defaults = {
    defaultType: 'info',
  };

  _init(element) {
    const state = super._init(element);

    if (!element.hasAttribute('data-toast-trigger')) {
      this.logger?.warn('Toast mounted on an element without data-toast-trigger', element);
      return state;
    }

    element.addEventListener(
      'click',
      event => {
        event.preventDefault();
        this._showFor(element);
      },
      { signal: state.controller.signal }
    );

    element.setAttribute('data-toast-enhanced', 'true');

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeAttribute('data-toast-enhanced');
      baseCleanup();
    };

    this.eventBus?.emit('toast:mount', {
      element,
      message: this.getAttr(element, 'message'),
      type: this.getAttr(element, 'trigger') || Toast.defaults.defaultType,
      timestamp: performance.now(),
    });

    return state;
  }

  /**
   * Show the toast a trigger describes
   */
  _showFor(element) {
    const message = this.getAttr(element, 'message');
    if (!message) {
      this.logger?.warn('Toast trigger has no data-toast-message', element);
      return;
    }

    const options = {
      message,
      type: this.getAttr(element, 'trigger') || Toast.defaults.defaultType,
      title: this.getAttr(element, 'title') ?? undefined,
      duration: this.getNumberAttr(element, 'duration') ?? undefined,
      dismissible: this.getBoolAttr(element, 'dismissible', true),
    };

    Toast.show(message, options.type, options);
    this._dispatch(element, 'toast:shown', { ...options, timestamp: performance.now() });
  }

  /**
   * Show a toast through the page's AlertManager
   *
   * @param {string} message
   * @param {string} [type='info']
   * @param {Object} [options] Any other `p-toasts` toast() options
   * @returns {Function} Closes the toast
   */
  static show(message, type = 'info', options = {}) {
    return AlertManager.notify(message, type, options);
  }

  getStatus() {
    return {
      mountedTriggers: this.trackedElements().length,
      defaults: Toast.defaults,
    };
  }

  static enhanceAll(selector = '[data-toast-trigger][data-toast-message]', options) {
    const instance = new Toast(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
