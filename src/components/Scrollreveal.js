import {BaseComponent} from '@peptolab/parallelogram';

/**
 * Scrollreveal Component with Global Staggering
 *
 * Now supports staggering between multiple data-scrollreveal elements
 */
export default class Scrollreveal extends BaseComponent {
    static get defaults() {
        return {
            threshold: 0.1,
            rootMargin: '0px',
            once: true,
            delay: 0,
            globalStagger: 0,        // NEW: Stagger delay between separate elements
            initialState: 'hidden'
        };
    }

    constructor(options = {}) {
        super(options);
        this.transitionManager = options.transitionManager;

        // Track all elements for global staggering
        this.revealQueue = [];
        this.globalStaggerDelay = options.globalStagger || 0;
        this.revealIndex = 0;

        this._createObserver();
    }

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

    _init(element) {
        if (this.revealIndex > 0 && document.querySelectorAll('[data-scrollreveal-enhanced="true"]').length === 0) {
            this.resetRevealOrder();
        }

        const state = super._init(element);

        // Get configuration from data attributes
        const threshold = this._getDataAttr(element, 'reveal-threshold', Scrollreveal.defaults.threshold);
        const once = this._getDataAttr(element, 'reveal-once', Scrollreveal.defaults.once);
        const delay = this._getDataAttr(element, 'reveal-delay', Scrollreveal.defaults.delay);
        const globalStagger = this._getDataAttr(element, 'reveal-global-stagger', this.globalStaggerDelay);
        const initialState = this._getDataAttr(element, 'reveal-initial', Scrollreveal.defaults.initialState);

        // Store state
        state.threshold = parseFloat(threshold);
        state.once = Boolean(once);
        state.delay = parseInt(delay, 10);
        state.globalStagger = parseInt(globalStagger, 10);
        state.initialState = initialState;
        state.hasBeenRevealed = false;
        state.isRevealing = false;
        state.revealOrder = null; // Will be set when element enters viewport

        // For global staggering, each element is treated as a single item
        state.items = [element];

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

            // Remove from reveal queue
            this.revealQueue = this.revealQueue.filter(item => item.element !== element);

            originalCleanup();
        };

        this.eventBus?.emit('scrollreveal:mount', {
            element,
            threshold: state.threshold,
            globalStagger: state.globalStagger,
            timestamp: performance.now()
        });

        this.logger?.info('Scrollreveal initialized', {
            element,
            threshold: state.threshold,
            once: state.once,
            globalStagger: state.globalStagger
        });

        return state;
    }

    _setInitialState(element, state) {
        if (state.initialState === 'hidden') {
            // Check if using CSS class animation
            const revealClass = element.dataset.scrollrevealClass;

            if (!revealClass) {
                // Only set inline styles if not using CSS classes
                element.style.opacity = '0';

                // Get transition settings for initial transform
                const y = element.dataset.transitionY || '1rem';
                element.style.transform = `translateY(${y})`;
            }

            // Mark as not yet revealed
            element.setAttribute('data-reveal-state', 'hidden');
        }
    }

    _handleIntersection(entries) {
        entries.forEach(entry => {
            const element = entry.target;
            const state = this.getState(element);

            if (!state) return;

            if (entry.isIntersecting && !state.hasBeenRevealed && !state.isRevealing) {
                // Add to reveal queue for global staggering
                if (state.globalStagger > 0) {
                    this._addToRevealQueue(element, state);
                } else {
                    // Reveal immediately if no global stagger
                    this._revealElement(element, state);
                }
            } else if (!entry.isIntersecting && !state.once && state.hasBeenRevealed) {
                this._hideElement(element, state);
            }
        });
    }

    /**
     * Add element to global reveal queue for staggered animation
     * @private
     * @param {HTMLElement} element - Element to reveal
     * @param {Object} state - Component state
     */
    _addToRevealQueue(element, state) {
        state.revealOrder = this.revealIndex++;
        this.revealQueue.push({element, state, timestamp: performance.now()});

        // Use RAF to process queue on next frame
        if (!this._queueScheduled) {
            this._queueScheduled = true;
            requestAnimationFrame(() => {
                this._processRevealQueue();
                this._queueScheduled = false;
            });
        }
    }

    /**
     * Process the reveal queue with global staggering
     * @private
     */
    async _processRevealQueue() {
        if (this.revealQueue.length === 0) return;

        // Sort queue by reveal order
        this.revealQueue.sort((a, b) => a.state.revealOrder - b.state.revealOrder);

        // Process immediately on RAF tick
        for (const {element, state} of this.revealQueue) {
            if (state.isRevealing || state.hasBeenRevealed) continue;

            // Calculate delay but don't wait for it here
            const totalDelay = state.delay + (state.revealOrder * state.globalStagger);

            if (totalDelay === 0) {
                // Reveal immediately on this frame
                this._revealElement(element, state, false);
            } else {
                // Schedule with setTimeout as before
                setTimeout(() => {
                    if (!state.hasBeenRevealed && !state.isRevealing) {
                        this._revealElement(element, state, false);
                    }
                }, totalDelay);
            }
        }
    }

    /**
     * Reveal an element with animation
     * @private
     * @param {HTMLElement} element - Element to reveal
     * @param {Object} state - Component state
     * @param {boolean} applyDelay - Whether to apply the element's delay
     */
    async _revealElement(element, state, applyDelay = true) {
        state.isRevealing = true;

        this.eventBus?.emit('scrollreveal:reveal-start', {
            element,
            revealOrder: state.revealOrder,
            timestamp: performance.now()
        });

        try {
            // Apply element-specific delay only if not already handled by global stagger
            if (applyDelay && state.delay > 0) {
                await this._delay(state.delay);
            }

            // Animate the element
            await this._revealItems([element], element);

            // Mark as revealed
            state.hasBeenRevealed = true;

            // Remove from queue
            this.revealQueue = this.revealQueue.filter(item => item.element !== element);

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
                revealOrder: state.revealOrder,
                timestamp: performance.now()
            });

            this.logger?.debug('Scrollreveal animation completed', {
                element,
                revealOrder: state.revealOrder
            });

        } catch (error) {
            this.logger?.error('Scrollreveal animation failed', {element, error});

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
            await this._hideItems([element], element);
            state.hasBeenRevealed = false;

            // Reset reveal order for potential re-staggering
            state.revealOrder = null;

            this.eventBus?.emit('scrollreveal:hide-complete', {
                element,
                timestamp: performance.now()
            });

        } catch (error) {
            this.logger?.error('Scrollreveal hide animation failed', {element, error});
        }
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
                const revealClass = item.dataset.scrollrevealClass;

                if (revealClass) {
                    // Use CSS class animation
                    await this._animateWithClass(item, revealClass);
                } else if (this.transitionManager) {
                    // Use TransitionManager JS animation
                    await this.transitionManager.enter(item);
                } else {
                    // Fallback to simple opacity/transform
                    item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
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
                const revealClass = item.dataset.scrollrevealClass;
                const exitClass = item.dataset.scrollrevealExitClass;

                if (exitClass) {
                    await this._animateWithClass(item, exitClass);
                } else if (revealClass) {
                    item.classList.remove(revealClass);
                } else if (this.transitionManager) {
                    await this.transitionManager.exit(item);
                } else {
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
                resolve();
            };

            element.addEventListener('animationend', handleAnimationEnd, {once: true});
            element.addEventListener('transitionend', handleAnimationEnd, {once: true});

            element.classList.add(className);

            // Fallback timeout
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
     * Set global stagger delay for all future elements
     * @param {number} delay - Stagger delay in milliseconds
     */
    setGlobalStagger(delay) {
        this.globalStaggerDelay = delay;
    }

    /**
     * Reset the reveal index (useful for resetting stagger order)
     */
    resetRevealOrder() {
        this.revealIndex = 0;
        this.revealQueue = [];
    }

    /**
     * Get component status and statistics
     * @returns {Object} Component status
     */
    getStatus() {
        const elements = document.querySelectorAll('[data-scrollreveal-enhanced="true"]');
        let revealedCount = 0;
        let revealingCount = 0;

        elements.forEach(element => {
            const state = this.getState(element);
            if (state) {
                if (state.hasBeenRevealed) revealedCount++;
                if (state.isRevealing) revealingCount++;
            }
        });

        return {
            totalElements: elements.length,
            revealedCount,
            revealingCount,
            queuedCount: this.revealQueue.length,
            globalStaggerDelay: this.globalStaggerDelay,
            observerActive: !!this.observer,
            defaults: Scrollreveal.defaults
        };
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.revealQueue = [];
        this.revealIndex = 0;

        super.destroy();
        this.logger?.info('Scrollreveal destroyed');
    }

    static enhanceAll(selector = '[data-scrollreveal]', options) {
        const instance = new Scrollreveal(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }
}