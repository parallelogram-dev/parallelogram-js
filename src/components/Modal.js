/**
 * Modal - Modal dialog enhancement component
 * Works with PModal web component and data attributes for modal triggers
 * Follows new naming conventions: data-modal-* attributes
 *
 * @example
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal"
 *          data-modal-size="lg"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * Settings belong on <p-modal>. A trigger only overrides the ones it sets itself
 * (data-modal-size, data-modal-closable, data-modal-backdrop-close, data-modal-keyboard).
 * Opening a modal closes the others unless the trigger sets data-modal-multiple, and focus returns
 * to the trigger on close unless it sets data-modal-focus="false".
 *
 * Each open dispatches modal:opened once, on the trigger that opened the modal, and modal:closed goes
 * to the same trigger. When a script opens the modal, they go to its first mounted trigger. Every
 * trigger's aria-expanded follows the modal.
 *
 * JavaScript (standalone):
 * import Modal from '@parallelogram-js/core/components/Modal';
 * Modal.enhanceAll();
 */

import { BaseComponent } from '../core/BaseComponent.js';
import './PModal.js';
import { generateId, createElement } from '../utils/dom-utils.js';
import { trustedHTML } from '../utils/trusted.js';

/* The trigger whose open() call is opening each modal */
const openers = new WeakMap();
/* The trigger each modal's modal:opened went to, so modal:closed goes to the same one */
const reportedOn = new WeakMap();
/* p-modal:open and p-modal:close events one of the modal's triggers has already reported */
const reported = new WeakSet();

export default class Modal extends BaseComponent {
  static selector = 'data-modal';

  /**
   * Default options for modal enhancement
   */
  static get defaults() {
    return {
      /* Modal size: xs, sm, md, lg, xl, fullscreen */
      size: 'md',
      /* Whether modal can be closed */
      closable: true,
      /* Close on backdrop click */
      backdropClose: true,
      /* Enable keyboard navigation */
      keyboard: true,
      /* Auto-focus when opened */
      focus: true,
      /* Allow multiple modals */
      multiple: false,
      /* Where to append modal elements */
      appendTo: 'body',
    };
  }

  /**
   * Initialize modal enhancement for a trigger element
   * @protected
   * @param {HTMLElement} element - Trigger element to enhance
   * @returns {import('../core/BaseComponent.js').ComponentState} Component state
   */
  _init(element) {
    const state = super._init(element);

    /*
     * Get configuration from data attributes
     * Note: getAttr automatically adds component prefix (data-modal-)
     */
    const target = this.getAttr(element, 'target');
    const size = this.getAttr(element, 'size', Modal.defaults.size);
    const closable = this.getBoolAttr(element, 'closable', Modal.defaults.closable);
    const backdropClose = this.getBoolAttr(element, 'backdrop-close', Modal.defaults.backdropClose);
    const keyboard = this.getBoolAttr(element, 'keyboard', Modal.defaults.keyboard);
    const focus = this.getBoolAttr(element, 'focus', Modal.defaults.focus);
    const multiple = this.getBoolAttr(element, 'multiple', Modal.defaults.multiple);

    if (!target) {
      this.logger?.warn('Modal: No data-modal-target attribute found', element);
      return state;
    }

    /* Find or create target modal */
    let modalElement = document.querySelector(target);
    if (!modalElement) {
      this.logger?.warn('Modal: Target modal not found', { target, element });
      return state;
    }

    /* Ensure it's an p-modal element */
    if (modalElement.tagName.toLowerCase() !== 'p-modal') {
      this.logger?.warn('Modal: Target is not an p-modal element', { target, element });
      return state;
    }

    /* Forward only the settings this trigger sets, so <p-modal>'s own attributes win otherwise */
    const overrides = {};
    if (this.hasAttr(element, 'size')) overrides.size = size;
    if (this.hasAttr(element, 'closable')) overrides.closable = closable;
    if (this.hasAttr(element, 'backdrop-close')) overrides.backdropClose = backdropClose;
    if (this.hasAttr(element, 'keyboard')) overrides.keyboard = keyboard;
    this._configureModal(modalElement, overrides);

    /* Store state */
    state.target = target;
    state.modalElement = modalElement;
    state.size = size;
    state.closable = closable;
    state.backdropClose = backdropClose;
    state.keyboard = keyboard;
    state.focus = focus;
    state.multiple = multiple;

    /* Set up event listeners */
    element.addEventListener('click', this._handleTriggerClick.bind(this, element), {
      signal: state.controller.signal,
    });

    /* Listen for modal events */
    modalElement.addEventListener('p-modal:open', this._handleModalOpen.bind(this, element), {
      signal: state.controller.signal,
    });

    modalElement.addEventListener('p-modal:close', this._handleModalClose.bind(this, element), {
      signal: state.controller.signal,
    });

    /* Set up ARIA attributes */
    element.setAttribute('aria-haspopup', 'dialog');
    element.setAttribute('aria-expanded', 'false');
    if (!element.getAttribute('aria-controls')) {
      modalElement.id ||= generateId('modal');
      element.setAttribute('aria-controls', modalElement.id);
    }

    this.logger?.info('Modal trigger initialized', {
      element,
      target,
      size,
      closable,
    });

    return state;
  }

  /**
   * Open a modal, reporting modal:opened on this trigger
   * @param {HTMLElement} triggerElement - Trigger element
   */
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    /* Close other modals if multiple is not allowed */
    if (!state.multiple) {
      this._closeOtherModals(state.modalElement);
    }

    /* p-modal returns focus to the trigger when it closes, unless data-modal-focus="false" */
    openers.set(state.modalElement, triggerElement);
    try {
      state.modalElement.open({ returnFocus: state.focus ? triggerElement : null });
    } finally {
      openers.delete(state.modalElement);
    }
  }

  /**
   * Close a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  close(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (typeof state.modalElement.close === 'function') {
      state.modalElement.close();
    } else {
      this.logger?.error('PModal close method not available', state.modalElement);
    }
  }

  /**
   * Toggle a modal
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(triggerElement, force) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (force === true) {
      this.open(triggerElement);
    } else if (force === false) {
      this.close(triggerElement);
    } else {
      if (state.modalElement.hasAttribute('open')) {
        this.close(triggerElement);
      } else {
        this.open(triggerElement);
      }
    }
  }

  /**
   * Check if a modal is open
   * @param {HTMLElement} triggerElement - Trigger element
   * @returns {boolean} Whether modal is open
   */
  isOpen(triggerElement) {
    const state = this.getState(triggerElement);
    return state?.modalElement?.hasAttribute('open') || false;
  }

  /**
   * Configure modal element with data attributes
   * @private
   * @param {PModal} modalElement - Modal element
   * @param {Object} config - Configuration object
   */
  _configureModal(modalElement, config) {
    if (config.size) {
      this.setAttr(modalElement, 'size', config.size);
    }

    if (config.closable !== undefined) {
      this.setAttr(modalElement, 'closable', String(config.closable));
    }

    if (config.backdropClose !== undefined) {
      this.setAttr(modalElement, 'backdrop-close', String(config.backdropClose));
    }

    if (config.keyboard !== undefined) {
      this.setAttr(modalElement, 'keyboard', String(config.keyboard));
    }
  }

  /**
   * Handle trigger click
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Event} event - Click event
   */
  _handleTriggerClick(triggerElement, event) {
    event.preventDefault();
    this.open(triggerElement);
  }

  /**
   * Handle modal open event. Every trigger for the modal listens; the first to see the event
   * reports it once, on the trigger that opened the modal, or on itself when a script opened it.
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal open event
   */
  _handleModalOpen(triggerElement, event) {
    triggerElement.setAttribute('aria-expanded', 'true');
    if (reported.has(event)) return;
    reported.add(event);

    const modal = event.detail.modal;
    const trigger = openers.get(modal) ?? triggerElement;
    trigger.setAttribute('aria-expanded', 'true');
    reportedOn.set(modal, trigger);

    /* Dispatches on the trigger and emits on the event bus */
    this._dispatch(trigger, 'modal:opened', { trigger, modal });

    this.logger?.info('Modal opened', { triggerElement: trigger, modal });
  }

  /**
   * Handle modal close event, reporting it once on the trigger its open was reported on
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal close event
   */
  _handleModalClose(triggerElement, event) {
    triggerElement.setAttribute('aria-expanded', 'false');
    if (reported.has(event)) return;
    reported.add(event);

    const modal = event.detail.modal;
    const trigger = reportedOn.get(modal) ?? triggerElement;
    trigger.setAttribute('aria-expanded', 'false');
    reportedOn.delete(modal);

    /* Dispatches on the trigger and emits on the event bus */
    this._dispatch(trigger, 'modal:closed', { trigger, modal });

    this.logger?.info('Modal closed', { triggerElement: trigger, modal });
  }

  /**
   * Close other open modals, leaving any that cannot be closed
   * @private
   * @param {PModal} currentModal - Current modal to keep open
   */
  _closeOtherModals(currentModal) {
    const openModals = document.querySelectorAll('p-modal[open]');
    openModals.forEach(modal => {
      if (modal !== currentModal && modal.getAttribute('data-modal-closable') !== 'false') {
        modal.close();
      }
    });
  }

  /**
   * Update modal configuration
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Object} newConfig - New configuration
   */
  updateConfig(triggerElement, newConfig) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    /* Update state */
    Object.assign(state, newConfig);

    /* Update modal element */
    this._configureModal(state.modalElement, newConfig);

    this.logger?.info('Modal configuration updated', { triggerElement, newConfig });
  }

  /**
   * Static method to enhance all modal triggers on the page
   * @param {string} [selector='[data-modal][data-modal-target]'] - CSS selector
   * @param {Object} [options] - Component options
   * @returns {Modal} Modal instance
   */
  static enhanceAll(selector = '[data-modal][data-modal-target]', options) {
    const instance = new Modal(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }

  /**
   * Static method to create a modal programmatically
   *
   * The modal is appended to document.body and returned closed; call open() on it.
   *
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string|Node} config.content - Modal content. Strings are inserted as HTML, through
   *   the `parallelogram` Trusted Types policy where the page enforces Trusted Types, so only pass
   *   trusted markup; pass a Node for anything built from user data.
   * @param {Array<{label: string, type?: string, close?: boolean, onClick?: Function}>} [config.actions]
   *   Action buttons. Buttons close the modal unless close is false.
   * @param {string} [config.size='md'] - Modal size: xs, sm, md, lg, xl or fullscreen
   * @param {Object} [config.options] - Additional data-modal-* attributes
   * @returns {Promise<PModal>} Modal element
   */
  static async create({ title, content, actions = [], size = 'md', options = {} }) {
    /* Create modal element */
    const modal = document.createElement('p-modal');
    modal.id = generateId('modal');

    /* Configure attributes */
    modal.setAttribute('data-modal-size', size);
    Object.entries(options).forEach(([key, value]) => {
      modal.setAttribute(`data-modal-${key}`, String(value));
    });

    /* Create title */
    if (title) {
      const titleElement = createElement('h2', { slot: 'title' }, title);
      modal.appendChild(titleElement);
    }

    /* Create content */
    if (content) {
      const contentElement = document.createElement('div');
      if (content instanceof Node) {
        contentElement.append(content);
      } else {
        contentElement.innerHTML = trustedHTML(content);
      }
      modal.appendChild(contentElement);
    }

    /* Create actions */
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.slot = 'actions';

      actions.forEach(action => {
        const button = createElement(
          'button',
          {
            type: 'button',
            className: `btn btn--${action.type || 'secondary'}`,
            ...(action.close !== false && { 'data-modal-close': '' }),
          },
          action.label
        );

        if (action.onClick) {
          button.addEventListener('click', action.onClick);
        }

        actionsContainer.appendChild(button);
      });

      modal.appendChild(actionsContainer);
    }

    /* Append to document */
    document.body.appendChild(modal);
    return modal;
  }
}
