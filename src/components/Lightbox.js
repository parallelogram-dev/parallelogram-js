import { BaseComponent } from '../core/BaseComponent.js';
import { prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';
import { setStaticHTML } from '../utils/shadow.js';
import { chevronLeft, chevronRight, iconMarkup, x } from '../utils/icons.js';

const ICONS = {
  close: iconMarkup(x),
  prev: iconMarkup(chevronLeft),
  next: iconMarkup(chevronRight),
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
      /* 'adjacent' | 'all' | 'none' */
      preloadStrategy: 'adjacent',
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

  /**
   * @param {import('../core/BaseComponent.js').ComponentContext} [options]
   */
  constructor(options = {}) {
    super(options);
    this.lightboxElement = null;
    /** @type {HTMLElement|null} The gallery link the open viewer belongs to */
    this.currentTriggerElement = null;
  }

  /**
   * Mount on a gallery link, ignoring the lightbox's own overlay
   *
   * The overlay carries the deprecated `data-lightbox` state copy, so a page observer watching for
   * `[data-lightbox]` would otherwise mount it as another gallery link.
   *
   * @param {HTMLElement} element
   */
  mount(element) {
    if (
      element === this.lightboxElement ||
      element.classList.contains(this.constructor.defaults.overlayClass)
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
    return this._getConfigFromAttrs(element, {
      closeOnEscape: 'close-escape',
      closeOnBackdrop: 'close-backdrop',
      showCounter: 'show-counter',
      showNavigation: 'show-nav',
      keyNavigation: 'key-nav',
      useDirectionalTransitions: 'directional-transitions',
      preloadStrategy: 'preload',
      /* BEM class names */
      baseClass: 'base-class',
      overlayClass: 'overlay-class',
      containerClass: 'container-class',
      closeClass: 'close-class',
      prevClass: 'prev-class',
      nextClass: 'next-class',
      contentClass: 'content-class',
      imageClass: 'image-class',
      counterClass: 'counter-class',
      /* State and utility classes */
      stateOpeningClass: 'state-opening-class',
      stateOpenClass: 'state-open-class',
      stateTransitioningClass: 'state-transitioning-class',
      stateClosingClass: 'state-closing-class',
      showClass: 'show-class',
      slideLeftClass: 'slide-left-class',
      slideRightClass: 'slide-right-class',
    });
  }

  _setState(element, newState) {
    const state = this.getState(element);
    if (!state) return;

    const oldState = state.lightboxState;
    state.lightboxState = newState;

    /* Update the viewer's state attribute, and swap the previous state's class for the new one's */
    if (this.lightboxElement) {
      const classesFor = value =>
        (state.config[`state${value[0].toUpperCase()}${value.slice(1)}Class`] ?? '')
          .split(' ')
          .filter(Boolean);
      this.lightboxElement.classList.remove(...classesFor(oldState));
      this.lightboxElement.classList.add(...classesFor(newState));
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
      setStaticHTML(control, ICONS[action]);
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
    const error = document.createElement('p');
    error.className = 'lightbox__error';
    error.hidden = true;
    image.addEventListener('error', () => {
      if (!image.getAttribute('src')) return;
      error.textContent = `${image.alt || 'The image'} couldn't be loaded`;
      error.hidden = false;
      image.hidden = true;
    });
    image.addEventListener('load', () => {
      error.hidden = true;
      image.hidden = false;
    });
    content.append(image, error);
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
      /* The counter is the only live region here, so the image's name goes in it rather than in a
         second one that would announce over it. It is not shown: the badge still reads 1 / 3. */
      const name = document.createElement('span');
      name.className = 'lightbox__counter-name';
      name.textContent = imageData.alt;
      counter.replaceChildren(`${index + 1} / ${state.galleryElements.length}`, name);
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

  /**
   * Open the viewer at a gallery link's image
   *
   * @param {HTMLElement} triggerElement - A mounted gallery link
   */
  open(triggerElement) {
    this._openLightbox(triggerElement);
  }

  /**
   * @param {HTMLElement} triggerElement - The gallery link the viewer was opened from
   */
  close(triggerElement) {
    this._closeLightbox(triggerElement);
  }

  /**
   * @param {HTMLElement} triggerElement - The gallery link the viewer was opened from
   */
  next(triggerElement) {
    this._nextImage(triggerElement);
  }

  /**
   * @param {HTMLElement} triggerElement - The gallery link the viewer was opened from
   */
  previous(triggerElement) {
    this._previousImage(triggerElement);
  }

  /**
   * Show the image at a position in the gallery while the viewer is open
   *
   * @param {HTMLElement} triggerElement - The gallery link the viewer was opened from
   * @param {number} index - The image's zero-based position in the gallery
   */
  goTo(triggerElement, index) {
    const state = this.getState(triggerElement);
    if (!state || !['opening', 'open'].includes(state.lightboxState)) return;

    if (index >= 0 && index < state.galleryElements.length) {
      state.currentIndex = index;
      this._showImage(triggerElement, state.currentIndex);
    }
  }

  /**
   * The viewer's state for a gallery link, or null when the link isn't mounted
   *
   * @param {HTMLElement} triggerElement - A mounted gallery link
   * @returns {{ lightboxState: 'closed'|'opening'|'open'|'transitioning'|'closing', currentIndex: number, gallerySize: number, gallery: string } | null}
   */
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

  /**
   * Create a Lightbox and mount it on every matching gallery link
   *
   * @param {string} [selector='[data-lightbox]']
   * @param {import('../core/BaseComponent.js').ComponentContext} [options]
   * @returns {Lightbox}
   */
  static enhanceAll(selector = '[data-lightbox]', options) {
    const instance = new Lightbox(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default Lightbox;
