/**
 * ComponentRegistry - Core utility for building component registries
 * Provides a fluent API for defining component loader configurations
 * with sensible defaults and path conventions.
 */

/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} Camel-cased string
 */
function camelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Get data attribute with type conversion
 * @param {HTMLElement} element - Element to read from
 * @param {string} attr - Attribute name (kebab-case or camelCase)
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Converted value
 */
function getDataAttr(element, attr, defaultValue) {
  const key = attr.includes('-') ? camelCase(attr) : attr;
  const value = element.dataset[key];
  if (value === undefined) return defaultValue;

  /* Convert string values to appropriate types */
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}

/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function - delays execution until after wait milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function - ensures it's only called at most once per time period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between allowed executions
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Delay helper - returns a promise that resolves after specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for CSS transition or animation to complete
 * @param {HTMLElement} element - Element with transition/animation
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise} Promise that resolves when transition ends
 */
async function waitForTransition(element, timeout = 2000) {
  return new Promise((resolve) => {
    const handleEnd = () => {
      element.removeEventListener('animationend', handleEnd);
      element.removeEventListener('transitionend', handleEnd);
      resolve();
    };

    element.addEventListener('animationend', handleEnd, { once: true });
    element.addEventListener('transitionend', handleEnd, { once: true });

    setTimeout(() => {
      element.removeEventListener('animationend', handleEnd);
      element.removeEventListener('transitionend', handleEnd);
      resolve();
    }, timeout);
  });
}

/**
 * Apply fade-in effect to element
 * @param {HTMLElement} element - Element to fade in
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
async function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.transition = `opacity ${duration}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '1';

  return new Promise((resolve) => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Apply fade-out effect to element
 * @param {HTMLElement} element - Element to fade out
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
async function fadeOut(element, duration = 300) {
  element.style.opacity = '1';
  element.style.transition = `opacity ${duration}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '0';

  return new Promise((resolve) => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
function getFocusableElements(container = document) {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
  ];
  return Array.from(container.querySelectorAll(selectors.join(',')));
}

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 * @param {HTMLElement} container - Container to trap focus within
 * @param {KeyboardEvent} event - Tab key event
 */
function trapFocus(container, event) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.contains(document.activeElement) ? document.activeElement : null;

  if (event.shiftKey && (active === first || !active)) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && active === last) {
    first.focus();
    event.preventDefault();
  }
}

/**
 * Restore focus to an element with smooth transition
 * @param {HTMLElement} element - Element to focus
 */
function restoreFocus(element) {
  if (element && typeof element.focus === 'function') {
    requestAnimationFrame(() => element.focus());
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Text content or child element
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }

  return element;
}

/**
 * BaseComponent - Production-ready base class with state management
 *
 * Provides lifecycle helpers, state tracking per element, data-attribute
 * parsing, and event dispatching. Components should extend this class and
 * implement _init(element) and optionally update(element).
 *
 * @typedef {Object} ComponentState
 * @property {AbortController} controller - Abort controller for listeners
 * @property {Function} cleanup - Cleanup function called on unmount
 */
class BaseComponent {
  constructor({ eventBus, logger, router }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;
    // Primary storage for element states
    this.elements = new WeakMap();
    // Backward-compat alias for older components expecting `states`
    this.states = this.elements;
    this._keys = null;
  }

  mount(element) {
    if (this.elements.has(element)) return this.update(element);
    const state = this._init(element);
    this.elements.set(element, state);
  }

  update(element) {
    // Override in subclasses for update logic
  }

  unmount(element) {
    const state = this.elements.get(element);
    if (!state) return;
    try {
      state.cleanup?.();
    } finally {
      this.elements.delete(element);
    }
  }

  destroy() {
    for (const element of this._elementsKeys()) {
      this.unmount(element);
    }
  }

  _elementsKeys() {
    if (!this._keys) this._keys = new Set();
    return this._keys;
  }

  _track(element) {
    if (!this._keys) this._keys = new Set();
    this._keys.add(element);
  }

  _untrack(element) {
    this._keys?.delete(element);
  }

  _init(element) {
    const controller = new AbortController();
    const cleanup = () => {
      controller.abort();
      this._untrack(element);
    };
    this._track(element);
    return { cleanup, controller };
  }

  // Helper method for getting state
  getState(element) {
    return this.elements.get(element);
  }

  /* Wrapper methods that delegate to shared utilities */
  _getDataAttr(element, attr, defaultValue) {
    return getDataAttr(element, attr, defaultValue);
  }

  _camelCase(str) {
    return camelCase(str);
  }

  _debounce(func, wait = 300) {
    return debounce(func, wait);
  }

  _throttle(func, limit = 100) {
    return throttle(func, limit);
  }

  _delay(ms) {
    return delay(ms);
  }

  /**
   * Get target element from data attribute with validation
   * Supports both CSS selectors (data-*-target="#id") and data-view lookups (data-*-target-view="viewname")
   *
   * @param {HTMLElement} element - Element containing the data attribute
   * @param {string} dataAttr - Data attribute name (without 'data-' prefix)
   * @param {Object} options - Options for validation
   * @param {boolean} options.required - Whether to warn if not found
   * @returns {HTMLElement|null} Target element or null
   *
   * @example
   * // CSS selector approach
   * <button data-toggle-target="#sidebar">Toggle</button>
   *
   * // data-view approach (more consistent with framework)
   * <button data-toggle-target-view="sidebar">Toggle</button>
   * <div data-view="sidebar">...</div>
   */
  _getTargetElement(element, dataAttr, options = {}) {
    /* Check for data-view based target first (e.g., data-toggle-target-view) */
    const viewAttr = `${dataAttr}-view`;
    const viewName = this._getDataAttr(element, viewAttr);

    if (viewName) {
      const target = document.querySelector(`[data-view="${viewName}"]`);
      if (!target && options.required) {
        this.logger?.warn(`Target element with data-view="${viewName}" not found`, {
          viewName,
          element,
          attribute: viewAttr
        });
      }
      return target;
    }

    /* Fallback to CSS selector approach (e.g., data-toggle-target="#id") */
    const selector = this._getDataAttr(element, dataAttr);
    if (!selector) {
      if (options.required) {
        this.logger?.warn(`No ${dataAttr} or ${viewAttr} attribute found`, element);
      }
      return null;
    }

    const target = document.querySelector(selector);
    if (!target && options.required) {
      this.logger?.warn(`Target element not found`, { selector, element });
    }
    return target;
  }

  /**
   * Parse multiple data attributes into configuration object
   * @param {HTMLElement} element - Element with data attributes
   * @param {Object} mapping - Map of config keys to data attribute names
   * @returns {Object} Configuration object
   */
  _getConfigFromAttrs(element, mapping) {
    const config = {};
    for (const [key, attrName] of Object.entries(mapping)) {
      const defaultValue = this.constructor.defaults?.[key];
      config[key] = this._getDataAttr(element, attrName, defaultValue);
    }
    return config;
  }

  /**
   * Validate and require state exists before proceeding
   * @param {HTMLElement} element - Element to get state for
   * @param {string} methodName - Name of calling method for error messages
   * @returns {Object|null} State object or null
   */
  _requireState(element, methodName = 'method') {
    const state = this.getState(element);
    if (!state) {
      this.logger?.warn(`${methodName}: No state found for element`, element);
    }
    return state;
  }

  _generateId(prefix = 'elem') {
    return generateId(prefix);
  }

  async _waitForTransition(element, timeout = 2000) {
    return waitForTransition(element, timeout);
  }

  async _fadeIn(element, duration = 300) {
    return fadeIn(element, duration);
  }

  async _fadeOut(element, duration = 300) {
    return fadeOut(element, duration);
  }

  _getFocusableElements(container = document) {
    return getFocusableElements(container);
  }

  _trapFocus(container, event) {
    return trapFocus(container, event);
  }

  _restoreFocus(element) {
    return restoreFocus(element);
  }

  _createElement(tag, attributes = {}, content = '') {
    return createElement(tag, attributes, content);
  }

  // Dispatch custom events
  _dispatch(element, eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    this.eventBus?.emit(eventType, { element, ...detail });
    return event;
  }
}

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
