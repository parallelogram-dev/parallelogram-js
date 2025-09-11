import {BaseComponent} from '../core/BaseComponent.js';

export class Lazyimage extends BaseComponent {
    static get defaults() {
        return {
            threshold: '200px',
            fadeIn: true,
            retryAttempts: 3,
            retryDelay: 1000,
            placeholderClass: 'lazy-image--loading',
            loadedClass: 'lazy-image--loaded',
            errorClass: 'lazy-image--error',
            preferNativeLoading: true,
            nativeLoadingThreshold: '500px'
        };
    }

    _init(element) {
        const state = super._init(element);

        const src = this._getDataAttr(element, 'lazyimage-src');
        const threshold = this._getDataAttr(element, 'lazyimage-threshold', Lazyimage.defaults.threshold);
        const fadeIn = this._getDataAttr(element, 'lazyimage-fadein', Lazyimage.defaults.fadeIn);
        const preferNative = this._getDataAttr(element, 'lazyimage-native', Lazyimage.defaults.preferNativeLoading);

        if (!src) {
            this.logger?.warn('Lazyimage: No data-lazyimage-src attribute found', element);
            return state;
        }

        // Check if we should use native loading="lazy"
        if (preferNative && this._shouldUseNativeLoading(element, threshold)) {
            this._setupNativeLoading(element, src, {fadeIn}, state);
        } else {
            this._setupIntersectionObserver(element, src, threshold, {fadeIn}, state);
        }

        state.src = src;
        state.loaded = false;
        state.retryCount = 0;

        this.logger?.info('Lazyimage initialized', {
            element,
            src,
            threshold,
            strategy: state.strategy
        });

        return state;
    }

    /**
     * Determine if we should use native loading="lazy"
     */
    _shouldUseNativeLoading(element, threshold) {
        // Check browser support
        if (!('loading' in HTMLImageElement.prototype)) {
            return false;
        }

        // If element already has loading attribute, respect it
        if (element.hasAttribute('loading')) {
            return element.getAttribute('loading') === 'lazy';
        }

        // Use native for larger thresholds (further from viewport)
        const thresholdPx = parseInt(threshold);
        const nativeThresholdPx = parseInt(Lazyimage.defaults.nativeLoadingThreshold);

        return thresholdPx >= nativeThresholdPx;
    }

    /**
     * Setup native loading="lazy" with load event monitoring
     */
    _setupNativeLoading(element, src, options, state) {
        state.strategy = 'native';

        element.classList.add(Lazyimage.defaults.placeholderClass);

        // Set up load/error handlers before setting src
        const loadHandler = () => this._handleImageLoad(element, src, options, state);
        const errorHandler = () => this._handleImageError(element, src, state);

        element.addEventListener('load', loadHandler, {once: true});
        element.addEventListener('error', errorHandler, {once: true});

        // Set native lazy loading and src
        element.setAttribute('loading', 'lazy');
        element.src = src;

        // Store cleanup
        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            element.removeEventListener('load', loadHandler);
            element.removeEventListener('error', errorHandler);
            originalCleanup();
        };
    }

    /**
     * Setup intersection observer for custom lazy loading
     */
    _setupIntersectionObserver(element, src, threshold, options, state) {
        state.strategy = 'intersection';

        element.classList.add(Lazyimage.defaults.placeholderClass);

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this._loadImage(element, src, options, state);
                    observer.disconnect();
                }
            }
        }, {
            rootMargin: threshold,
            threshold: 0.1
        });

        observer.observe(element);
        state.observer = observer;

        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            observer.disconnect();
            originalCleanup();
        };
    }

    /**
     * Load image with intersection observer approach
     */
    _loadImage(element, src, options, state) {
        const img = new Image();

        img.onload = () => this._handleImageLoad(element, src, options, state);
        img.onerror = () => this._handleImageError(element, src, state);

        img.src = src;
    }

    /**
     * Handle successful image load - CLEANUP AND DETACH
     */
    _handleImageLoad(element, src, options, state) {
        if (!state || state.loaded) return;

        state.loaded = true;

        // Update element
        if (element.src !== src) {
            element.src = src;
        }

        element.classList.remove(Lazyimage.defaults.placeholderClass, Lazyimage.defaults.errorClass);
        element.classList.add(Lazyimage.defaults.loadedClass);

        // Apply fade in effect
        if (options.fadeIn) {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease-in-out';
            requestAnimationFrame(() => {
                element.style.opacity = '1';
            });
        }

        // Dispatch events
        this._dispatch(element, 'lazy:loaded', {src, strategy: state.strategy});
        this.eventBus?.emit('lazy-image:loaded', {element, src, strategy: state.strategy});

        this.logger?.info('Lazyimage: Successfully loaded', {element, src, strategy: state.strategy});

        // OPTIMIZATION: Immediately cleanup and detach this instance
        this._immediateCleanup(element, state);
    }

    /**
     * Handle image load error with retry logic
     */
    _handleImageError(element, src, state) {
        if (!state) return;

        state.retryCount = (state.retryCount || 0) + 1;

        // Try retry if attempts remaining
        if (state.retryCount < Lazyimage.defaults.retryAttempts) {
            this.logger?.warn(`Lazyimage: Load failed, retrying (${state.retryCount}/${Lazyimage.defaults.retryAttempts})`, {
                element,
                src
            });

            setTimeout(() => {
                if (state.strategy === 'native') {
                    // For native loading, just retry by setting src again
                    element.src = src;
                } else {
                    // For intersection observer, trigger load again
                    this._loadImage(element, src, {fadeIn: this._getDataAttr(element, 'lazyimage-fadein', Lazyimage.defaults.fadeIn)}, state);
                }
            }, Lazyimage.defaults.retryDelay);

            return;
        }

        // Max retries exceeded - mark as error and cleanup
        element.classList.remove(Lazyimage.defaults.placeholderClass);
        element.classList.add(Lazyimage.defaults.errorClass);

        this._dispatch(element, 'lazy:error', {src, retryCount: state.retryCount});
        this.eventBus?.emit('lazy-image:error', {element, src, retryCount: state.retryCount});

        this.logger?.error('Lazyimage: Failed to load after retries', {element, src, retryCount: state.retryCount});

        // Cleanup after error
        this._immediateCleanup(element, state);
    }

    /**
     * Immediately cleanup and detach component instance from element
     */
    _immediateCleanup(element, state) {
        // Mark element as no longer needing lazy loading
        element.setAttribute('data-lazyimage-complete', 'true');
        element.removeAttribute('data-lazyimage-src'); // Remove to prevent re-initialization

        // Run the cleanup function to remove observers/listeners
        if (state.cleanup) {
            state.cleanup();
        }

        // Remove state from component
        this._removeState(element);

        // Emit detachment event
        this.eventBus?.emit('lazy-image:detached', {
            element,
            reason: state.loaded ? 'loaded' : 'error',
            strategy: state.strategy
        });

        this.logger?.debug('Lazyimage: Component detached from element', {element, loaded: state.loaded});
    }

    /**
     * Remove state for an element (helper method)
     */
    _removeState(element) {
        if (this.states && this.states.has && this.states.has(element)) {
            this.states.delete(element);
        }
    }

    /**
     * Get current loading statistics
     */
    getLoadingStats() {
        const allImages = document.querySelectorAll('[data-lazyimage-src], [data-lazyimage-complete]');
        const loading = document.querySelectorAll('[data-lazyimage-src]:not([data-lazyimage-complete])');
        const completed = document.querySelectorAll('[data-lazyimage-complete]');
        const errors = document.querySelectorAll('[data-lazyimage-complete].lazy-image--error');

        return {
            total: allImages.length,
            loading: loading.length,
            completed: completed.length - errors.length,
            errors: errors.length,
            nativeSupported: 'loading' in HTMLImageElement.prototype
        };
    }

    /**
     * Enhanced static helper that respects completed images
     */
    static enhanceAll(selector = '[data-lazyimage-src]:not([data-lazyimage-complete])', options) {
        const instance = new Lazyimage(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }

    /**
     * Cleanup all completed lazy images (for memory optimization)
     */
    static cleanupCompleted() {
        const completedImages = document.querySelectorAll('[data-lazyimage-complete]');
        let cleanedCount = 0;

        completedImages.forEach(element => {
            // Remove any remaining data attributes to free memory
            element.removeAttribute('data-lazyimage-complete');
            element.removeAttribute('data-lazyimage-threshold');
            element.removeAttribute('data-lazyimage-fadein');
            element.removeAttribute('data-lazyimage-native');
            cleanedCount++;
        });

        return cleanedCount;
    }
}