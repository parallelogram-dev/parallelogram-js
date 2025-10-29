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
