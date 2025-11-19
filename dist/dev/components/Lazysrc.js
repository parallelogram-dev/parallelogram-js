function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,o){return function(e,n,o){const r=n.includes("-")?t(n):n,s=e.dataset[r];return void 0===s?o:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,o)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...o){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,o);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...o){n||(t.apply(this,o),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const o=`${e}-view`,r=this.getAttr(t,o);if(r){const t=document.querySelector(`[data-view="${r}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[o,r]of Object.entries(e)){const e=this.constructor.defaults?.[o];n[o]=this.getAttr(t,r,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const o=()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();};t.addEventListener("animationend",o,{once:true}),t.addEventListener("transitionend",o,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const o=e(t);if(!o.length)return;const r=o[0],s=o[o.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==r&&i?n.shiftKey||i!==s||(r.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const o=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?o.className=n:"style"===t&&"object"==typeof n?Object.assign(o.style,n):"dataset"===t&&"object"==typeof n?Object.assign(o.dataset,n):o.setAttribute(t,n);return "string"==typeof n?o.textContent=n:n instanceof HTMLElement&&o.appendChild(n),o}(t,e,n)}_dispatch(t,e,n){const o=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(o),o}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const o=t.getAttribute(`${this._getSelector()}-${e}`);return null!==o?o:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

/**
 * Lazysrc Component - Standalone lazy loading without external dependencies
 * Supports img, picture elements, and background images with automatic parent detection
 *
 * @example
 * HTML:
 * <!-- Basic lazy image with semantic markup -->
 * <figure>
 *   <img data-lazysrc data-lazysrc-src="image.jpg" alt="Description">
 *   <figcaption>Image caption</figcaption>
 * </figure>
 *
 * <!-- Responsive lazy image with srcset -->
 * <figure>
 *   <img data-lazysrc
 *        src="placeholder.jpg"
 *        data-lazysrc-src="image.jpg"
 *        data-lazysrc-srcset="image-320.jpg 320w, image-640.jpg 640w, image-1280.jpg 1280w"
 *        data-lazysrc-sizes="(max-width: 320px) 280px, (max-width: 640px) 600px, 1200px"
 *        alt="Description">
 *   <figcaption>Responsive image caption</figcaption>
 * </figure>
 *
 * <!-- Native HTML with progressive enhancement -->
 * <figure>
 *   <img data-lazysrc
 *        src="image.jpg"
 *        srcset="image-320.jpg 320w, image-640.jpg 640w"
 *        sizes="(max-width: 640px) 600px, 1200px"
 *        alt="Description">
 *   <figcaption>Progressive enhancement example</figcaption>
 * </figure>
 *
 * <!-- Picture element with sources (data-lazysrc on img, not picture) -->
 * <picture>
 *   <source data-lazysrc-srcset="image.webp" type="image/webp">
 *   <source data-lazysrc-srcset="image.jpg" type="image/jpeg">
 *   <img data-lazysrc data-lazysrc-src="image.jpg" alt="Description">
 * </picture>
 *
 * <!-- Picture with responsive images (srcset + sizes) -->
 * <picture>
 *   <source
 *     data-lazysrc-srcset="image-320.webp 320w, image-1280.webp 1280w"
 *     data-lazysrc-sizes="(max-width: 640px) 320px, 1280px"
 *     type="image/webp">
 *   <source
 *     data-lazysrc-srcset="image-320.jpg 320w, image-1280.jpg 1280w"
 *     data-lazysrc-sizes="(max-width: 640px) 320px, 1280px"
 *     type="image/jpeg">
 *   <img data-lazysrc data-lazysrc-src="image-1280.jpg" alt="Description">
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
class Lazysrc extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-lazysrc';
  }

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
      useNativeLoading: false, // Use native loading="lazy" when available
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
      threshold: Lazysrc.defaults.threshold,
    };

    this.observer = new IntersectionObserver(this._handleIntersection.bind(this), observerOptions);

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

    /* Detect if this element is inside a <picture> element */
    if (this._isImage(element) && element.parentElement?.tagName === 'PICTURE') {
      state.pictureParent = element.parentElement;
    }

    // Check if we should use native lazy loading
    if (
      (config.useNativeLoading || element.hasAttribute('loading')) &&
      this._supportsNativeLoading() &&
      this._isImage(element)
    ) {
      this._setupNativeLoading(element, state);
    } else {
      // Use intersection observer
      this._setupIntersectionLoading(element, state);
    }

    // Listen for force load events (e.g., from Lightbox component)
    const forceLoadHandler = async (event) => {
      const statePromise = this.getState(element);
      const state = statePromise instanceof Promise ? await statePromise : statePromise;

      // Only force load if element hasn't been loaded yet and has valid state
      if (state && !state.isLoaded && !state.isLoading) {
        await this._loadElement(element, state);
      }
      // If state.isLoaded is true or state doesn't exist, silently ignore
    };
    element.addEventListener('lazysrc:forceLoad', forceLoadHandler);

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this.observer.unobserve(element);
      this.loadingAttempts.delete(element);
      element.removeEventListener('lazysrc:forceLoad', forceLoadHandler);
      originalCleanup();
    };

    // Emit via custom event instead of eventBus
    this._dispatch(element, 'lazysrc:mounted', {
      element,
      config,
      timestamp: performance.now(),
    });

    this.logger?.info('Lazysrc initialized', {
      element,
      threshold: config.threshold,
      useNative: config.useNativeLoading,
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
    const config = { ...Lazysrc.defaults };

    // Threshold
    const threshold = this.getAttr(element, 'threshold');
    if (threshold) {
      config.threshold = parseFloat(threshold);
    }

    // Root margin
    const rootMargin = this.getAttr(element, 'root-margin');
    if (rootMargin) {
      config.rootMargin = rootMargin;
    }

    // CSS Classes
    const loadingClass = this.getAttr(element, 'loading-class');
    if (loadingClass) {
      config.loadingClass = loadingClass;
    }
    const loadedClass = this.getAttr(element, 'loaded-class');
    if (loadedClass) {
      config.loadedClass = loadedClass;
    }
    const errorClass = this.getAttr(element, 'error-class');
    if (errorClass) {
      config.errorClass = errorClass;
    }

    // Animation
    const fadeDuration = this.getAttr(element, 'fade-duration');
    if (fadeDuration) {
      config.fadeInDuration = parseInt(fadeDuration, 10);
    }

    // Retry logic
    const retryAttempts = this.getAttr(element, 'retry-attempts');
    if (retryAttempts) {
      config.retryAttempts = parseInt(retryAttempts, 10);
    }
    const retryDelay = this.getAttr(element, 'retry-delay');
    if (retryDelay) {
      config.retryDelay = parseInt(retryDelay, 10);
    }

    // Native loading
    if (this.hasAttr(element, 'use-native')) {
      config.useNativeLoading = this.getAttr(element, 'use-native') !== 'false';
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
    this.logger?.info('Setting up intersection loading for element', { element, state });

    // Store original sources and clear them to prevent immediate loading
    this._storeAndClearSources(element, state);

    // Update observer threshold if different from default
    if (
      state.config.threshold !== Lazysrc.defaults.threshold ||
      state.config.rootMargin !== Lazysrc.defaults.rootMargin
    ) {
      this.logger?.info('Creating custom observer for element', {
        threshold: state.config.threshold,
        rootMargin: state.config.rootMargin,
      });

      // Create custom observer for this element
      state.customObserver = new IntersectionObserver(this._handleIntersection.bind(this), {
        root: null,
        rootMargin: state.config.rootMargin,
        threshold: state.config.threshold,
      });
      state.customObserver.observe(element);
      this.logger?.info('Element added to custom observer', { element });
    } else {
      this.logger?.info('Adding element to default observer', { element });
      this.observer.observe(element);
      this.logger?.info('Element added to default observer', { element });
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
      /* Check if this img is inside a picture element */
      const pictureParent = state.pictureParent;

      if (pictureParent) {
        /* Handle picture sources when data-lazysrc is on the img */
        const sources = pictureParent.querySelectorAll('source');
        state.originalSources = [];

        sources.forEach((source, index) => {
          if (source.srcset && !source.dataset.lazysrcSrcset) {
            state.originalSources[index] = {
              srcset: source.srcset,
              sizes: source.sizes || null,
            };
            source.removeAttribute('srcset');
          }
        });
      }

      /* Store and clear img src/srcset */
      if (element.src && !this.hasAttr(element, 'src')) {
        state.originalSrc = element.src;
        element.removeAttribute('src');
      }
      if (element.srcset && !this.hasAttr(element, 'srcset')) {
        state.originalSrcset = element.srcset;
        element.removeAttribute('srcset');
      }
      if (element.sizes && !this.hasAttr(element, 'sizes')) {
        state.originalSizes = element.sizes;
      }
    } else if (element.tagName === 'PICTURE') {
      /* Handle picture sources when data-lazysrc is on the picture element */
      const sources = element.querySelectorAll('source');
      state.originalSources = [];

      sources.forEach((source, index) => {
        if (source.srcset && !source.dataset.lazysrcSrcset) {
          state.originalSources[index] = {
            srcset: source.srcset,
            sizes: source.sizes || null,
          };
          source.removeAttribute('srcset');
        }
      });

      /* Handle img within picture */
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
        intersectionRatio: entry.intersectionRatio,
      });

      if (entry.isIntersecting) {
        const element = entry.target;
        const statePromise = this.getState(element);

        // Await the state if it's a Promise
        const state = statePromise instanceof Promise ? await statePromise : statePromise;

        // Debug logging to understand state structure
        this.logger?.debug('State structure debug:', {
          wasPromise: statePromise instanceof Promise,
          hasState: !!state,
          stateKeys: state ? Object.keys(state) : null,
          hasConfig: !!state?.config,
          fullState: state,
        });

        this.logger?.info('Resolved state for intersecting element', {
          hasState: !!state,
          isLoaded: state?.isLoaded,
          isLoading: state?.isLoading,
        });

        // Fix: Access properties directly on resolved state
        if (state && !state.isLoaded && !state.isLoading) {
          this.logger?.info('Calling _loadElement for element', { element });
          await this._loadElement(element, state);
        }
      }
    }
  }

  /**
   * Load an element
   * @private
   * @param {HTMLElement} element
   * @param {Object} componentState
   */
  async _loadElement(element, componentState) {
    // Debug logging to understand the state structure
    this.logger?.debug('_loadElement called with:', {
      element,
      componentState,
      componentStateKeys: componentState ? Object.keys(componentState) : null,
      hasConfig: !!(componentState && componentState.config),
      configKeys: componentState?.config ? Object.keys(componentState.config) : null,
    });

    if (!componentState) {
      this.logger?.error('Invalid state for element', { element, componentState });
      return;
    }

    if (!componentState.config) {
      this.logger?.error('Missing config for element', {
        element,
        componentState,
        componentStateKeys: Object.keys(componentState),
      });
      return;
    }

    if (componentState.isLoading || componentState.isLoaded) return;

    componentState.isLoading = true;
    componentState.loadStartTime = performance.now(); // Track when loading started
    element.classList.add(componentState.config.loadingClass);

    // Emit via custom event
    this._dispatch(element, 'lazysrc:loading-start', {
      element,
      timestamp: performance.now(),
    });

    try {
      // Handle different element types
      if (this.hasAttr(element, 'bg')) {
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
      /* Check if this image is inside a picture element */
      if (state.pictureParent) {
        /*
         * Handle picture element with race condition prevention
         *
         * Apply sources to the actual img element, not a temporary Image object.
         * This ensures the picture element's source selection works correctly.
         *
         * IMPORTANT: Handlers are set up AFTER applying sources to prevent race conditions:
         * - Prevents infinite loops when images are cached (onload fires immediately)
         * - Ensures browser doesn't start loading before all source elements are ready
         * - Maintains correct picture element source selection order
         */
        this._applyPictureSources(state.pictureParent, state);

        /* Set up handlers AFTER applying sources */
        element.onload = () => {
          resolve();
        };

        element.onerror = () => {
          reject(new Error('Picture image failed to load'));
        };
      } else {
        /* Standard image loading */
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

        // Get src and srcset
        const src = this.getAttr(element, 'src') || state.originalSrc;
        const srcset = this.getAttr(element, 'srcset') || state.originalSrcset;
        const sizes = this.getAttr(element, 'sizes') || state.originalSizes;

        // Set srcset and sizes first (browser will choose best image)
        if (srcset) {
          img.srcset = srcset;
          if (sizes) {
            img.sizes = sizes;
          }
        }

        // Set src (either as fallback or primary)
        if (src) {
          img.src = src;
        } else if (!srcset) {
          reject(new Error('No src or srcset specified'));
          return;
        }
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

      // Apply sources to trigger loading
      this._applyPictureSources(element, state);

      // Set up handlers AFTER applying sources to avoid infinite loop
      // (onload can fire immediately if image is cached)
      img.onload = () => {
        resolve();
      };

      img.onerror = () => {
        reject(new Error('Picture failed to load'));
      };
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
      const bgUrl = this.getAttr(element, 'bg');
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
    const srcset = this.getAttr(element, 'srcset');
    if (srcset) {
      element.srcset = srcset;
    } else if (state.originalSrcset) {
      element.srcset = state.originalSrcset;
    }

    // Apply sizes - prefer data attribute, fall back to stored original
    const sizes = this.getAttr(element, 'sizes');
    if (sizes) {
      element.sizes = sizes;
    } else if (state.originalSizes) {
      element.sizes = state.originalSizes;
    }

    // Apply src - prefer data attribute, fall back to stored original
    const src = this.getAttr(element, 'src');
    if (src) {
      element.src = src;
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
    /* Handle source elements */
    const sources = element.querySelectorAll('source');
    sources.forEach((source, index) => {
      if (source.dataset.lazysrcSrcset) {
        source.srcset = source.dataset.lazysrcSrcset;
        /* Also apply data-lazysrc-sizes if present */
        if (source.dataset.lazysrcSizes) {
          source.sizes = source.dataset.lazysrcSizes;
        }
      } else if (state.originalSources && state.originalSources[index]) {
        source.srcset = state.originalSources[index].srcset;
        if (state.originalSources[index].sizes) {
          source.sizes = state.originalSources[index].sizes;
        }
      }
    });

    /* Handle img element */
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

    // Calculate load time
    const loadTime = state.loadStartTime ? performance.now() - state.loadStartTime : 0;

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

    // Emit via custom event
    this._dispatch(element, 'lazysrc:loaded', {
      element,
      timestamp: performance.now(),
      loadTime: Math.round(loadTime),
    });

    this.logger?.debug('Element loaded successfully', { element, loadTime });
    
    // Auto-detach after successful load if configured
    if (state.config.autoDetach !== false) {
      setTimeout(() => {
        this._detachElement(element, state);
      }, 100);
    }
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

      setTimeout(
        () => {
          state.isLoading = false;
          state.hasError = false;
          element.classList.remove(state.config.errorClass);
          this._loadElement(element, state);
        },
        state.config.retryDelay * (attempts + 1)
      ); // Exponential backoff

      this.logger?.info(
        `Retrying load for element (attempt ${attempts + 1}/${state.config.retryAttempts})`,
        { element }
      );
      return;
    }

    // Emit via custom event
    this._dispatch(element, 'lazysrc:error', {
      element,
      error: error?.message || 'Load failed',
      timestamp: performance.now(),
    });

    this.logger?.warn('Element failed to load after retries', { element, error });
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
  async loadElement(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;

    if (state && !state.isLoaded && !state.isLoading) {
      await this._loadElement(element, state);
    }
  }

  /**
   * Force load all lazy elements in container
   * @param {HTMLElement} [container] - Container to search within
   */
  async loadAll(container = document) {
    const elements = container.querySelectorAll('[data-lazysrc-enhanced="true"]');

    for (const element of elements) {
      const statePromise = this.getState(element);
      const state = statePromise instanceof Promise ? await statePromise : statePromise;

      if (state && !state.isLoaded && !state.isLoading) {
        await this._loadElement(element, state);
      }
    }
  }

  /**
   * Update observer for new content
   * @param {HTMLElement} [container] - Container to search for new elements
   */
  update(container = document) {
    // Find new lazy load elements that haven't been enhanced
    const newElements = container.querySelectorAll(
      '[data-lazysrc]:not([data-lazysrc-enhanced="true"])'
    );
    newElements.forEach(element => {
      this.mount(element);
    });
  }

  /**
   * Check if element is loaded
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is loaded
   */
  async isLoaded(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
    return state ? state.isLoaded : false;
  }

  /**
   * Check if element is loading
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element is loading
   */
  async isLoading(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
    return state ? state.isLoading : false;
  }

  /**
   * Check if element has error
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether element has error
   */
  async hasError(element) {
    const statePromise = this.getState(element);
    const state = statePromise instanceof Promise ? await statePromise : statePromise;
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
      defaults: Lazysrc.defaults,
    };
  }

  /**
   * Detach element from component after loading
   * @private
   * @param {HTMLElement} element
   * @param {Object} state
   */
  _detachElement(element, state) {
    // Only detach if already loaded
    if (!state.isLoaded) return;
    
    // Clean up state
    if (state.customObserver) {
      state.customObserver.disconnect();
      state.customObserver = null;
    }
    
    // Emit detached event via custom event
    this._dispatch(element, 'lazysrc:detached', {
      element,
      timestamp: performance.now(),
    });
    
    this.logger?.debug('Element detached after loading', { element });
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

export { Lazysrc as default };
