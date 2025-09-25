import { BaseComponent } from '@peptolab/parallelogram';

/**
 * Carousel - Image/content carousel component
 * Enhances HTML with data attributes for carousel functionality
 *
 * @example
 * HTML:
 * <div class="carousel"
 *      data-carousel
 *      data-carousel-autoplay-delay="5000"
 *      data-carousel-loop="true"
 *      data-carousel-show-dots="true">
 *   <div class="carousel-track" data-carousel-track>
 *     <figure class="carousel-slide" data-carousel-slide>
 *       <img src="image1.jpg" alt="Description 1" />
 *       <figcaption>Caption for slide 1</figcaption>
 *     </figure>
 *     <figure class="carousel-slide" data-carousel-slide>
 *       <img src="image2.jpg" alt="Description 2" />
 *       <figcaption>Caption for slide 2</figcaption>
 *     </figure>
 *     <figure class="carousel-slide" data-carousel-slide>
 *       <img src="image3.jpg" alt="Description 3" />
 *       <figcaption>Caption for slide 3</figcaption>
 *     </figure>
 *   </div>
 * </div>
 *
 * JavaScript (standalone):
 * import { Carousel } from './components/Carousel.js';
 * const carousels = new Carousel();
 * document.querySelectorAll('[data-carousel]')
 *   .forEach(carousel => carousels.mount(carousel));
 *
 * JavaScript (with framework):
 * // Automatically handled by PageManager
 */

class Carousel extends BaseComponent {
  /**
   * Default options for carousel
   */
  static get defaults() {
    return {
      autoplayDelay: 5000, // Auto-advance delay (ms)
      loop: true, // Loop back to start
      showDots: true, // Show dot indicators
      showArrows: true, // Show navigation arrows
      slideSelector: '[data-carousel-slide]',
      trackSelector: '[data-carousel-track]',
      swipeThreshold: 50, // Touch swipe threshold (px)
      transitionDuration: 300, // CSS transition duration (ms)
      pauseOnHover: true, // Pause autoplay on hover
      keyboardNavigation: true, // Enable keyboard navigation
    };
  }

  /**
   * Initialize carousel for an element
   * @protected
   * @param {HTMLElement} element - Carousel element to enhance
   * @returns {import('../core/BaseComponent.js').ComponentState} Component state
   */
  _init(element) {
    const state = super._init(element);

    // Get configuration from data attributes
    const autoplayDelay = this._getDataAttr(
      element,
      'carousel-autoplay-delay',
      Carousel.defaults.autoplayDelay
    );
    const loop = this._getDataAttr(element, 'carousel-loop', Carousel.defaults.loop);
    const showDots = this._getDataAttr(element, 'carousel-show-dots', Carousel.defaults.showDots);
    const showArrows = this._getDataAttr(
      element,
      'carousel-show-arrows',
      Carousel.defaults.showArrows
    );
    const pauseOnHover = this._getDataAttr(
      element,
      'carousel-pause-on-hover',
      Carousel.defaults.pauseOnHover
    );
    const keyboardNavigation = this._getDataAttr(
      element,
      'carousel-keyboard',
      Carousel.defaults.keyboardNavigation
    );

    // Find carousel elements
    const track = element.querySelector(Carousel.defaults.trackSelector);
    const slides = element.querySelectorAll(Carousel.defaults.slideSelector);

    if (!track || slides.length === 0) {
      this.logger?.warn('Carousel: No track or slides found', element);
      return state;
    }

    // Set up carousel state
    state.currentSlide = 0;
    state.totalSlides = slides.length;
    state.autoplayDelay = autoplayDelay;
    state.loop = loop;
    state.track = track;
    state.slides = Array.from(slides);
    state.autoplayTimer = null;
    state.isPlaying = autoplayDelay > 0;

    // Add ARIA attributes
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', 'Carousel');
    track.setAttribute('aria-live', 'polite');

    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${index + 1} of ${slides.length}`);
      slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
    });

    // Create navigation controls
    if (showArrows) {
      this._createArrows(element, state);
    }

    if (showDots) {
      this._createDots(element, state);
    }

    // Set up event listeners
    this._setupEventListeners(element, state, { pauseOnHover, keyboardNavigation });

    // Start autoplay if enabled
    if (state.isPlaying) {
      this._startAutoplay(state);
    }

    // Initial slide positioning
    this._updateSlidePosition(element, state);

    this.logger?.info('Carousel initialized', {
      element,
      totalSlides: state.totalSlides,
      autoplayDelay,
      loop,
    });

    return state;
  }

  /**
   * Go to specific slide
   * @param {HTMLElement} element - Carousel element
   * @param {number} slideIndex - Target slide index
   */
  goToSlide(element, slideIndex) {
    const state = this.getState(element);
    if (!state) return;

    const targetIndex = this._validateSlideIndex(slideIndex, state);
    if (targetIndex === state.currentSlide) return;

    state.currentSlide = targetIndex;
    this._updateSlidePosition(element, state);
    this._restartAutoplay(state);

    // Dispatch custom event
    this._dispatch(element, 'carousel:slide-change', {
      currentSlide: state.currentSlide,
      totalSlides: state.totalSlides,
    });
  }

  /**
   * Go to next slide
   * @param {HTMLElement} element - Carousel element
   */
  next(element) {
    const state = this.getState(element);
    if (!state) return;

    let nextIndex = state.currentSlide + 1;
    if (nextIndex >= state.totalSlides) {
      nextIndex = state.loop ? 0 : state.totalSlides - 1;
    }

    this.goToSlide(element, nextIndex);
  }

  /**
   * Go to previous slide
   * @param {HTMLElement} element - Carousel element
   */
  previous(element) {
    const state = this.getState(element);
    if (!state) return;

    let prevIndex = state.currentSlide - 1;
    if (prevIndex < 0) {
      prevIndex = state.loop ? state.totalSlides - 1 : 0;
    }

    this.goToSlide(element, prevIndex);
  }

  /**
   * Play/resume autoplay
   * @param {HTMLElement} element - Carousel element
   */
  play(element) {
    const state = this.getState(element);
    if (!state) return;

    state.isPlaying = true;
    this._startAutoplay(state);

    this._dispatch(element, 'carousel:play', {});
  }

  /**
   * Pause autoplay
   * @param {HTMLElement} element - Carousel element
   */
  pause(element) {
    const state = this.getState(element);
    if (!state) return;

    state.isPlaying = false;
    this._stopAutoplay(state);

    this._dispatch(element, 'carousel:pause', {});
  }

  /**
   * Create navigation arrows
   * @private
   */
  _createArrows(element, state) {
    const prevButton = document.createElement('button');
    prevButton.className = 'carousel__arrow carousel__arrow--prev';
    prevButton.setAttribute('aria-label', 'Previous slide');
    prevButton.innerHTML = '←';

    const nextButton = document.createElement('button');
    nextButton.className = 'carousel__arrow carousel__arrow--next';
    nextButton.setAttribute('aria-label', 'Next slide');
    nextButton.innerHTML = '→';

    element.appendChild(prevButton);
    element.appendChild(nextButton);

    // Store references
    state.prevButton = prevButton;
    state.nextButton = nextButton;

    // Add event listeners
    prevButton.addEventListener('click', () => this.previous(element), {
      signal: state.controller.signal,
    });

    nextButton.addEventListener('click', () => this.next(element), {
      signal: state.controller.signal,
    });
  }

  /**
   * Create dot indicators
   * @private
   */
  _createDots(element, state) {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel__dots';
    dotsContainer.setAttribute('role', 'tablist');
    dotsContainer.setAttribute('aria-label', 'Carousel navigation');

    state.dots = [];

    for (let i = 0; i < state.totalSlides; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.setAttribute('aria-controls', `slide-${i}`);

      if (i === 0) {
        dot.classList.add('active');
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.setAttribute('aria-selected', 'false');
      }

      dot.addEventListener('click', () => this.goToSlide(element, i), {
        signal: state.controller.signal,
      });

      dotsContainer.appendChild(dot);
      state.dots.push(dot);
    }

    element.appendChild(dotsContainer);
    state.dotsContainer = dotsContainer;
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners(element, state, options) {
    if (options.pauseOnHover) {
      element.addEventListener('mouseenter', () => this._stopAutoplay(state), {
        signal: state.controller.signal,
      });

      element.addEventListener(
        'mouseleave',
        () => {
          if (state.isPlaying) this._startAutoplay(state);
        },
        {
          signal: state.controller.signal,
        }
      );
    }

    if (options.keyboardNavigation) {
      element.addEventListener(
        'keydown',
        event => {
          switch (event.key) {
            case 'ArrowLeft':
              event.preventDefault();
              this.previous(element);
              break;
            case 'ArrowRight':
              event.preventDefault();
              this.next(element);
              break;
            case ' ':
              event.preventDefault();
              if (state.isPlaying) {
                this.pause(element);
              } else {
                this.play(element);
              }
              break;
          }
        },
        {
          signal: state.controller.signal,
        }
      );
    }

    // Touch/swipe support
    this._setupTouchEvents(element, state);
  }

  /**
   * Set up touch/swipe events
   * @private
   */
  _setupTouchEvents(element, state) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    element.addEventListener(
      'touchstart',
      event => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isDragging = true;
        this._stopAutoplay(state);
      },
      {
        passive: true,
        signal: state.controller.signal,
      }
    );

    element.addEventListener(
      'touchmove',
      event => {
        if (!isDragging) return;

        const touch = event.touches[0];
        const diffX = touch.clientX - startX;
        const diffY = touch.clientY - startY;

        // Prevent vertical scrolling if horizontal swipe is detected
        if (Math.abs(diffX) > Math.abs(diffY)) {
          event.preventDefault();
        }
      },
      {
        passive: false,
        signal: state.controller.signal,
      }
    );

    element.addEventListener(
      'touchend',
      event => {
        if (!isDragging) return;
        isDragging = false;

        const touch = event.changedTouches[0];
        const diffX = touch.clientX - startX;

        if (Math.abs(diffX) > Carousel.defaults.swipeThreshold) {
          if (diffX > 0) {
            this.previous(element);
          } else {
            this.next(element);
          }
        }

        if (state.isPlaying) this._startAutoplay(state);
      },
      {
        passive: true,
        signal: state.controller.signal,
      }
    );
  }

  /**
   * Update slide position and UI
   * @private
   */
  _updateSlidePosition(element, state) {
    // Update slides
    state.slides.forEach((slide, index) => {
      slide.setAttribute('aria-hidden', index === state.currentSlide ? 'false' : 'true');
      if (index === state.currentSlide) {
        slide.classList.add('carousel__slide--active');
      } else {
        slide.classList.remove('carousel__slide--active');
      }
    });

    // Update track position
    const translateX = -(state.currentSlide * 100);
    state.track.style.transform = `translateX(${translateX}%)`;

    // Update dots
    if (state.dots) {
      state.dots.forEach((dot, index) => {
        const isActive = index === state.currentSlide;
        if (isActive) {
          dot.classList.add('carousel__dot--active');
        } else {
          dot.classList.remove('carousel__dot--active');
        }
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    // Update arrow states
    if (state.prevButton && state.nextButton && !state.loop) {
      state.prevButton.disabled = state.currentSlide === 0;
      state.nextButton.disabled = state.currentSlide === state.totalSlides - 1;
    }
  }

  /**
   * Start autoplay timer
   * @private
   */
  _startAutoplay(state) {
    this._stopAutoplay(state);
    if (state.autoplayDelay > 0) {
      state.autoplayTimer = setTimeout(() => {
        this.next(state.track.closest('[data-carousel]'));
      }, state.autoplayDelay);
    }
  }

  /**
   * Stop autoplay timer
   * @private
   */
  _stopAutoplay(state) {
    if (state.autoplayTimer) {
      clearTimeout(state.autoplayTimer);
      state.autoplayTimer = null;
    }
  }

  /**
   * Restart autoplay (stop and start)
   * @private
   */
  _restartAutoplay(state) {
    if (state.isPlaying) {
      this._startAutoplay(state);
    }
  }

  /**
   * Validate and normalize slide index
   * @private
   */
  _validateSlideIndex(index, state) {
    return Math.max(0, Math.min(index, state.totalSlides - 1));
  }

  /**
   * Enhanced cleanup for carousel
   * @param {HTMLElement} element - Carousel element
   */
  unmount(element) {
    const state = this.getState(element);
    if (state) {
      this._stopAutoplay(state);
    }
    super.unmount(element);
  }

  /**
   * Static method to enhance all carousels on the page
   * @param {string} [selector='[data-carousel]'] - CSS selector
   * @param {Object} [options] - Component options
   * @returns {Carousel} Carousel instance
   */
  static enhanceAll(selector = '[data-carousel]', options) {
    const instance = new Carousel(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Carousel as default };
