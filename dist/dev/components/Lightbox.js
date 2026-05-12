function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * Lightbox Component - Image/media gallery viewer with proper state management
 *
 * States:
 * - closed: Lightbox is not visible
 * - opening: Lightbox is transitioning in
 * - open: Lightbox is fully visible and interactive
 * - transitioning: Lightbox is changing images
 * - closing: Lightbox is transitioning out
 *
 * Features:
 * - BEM-compliant class naming
 * - Configurable via data attributes
 * - Gallery support with navigation
 * - Keyboard navigation
 * - State-based architecture
 *
 * @example
 * <a data-lightbox="gallery" href="large1.jpg">
 *   <img src="thumb1.jpg" alt="Image 1">
 * </a>
 */
class Lightbox extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-lightbox';
  }

  static get defaults() {
    return {
      closeOnEscape: true,
      closeOnBackdrop: true,
      showCounter: true,
      showNavigation: true,
      keyNavigation: true,
      useDirectionalTransitions: true,
      preloadStrategy: 'adjacent', // 'adjacent' | 'all' | 'none'
      /* BEM class names */
      baseClass: 'lightbox',
      overlayClass: 'lightbox__overlay',
      containerClass: 'lightbox__container',
      closeClass: 'lightbox__close',
      prevClass: 'lightbox__nav lightbox__nav--prev',
      nextClass: 'lightbox__nav lightbox__nav--next',
      contentClass: 'lightbox__content',
      imageClass: 'lightbox__image',
      counterClass: 'lightbox__counter',
      /* State classes */
      stateClosedClass: 'is-closed',
      stateOpeningClass: 'is-opening',
      stateOpenClass: 'is-open',
      stateTransitioningClass: 'is-transitioning',
      stateClosingClass: 'is-closing',
      /* Utility classes */
      showClass: 'show',
      slideLeftClass: 'slide-left',
      slideRightClass: 'slide-right',
    };
  }

  constructor(options = {}) {
    super(options);
    this.lightboxElement = null;
    this.keyHandler = null;
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const gallery = element.dataset.lightbox;

    /* Initialize state with config and gallery info */
    state.config = config;
    state.gallery = gallery;
    state.lightboxState = 'closed';
    state.currentIndex = 0;
    state.galleryElements = [];

    /* Bind click handler */
    element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._openLightbox(element);
    });

    this.eventBus?.emit('lightbox:mounted', { element, gallery });
    return state;
  }

  _getConfiguration(element) {
    return {
      closeOnEscape: this.getAttr(
        element,
        'close-escape',
        Lightbox.defaults.closeOnEscape
      ),
      closeOnBackdrop: this.getAttr(
        element,
        'close-backdrop',
        Lightbox.defaults.closeOnBackdrop
      ),
      showCounter: this.getAttr(
        element,
        'show-counter',
        Lightbox.defaults.showCounter
      ),
      showNavigation: this.getAttr(
        element,
        'show-nav',
        Lightbox.defaults.showNavigation
      ),
      keyNavigation: this.getAttr(
        element,
        'key-nav',
        Lightbox.defaults.keyNavigation
      ),
      useDirectionalTransitions: this.getAttr(
        element,
        'directional-transitions',
        Lightbox.defaults.useDirectionalTransitions
      ),
      preloadStrategy: this.getAttr(
        element,
        'preload',
        Lightbox.defaults.preloadStrategy
      ),
      /* BEM class names */
      baseClass: this.getAttr(element, 'base-class', Lightbox.defaults.baseClass),
      overlayClass: this.getAttr(element, 'overlay-class', Lightbox.defaults.overlayClass),
      containerClass: this.getAttr(element, 'container-class', Lightbox.defaults.containerClass),
      closeClass: this.getAttr(element, 'close-class', Lightbox.defaults.closeClass),
      prevClass: this.getAttr(element, 'prev-class', Lightbox.defaults.prevClass),
      nextClass: this.getAttr(element, 'next-class', Lightbox.defaults.nextClass),
      contentClass: this.getAttr(element, 'content-class', Lightbox.defaults.contentClass),
      imageClass: this.getAttr(element, 'image-class', Lightbox.defaults.imageClass),
      counterClass: this.getAttr(element, 'counter-class', Lightbox.defaults.counterClass),
      /* State classes */
      stateClosedClass: this.getAttr(element, 'state-closed-class', Lightbox.defaults.stateClosedClass),
      stateOpeningClass: this.getAttr(element, 'state-opening-class', Lightbox.defaults.stateOpeningClass),
      stateOpenClass: this.getAttr(element, 'state-open-class', Lightbox.defaults.stateOpenClass),
      stateTransitioningClass: this.getAttr(element, 'state-transitioning-class', Lightbox.defaults.stateTransitioningClass),
      stateClosingClass: this.getAttr(element, 'state-closing-class', Lightbox.defaults.stateClosingClass),
      showClass: this.getAttr(element, 'show-class', Lightbox.defaults.showClass),
      slideLeftClass: this.getAttr(element, 'slide-left-class', Lightbox.defaults.slideLeftClass),
      slideRightClass: this.getAttr(element, 'slide-right-class', Lightbox.defaults.slideRightClass),
    };
  }

  _setState(element, newState) {
    const state = this.getState(element);
    if (!state) return;

    const oldState = state.lightboxState;
    state.lightboxState = newState;

    /* Update lightbox element data attribute for state-based CSS */
    if (this.lightboxElement) {
      this.setState(this.lightboxElement, newState);
    }

    this.eventBus?.emit('lightbox:stateChange', {
      element,
      oldState,
      newState,
      gallery: state.gallery,
    });
  }

  _openLightbox(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || state.lightboxState !== 'closed') return;

    /* Build gallery from all elements with same gallery name */
    state.galleryElements = Array.from(
      document.querySelectorAll(`[data-lightbox="${state.gallery}"]`)
    );

    state.currentIndex = state.galleryElements.indexOf(triggerElement);

    this._setState(triggerElement, 'opening');
    this._createLightboxElement(triggerElement);
    this._showImage(triggerElement, state.currentIndex);
    this._setupEventListeners(triggerElement);

    /* Calculate and set scrollbar width */
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('overflow--hidden');

    /* Transition to open state */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.lightboxElement && state.config) {
          this.lightboxElement.classList.add(state.config.showClass);
          /* After transition completes, set to fully open */
          this.lightboxElement.addEventListener('transitionend', () => {
            this._setState(triggerElement, 'open');
          }, { once: true });
        }
      });
    });

    this.eventBus?.emit('lightbox:opened', {
      gallery: state.gallery,
      index: state.currentIndex,
      total: state.galleryElements.length,
    });

    /* Eager load adjacent images for smooth navigation */
    this._eagerLoadAdjacentImages(triggerElement);
  }

  _eagerLoadAdjacentImages(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || !state.galleryElements) return;

    const config = state.config;
    const currentIndex = state.currentIndex;
    const gallery = state.galleryElements;

    /* Check preload strategy */
    if (config.preloadStrategy === 'none') {
      return; // Don't preload anything
    }

    /* Determine which images to preload based on strategy */
    let indicesToLoad = [];

    if (config.preloadStrategy === 'all') {
      /* Preload all images in the gallery */
      indicesToLoad = gallery.map((_, index) => index);
    } else {
      /* Default: 'adjacent' - preload current, previous, and next */
      indicesToLoad = [currentIndex];

      if (config.showNavigation) {
        /* Preload previous image if exists */
        if (currentIndex > 0) {
          indicesToLoad.push(currentIndex - 1);
        }
        /* Preload next image if exists */
        if (currentIndex < gallery.length - 1) {
          indicesToLoad.push(currentIndex + 1);
        }
      }
    }

    /* Preload each image in the load set */
    indicesToLoad.forEach((index) => {
      const element = gallery[index];
      const imageUrl = element.href;

      /* Find any lazy-loaded images within the trigger element */
      const lazyImages = element.querySelectorAll('[data-lazysrc]');
      lazyImages.forEach((lazyImg) => {
        /* Trigger custom event on the lazy image element */
        const event = new CustomEvent('lazysrc:forceLoad', {
          bubbles: true,
          detail: {
            source: 'lightbox',
            gallery: state.gallery,
            index: index,
            strategy: config.preloadStrategy,
          },
        });
        lazyImg.dispatchEvent(event);
      });

      /* Also preload the main href image */
      this._preloadImage(imageUrl);
    });
  }

  _preloadImage(url) {
    /* Simple image preloading */
    const img = new Image();
    img.src = url;
  }

  _createLightboxElement(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state) return;

    const config = state.config;

    this.lightboxElement = document.createElement('div');
    this.lightboxElement.className = config.overlayClass;
    this.setState(this.lightboxElement, 'opening');
    this.lightboxElement.innerHTML = `
      <div class="${config.containerClass}">
        <button class="${config.closeClass}" data-lightbox-action="close" aria-label="Close"></button>
        ${
          config.showNavigation
            ? `
          <button class="${config.prevClass}" data-lightbox-action="prev" aria-label="Previous"></button>
          <button class="${config.nextClass}" data-lightbox-action="next" aria-label="Next"></button>
        `
            : ''
        }
        <div class="${config.contentClass}">
          <img class="${config.imageClass}" alt="">
        </div>
        ${config.showCounter ? `<div class="${config.counterClass}"></div>` : ''}
      </div>
    `;

    document.body.appendChild(this.lightboxElement);

    /* Store reference to trigger element using WeakMap would be cleaner, but for simplicity just store directly */
    this.currentTriggerElement = triggerElement;

    /* Setup button handlers */
    const closeBtn = this.lightboxElement.querySelector('[data-lightbox-action="close"]');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeLightbox(triggerElement);
    });

    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector('[data-lightbox-action="prev"]');
      const nextBtn = this.lightboxElement.querySelector('[data-lightbox-action="next"]');

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._previousImage(triggerElement);
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._nextImage(triggerElement);
      });

      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }

    if (config.closeOnBackdrop) {
      this.lightboxElement.addEventListener('click', (e) => {
        if (e.target === this.lightboxElement) {
          this._closeLightbox(triggerElement);
        }
      });
    }
  }

  _showImage(triggerElement, index, direction = null) {
    const state = this.getState(triggerElement);
    if (!state) return;

    const config = state.config;
    const element = state.galleryElements[index];
    const imageUrl = element.href;
    const imageAlt = element.querySelector('img')?.alt || '';

    const img = this.lightboxElement.querySelector(`.${config.imageClass.split(' ')[0]}`);

    /* Apply directional transition if configured */
    if (config.useDirectionalTransitions && direction && state.lightboxState === 'open') {
      this._setState(triggerElement, 'transitioning');

      const slideOutClass = direction === 'next' ? config.slideLeftClass : config.slideRightClass;
      const slideInClass = direction === 'next' ? config.slideRightClass : config.slideLeftClass;

      img.classList.add(slideOutClass);

      img.addEventListener(
        'transitionend',
        () => {
          const loader = new Image();
          loader.onload = () => {
            img.src = imageUrl;
            img.alt = imageAlt;
            img.style.transition = 'none';
            img.classList.add(slideInClass);
            img.offsetHeight;
            img.classList.remove(slideOutClass);

            requestAnimationFrame(() => {
              img.style.transition = '';
              img.classList.remove(slideInClass);

              img.addEventListener(
                'transitionend',
                () => {
                  this._setState(triggerElement, 'open');
                },
                { once: true }
              );
            });
          };
          loader.onerror = () => {
            img.src = imageUrl;
            img.alt = imageAlt;
            this._setState(triggerElement, 'open');
          };
          loader.src = imageUrl;
        },
        { once: true }
      );
    } else {
      img.src = imageUrl;
      img.alt = imageAlt;
    }

    /* Update counter */
    if (config.showCounter) {
      const counter = this.lightboxElement.querySelector(`.${config.counterClass.split(' ')[0]}`);
      counter.textContent = `${index + 1} / ${state.galleryElements.length}`;
    }

    /* Update navigation buttons */
    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector('[data-lightbox-action="prev"]');
      const nextBtn = this.lightboxElement.querySelector('[data-lightbox-action="next"]');

      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === state.galleryElements.length - 1;
    }
  }

  _previousImage(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || state.lightboxState !== 'open') return;

    if (state.currentIndex > 0) {
      state.currentIndex--;
      this._showImage(triggerElement, state.currentIndex, 'prev');
    }
  }

  _nextImage(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || state.lightboxState !== 'open') return;

    if (state.currentIndex < state.galleryElements.length - 1) {
      state.currentIndex++;
      this._showImage(triggerElement, state.currentIndex, 'next');
    }
  }

  _setupEventListeners(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state) return;

    const config = state.config;

    if (config.closeOnEscape || config.keyNavigation) {
      this.keyHandler = (e) => {
        /* Check if this lightbox is currently open */
        if (state.lightboxState !== 'open' && state.lightboxState !== 'transitioning') return;

        let handled = false;
        switch (e.key) {
          case 'Escape':
            if (config.closeOnEscape) {
              this._closeLightbox(triggerElement);
              handled = true;
            }
            break;
          case 'ArrowLeft':
            if (config.keyNavigation) {
              this._previousImage(triggerElement);
              handled = true;
            }
            break;
          case 'ArrowRight':
            if (config.keyNavigation) {
              this._nextImage(triggerElement);
              handled = true;
            }
            break;
        }
        if (handled) {
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', this.keyHandler);
    }
  }

  _closeLightbox(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || state.lightboxState === 'closed' || state.lightboxState === 'closing') return;

    this._setState(triggerElement, 'closing');

    /* Remove show class to trigger close transition */
    this.lightboxElement.classList.remove(state.config.showClass);

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;

      /* Remove event listeners */
      if (this.keyHandler) {
        document.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }

      /* Remove lightbox element */
      if (this.lightboxElement) {
        this.lightboxElement.remove();
        this.lightboxElement = null;
      }

      /* Restore body scroll */
      document.body.classList.remove('overflow--hidden');

      /* Reset state */
      this._setState(triggerElement, 'closed');
      state.currentIndex = 0;
      state.galleryElements = [];

      this.eventBus?.emit('lightbox:closed', {});
    };

    /* Wait for transition */
    const handleTransitionEnd = (event) => {
      if (event && event.target !== this.lightboxElement) return;
      cleanup();
    };

    this.lightboxElement.addEventListener('transitionend', handleTransitionEnd, { once: true });
    this.lightboxElement.addEventListener('animationend', handleTransitionEnd, { once: true });

    /* Fallback */
    setTimeout(cleanup, 1000);
  }

  /* Public API */
  open(triggerElement) {
    this._openLightbox(triggerElement);
  }

  close(triggerElement) {
    this._closeLightbox(triggerElement);
  }

  next(triggerElement) {
    this._nextImage(triggerElement);
  }

  previous(triggerElement) {
    this._previousImage(triggerElement);
  }

  goTo(triggerElement, index) {
    const state = this.getState(triggerElement);
    if (!state || state.lightboxState !== 'open') return;

    if (index >= 0 && index < state.galleryElements.length) {
      state.currentIndex = index;
      this._showImage(triggerElement, state.currentIndex);
    }
  }

  getStatus(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state) return null;

    return {
      lightboxState: state.lightboxState,
      currentIndex: state.currentIndex,
      gallerySize: state.galleryElements.length,
      gallery: state.gallery,
    };
  }

  static enhanceAll(selector = '[data-lightbox]', options) {
    const instance = new Lightbox(options);
    document.querySelectorAll(selector).forEach((el) => instance.mount(el));
    return instance;
  }
}

export { Lightbox, Lightbox as default };
