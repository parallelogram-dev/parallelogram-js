import {BaseComponent} from '@peptolab/parallelogram';

/**
 * Lazysrc Component - Standalone lazy loading without external dependencies
 *
 * @example
 * HTML:
 * <!-- Basic lazy image -->
 * <img data-lazysrc data-lazysrc-src="image.jpg" alt="Description">
 *
 * <!-- Responsive lazy image with srcset -->
 * <img data-lazysrc
 *      src="placeholder.jpg"
 *      data-lazysrc-src="image.jpg"
 *      data-lazysrc-srcset="image-320.jpg 320w, image-640.jpg 640w, image-1280.jpg 1280w"
 *      data-lazysrc-sizes="(max-width: 320px) 280px, (max-width: 640px) 600px, 1200px"
 *      alt="Description">
 *
 * <!-- Native HTML with progressive enhancement -->
 * <img data-lazysrc
 *      src="image.jpg"
 *      srcset="image-320.jpg 320w, image-640.jpg 640w"
 *      sizes="(max-width: 640px) 600px, 1200px"
 *      alt="Description">
 *
 * <!-- Picture element with sources -->
 * <picture data-lazysrc>
 *   <source data-lazysrc-srcset="image.webp" type="image/webp">
 *   <source data-lazysrc-srcset="image.jpg" type="image/jpeg">
 *   <img data-lazysrc-src="image.jpg" alt="Description">
 * </picture>
 *
 * <!-- Background image -->
 * <div data-lazysrc data-lazysrc-bg="background.jpg"></div>
 *
 * <!-- Custom threshold and classes -->
 * <img data-lazysrc
 *      data-lazysrc-src="image.jpg"
 *      data-lazysrc-threshold="0.2"
 *      data-lazysrc-loading-class="custom-loading"
 *      data-lazysrc-loaded-class="custom-loaded"
 *      alt="Description">
 */
export default class Lazysrc extends BaseComponent {
    static get defaults() {
        return {
            threshold: 0.1,
            rootMargin: '50px',
            loadingClass: 'loading',
            loadedClass: 'loaded',
            errorClass: 'error',
            fadeInDuration: 300,
            retryAttempts: 3,
            retryDelay: 1000,
            useNativeLoading: false // Use native loading="lazy" when available
        };
    }

    constructor(options = {}) {
        super(options);

        // Create intersection observer
        this._createObserver();

        // Track loading attempts for retry logic
        this.loadingAttempts = new Map();
    }

    /**
     * Create intersection observer for lazy loading
     * @private
     */
    _createObserver() {
        const observerOptions = {
            root: null,
            rootMargin: Lazysrc.defaults.rootMargin,
            threshold: Lazysrc.defaults.threshold
        };

        this.observer = new IntersectionObserver(
            this._handleIntersection.bind(this),
            observerOptions
        );

        this.logger?.info('Lazysrc intersection observer created', observerOptions);
    }

    async _init(element) {
        const state = super._init(element);

        // Get configuration for this element
        const config = this._getConfiguration(element);

        // Store state
        state.config = config;
        state.isLoaded = false;
        state.isLoading = false;
        state.hasError = false;

        // Check if we should use native lazy loading
        if ((config.useNativeLoading || element.hasAttribute('loading')) &&
            this._supportsNativeLoading() && this._isImage(element)) {
            this._setupNativeLoading(element, state);
        } else {
            // Use intersection observer
            this._setupIntersectionLoading(element, state);
        }

        // Setup cleanup
        const originalCleanup = state.cleanup;
        state.cleanup = () => {
            this.observer.unobserve(element);
            this.loadingAttempts.delete(element);
            originalCleanup();
        };

        this.eventBus?.emit('lazysrc:mounted', {
            element,
            config,
            timestamp: performance.now()
        });

        this.logger?.info('Lazysrc initialized', {
            element,
            threshold: config.threshold,
            useNative: config.useNativeLoading
        });

        return state;
    }

    /**
     * Get configuration from data attributes
     * @private
     * @param {HTMLElement} element - Element to configure
     * @returns {Object} Configuration object
     */
    _getConfiguration(element) {
        const config = {...Lazysrc.defaults};

        // Threshold
        if (element.dataset.lazysrcThreshold) {
            config.threshold = parseFloat(element.dataset.lazysrcThreshold);
        }

        // Root margin
        if (element.dataset.lazysrcRootMargin) {
            config.rootMargin = element.dataset.lazysrcRootMargin;
        }

        // CSS Classes
        if (element.dataset.lazysrcLoadingClass) {
            config.loadingClass = element.dataset.lazysrcLoadingClass;
        }
        if (element.dataset.lazysrcLoadedClass) {
            config.loadedClass = element.dataset.lazysrcLoadedClass;
        }
        if (element.dataset.lazysrcErrorClass) {
            config.errorClass = element.dataset.lazysrcErrorClass;
        }

        // Animation
        if (element.dataset.lazysrcFadeDuration) {
            config.fadeInDuration = parseInt(element.dataset.lazysrcFadeDuration, 10);
        }

        // Retry logic
        if (element.dataset.lazysrcRetryAttempts) {
            config.retryAttempts = parseInt(element.dataset.lazysrcRetryAttempts, 10);
        }
        if (element.dataset.lazysrcRetryDelay) {
            config.retryDelay = parseInt(element.dataset.lazysrcRetryDelay, 10);
        }

        // Native loading
        if (element.dataset.lazysrcUseNative !== undefined) {
            config.useNativeLoading = element.dataset.lazysrcUseNative !== 'false';
        }

        return config;
    }

    /**
     * Check if browser supports native lazy loading
     * @private
     * @returns {boolean}
     */
    _supportsNativeLoading() {
        return 'loading' in HTMLImageElement.prototype;
    }

    /**
     * Check if element is an image
     * @private
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    _isImage(element) {
        return element.tagName === 'IMG';
    }

    /**
     * Setup native lazy loading
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     */
    _setupNativeLoading(element, state) {
        if (this._isImage(element)) {
            // Set up native loading if not already present
            if (!element.hasAttribute('loading')) {
                element.loading = 'lazy';
            }

            // Apply the src immediately for native loading
            this._applySources(element, state);

            // Listen for load events
            element.addEventListener('load', () => {
                this._onElementLoaded(element, state);
            });

            element.addEventListener('error', () => {
                this._onElementError(element, state);
            });
        }
    }

    /**
     * Setup intersection observer loading
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     */
    _setupIntersectionLoading(element, state) {
        this.logger?.info('Setting up intersection loading for element', {element});

        // Store original sources and clear them to prevent immediate loading
        this._storeAndClearSources(element, state);

        // Update observer threshold if different from default
        if (state.config.threshold !== Lazysrc.defaults.threshold ||
            state.config.rootMargin !== Lazysrc.defaults.rootMargin) {

            this.logger?.info('Creating custom observer for element', {
                threshold: state.config.threshold,
                rootMargin: state.config.rootMargin
            });

            // Create custom observer for this element
            state.customObserver = new IntersectionObserver(
                this._handleIntersection.bind(this),
                {
                    root: null,
                    rootMargin: state.config.rootMargin,
                    threshold: state.config.threshold
                }
            );
            state.customObserver.observe(element);
            this.logger?.info('Element added to custom observer', {element});
        } else {
            this.logger?.info('Adding element to default observer', {element});
            this.observer.observe(element);
            this.logger?.info('Element added to default observer', {element});
        }
    }

    /**
     * Store original sources and clear them to prevent immediate loading
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     */
    _storeAndClearSources(element, state) {
        if (element.tagName === 'IMG') {
            // Store original src and srcset
            if (element.src && !element.dataset.lazysrcSrc) {
                state.originalSrc = element.src;
                element.removeAttribute('src');
            }
            if (element.srcset && !element.dataset.lazysrcSrcset) {
                state.originalSrcset = element.srcset;
                element.removeAttribute('srcset');
            }
            if (element.sizes && !element.dataset.lazysrcSizes) {
                state.originalSizes = element.sizes;
            }
        } else if (element.tagName === 'PICTURE') {
            // Handle picture sources
            const sources = element.querySelectorAll('source');
            state.originalSources = [];

            sources.forEach((source, index) => {
                if (source.srcset && !source.dataset.lazysrcSrcset) {
                    state.originalSources[index] = {
                        srcset: source.srcset,
                        sizes: source.sizes || null
                    };
                    source.removeAttribute('srcset');
                }
            });

            // Handle img within picture
            const img = element.querySelector('img');
            if (img) {
                if (img.src && !img.dataset.lazysrcSrc) {
                    state.originalSrc = img.src;
                    img.removeAttribute('src');
                }
                if (img.srcset && !img.dataset.lazysrcSrcset) {
                    state.originalSrcset = img.srcset;
                    img.removeAttribute('srcset');
                }
            }
        }
    }

    /**
     * Handle intersection observer entries
     * @private
     * @param {IntersectionObserverEntry[]} entries
     */
    async _handleIntersection(entries) {
    this.logger?.info('Intersection handler called', { entriesCount: entries.length });

    for (const entry of entries) {
        this.logger?.info('Processing intersection entry', {
            isIntersecting: entry.isIntersecting,
            element: entry.target,
            intersectionRatio: entry.intersectionRatio
        });

        if (entry.isIntersecting) {
            const element = entry.target;
            const state = this.getState(element);

            // Await the state Promise
            const resolvedState = await state;

            this.logger?.info('Resolved state for intersecting element', {
                hasState: !!resolvedState,
                hasResult: !!(resolvedState && resolvedState.result)
            });

            if (resolvedState && resolvedState.result && !resolvedState.result.isLoaded && !resolvedState.result.isLoading) {
                this.logger?.info('Calling _loadElement for element', { element });
                this._loadElement(element, resolvedState);
            }
        }
    }
}

    /**
     * Load an element
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     */
    async _loadElement(element, state) {
        if (!state || !state.result) {
            this.logger?.error('Invalid state for element', {element, state});
            return;
        }

        const componentState = state.result; // Get the actual state object

        if (!componentState.config) {
            this.logger?.error('Missing config for element', {element, componentState});
            return;
        }

        if (componentState.isLoading || componentState.isLoaded) return;

        componentState.isLoading = true;
        element.classList.add(componentState.config.loadingClass);

        this.eventBus?.emit('lazysrc:loading-start', {
            element,
            timestamp: performance.now()
        });

        try {
            // Handle different element types
            if (element.dataset.lazysrcBg) {
                await this._loadBackgroundImage(element, componentState);
            } else if (element.tagName === 'PICTURE') {
                await this._loadPictureElement(element, componentState);
            } else if (this._isImage(element)) {
                await this._loadImageElement(element, componentState);
            } else {
                // Generic element with background image
                await this._loadBackgroundImage(element, componentState);
            }

            this._onElementLoaded(element, componentState);

        } catch (error) {
            this._onElementError(element, componentState, error);
        }
    }

    /**
     * Load image element
     * @private
     * @param {HTMLImageElement} element
     * @param {Object} state
     * @returns {Promise}
     */
    _loadImageElement(element, state) {
        return new Promise((resolve, reject) => {
            // Create new image for preloading
            const img = new Image();

            // Handle load success
            img.onload = () => {
                this._applySources(element, state);
                resolve();
            };

            // Handle load error
            img.onerror = () => {
                reject(new Error('Image failed to load'));
            };

            // Start loading - prefer data attribute, fall back to stored original
            const src = element.dataset.lazysrcSrc || state.originalSrc;
            if (src) {
                img.src = src;
            } else {
                reject(new Error('No src specified'));
            }
        });
    }

    /**
     * Load picture element
     * @private
     * @param {HTMLPictureElement} element
     * @param {Object} state
     * @returns {Promise}
     */
    _loadPictureElement(element, state) {
        return new Promise((resolve, reject) => {
            const img = element.querySelector('img');
            if (!img) {
                reject(new Error('No img element found in picture'));
                return;
            }

            // Handle load success
            img.onload = () => {
                this._applyPictureSources(element, state);
                resolve();
            };

            // Handle load error
            img.onerror = () => {
                reject(new Error('Picture failed to load'));
            };

            // Apply sources to trigger loading
            this._applyPictureSources(element, state);
        });
    }

    /**
     * Load background image
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     * @returns {Promise}
     */
    _loadBackgroundImage(element, state) {
        return new Promise((resolve, reject) => {
            const bgUrl = element.dataset.lazysrcBg;
            if (!bgUrl) {
                reject(new Error('No background image URL specified'));
                return;
            }

            // Create new image for preloading
            const img = new Image();

            img.onload = () => {
                element.style.backgroundImage = `url("${bgUrl}")`;
                resolve();
            };

            img.onerror = () => {
                reject(new Error('Background image failed to load'));
            };

            img.src = bgUrl;
        });
    }

    /**
     * Apply sources to image element
     * @private
     * @param {HTMLImageElement} element
     * @param {Object} state
     */
    _applySources(element, state) {
        // Apply srcset - prefer data attribute, fall back to stored original
        if (element.dataset.lazysrcSrcset) {
            element.srcset = element.dataset.lazysrcSrcset;
        } else if (state.originalSrcset) {
            element.srcset = state.originalSrcset;
        }

        // Apply sizes - prefer data attribute, fall back to stored original
        if (element.dataset.lazysrcSizes) {
            element.sizes = element.dataset.lazysrcSizes;
        } else if (state.originalSizes) {
            element.sizes = state.originalSizes;
        }

        // Apply src - prefer data attribute, fall back to stored original
        if (element.dataset.lazysrcSrc) {
            element.src = element.dataset.lazysrcSrc;
        } else if (state.originalSrc) {
            element.src = state.originalSrc;
        }
    }

    /**
     * Apply sources to picture element
     * @private
     * @param {HTMLPictureElement} element
     * @param {Object} state
     */
    _applyPictureSources(element, state) {
        // Handle source elements
        const sources = element.querySelectorAll('source');
        sources.forEach((source, index) => {
            if (source.dataset.lazysrcSrcset) {
                source.srcset = source.dataset.lazysrcSrcset;
            } else if (state.originalSources && state.originalSources[index]) {
                source.srcset = state.originalSources[index].srcset;
                if (state.originalSources[index].sizes) {
                    source.sizes = state.originalSources[index].sizes;
                }
            }
        });

        // Handle img element
        const img = element.querySelector('img');
        if (img) {
            this._applySources(img, state);
        }
    }

    /**
     * Handle successful element load
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     */
    _onElementLoaded(element, state) {
        state.isLoading = false;
        state.isLoaded = true;
        state.hasError = false;

        element.classList.remove(state.config.loadingClass);
        element.classList.add(state.config.loadedClass);

        // Apply fade-in effect
        if (state.config.fadeInDuration > 0) {
            this._applyFadeInEffect(element, state.config.fadeInDuration);
        }

        // Stop observing this element
        this.observer.unobserve(element);
        if (state.customObserver) {
            state.customObserver.unobserve(element);
        }

        // Clear retry attempts
        this.loadingAttempts.delete(element);

        this.eventBus?.emit('lazysrc:loaded', {
            element,
            timestamp: performance.now()
        });

        this.logger?.debug('Element loaded successfully', {element});
    }

    /**
     * Handle element load error
     * @private
     * @param {HTMLElement} element
     * @param {Object} state
     * @param {Error} error
     */
    _onElementError(element, state, error) {
        state.isLoading = false;
        state.hasError = true;

        element.classList.remove(state.config.loadingClass);
        element.classList.add(state.config.errorClass);

        // Retry logic
        const attempts = this.loadingAttempts.get(element) || 0;
        if (attempts < state.config.retryAttempts) {
            this.loadingAttempts.set(element, attempts + 1);

            setTimeout(() => {
                state.isLoading = false;
                state.hasError = false;
                element.classList.remove(state.config.errorClass);
                this._loadElement(element, state);
            }, state.config.retryDelay * (attempts + 1)); // Exponential backoff

            this.logger?.info(`Retrying load for element (attempt ${attempts + 1}/${state.config.retryAttempts})`, {element});
            return;
        }

        this.eventBus?.emit('lazysrc:error', {
            element,
            error: error?.message || 'Load failed',
            timestamp: performance.now()
        });

        this.logger?.warn('Element failed to load after retries', {element, error});
    }

    /**
     * Apply fade-in effect
     * @private
     * @param {HTMLElement} element
     * @param {number} duration
     */
    _applyFadeInEffect(element, duration) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;

        // Force reflow
        element.offsetHeight;

        element.style.opacity = '1';

        // Clean up after animation
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
    }

    /**
     * Force load a specific element
     * @param {HTMLElement} element - Element to load
     */
    loadElement(element) {
        const state = this.getState(element);
        if (state && !state.isLoaded && !state.isLoading) {
            this._loadElement(element, state);
        }
    }

    /**
     * Force load all lazy elements in container
     * @param {HTMLElement} [container] - Container to search within
     */
    loadAll(container = document) {
        const elements = container.querySelectorAll('[data-lazysrc-enhanced="true"]');
        elements.forEach(element => {
            const state = this.getState(element);
            if (state && !state.isLoaded && !state.isLoading) {
                this._loadElement(element, state);
            }
        });
    }

    /**
     * Update observer for new content
     * @param {HTMLElement} [container] - Container to search for new elements
     */
    update(container = document) {
        // Find new lazy load elements that haven't been enhanced
        const newElements = container.querySelectorAll('[data-lazysrc]:not([data-lazysrc-enhanced="true"])');
        newElements.forEach(element => {
            this.mount(element);
        });
    }

    /**
     * Check if element is loaded
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Whether element is loaded
     */
    isLoaded(element) {
        const state = this.getState(element);
        return state ? state.isLoaded : false;
    }

    /**
     * Check if element is loading
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Whether element is loading
     */
    isLoading(element) {
        const state = this.getState(element);
        return state ? state.isLoading : false;
    }

    /**
     * Check if element has error
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} Whether element has error
     */
    hasError(element) {
        const state = this.getState(element);
        return state ? state.hasError : false;
    }

    /**
     * Get component status
     * @returns {Object} Component status
     */
    getStatus() {
        const elements = document.querySelectorAll('[data-lazysrc-enhanced="true"]');
        let loadedCount = 0;
        let loadingCount = 0;
        let errorCount = 0;

        elements.forEach(element => {
            if (this.isLoaded(element)) loadedCount++;
            if (this.isLoading(element)) loadingCount++;
            if (this.hasError(element)) errorCount++;
        });

        return {
            totalElements: elements.length,
            loadedCount,
            loadingCount,
            errorCount,
            observerActive: !!this.observer,
            supportsNative: this._supportsNativeLoading(),
            defaults: Lazysrc.defaults
        };
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        this.loadingAttempts.clear();
        super.destroy();
        this.logger?.info('Lazysrc destroyed');
    }

    /**
     * Enhance all lazy load elements on the page
     * @param {string} selector - CSS selector for lazy elements
     * @param {Object} options - Component options
     * @returns {Lazysrc} Component instance
     */
    static enhanceAll(selector = '[data-lazysrc]', options) {
        const instance = new Lazysrc(options);
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            instance.mount(element);
        });

        return instance;
    }
}