import { BaseComponent } from '@peptolab/parallelogram';
/**
 * Scrollhide Component
 *
 * Progressive enhancement for scroll-responsive element behavior.
 * Hides/shows elements based on scroll direction and position with overlay effects.
 *
 * @example
 * HTML:
 * <!-- Basic scroll-hiding menu -->
 * <nav data-scrollhide class="main-nav">
 *   <a href="/">Home</a>
 *   <a href="/about">About</a>
 * </nav>
 *
 * <!-- Custom configuration -->
 * <header data-scrollhide
 *         data-scroll-threshold="50"
 *         data-overlay-threshold="100"
 *         class="site-header">
 *   Navigation content
 * </header>
 *
 * <!-- Manual targeting -->
 * <div data-scrollhide data-scrollhide-target="#floating-menu">
 *   <nav id="floating-menu">Menu items</nav>
 * </div>
 *
 * JavaScript (standalone):
 * import { Scrollhide } from './components/Scrollhide.js';
 * const scrollhide = new Scrollhide();
 * document.querySelectorAll('[data-scrollhide]')
 *   .forEach(element => scrollhide.mount(element));
 */
export class Scrollhide extends BaseComponent {
    /**
     * Default configuration for scrollhide component
     * @returns {Object} Default config
     */
    static get defaults() {
        return {
            scrollThreshold: 50,     // Pixels scrolled before hiding/showing
            overlayThreshold: 100,   // Pixels scrolled before adding overlay class
            scrolledClass: 'scrollhide',      // Class added when element should hide
            overlayClass: 'scrolloverlay',    // Class added for overlay effect
            debounceMs: 16,          // Scroll event debouncing (60fps)
            passive: true            // Use passive scroll listeners
        };
    }

    /**
     * Initialize the scrollhide functionality on an element
     * @param {HTMLElement} element - Element with data-scrollhide attribute
     * @returns {Object} State object for this element
     */
    _init(element) {
        const state = super._init(element);

        // Get target element (could be self or specified target)
        const targetSelector = this._getDataAttr(element, 'scrollhide-target');
        const target = targetSelector ? document.querySelector(targetSelector) : element;

        if (!target) {
            this.logger?.warn('Scrollhide: Target element not found', {
                selector: targetSelector,
                element
            });
            return state;
        }

        // Get configuration from data attributes
        const scrollThreshold = this._getDataAttr(element, 'scroll-threshold', Scrollhide.defaults.scrollThreshold);
        const overlayThreshold = this._getDataAttr(element, 'overlay-threshold', Scrollhide.defaults.overlayThreshold);
        const scrolledClass = this._getDataAttr(element, 'scrolled-class', Scrollhide.defaults.scrolledClass);
        const overlayClass = this._getDataAttr(element, 'overlay-class', Scrollhide.defaults.overlayClass);
        const debounceMs = this._getDataAttr(element, 'debounce', Scrollhide.defaults.debounceMs);

        // Store state
        state.target = target;
        state.targetSelector = targetSelector;
        state.scrollThreshold = parseInt(scrollThreshold, 10);
        state.overlayThreshold = parseInt(overlayThreshold, 10);
        state.scrolledClass = scrolledClass;
        state.overlayClass = overlayClass;
        state.currentY = 0;
        state.lastY = 0;
        state.ticking = false;

        // Create throttled scroll handler
        const scrollHandler = this._createScrollHandler(element, state);
        const throttledHandler = this._throttle(scrollHandler, debounceMs);

        // Set up scroll listener
        window.addEventListener('scroll', throttledHandler, {
            passive: Scrollhide.defaults.passive
        });

        // Store handler for cleanup
        state.scrollHandler = throttledHandler;

        // Setup cleanup
        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            window.removeEventListener('scroll', state.scrollHandler);
            if (state.animationFrame) {
                cancelAnimationFrame(state.animationFrame);
            }
            originalCleanup();
        };

        // Initial position check
        this._updateElementState(element, state);

        this.eventBus?.emit('scrollhide:mount', {
            element,
            target,
            scrollThreshold: state.scrollThreshold,
            overlayThreshold: state.overlayThreshold,
            timestamp: performance.now()
        });

        this.logger?.info('Scrollhide initialized', {
            element,
            target: targetSelector || 'self',
            scrollThreshold: state.scrollThreshold,
            overlayThreshold: state.overlayThreshold
        });

        return state;
    }

    /**
     * Create scroll event handler for an element
     * @private
     * @param {HTMLElement} element - Element with scrollhide
     * @param {Object} state - Component state
     * @returns {Function} Scroll handler function
     */
    _createScrollHandler(element, state) {
        return () => {
            if (!state.ticking) {
                state.animationFrame = requestAnimationFrame(() => {
                    this._onScroll(element, state);
                    state.ticking = false;
                });
                state.ticking = true;
            }
        };
    }

    /**
     * Handle scroll events
     * @private
     * @param {HTMLElement} element - Element with scrollhide
     * @param {Object} state - Component state
     */
    _onScroll(element, state) {
        state.currentY = window.scrollY;

        this._updateElementState(element, state);

        // Update last position for next comparison
        state.lastY = state.currentY;
    }

    /**
     * Update element state based on scroll position
     * @private
     * @param {HTMLElement} element - Element with scrollhide
     * @param {Object} state - Component state
     */
    _updateElementState(element, state) {
        const { target, currentY, lastY, scrollThreshold, overlayThreshold, scrolledClass, overlayClass } = state;

        // Handle overlay class (for background/styling effects)
        const hasOverlay = target.classList.contains(overlayClass);
        if (currentY > overlayThreshold && !hasOverlay) {
            target.classList.add(overlayClass);
            this._emitStateChange(element, 'overlay-added', { scrollY: currentY });
        } else if (currentY <= overlayThreshold && hasOverlay) {
            target.classList.remove(overlayClass);
            this._emitStateChange(element, 'overlay-removed', { scrollY: currentY });
        }

        // Handle scroll hide/show behavior
        const isHidden = target.classList.contains(scrolledClass);

        // Show element when at top of page
        if (currentY <= 0) {
            if (isHidden) {
                target.classList.remove(scrolledClass);
                this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'top' });
            }
            return;
        }

        // Hide element when scrolling down past threshold
        if (currentY > scrollThreshold && currentY > lastY && !isHidden) {
            target.classList.add(scrolledClass);
            this._emitStateChange(element, 'hidden', { scrollY: currentY, reason: 'scroll-down' });
        }
        // Show element when scrolling up
        else if (currentY < lastY && isHidden) {
            target.classList.remove(scrolledClass);
            this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'scroll-up' });
        }
    }

    /**
     * Emit state change events
     * @private
     * @param {HTMLElement} element - Element with scrollhide
     * @param {string} action - Action that occurred
     * @param {Object} data - Additional event data
     */
    _emitStateChange(element, action, data) {
        const state = this.getState(element);

        // DOM event
        this._dispatch(element, `scrollhide:${action}`, {
            target: state.target,
            ...data
        });

        // Framework event
        this.eventBus?.emit(`scrollhide:${action}`, {
            element,
            target: state.target,
            timestamp: performance.now(),
            ...data
        });

        this.logger?.debug(`Scrollhide ${action}`, {
            element,
            target: state.targetSelector || 'self',
            ...data
        });
    }

    /**
     * Manually show the element
     * @param {HTMLElement} element - Element with scrollhide
     */
    show(element) {
        const state = this.getState(element);
        if (!state) return;

        state.target.classList.remove(state.scrolledClass);
        this._emitStateChange(element, 'shown', {
            scrollY: state.currentY,
            reason: 'manual'
        });
    }

    /**
     * Manually hide the element
     * @param {HTMLElement} element - Element with scrollhide
     */
    hide(element) {
        const state = this.getState(element);
        if (!state) return;

        state.target.classList.add(state.scrolledClass);
        this._emitStateChange(element, 'hidden', {
            scrollY: state.currentY,
            reason: 'manual'
        });
    }

    /**
     * Toggle element visibility
     * @param {HTMLElement} element - Element with scrollhide
     */
    toggle(element) {
        const state = this.getState(element);
        if (!state) return;

        if (this.isHidden(element)) {
            this.show(element);
        } else {
            this.hide(element);
        }
    }

    /**
     * Check if element is currently hidden
     * @param {HTMLElement} element - Element with scrollhide
     * @returns {boolean} Whether the element is hidden
     */
    isHidden(element) {
        const state = this.getState(element);
        return state ? state.target.classList.contains(state.scrolledClass) : false;
    }

    /**
     * Check if element has overlay effect active
     * @param {HTMLElement} element - Element with scrollhide
     * @returns {boolean} Whether the overlay is active
     */
    hasOverlay(element) {
        const state = this.getState(element);
        return state ? state.target.classList.contains(state.overlayClass) : false;
    }

    /**
     * Get current scroll position
     * @param {HTMLElement} element - Element with scrollhide
     * @returns {number} Current scroll Y position
     */
    getScrollPosition(element) {
        const state = this.getState(element);
        return state ? state.currentY : window.scrollY;
    }

    /**
     * Update thresholds dynamically
     * @param {HTMLElement} element - Element with scrollhide
     * @param {Object} options - New threshold values
     * @param {number} [options.scrollThreshold] - New scroll threshold
     * @param {number} [options.overlayThreshold] - New overlay threshold
     */
    updateThresholds(element, { scrollThreshold, overlayThreshold }) {
        const state = this.getState(element);
        if (!state) return;

        if (typeof scrollThreshold === 'number') {
            state.scrollThreshold = scrollThreshold;
        }

        if (typeof overlayThreshold === 'number') {
            state.overlayThreshold = overlayThreshold;
        }

        // Re-evaluate current state with new thresholds
        this._updateElementState(element, state);

        this.logger?.info('Scrollhide thresholds updated', {
            element,
            scrollThreshold: state.scrollThreshold,
            overlayThreshold: state.overlayThreshold
        });
    }

    /**
     * Create a throttled function
     * @private
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    _throttle(func, delay) {
        let timeoutId = null;
        let lastExecTime = 0;

        return function (...args) {
            const currentTime = Date.now();

            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Get component status and statistics
     * @returns {Object} Component status
     */
    getStatus() {
        const elements = document.querySelectorAll('[data-scrollhide-enhanced="true"]');
        let hiddenCount = 0;
        let overlayCount = 0;

        elements.forEach(element => {
            const state = this.getState(element);
            if (state) {
                if (this.isHidden(element)) hiddenCount++;
                if (this.hasOverlay(element)) overlayCount++;
            }
        });

        return {
            totalElements: elements.length,
            hiddenCount,
            overlayCount,
            currentScrollY: window.scrollY,
            defaults: Scrollhide.defaults
        };
    }

    /**
     * Enhance all scrollhide elements on the page
     * @param {string} selector - CSS selector for scrollhide elements
     * @param {Object} options - Component options
     * @returns {Scrollhide} Component instance
     */
    static enhanceAll(selector = '[data-scrollhide]', options) {
        const instance = new Scrollhide(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }
}