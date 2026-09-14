import { BaseComponent } from '../core/BaseComponent.js';
import { prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';

const ICONS = {
  close:
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  prev: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
};

/**
 * Lightbox - image gallery viewer shown in a native modal `<dialog>`
 *
 * Links that share a `data-lightbox` gallery name open one viewer. It is named "Image viewer", takes
 * focus on its close button, keeps the rest of the page inert and returns focus to the link when it
 * closes. The arrow keys move between images, Escape and the backdrop close it, the counter is
 * announced as it changes, and slides are skipped when the user prefers reduced motion.
 *
 * The viewer's state is written to `data-lightbox-state`: closed, opening, open, transitioning or
 * closing.
 *
 * @example
 * <a data-lightbox="gallery" href="large1.jpg">
 *   <img src="thumb1.jpg" alt="Image 1">
 * </a>
 */
export class Lightbox extends BaseComponent {
  static selector = 'data-lightbox';

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
    this.currentTriggerElement = null;
  }

  /**
   * Mount on a gallery link, ignoring the lightbox's own overlay
   *
   * The overlay carries the deprecated `data-lightbox` state copy, so a page observer watching for
   * `[data-lightbox]` would otherwise mount it as another gallery link.
   */
  mount(element) {
    if (
      element === this.lightboxElement ||
      element.classList.contains(Lightbox.defaults.overlayClass)
    ) {
      return undefined;
    }
    return super.mount(element);
  }

  _init(element) {
    const state = super._init(element);

    state.config = this._getConfiguration(element);
    state.gallery = element.dataset.lightbox;
    state.lightboxState = 'closed';
    state.currentIndex = 0;
    state.galleryElements = [];
    state.preloadedAll = false;

    element.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();
        this._openLightbox(element);
      },
      { signal: state.controller.signal }
    );

    /* Unmounting the link that opened the viewer closes it */
    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      if (this.currentTriggerElement === element) {
        this._teardown(element, state, { restoreFocus: false });
      }
      baseCleanup?.();
    };

    this.eventBus?.emit('lightbox:mounted', { element, gallery: state.gallery });
    return state;
  }

  _getConfiguration(element) {
    return {
      closeOnEscape: this.getBoolAttr(element, 'close-escape', Lightbox.defaults.closeOnEscape),
      closeOnBackdrop: this.getBoolAttr(
        element,
        'close-backdrop',
        Lightbox.defaults.closeOnBackdrop
      ),
      showCounter: this.getBoolAttr(element, 'show-counter', Lightbox.defaults.showCounter),
      showNavigation: this.getBoolAttr(element, 'show-nav', Lightbox.defaults.showNavigation),
      keyNavigation: this.getBoolAttr(element, 'key-nav', Lightbox.defaults.keyNavigation),
      useDirectionalTransitions: this.getBoolAttr(
        element,
        'directional-transitions',
        Lightbox.defaults.useDirectionalTransitions
      ),
      preloadStrategy: this.getAttr(element, 'preload', Lightbox.defaults.preloadStrategy),
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
      stateClosedClass: this.getAttr(
        element,
        'state-closed-class',
        Lightbox.defaults.stateClosedClass
      ),
      stateOpeningClass: this.getAttr(
        element,
        'state-opening-class',
        Lightbox.defaults.stateOpeningClass
      ),
      stateOpenClass: this.getAttr(element, 'state-open-class', Lightbox.defaults.stateOpenClass),
      stateTransitioningClass: this.getAttr(
        element,
        'state-transitioning-class',
        Lightbox.defaults.stateTransitioningClass
      ),
      stateClosingClass: this.getAttr(
        element,
        'state-closing-class',
        Lightbox.defaults.stateClosingClass
      ),
      showClass: this.getAttr(element, 'show-class', Lightbox.defaults.showClass),
      slideLeftClass: this.getAttr(element, 'slide-left-class', Lightbox.defaults.slideLeftClass),
      slideRightClass: this.getAttr(
        element,
        'slide-right-class',
        Lightbox.defaults.slideRightClass
      ),
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
    if (!state || state.lightboxState !== 'closed' || this.lightboxElement) return;

    state.galleryElements = Array.from(
      document.querySelectorAll(`[data-lightbox="${CSS.escape(state.gallery ?? '')}"]`)
    ).filter(element => !element.classList.contains(state.config.overlayClass));
    state.currentIndex = Math.max(0, state.galleryElements.indexOf(triggerElement));
    this.currentTriggerElement = triggerElement;

    const overlay = this._createLightboxElement(triggerElement);
    this._setState(triggerElement, 'opening');
    this._showImage(triggerElement, state.currentIndex);

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('overflow--hidden');

    overlay.showModal();
    overlay.querySelector('[data-lightbox-action="close"]')?.focus({ preventScroll: true });

    /* Become fully open once the overlay's own opening animation has finished */
    requestAnimationFrame(() => {
      if (this.lightboxElement !== overlay) return;
      overlay.classList.add(state.config.showClass);
      whenAnimationsFinish(overlay).then(() => {
        if (this.lightboxElement === overlay && state.lightboxState === 'opening') {
          this._setState(triggerElement, 'open');
        }
      });
    });

    this.eventBus?.emit('lightbox:opened', {
      gallery: state.gallery,
      index: state.currentIndex,
      total: state.galleryElements.length,
    });
  }

  _eagerLoadAdjacentImages(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || !state.galleryElements) return;

    const { config, currentIndex, galleryElements: gallery } = state;

    if (config.preloadStrategy === 'none') {
      return;
    }

    let indicesToLoad;

    if (config.preloadStrategy === 'all') {
      if (state.preloadedAll) return;
      state.preloadedAll = true;
      indicesToLoad = gallery.map((_, index) => index);
    } else {
      /* 'adjacent': the current image and its neighbours */
      indicesToLoad = [currentIndex];

      if (config.showNavigation) {
        if (currentIndex > 0) {
          indicesToLoad.push(currentIndex - 1);
        }
        if (currentIndex < gallery.length - 1) {
          indicesToLoad.push(currentIndex + 1);
        }
      }
    }

    indicesToLoad.forEach(index => {
      const element = gallery[index];

      /* Ask lazily loaded thumbnails inside the link to load too */
      element.querySelectorAll('[data-lazysrc]').forEach(lazyImg => {
        lazyImg.dispatchEvent(
          new CustomEvent('lazysrc:forceLoad', {
            bubbles: true,
            detail: {
              source: 'lightbox',
              gallery: state.gallery,
              index,
              strategy: config.preloadStrategy,
            },
          })
        );
      });

      this._preloadImage(this._getImageData(element));
    });
  }

  /**
   * Resolve the lightbox image data for a trigger element.
   *
   * The href is the default full-size source. Optional data-lightbox-srcset
   * and data-lightbox-sizes attributes let a trigger drive a responsive
   * <img> so the lightbox can serve a viewport-appropriate variant instead
   * of the full-size href on every device. Triggers without those attributes
   * keep the original href-only behaviour.
   */
  _getImageData(element) {
    const srcset = element.getAttribute('data-lightbox-srcset') || '';

    return {
      src: element.getAttribute('href') || '',
      srcset,
      sizes: element.getAttribute('data-lightbox-sizes') || (srcset ? '100vw' : ''),
      alt: element.querySelector('img')?.alt || '',
    };
  }

  /**
   * Apply resolved image data to an <img>, including responsive attributes.
   */
  _applyImageData(img, data) {
    img.alt = data.alt;
    if (data.srcset) {
      img.srcset = data.srcset;
      img.sizes = data.sizes;
    } else {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    }
    img.src = data.src;
  }

  /**
   * Load and decode an image, so swapping it in doesn't stutter
   *
   * @returns {Promise<void>} Resolves when the image is ready or has failed
   */
  _preloadImage(data) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => (img.decode?.() ?? Promise.resolve()).then(resolve, resolve);
      img.onerror = () => resolve();
      if (data.srcset) {
        img.sizes = data.sizes;
        img.srcset = data.srcset;
      }
      img.src = data.src;
    });
  }

  /**
   * Build the viewer dialog and append it to the page
   *
   * @returns {HTMLDialogElement}
   */
  _createLightboxElement(triggerElement) {
    const { config } = this.getState(triggerElement);

    const overlay = document.createElement('dialog');
    overlay.className = config.overlayClass;
    overlay.setAttribute('aria-label', 'Image viewer');

    const button = (action, className, label) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = className;
      control.dataset.lightboxAction = action;
      control.setAttribute('aria-label', label);
      control.innerHTML = ICONS[action];
      return control;
    };

    overlay.append(button('close', config.closeClass, 'Close'));
    if (config.showNavigation) {
      overlay.append(
        button('prev', config.prevClass, 'Previous image'),
        button('next', config.nextClass, 'Next image')
      );
    }

    const container = document.createElement('div');
    container.className = config.containerClass;
    const content = document.createElement('div');
    content.className = config.contentClass;
    const image = document.createElement('img');
    image.className = config.imageClass;
    image.alt = '';
    content.append(image);
    container.append(content);
    overlay.append(container);

    if (config.showCounter) {
      const counter = document.createElement('div');
      counter.className = config.counterClass;
      counter.setAttribute('aria-live', 'polite');
      overlay.append(counter);
    }

    overlay.addEventListener('click', event => {
      const action = event.target.closest('[data-lightbox-action]')?.dataset.lightboxAction;
      if (action === 'close') {
        this._closeLightbox(triggerElement);
      } else if (action === 'prev') {
        this._previousImage(triggerElement);
      } else if (action === 'next') {
        this._nextImage(triggerElement);
      } else if (event.target === overlay && config.closeOnBackdrop) {
        this._closeLightbox(triggerElement);
      }
    });

    overlay.addEventListener('keydown', event => this._onKeydown(triggerElement, event));

    overlay.addEventListener('cancel', event => {
      event.preventDefault();
      if (config.closeOnEscape) {
        this._closeLightbox(triggerElement);
      }
    });

    /* The browser can close a modal dialog itself, for example on a repeated Escape */
    overlay.addEventListener('close', () => {
      if (this.lightboxElement === overlay) {
        this._teardown(triggerElement, this.getState(triggerElement));
      }
    });

    document.body.append(overlay);
    this.lightboxElement = overlay;
    return overlay;
  }

  _onKeydown(triggerElement, event) {
    const state = this.getState(triggerElement);
    if (!state) return;

    const { config } = state;
    const actions = {
      Escape: config.closeOnEscape && (() => this._closeLightbox(triggerElement)),
      ArrowLeft: config.keyNavigation && (() => this._previousImage(triggerElement)),
      ArrowRight: config.keyNavigation && (() => this._nextImage(triggerElement)),
    };

    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  _showImage(triggerElement, index, direction = null) {
    const state = this.getState(triggerElement);
    if (!state || !this.lightboxElement) return;

    const { config } = state;
    const imageData = this._getImageData(state.galleryElements[index]);
    const img = this.lightboxElement.querySelector(`.${config.imageClass.split(' ')[0]}`);

    const slide =
      config.useDirectionalTransitions &&
      direction &&
      state.lightboxState === 'open' &&
      !prefersReducedMotion();
    if (slide) {
      this._slideToImage(triggerElement, img, imageData, direction);
    } else {
      this._applyImageData(img, imageData);
    }

    if (config.showCounter) {
      const counter = this.lightboxElement.querySelector(`.${config.counterClass.split(' ')[0]}`);
      counter.textContent = `${index + 1} / ${state.galleryElements.length}`;
    }

    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector('[data-lightbox-action="prev"]');
      const nextBtn = this.lightboxElement.querySelector('[data-lightbox-action="next"]');

      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === state.galleryElements.length - 1;
    }

    this._eagerLoadAdjacentImages(triggerElement);
  }

  /**
   * Slide the current image out and the next one in.
   *
   * The new image is swapped in once it has loaded or failed, and the lightbox
   * always returns to 'open' afterwards, so a broken image or a transition that
   * never ends cannot block further navigation.
   */
  async _slideToImage(triggerElement, img, imageData, direction) {
    const state = this.getState(triggerElement);
    const { config } = state;
    const overlay = this.lightboxElement;
    const slideOutClass = direction === 'next' ? config.slideLeftClass : config.slideRightClass;
    const slideInClass = direction === 'next' ? config.slideRightClass : config.slideLeftClass;

    this._setState(triggerElement, 'transitioning');

    try {
      img.classList.add(slideOutClass);
      await Promise.all([whenAnimationsFinish(img), this._preloadImage(imageData)]);
      if (this.lightboxElement !== overlay) return;

      this._applyImageData(img, imageData);
      img.style.transition = 'none';
      img.classList.add(slideInClass);
      img.classList.remove(slideOutClass);
      img.getBoundingClientRect();
      await new Promise(resolve => requestAnimationFrame(resolve));

      img.style.transition = '';
      img.classList.remove(slideInClass);
      await whenAnimationsFinish(img);
    } finally {
      if (this.lightboxElement === overlay && state.lightboxState === 'transitioning') {
        this._setState(triggerElement, 'open');
      }
    }
  }

  _previousImage(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || !['opening', 'open'].includes(state.lightboxState)) return;

    if (state.currentIndex > 0) {
      state.currentIndex--;
      this._showImage(triggerElement, state.currentIndex, 'prev');
    }
  }

  _nextImage(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state || !['opening', 'open'].includes(state.lightboxState)) return;

    if (state.currentIndex < state.galleryElements.length - 1) {
      state.currentIndex++;
      this._showImage(triggerElement, state.currentIndex, 'next');
    }
  }

  _closeLightbox(triggerElement) {
    const state = this.getState(triggerElement);
    const overlay = this.lightboxElement;
    if (!state || !overlay || ['closed', 'closing'].includes(state.lightboxState)) return;

    this._setState(triggerElement, 'closing');
    overlay.classList.remove(state.config.showClass);

    whenAnimationsFinish(overlay).then(() => {
      if (this.lightboxElement === overlay) {
        this._teardown(triggerElement, state);
      }
    });
  }

  /**
   * Remove the viewer, unlock page scroll and, unless told otherwise, return focus to the link
   */
  _teardown(triggerElement, state, { restoreFocus = true } = {}) {
    const overlay = this.lightboxElement;
    if (!overlay) return;

    this.lightboxElement = null;
    this.currentTriggerElement = null;
    if (overlay.open) {
      overlay.close();
    }
    overlay.remove();

    document.body.classList.remove('overflow--hidden');
    document.documentElement.style.removeProperty('--scrollbar-width');

    if (this.getState(triggerElement)) {
      this._setState(triggerElement, 'closed');
    } else if (state) {
      state.lightboxState = 'closed';
    }
    if (state) {
      state.currentIndex = 0;
      state.galleryElements = [];
      state.preloadedAll = false;
    }

    if (restoreFocus && triggerElement.isConnected) {
      triggerElement.focus({ preventScroll: true });
    }

    this.eventBus?.emit('lightbox:closed', {});
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
    if (!state || !['opening', 'open'].includes(state.lightboxState)) return;

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
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default Lightbox;
