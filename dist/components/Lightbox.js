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
class Lightbox extends BaseComponent {
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
    this.isTransitioning = false;
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const gallery = element.dataset.lightbox;

    state.config = config;
    state.gallery = gallery;

    element.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
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

    // Calculate and set scrollbar width, then apply overflow--hidden class
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('overflow--hidden');

    // Add show class after paint for transition (double RAF)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.lightboxElement.classList.add(state.config.showClass);
      });
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
                <button class="${config.closeClass}" data-lightbox-action="close" aria-label="Close">&times;</button>
                ${
                  config.showNavigation
                    ? `
                    <button class="${config.prevClass}" data-lightbox-action="prev" aria-label="Previous">&larr;</button>
                    <button class="${config.nextClass}" data-lightbox-action="next" aria-label="Next">&rarr;</button>
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
    const closeBtn = this.lightboxElement.querySelector('[data-lightbox-action="close"]');
    closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      this._closeLightbox();
    });

    if (config.showNavigation) {
      const prevBtn = this.lightboxElement.querySelector('[data-lightbox-action="prev"]');
      const nextBtn = this.lightboxElement.querySelector('[data-lightbox-action="next"]');

      prevBtn.addEventListener('click', e => {
        e.stopPropagation();
        this._previousImage(config);
      });

      nextBtn.addEventListener('click', e => {
        e.stopPropagation();
        this._nextImage(config);
      });

      // Initially disable both buttons - _showImage will set correct state
      prevBtn.disabled = true;
      nextBtn.disabled = true;
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
      this.isTransitioning = true;
      const slideOutClass = direction === 'next' ? config.slideLeftClass : config.slideRightClass;
      const slideInClass = direction === 'next' ? config.slideRightClass : config.slideLeftClass;

      // Step 1: Slide out current image
      img.classList.add(slideOutClass);

      img.addEventListener(
        'transitionend',
        () => {
          // Step 2: Image has slid out, remove the class

          // Step 3: Preload new image
          const loader = new Image();
          loader.onload = () => {
            // Step 4: Image loaded, update src and position off-screen
            img.src = imageUrl;
            img.alt = imageAlt;
            img.style.transition = 'none';
            img.classList.add(slideInClass);
            img.offsetHeight;
            img.classList.remove(slideOutClass);

            // Step 5: Slide in
            requestAnimationFrame(() => {
              img.style.transition = '';
              img.classList.remove(slideInClass);

              img.addEventListener(
                'transitionend',
                () => {
                  this.isTransitioning = false;
                },
                { once: true }
              );
            });
          };
          loader.onerror = () => {
            img.src = imageUrl;
            img.alt = imageAlt;
            this.isTransitioning = false;
          };
          loader.src = imageUrl;
        },
        { once: true }
      );
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
      const prevBtn = this.lightboxElement.querySelector('[data-lightbox-action="prev"]');
      const nextBtn = this.lightboxElement.querySelector('[data-lightbox-action="next"]');

      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === this.currentGallery.length - 1;
    }
  }

  _previousImage(config) {
    if (this.isTransitioning) return;
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._showImage(this.currentIndex, config, 'prev');
    }
  }

  _nextImage(config) {
    if (this.isTransitioning) return;
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

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;

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
      document.body.classList.remove('overflow--hidden');

      this.isOpen = false;
      this.currentGallery = [];
      this.currentIndex = 0;
      this.currentConfig = null;

      this.eventBus?.emit('lightbox:closed', {});
    };

    // Wait for transition to complete
    const handleTransitionEnd = event => {
      if (event && event.target !== this.lightboxElement) return;
      cleanup();
    };

    this.lightboxElement.addEventListener('transitionend', handleTransitionEnd, { once: true });
    this.lightboxElement.addEventListener('animationend', handleTransitionEnd, { once: true });

    // Fallback in case transition doesn't fire
    setTimeout(cleanup, 1000);
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

export { Lightbox, Lightbox as default };
