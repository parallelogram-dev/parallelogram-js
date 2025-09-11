import { BaseComponent } from '@peptolab/parallelogram';
/**
 * Scrollreveal Component
 *
 * Progressive enhancement for scroll-triggered reveal animations.
 * Integrates with TransitionManager for flexible CSS or JS-based animations.
 *
 * @example
 * HTML:
 * <!-- Basic scroll reveal -->
 * <div data-scrollreveal>
 *   <h2>This will fade in when scrolled into view</h2>
 * </div>
 *
 * <!-- Custom animation configuration -->
 * <section data-scrollreveal
 *          data-reveal-threshold="0.2"
 *          data-reveal-delay="100"
 *          data-transition-y="2rem"
 *          data-transition-duration="500">
 *   Content with custom reveal settings
 * </section>
 *
 * <!-- CSS-based animation -->
 * <div data-scrollreveal
 *      data-scrollreveal-class="slide-up"
 *      data-reveal-once="false">
 *   Uses CSS animation classes
 * </div>
 *
 * <!-- Staggered reveals -->
 * <div data-scrollreveal data-reveal-stagger="150">
 *   <div data-scrollreveal-item>Item 1</div>
 *   <div data-scrollreveal-item>Item 2</div>
 *   <div data-scrollreveal-item>Item 3</div>
 * </div>
 *
 * JavaScript (standalone):
 * import { Scrollreveal } from './components/Scrollreveal.js';
 * const scrollreveal = new Scrollreveal({ transitionManager });
 * document.querySelectorAll('[data-scrollreveal]')
 *   .forEach(element => scrollreveal.mount(element));
 */
export class Scrollreveal extends BaseComponent {
    /**
     * Default configuration for scrollreveal component
     * @returns {Object} Default config
     */
    static get defaults() {
        return {
            threshold: 0.1,          // Intersection threshold (0.0 to 1.0)
            rootMargin: '0px',       // Root margin for intersection observer
            once: true,              // Only animate once when first seen
            delay: 0,                // Delay before animation starts (ms)
            stagger: 0,              // Stagger delay for multiple items (ms)
            initialState: 'hidden'   // Initial state: 'hidden' or 'visible'
        };
    }

    /**
     * Constructor
     * @param {Object} options - Component options
     * @param {Object} options.transitionManager - TransitionManager instance
     */
    constructor(options = {}) {
        super(options);

        // TransitionManager is optional if using CSS classes
        this.transitionManager = options.transitionManager;

        // Create intersection observer
        this._createObserver();
    }

    /**
     * Create intersection observer for scroll detection
     * @private
     */
    _createObserver() {
        const observerOptions = {
            root: null,
            rootMargin: Scrollreveal.defaults.rootMargin,
            threshold: Scrollreveal.defaults.threshold
        };

        this.observer = new IntersectionObserver(
            this._handleIntersection.bind(this),
            observerOptions
        );

        this.logger?.info('Scrollreveal intersection observer created', observerOptions);
    }

    /**
     * Initialize the scrollreveal functionality on an element
     * @param {HTMLElement} element - Element with data-scrollreveal attribute
     * @returns {Object} State object for this element
     */
    _init(element) {
        const state = super._init(element);

        // Get configuration from data attributes
        const threshold = this._getDataAttr(element, 'reveal-threshold', Scrollreveal.defaults.threshold);
        const once = this._getDataAttr(element, 'reveal-once', Scrollreveal.defaults.once);
        const delay = this._getDataAttr(element, 'reveal-delay', Scrollreveal.defaults.delay);
        const stagger = this._getDataAttr(element, 'reveal-stagger', Scrollreveal.defaults.stagger);
        const initialState = this._getDataAttr(element, 'reveal-initial', Scrollreveal.defaults.initialState);

        // Store state
        state.threshold = parseFloat(threshold);
        state.once = Boolean(once);
        state.delay = parseInt(delay, 10);
        state.stagger = parseInt(stagger, 10);
        state.initialState = initialState;
        state.hasBeenRevealed = false;
        state.isRevealing = false;

        // Find reveal items (for staggered animations)
        const items = element.querySelectorAll('[data-scrollreveal-item]');
        state.items = items.length > 0 ? Array.from(items) : [element];

        // Set initial state
        this._setInitialState(element, state);

        // Create observer with element-specific threshold if needed
        if (state.threshold !== Scrollreveal.defaults.threshold) {
            state.customObserver = new IntersectionObserver(
                this._handleIntersection.bind(this),
                {
                    root: null,
                    rootMargin: Scrollreveal.defaults.rootMargin,
                    threshold: state.threshold
                }
            );
            state.customObserver.observe(element);
        } else {
            this.observer.observe(element);
        }

        // Setup cleanup
        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            if (state.customObserver) {
                state.customObserver.unobserve(element);
                state.customObserver.disconnect();
            } else {
                this.observer.unobserve(element);
            }
            originalCleanup();
        };

        this.eventBus?.emit('scrollreveal:mount', {
            element,
            itemCount: state.items.length,
            threshold: state.threshold,
            timestamp: performance.now()
        });

        this.logger?.info('Scrollreveal initialized', {
            element,
            itemCount: state.items.length,
            threshold: state.threshold,
            once: state.once,
            stagger: state.stagger
        });

        return state;
    }

    /**
     * Set initial state for reveal elements
     * @private
     * @param {HTMLElement} element - Container element
     * @param {Object} state - Component state
     */
    _setInitialState(element, state) {
        if (state.initialState === 'hidden') {
            state.items.forEach(item => {
                // Check if using CSS class animation
                const revealClass = item.dataset.scrollrevealClass ||
                                  element.dataset.scrollrevealClass;

                if (!revealClass) {
                    // Only set inline styles if not using CSS classes
                    item.style.opacity = '0';

                    // Get transition settings for initial transform
                    const y = item.dataset.transitionY ||
                             (this.transitionManager?.defaults?.y || '1rem');
                    item.style.transform = `translateY(${y})`;
                }

                // Mark as not yet revealed
                item.setAttribute('data-reveal-state', 'hidden');
            });
        }
    }

    /**
     * Handle intersection observer entries
     * @private
     * @param {IntersectionObserverEntry[]} entries - Observer entries
     */
    _handleIntersection(entries) {
        entries.forEach(entry => {
            const element = entry.target;
            const state = this.getState(element);

            if (!state) return;

            if (entry.isIntersecting && !state.hasBeenRevealed && !state.isRevealing) {
                this._revealElement(element, state);
            } else if (!entry.isIntersecting && !state.once && state.hasBeenRevealed) {
                this._hideElement(element, state);
            }
        });
    }

    /**
     * Reveal an element with animation
     * @private
     * @param {HTMLElement} element - Container element
     * @param {Object} state - Component state
     */
    async _revealElement(element, state) {
        state.isRevealing = true;

        this.eventBus?.emit('scrollreveal:reveal-start', {
            element,
            itemCount: state.items.length,
            timestamp: performance.now()
        });

        try {
            // Apply base delay
            if (state.delay > 0) {
                await this._delay(state.delay);
            }

            // Animate items (with stagger if specified)
            if (state.stagger > 0 && state.items.length > 1) {
                await this._revealWithStagger(state.items, state.stagger, element);
            } else {
                await this._revealItems(state.items, element);
            }

            // Mark as revealed
            state.hasBeenRevealed = true;

            // Stop observing if once is true
            if (state.once) {
                if (state.customObserver) {
                    state.customObserver.unobserve(element);
                } else {
                    this.observer.unobserve(element);
                }
            }

            this.eventBus?.emit('scrollreveal:reveal-complete', {
                element,
                itemCount: state.items.length,
                timestamp: performance.now()
            });

            this.logger?.debug('Scrollreveal animation completed', {
                element,
                itemCount: state.items.length
            });

        } catch (error) {
            this.logger?.error('Scrollreveal animation failed', { element, error });

            this.eventBus?.emit('scrollreveal:reveal-error', {
                element,
                error,
                timestamp: performance.now()
            });
        } finally {
            state.isRevealing = false;
        }
    }

    /**
     * Hide an element with animation (for non-once reveals)
     * @private
     * @param {HTMLElement} element - Container element
     * @param {Object} state - Component state
     */
    async _hideElement(element, state) {
        if (state.once) return;

        try {
            await this._hideItems(state.items, element);
            state.hasBeenRevealed = false;

            this.eventBus?.emit('scrollreveal:hide-complete', {
                element,
                itemCount: state.items.length,
                timestamp: performance.now()
            });

        } catch (error) {
            this.logger?.error('Scrollreveal hide animation failed', { element, error });
        }
    }

    /**
     * Reveal items with stagger effect
     * @private
     * @param {HTMLElement[]} items - Items to reveal
     * @param {number} staggerDelay - Delay between items
     * @param {HTMLElement} container - Container element
     */
    async _revealWithStagger(items, staggerDelay, container) {
        const promises = items.map((item, index) => {
            return this._delay(index * staggerDelay).then(() => {
                return this._revealItems([item], container);
            });
        });

        await Promise.all(promises);
    }

    /**
     * Reveal items using CSS class or TransitionManager
     * @private
     * @param {HTMLElement[]} items - Items to reveal
     * @param {HTMLElement} container - Container element
     */
    async _revealItems(items, container) {
        const promises = items.map(async (item) => {
            item.setAttribute('data-reveal-state', 'revealing');

            try {
                // Check for CSS class-based animation first
                const revealClass = item.dataset.scrollrevealClass ||
                                  container.dataset.scrollrevealClass;

                if (revealClass) {
                    // Use CSS class animation
                    await this._animateWithClass(item, revealClass);
                } else if (this.transitionManager) {
                    // Use TransitionManager JS animation
                    await this.transitionManager.enter(item);
                } else {
                    // Fallback to simple opacity/transform
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }
                item.setAttribute('data-reveal-state', 'visible');
            } catch (error) {
                item.setAttribute('data-reveal-state', 'error');
                throw error;
            }
        });

        await Promise.all(promises);
    }

    /**
     * Hide items using CSS class or TransitionManager
     * @private
     * @param {HTMLElement[]} items - Items to hide
     * @param {HTMLElement} container - Container element
     */
    async _hideItems(items, container) {
        const promises = items.map(async (item) => {
            item.setAttribute('data-reveal-state', 'hiding');

            try {
                // Check for CSS class-based animation first
                const revealClass = item.dataset.scrollrevealClass ||
                                  container.dataset.scrollrevealClass;
                const exitClass = item.dataset.scrollrevealExitClass ||
                                container.dataset.scrollrevealExitClass;

                if (exitClass) {
                    // Use specific exit class
                    await this._animateWithClass(item, exitClass);
                } else if (revealClass) {
                    // Just remove the reveal class
                    item.classList.remove(revealClass);
                } else if (this.transitionManager) {
                    // Use TransitionManager JS animation
                    await this.transitionManager.exit(item);
                } else {
                    // Fallback to simple opacity/transform
                    const y = item.dataset.transitionY || '1rem';
                    item.style.opacity = '0';
                    item.style.transform = `translateY(${y})`;
                }
                item.setAttribute('data-reveal-state', 'hidden');
            } catch (error) {
                item.setAttribute('data-reveal-state', 'error');
                throw error;
            }
        });

        await Promise.all(promises);
    }

    /**
     * Animate element with CSS class
     * @private
     * @param {HTMLElement} element - Element to animate
     * @param {string} className - CSS class name
     * @returns {Promise} Animation completion promise
     */
    _animateWithClass(element, className) {
        return new Promise((resolve) => {
            const handleAnimationEnd = () => {
                element.removeEventListener('animationend', handleAnimationEnd);
                element.removeEventListener('transitionend', handleAnimationEnd);
                // Don't automatically remove the class - let CSS handle persistence
                resolve();
            };

            // Listen for both animation and transition end events
            element.addEventListener('animationend', handleAnimationEnd, { once: true });
            element.addEventListener('transitionend', handleAnimationEnd, { once: true });

            // Add the class to trigger the animation
            element.classList.add(className);

            // Fallback timeout in case events don't fire
            setTimeout(() => {
                element.removeEventListener('animationend', handleAnimationEnd);
                element.removeEventListener('transitionend', handleAnimationEnd);
                resolve();
            }, 2000);
        });
    }

    /**
     * Create a delay promise
     * @private
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Manually trigger reveal animation
     * @param {HTMLElement} element - Container element
     */
    async reveal(element) {
        const state = this.getState(element);
        if (!state || state.hasBeenRevealed || state.isRevealing) return;

        await this._revealElement(element, state);
    }

    /**
     * Manually trigger hide animation
     * @param {HTMLElement} element - Container element
     */
    async hide(element) {
        const state = this.getState(element);
        if (!state || !state.hasBeenRevealed) return;

        await this._hideElement(element, state);
    }

    /**
     * Reset element to initial state
     * @param {HTMLElement} element - Container element
     */
    reset(element) {
        const state = this.getState(element);
        if (!state) return;

        // Reset state
        state.hasBeenRevealed = false;
        state.isRevealing = false;

        // Reset visual state
        this._setInitialState(element, state);

        // Resume observing if needed
        if (state.once) {
            if (state.customObserver) {
                state.customObserver.observe(element);
            } else {
                this.observer.observe(element);
            }
        }

        this.logger?.debug('Scrollreveal reset', { element });
    }

    /**
     * Check if element has been revealed
     * @param {HTMLElement} element - Container element
     * @returns {boolean} Whether the element has been revealed
     */
    isRevealed(element) {
        const state = this.getState(element);
        return state ? state.hasBeenRevealed : false;
    }

    /**
     * Update intersection observer threshold
     * @param {HTMLElement} element - Container element
     * @param {number} threshold - New threshold (0.0 to 1.0)
     */
    updateThreshold(element, threshold) {
        const state = this.getState(element);
        if (!state) return;

        state.threshold = threshold;

        // Recreate observer with new threshold
        if (state.customObserver) {
            state.customObserver.disconnect();
        }

        state.customObserver = new IntersectionObserver(
            this._handleIntersection.bind(this),
            {
                root: null,
                rootMargin: Scrollreveal.defaults.rootMargin,
                threshold
            }
        );

        state.customObserver.observe(element);

        this.logger?.info('Scrollreveal threshold updated', { element, threshold });
    }

    /**
     * Get component status and statistics
     * @returns {Object} Component status
     */
    getStatus() {
        const elements = document.querySelectorAll('[data-scrollreveal-enhanced="true"]');
        let revealedCount = 0;
        let revealingCount = 0;
        let totalItems = 0;

        elements.forEach(element => {
            const state = this.getState(element);
            if (state) {
                totalItems += state.items.length;
                if (state.hasBeenRevealed) revealedCount++;
                if (state.isRevealing) revealingCount++;
            }
        });

        return {
            totalElements: elements.length,
            totalItems,
            revealedCount,
            revealingCount,
            observerActive: !!this.observer,
            defaults: Scrollreveal.defaults
        };
    }

    /**
     * Clean up intersection observer
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        super.destroy();
        this.logger?.info('Scrollreveal destroyed');
    }

    /**
     * Enhance all scrollreveal elements on the page
     * @param {string} selector - CSS selector for scrollreveal elements
     * @param {Object} options - Component options
     * @returns {Scrollreveal} Component instance
     */
    static enhanceAll(selector = '[data-scrollreveal]', options) {
        const instance = new Scrollreveal(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }
}