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
 *          data-modal-size="large"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="modal__button modal__button--secondary" data-modal-close>Cancel</button>
 *     <button class="modal__button modal__button--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * JavaScript (standalone):
 * import { Modal } from './components/Modal.js';
 * const modals = new Modal();
 * document.querySelectorAll('[data-modal]')
 *   .forEach(trigger => modals.mount(trigger));
 */

import { BaseComponent } from '@peptolab/parallelogram';
import { PModal } from './PModal.js';

export class Modal extends BaseComponent {
    /**
     * Default options for modal enhancement
     */
    static get defaults() {
        return {
            size: 'medium',              // Modal size: small, medium, large, fullscreen
            closable: true,              // Whether modal can be closed
            backdropClose: true,         // Close on backdrop click
            keyboard: true,              // Enable keyboard navigation
            focus: true,                 // Auto-focus when opened
            multiple: false,             // Allow multiple modals
            appendTo: 'body'             // Where to append modal elements
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

        // Get configuration from data attributes
        const target = this._getDataAttr(element, 'modal-target');
        const size = this._getDataAttr(element, 'modal-size', Modal.defaults.size);
        const closable = this._getDataAttr(element, 'modal-closable', Modal.defaults.closable);
        const backdropClose = this._getDataAttr(element, 'modal-backdrop-close', Modal.defaults.backdropClose);
        const keyboard = this._getDataAttr(element, 'modal-keyboard', Modal.defaults.keyboard);
        const focus = this._getDataAttr(element, 'modal-focus', Modal.defaults.focus);
        const multiple = this._getDataAttr(element, 'modal-multiple', Modal.defaults.multiple);

        if (!target) {
            this.logger?.warn('Modal: No data-modal-target attribute found', element);
            return state;
        }

        // Find or create target modal
        let modalElement = document.querySelector(target);
        if (!modalElement) {
            this.logger?.warn('Modal: Target modal not found', {target, element});
            return state;
        }

        // Ensure it's an p-modal element
        if (modalElement.tagName.toLowerCase() !== 'p-modal') {
            this.logger?.warn('Modal: Target is not an p-modal element', {target, element});
            return state;
        }

        // Configure modal attributes
        this._configureModal(modalElement, {
            size,
            closable,
            backdropClose,
            keyboard
        });

        // Store state
        state.target = target;
        state.modalElement = modalElement;
        state.size = size;
        state.closable = closable;
        state.backdropClose = backdropClose;
        state.keyboard = keyboard;
        state.focus = focus;
        state.multiple = multiple;

        // Set up event listeners
        element.addEventListener('click', this._handleTriggerClick.bind(this, element), {
            signal: state.controller.signal
        });

        // Listen for modal events
        modalElement.addEventListener('modal:open', this._handleModalOpen.bind(this, element), {
            signal: state.controller.signal
        });

        modalElement.addEventListener('modal:close', this._handleModalClose.bind(this, element), {
            signal: state.controller.signal
        });

        // Set up ARIA attributes
        element.setAttribute('aria-haspopup', 'dialog');
        element.setAttribute('aria-expanded', 'false');
        if (!element.getAttribute('aria-controls')) {
            element.setAttribute('aria-controls', target.replace('#', ''));
        }

        this.logger?.info('Modal trigger initialized', {
            element,
            target,
            size,
            closable
        });

        return state;
    }

    /**
     * Open a modal
     * @param {HTMLElement} triggerElement - Trigger element
     */
    open(triggerElement) {
        const state = this.getState(triggerElement);
        if (!state?.modalElement) return;

        // Close other modals if multiple is not allowed
        if (!state.multiple) {
            this._closeOtherModals(state.modalElement);
        }

        // Store the trigger element for focus restoration
        state.modalElement._triggerElement = triggerElement;

        // Open the modal
        state.modalElement.open();
    }

    /**
     * Close a modal
     * @param {HTMLElement} triggerElement - Trigger element
     */
    close(triggerElement) {
        const state = this.getState(triggerElement);
        if (!state?.modalElement) return;

        state.modalElement.close();
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
            modalElement.setAttribute('data-modal-size', config.size);
        }

        if (config.closable !== undefined) {
            modalElement.setAttribute('data-modal-closable', String(config.closable));
        }

        if (config.backdropClose !== undefined) {
            modalElement.setAttribute('data-modal-backdrop-close', String(config.backdropClose));
        }

        if (config.keyboard !== undefined) {
            modalElement.setAttribute('data-modal-keyboard', String(config.keyboard));
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
     * Handle modal open event
     * @private
     * @param {HTMLElement} triggerElement - Trigger element
     * @param {CustomEvent} event - Modal open event
     */
    _handleModalOpen(triggerElement, event) {
        // Update ARIA attributes
        triggerElement.setAttribute('aria-expanded', 'true');

        // Dispatch enhancement event
        this._dispatch(triggerElement, 'modal:opened', {
            trigger: triggerElement,
            modal: event.detail.modal
        });

        // Emit to event bus if available
        this.eventBus?.emit('modal:opened', {
            trigger: triggerElement,
            modal: event.detail.modal
        });

        this.logger?.info('Modal opened', {triggerElement, modal: event.detail.modal});
    }

    /**
     * Handle modal close event
     * @private
     * @param {HTMLElement} triggerElement - Trigger element
     * @param {CustomEvent} event - Modal close event
     */
    _handleModalClose(triggerElement, event) {
        // Update ARIA attributes
        triggerElement.setAttribute('aria-expanded', 'false');

        // Restore focus to trigger
        const state = this.getState(triggerElement);
        if (state?.focus && event.detail.modal._triggerElement) {
            requestAnimationFrame(() => {
                event.detail.modal._triggerElement.focus();
            });
        }

        // Dispatch enhancement event
        this._dispatch(triggerElement, 'modal:closed', {
            trigger: triggerElement,
            modal: event.detail.modal
        });

        // Emit to event bus if available
        this.eventBus?.emit('modal:closed', {
            trigger: triggerElement,
            modal: event.detail.modal
        });

        this.logger?.info('Modal closed', {triggerElement, modal: event.detail.modal});
    }

    /**
     * Close other open modals
     * @private
     * @param {PModal} currentModal - Current modal to keep open
     */
    _closeOtherModals(currentModal) {
        const openModals = document.querySelectorAll('p-modal[open]');
        openModals.forEach(modal => {
            if (modal !== currentModal) {
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

        // Update state
        Object.assign(state, newConfig);

        // Update modal element
        this._configureModal(state.modalElement, newConfig);

        this.logger?.info('Modal configuration updated', {triggerElement, newConfig});
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
     * @param {Object} config - Modal configuration
     * @param {string} config.title - Modal title
     * @param {string} config.content - Modal content (HTML)
     * @param {Array} [config.actions] - Action buttons
     * @param {string} [config.size] - Modal size
     * @param {Object} [config.options] - Additional options
     * @returns {Promise<PModal>} Modal element
     */
    static async create({
                            title,
                            content,
                            actions = [],
                            size = 'medium',
                            options = {}
                        }) {
        // Create modal element
        const modal = document.createElement('p-modal');
        modal.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Configure attributes
        modal.setAttribute('data-modal-size', size);
        Object.entries(options).forEach(([key, value]) => {
            modal.setAttribute(`data-modal-${key}`, String(value));
        });

        // Create title
        if (title) {
            const titleElement = document.createElement('h2');
            titleElement.slot = 'title';
            titleElement.textContent = title;
            modal.appendChild(titleElement);
        }

        // Create content
        if (content) {
            const contentElement = document.createElement('div');
            contentElement.innerHTML = content;
            modal.appendChild(contentElement);
        }

        // Create actions
        if (actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.slot = 'actions';

            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `modal__button modal__button--${action.type || 'secondary'}`;
                button.textContent = action.label;

                if (action.close !== false) {
                    button.setAttribute('data-modal-close', '');
                }

                if (action.onClick) {
                    button.addEventListener('click', action.onClick);
                }

                actionsContainer.appendChild(button);
            });

            modal.appendChild(actionsContainer);
        }

        // Append to document
        document.body.appendChild(modal);
    }
}