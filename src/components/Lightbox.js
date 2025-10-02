import { BaseComponent } from '@peptolab/parallelogram';

/**
 * Lightbox Component - Image/media gallery viewer
 *
 * Features:
 * - BEM-compliant class naming (.lightbox__overlay, .lightbox__container, etc.)
 * - Configurable class names via data attributes
 * - Gallery support with navigation
 * - Keyboard navigation (arrow keys, escape)
 * - Counter display
 * - Backdrop click to close
 * - Responsive design
 *
 * @example
 * <!-- Basic lightbox -->
 * <figure>
 *   <a data-lightbox="gallery" href="large1.jpg">
 *     <img src="thumb1.jpg" alt="Image 1">
 *   </a>
 *   <figcaption>Click to view larger image</figcaption>
 * </figure>
 *
 * <!-- Gallery with multiple images -->
 * <figure>
 *   <a data-lightbox="gallery" href="large2.jpg">
 *     <img src="thumb2.jpg" alt="Image 2">
 *   </a>
 *   <figcaption>Gallery image 2</figcaption>
 * </figure>
 *
 * <!-- Custom configuration -->
 * <a data-lightbox="custom"
 *    data-lightbox-close-escape="false"
 *    data-lightbox-show-counter="true"
 *    data-lightbox-overlay-class="custom-lightbox__overlay"
 *    href="image.jpg">
 *   <img src="thumb.jpg" alt="Custom lightbox">
 * </a>
 *
 * BEM Classes:
 * - .lightbox__overlay - Fullscreen overlay backdrop
 * - .lightbox__container - Container for lightbox content
 * - .lightbox__content - Content wrapper
 * - .lightbox__image - Image element
 * - .lightbox__close - Close button
 * - .lightbox__nav - Navigation button
 * - .lightbox__nav--prev - Previous button modifier
 * - .lightbox__nav--next - Next button modifier
 * - .lightbox__counter - Image counter display
 */
export class Lightbox extends BaseComponent {
  static get defaults() {
    return {
      closeOnEscape: true,
      closeOnBackdrop: true,
      showCounter: true,
      showNavigation: true,
      keyNavigation: true,
      useDirectionalTransitions: true,
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
      /* Utility classes for transitions */
      showClass: 'show',
      slideLeftClass: 'slide-left',
      slideRightClass: 'slide-right',
    };
  }

  constructor(options = {}) {
    super(options);
    this.lightboxElement = null;
    this.currentGallery = [];
    this.currentIndex = 0;
    this.isOpen = false;
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const gallery = element.dataset.lightbox;

    state.config = config;
    state.gallery = gallery;

    element.addEventListener('click', e => {
      e.preventDefault();
      this._openLightbox(element, state);
    });

    this.eventBus?.emit('lightbox:mounted', { element, gallery });
    return state;
  }

  _getConfiguration(element) {
    return {
      closeOnEscape: this._getDataAttr(
        element,
        'lightbox-close-escape',
        Lightbox.defaults.closeOnEscape
      ),
      closeOnBackdrop: this._getDataAttr(
        element,
        'lightbox-close-backdrop',
        Lightbox.defaults.closeOnBackdrop
      ),
      showCounter: this._getDataAttr(
        element,
        'lightbox-show-counter',
        Lightbox.defaults.showCounter
      ),
      showNavigation: this._getDataAttr(
        element,
        'lightbox-show-nav',
        Lightbox.defaults.showNavigation
      ),
      keyNavigation: this._getDataAttr(
        element,
        'lightbox-key-nav',
        Lightbox.defaults.keyNavigation
      ),
      useDirectionalTransitions: this._getDataAttr(
        element,
        'lightbox-directional-transitions',
        Lightbox.defaults.useDirectionalTransitions
      ),
      /* BEM class names - configurable via data attributes */
      baseClass: this._getDataAttr(element, 'lightbox-base-class', Lightbox.defaults.baseClass),
      overlayClass: this._getDataAttr(
        element,
        'lightbox-overlay-class',
        Lightbox.defaults.overlayClass
      ),
      containerClass: this._getDataAttr(
        element,
        'lightbox-container-class',
        Lightbox.defaults.containerClass
      ),
      closeClass: this._getDataAttr(
        element,
        'lightbox-close-class',
        Lightbox.defaults.closeClass
      ),
      prevClass: this._getDataAttr(element, 'lightbox-prev-class', Lightbox.defaults.prevClass),
      nextClass: this._getDataAttr(element, 'lightbox-next-class', Lightbox.defaults.nextClass),
      contentClass: this._getDataAttr(
        element,
        'lightbox-content-class',
        Lightbox.defaults.contentClass
      ),
      imageClass: this._getDataAttr(
        element,
        'lightbox-image-class',
        Lightbox.defaults.imageClass
      ),
      counterClass: this._getDataAttr(
        element,
        'lightbox-counter-class',
        Lightbox.defaults.counterClass
      ),
      showClass: this._getDataAttr(element, 'lightbox-show-class', Lightbox.defaults.showClass),
      slideLeftClass: this._getDataAttr(
        element,
        'lightbox-slide-left-class',
        Lightbox.defaults.slideLeftClass
      ),
      slideRightClass: this._getDataAttr(
        element,
        'lightbox-slide-right-class',
        Lightbox.defaults.slideRightClass
      ),
    };
  }

  _openLightbox(triggerElement, state) {
    if (this.isOpen) return;

    // Build gallery from all elements with same gallery name
    this.currentGallery = Array.from(
      document.querySelectorAll(`[data-lightbox="${state.gallery}"]`)
    );

    this.currentIndex = this.currentGallery.indexOf(triggerElement);
    this.currentConfig = state.config;

    this._createLightboxElement(state.config);
    this._showImage(this.currentIndex, state.config);
    this._setupEventListeners(state.config);

    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Add show class with RAF for transition
    requestAnimationFrame(() => {
      this.lightboxElement.classList.add(state.config.showClass);
    });

    this.eventBus?.emit('lightbox:opened', {
      gallery: state.gallery,
      index: this.currentIndex,
      total: this.currentGallery.length,
    });
  }

  _createLightboxElement(config) {
    this.lightboxElement = document.createElement('div');
    this.lightboxElement.className = config.overlayClass;
    this.lightboxElement.innerHTML = `
            <div class="${config.containerClass}">
                <button class="${config.closeClass}" aria-label="Close">&times;</button>
                ${
                  config.showNavigation
                    ? `
                    <button class="${config.prevClass}" aria-label="Previous">&larr;</button>
                    <button class="${config.nextClass}" aria-label="Next">&rarr;</button>
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

    // Setup button handlers
    this.lightboxElement.querySelector(`.${config.closeClass.split(' ')[0]}`).addEventListener('click', e => {
      e.stopPropagation();
      this._closeLightbox();
    });

    if (config.showNavigation) {
      this.lightboxElement.querySelector(`.${config.prevClass.split(' ')[0]}`).addEventListener('click', e => {
        e.stopPropagation();
        this._previousImage(config);
      });

      this.lightboxElement.querySelector(`.${config.nextClass.split(' ')[0]}`).addEventListener('click', e => {
        e.stopPropagation();
        this._nextImage(config);
      });
    }

    if (config.closeOnBackdrop) {
      this.lightboxElement.addEventListener('click', e => {
        if (e.target === this.lightboxElement) {
          this._closeLightbox();
        }
      });
    }
  }

  _showImage(index, config, direction = null) {
    const element = this.currentGallery[index];
    const imageUrl = element.href;
    const imageAlt = element.querySelector('img')?.alt || '';

    const img = this.lightboxElement.querySelector(`.${config.imageClass.split(' ')[0]}`);

    // Apply directional transition if configured and direction specified
    if (config.useDirectionalTransitions && direction) {
      const transitionClass = direction === 'next' ? config.slideLeftClass : config.slideRightClass;

      // Add transition class
      img.classList.add(transitionClass);

      // Wait for transition to complete, then update image and remove class
      const handleTransitionEnd = event => {
        if (event && event.target !== img) return;

        img.src = imageUrl;
        img.alt = imageAlt;

        // Remove transition class after image loads
        img.classList.remove(config.slideLeftClass, config.slideRightClass);
      };

      img.addEventListener('transitionend', handleTransitionEnd, { once: true });
      img.addEventListener('animationend', handleTransitionEnd, { once: true });
    } else {
      // No transition, just update immediately
      img.src = imageUrl;
      img.alt = imageAlt;
    }

    // Update counter
    if (config.showCounter) {
      const counter = this.lightboxElement.querySelector(`.${config.counterClass.split(' ')[0]}`);
      counter.textContent = `${index + 1} / ${this.currentGallery.length}`;
    }

    // Update navigation buttons
    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector(`.${config.prevClass.split(' ')[0]}`);
      const nextBtn = this.lightboxElement.querySelector(`.${config.nextClass.split(' ')[0]}`);

      prevBtn.style.display = index > 0 ? 'block' : 'none';
      nextBtn.style.display = index < this.currentGallery.length - 1 ? 'block' : 'none';
    }
  }

  _previousImage(config) {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._showImage(this.currentIndex, config, 'prev');
    }
  }

  _nextImage(config) {
    if (this.currentIndex < this.currentGallery.length - 1) {
      this.currentIndex++;
      this._showImage(this.currentIndex, config, 'next');
    }
  }

  _setupEventListeners(config) {
    if (config.closeOnEscape || config.keyNavigation) {
      this.keyHandler = e => {
        let handled = false;
        switch (e.key) {
          case 'Escape':
            if (config.closeOnEscape) {
              this._closeLightbox();
              handled = true;
            }
            break;
          case 'ArrowLeft':
            if (config.keyNavigation) {
              this._previousImage(config);
              handled = true;
            }
            break;
          case 'ArrowRight':
            if (config.keyNavigation) {
              this._nextImage(config);
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

  _closeLightbox() {
    if (!this.isOpen) return;

    // Remove show class to trigger close transition
    this.lightboxElement.classList.remove(this.currentConfig.showClass);

    // Wait for transition to complete
    const handleTransitionEnd = event => {
      if (event && event.target !== this.lightboxElement) return;

      // Remove event listeners
      if (this.keyHandler) {
        document.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }

      // Remove lightbox element
      if (this.lightboxElement) {
        this.lightboxElement.remove();
        this.lightboxElement = null;
      }

      // Restore body scroll
      document.body.style.overflow = '';

      this.isOpen = false;
      this.currentGallery = [];
      this.currentIndex = 0;
      this.currentConfig = null;

      this.eventBus?.emit('lightbox:closed', {});
    };

    this.lightboxElement.addEventListener('transitionend', handleTransitionEnd, { once: true });
    this.lightboxElement.addEventListener('animationend', handleTransitionEnd, { once: true });
  }

  // Public API
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (state) {
      this._openLightbox(triggerElement, state);
    }
  }

  close() {
    this._closeLightbox();
  }

  next() {
    if (this.isOpen && this.lightboxElement) {
      const config = { showNavigation: true, keyNavigation: true }; // Use current config
      this._nextImage(config);
    }
  }

  previous() {
    if (this.isOpen && this.lightboxElement) {
      const config = { showNavigation: true, keyNavigation: true }; // Use current config
      this._previousImage(config);
    }
  }

  goTo(index) {
    if (this.isOpen && index >= 0 && index < this.currentGallery.length) {
      this.currentIndex = index;
      const config = { showCounter: true, showNavigation: true }; // Use current config
      this._showImage(this.currentIndex, config);
    }
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      currentIndex: this.currentIndex,
      gallerySize: this.currentGallery.length,
    };
  }

  static enhanceAll(selector = '[data-lightbox]', options) {
    const instance = new Lightbox(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default Lightbox;
