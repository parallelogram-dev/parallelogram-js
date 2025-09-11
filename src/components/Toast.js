import { BaseComponent } from '@peptolab/parallelogram';
/**
 * Toast Component
 *
 * Handles data-toast-trigger elements and bridges to the existing PToasts web component
 * and AlertManager system.
 *
 * @example
 * HTML:
 * <button data-toast-trigger="info" data-toast-message="Hello World!">Show Toast</button>
 * <button data-toast-trigger="success"
 *         data-toast-message="Operation completed"
 *         data-toast-duration="5000">Success Toast</button>
 *
 * <p-toasts placement="top-right"></p-toasts>
 *
 * JavaScript (standalone):
 * import { Toast } from './components/Toast.js';
 * const toasts = new Toast();
 * document.querySelectorAll('[data-toast-trigger]')
 *   .forEach(trigger => toasts.mount(trigger));
 */
export default class Toast extends BaseComponent {
    /**
     * Default configuration for toast component
     * @returns {Object} Default config
     */
    static get defaults() {
        return {
            defaultDuration: 4000,
            defaultType: 'info',
            fadeOutDuration: 300,
            typeMapping: {
                'info': 'info',
                'success': 'success',
                'warn': 'warning',
                'warning': 'warning',
                'error': 'error',
                'danger': 'error'
            }
        };
    }

    /**
     * Initialize the toast trigger on an element
     * @param {HTMLElement} element - Element with data-toast-trigger attribute
     * @returns {Object} State object for this element
     */
    _init(element) {
        const state = super._init(element);

        const message = this._getDataAttr(element, 'toast-message');
        const type = this._getDataAttr(element, 'toast-trigger', Toast.defaults.defaultType);
        const duration = parseInt(this._getDataAttr(element, 'toast-duration', Toast.defaults.defaultDuration));
        const title = this._getDataAttr(element, 'toast-title');
        const dismissible = this._getDataAttr(element, 'toast-dismissible', 'true') !== 'false';

        if (!element.hasAttribute('data-toast-trigger')) {
            this.logger?.warn('Toast component mounted on element without data-toast-trigger attribute', element);
            return state;
        }

        if (!message) {
            this.logger?.warn('Toast trigger missing data-toast-message attribute', element);
            return state;
        }

        // Store configuration in state
        state.message = message;
        state.type = type;
        state.duration = duration;
        state.title = title;
        state.dismissible = dismissible;

        // Create bound click handler for this specific element
        const clickHandler = (event) => this._handleClick(event, element);

        // Add click listener
        element.addEventListener('click', clickHandler);

        // Mark as enhanced
        element.setAttribute('data-toast-enhanced', 'true');
        element.classList.add('toast-trigger--enhanced');

        // Store cleanup function
        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            element.removeEventListener('click', clickHandler);
            element.removeAttribute('data-toast-enhanced');
            element.classList.remove('toast-trigger--enhanced');
            originalCleanup();
        };

        // Emit mount event
        this.eventBus?.emit('toast:mount', {
            element,
            message,
            type,
            timestamp: performance.now()
        });

        this.logger?.debug('Toast trigger initialized', {
            element,
            message,
            type,
            duration
        });

        return state;
    }

    /**
     * Handle click events on toast triggers
     * @param {Event} event - Click event
     * @param {HTMLElement} element - The trigger element
     */
    _handleClick(event, element) {
        // Prevent default behavior
        event.preventDefault();

        const state = this.getState(element);
        if (!state) {
            this.logger?.warn('Toast trigger clicked but no state found', element);
            return;
        }

        // Map type if needed
        const alertType = Toast.defaults.typeMapping[state.type] || state.type;

        // Show the toast
        this._showToast({
            message: state.message,
            type: alertType,
            duration: state.duration,
            title: state.title,
            dismissible: state.dismissible,
            trigger: element
        });
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @param {string} options.message - Toast message
     * @param {string} options.type - Toast type (info, success, warning, error)
     * @param {number} options.duration - Display duration in ms
     * @param {string} options.title - Optional title
     * @param {boolean} options.dismissible - Whether toast can be dismissed
     * @param {HTMLElement} options.trigger - Element that triggered the toast
     */
    _showToast(options) {
        const {
            message,
            type = Toast.defaults.defaultType,
            duration = Toast.defaults.defaultDuration,
            title,
            dismissible = true,
            trigger
        } = options;

        try {
            // Use AlertManager if available, otherwise try direct PToasts
            if (window.alertManager && typeof window.alertManager.show === 'function') {
                window.alertManager.show({
                    message,
                    type,
                    duration,
                    title,
                    dismissible
                });
            } else {
                // Fallback: try to use PToasts directly
                const toastContainer = document.querySelector('p-toasts');
                if (toastContainer && typeof toastContainer.toast === 'function') {
                    toastContainer.toast({
                        message,
                        type,
                        duration,
                        title,
                        dismissible
                    });
                } else {
                    // Final fallback: simple alert
                    this.logger?.warn('No toast system available, falling back to alert');
                    alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
                }
            }

            // Dispatch custom event on the trigger element
            this._dispatch(trigger, 'toast:shown', {
                message,
                type,
                duration,
                title
            });

            // Emit success event
            this.eventBus?.emit('toast:show', {
                message,
                type,
                duration,
                title,
                trigger,
                timestamp: performance.now()
            });

            this.logger?.info('Toast shown', { message, type, duration, title });

        } catch (error) {
            this.logger?.error('Failed to show toast', error);

            // Dispatch error event on the trigger element
            this._dispatch(trigger, 'toast:error', {
                error: error.message,
                message,
                type
            });

            // Emit error event
            this.eventBus?.emit('toast:error', {
                error: error.message,
                options,
                trigger,
                timestamp: performance.now()
            });

            // Fallback to alert
            alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
        }
    }

    /**
     * Programmatically trigger a toast (for use by other components)
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @param {Object} options - Additional options
     */
    static show(message, type = 'info', options = {}) {
        const toast = new Toast();
        toast._showToast({
            message,
            type,
            ...options
        });
    }

    /**
     * Get component status and statistics
     * @returns {Object} Component status
     */
    getStatus() {
        const triggers = document.querySelectorAll('[data-toast-enhanced="true"]');

        return {
            mountedTriggers: triggers.length,
            availableTypes: Object.keys(Toast.defaults.typeMapping),
            alertManagerAvailable: !!(window.alertManager && typeof window.alertManager.show === 'function'),
            xToastsAvailable: !!document.querySelector('p-toasts'),
            defaults: Toast.defaults
        };
    }

    /**
     * Enhance all toast triggers on the page
     * @param {string} selector - CSS selector for toast triggers
     * @param {Object} options - Component options
     * @returns {Toast} Component instance
     */
    static enhanceAll(selector = '[data-toast-trigger][data-toast-message]', options) {
        const instance = new Toast(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }
}