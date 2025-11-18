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
 * Videoplay Component
 *
 * Progressive enhancement for scroll-triggered video play/pause behavior.
 * Respects the native autoplay attribute and only manages videos that have it set.
 * Automatically plays videos when they enter the viewport and pauses when they leave.
 *
 * @example
 * HTML:
 * <!-- No management - user controls manually -->
 * <video data-videoplay src="video.mp4" controls>
 *   Your browser doesn't support video.
 * </video>
 *
 * <!-- Autoplay on scroll with default settings -->
 * <video data-videoplay autoplay muted loop src="video.mp4">
 * </video>
 *
 * <!-- Custom configuration -->
 * <video data-videoplay
 *        autoplay
 *        muted
 *        loop
 *        data-videoplay-threshold="0.5"
 *        data-videoplay-autopause="true"
 *        data-videoplay-require-interaction="true"
 *        src="video.mp4">
 * </video>
 *
 * <!-- Target external video -->
 * <div data-videoplay data-video-target="#my-video" data-videoplay-threshold="0.3">
 *   <video id="my-video" autoplay muted loop src="hero-video.mp4"></video>
 *   <div>Video description and overlay content</div>
 * </div>
 */
class Videoplay extends BaseComponent {
  /**
   * Default configuration for videoplay component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      playThreshold: 0.3, // Percentage of video visible before playing (0.0 to 1.0)
      pauseThreshold: 0.1, // Percentage visible before pausing (usually lower than play)
      pauseOnExit: true, // Whether to pause when video leaves viewport
      muteWhenPlaying: null, // Force mute when auto-playing (null = respect existing)
      restoreVolumeOnPause: false, // Restore volume when pausing
      rootMargin: '0px', // Root margin for intersection observer
      enableInBackground: false, // Allow playing when page not visible
      preloadOnMount: true, // Set preload="metadata" when mounting
      requireUserInteraction: false, // Only manage play/pause after user has interacted with video
    };
  }

  /**
   * Constructor
   * @param {Object} options - Component options
   */
  constructor(options = {}) {
    super(options);

    // Create intersection observer
    this._createObserver();

    // Track page visibility for background behavior
    this._setupVisibilityHandling();
  }

  /**
   * Create intersection observer for viewport detection
   * @private
   */
  _createObserver() {
    const observerOptions = {
      root: null,
      rootMargin: Videoplay.defaults.rootMargin,
      threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0], // Multiple thresholds for precision
    };

    this.observer = new IntersectionObserver(this._handleIntersection.bind(this), observerOptions);

    this.logger?.info('Videoplay intersection observer created', observerOptions);
  }

  /**
   * Set up page visibility handling
   * @private
   */
  _setupVisibilityHandling() {
    this.isPageVisible = !document.hidden;

    const visibilityHandler = () => {
      this.isPageVisible = !document.hidden;

      if (!this.isPageVisible) {
        // Page hidden - pause all videos that don't allow background play
        this._pauseAllBackgroundVideos();
      } else {
        // Page visible - resume videos that should be playing
        this._resumeVisibleVideos();
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    this.visibilityHandler = visibilityHandler;
  }

  /**
   * Initialize the videoplay functionality on an element
   * @param {HTMLElement} element - Element with data-videoplay attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target video element
    const videoSelector = this._getDataAttr(element, 'video-target');
    const video = videoSelector
      ? document.querySelector(videoSelector)
      : element.tagName === 'VIDEO'
        ? element
        : element.querySelector('video');

    if (!video) {
      this.logger?.warn('Videoplay: No video element found', {
        element,
        selector: videoSelector,
      });
      return state;
    }

    // Get configuration from data attributes
    const playThreshold = this._getDataAttr(
      element,
      'videoplay-threshold',
      Videoplay.defaults.playThreshold
    );
    const pauseThreshold = this._getDataAttr(
      element,
      'videoplay-pause-threshold',
      Videoplay.defaults.pauseThreshold
    );
    const pauseOnExit = this._getDataAttr(
      element,
      'videoplay-autopause',
      Videoplay.defaults.pauseOnExit
    );
    const muteWhenPlaying = this._getDataAttr(
      element,
      'videoplay-automute',
      Videoplay.defaults.muteWhenPlaying
    );
    const restoreVolumeOnPause = this._getDataAttr(
      element,
      'videoplay-restore-volume',
      Videoplay.defaults.restoreVolumeOnPause
    );
    const enableInBackground = this._getDataAttr(
      element,
      'videoplay-background',
      Videoplay.defaults.enableInBackground
    );
    const preloadOnMount = this._getDataAttr(
      element,
      'videoplay-preload',
      Videoplay.defaults.preloadOnMount
    );
    const requireUserInteraction = this._getDataAttr(
      element,
      'videoplay-require-interaction',
      Videoplay.defaults.requireUserInteraction
    );

    // Check if video has native autoplay attribute
    const hasAutoplay = video.hasAttribute('autoplay');

    // Store state
    state.video = video;
    state.videoSelector = videoSelector;
    state.playThreshold = parseFloat(playThreshold);
    state.pauseThreshold = parseFloat(pauseThreshold);
    state.pauseOnExit = Boolean(pauseOnExit);
    state.muteWhenPlaying = muteWhenPlaying === null ? null : Boolean(muteWhenPlaying);
    state.restoreVolumeOnPause = Boolean(restoreVolumeOnPause);
    state.enableInBackground = Boolean(enableInBackground);
    state.preloadOnMount = Boolean(preloadOnMount);
    state.requireUserInteraction = Boolean(requireUserInteraction);
    state.hasAutoplay = hasAutoplay;
    state.isPlaying = false;
    state.isIntersecting = false;
    state.intersectionRatio = 0;
    state.originalMuted = video.muted;
    state.originalVolume = video.volume;
    state.hasUserInteracted = false;

    // Set up video properties
    this._setupVideo(video, state);

    // Mark as enhanced for status tracking
    element.setAttribute('data-videoplay-enhanced', 'true');

    // Start observing
    this.observer.observe(element);

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this.observer.unobserve(element);
      this._resetVideo(video, state);
      originalCleanup();
    };

    this.eventBus?.emit('videoplay:mount', {
      element,
      video,
      hasAutoplay: state.hasAutoplay,
      playThreshold: state.playThreshold,
      timestamp: performance.now(),
    });

    this.logger?.info('Videoplay initialized', {
      element,
      video: videoSelector || 'self',
      hasAutoplay: state.hasAutoplay,
      playThreshold: state.playThreshold,
      pauseOnExit: state.pauseOnExit,
    });

    return state;
  }

  /**
   * Set up video element properties
   * @private
   * @param {HTMLVideoElement} video - Video element
   * @param {Object} state - Component state
   */
  _setupVideo(video, state) {
    // Set preload if requested
    if (state.preloadOnMount && !video.getAttribute('preload')) {
      video.preload = 'metadata';
    }

    // Ensure video is muted for autoplay if no explicit setting
    if (state.muteWhenPlaying === null && state.hasAutoplay && !video.hasAttribute('muted')) {
      // For autoplay to work reliably, videos usually need to be muted
      video.muted = true;
      state.originalMuted = false; // Remember it wasn't originally muted
    }

    // Add event listeners for debugging and state tracking
    const playHandler = () => {
      state.isPlaying = true;
      this._emitVideoEvent(video, 'play', { reason: 'browser-play' });
    };

    const pauseHandler = () => {
      state.isPlaying = false;
      this._emitVideoEvent(video, 'pause', { reason: 'browser-pause' });
    };

    const errorHandler = e => {
      this.logger?.error('Video playback error', { video, error: e });
      this._emitVideoEvent(video, 'error', { error: e });
    };

    // Track user interaction with video
    const userInteractionHandler = () => {
      state.hasUserInteracted = true;
      this.logger?.debug('User interacted with video', { video });
    };

    video.addEventListener('play', playHandler);
    video.addEventListener('pause', pauseHandler);
    video.addEventListener('error', errorHandler);

    // Listen for user interaction events
    video.addEventListener('click', userInteractionHandler);
    video.addEventListener('play', userInteractionHandler);

    // Store handlers for cleanup
    state.playHandler = playHandler;
    state.pauseHandler = pauseHandler;
    state.errorHandler = errorHandler;
    state.userInteractionHandler = userInteractionHandler;
  }

  /**
   * Handle intersection observer entries
   * @private
   * @param {IntersectionObserverEntry[]} entries - Observer entries
   */
  _handleIntersection(entries) {
    entries.forEach(entry => {
      const element = entry.target;
      const state = this.getState(element);

      if (!state) return;

      state.isIntersecting = entry.isIntersecting;
      state.intersectionRatio = entry.intersectionRatio;

      // Determine if should play or pause
      const canAutoplay =
        state.hasAutoplay && (!state.requireUserInteraction || state.hasUserInteracted);

      const shouldPlay =
        entry.isIntersecting &&
        entry.intersectionRatio >= state.playThreshold &&
        (this.isPageVisible || state.enableInBackground) &&
        canAutoplay;

      const shouldPause =
        (!entry.isIntersecting || entry.intersectionRatio < state.pauseThreshold) &&
        state.pauseOnExit &&
        (!state.requireUserInteraction || state.hasUserInteracted);

      if (shouldPlay && !state.isPlaying) {
        this._playVideo(element, state, 'scroll-in');
      } else if (shouldPause && state.isPlaying) {
        this._pauseVideo(element, state, 'scroll-out');
      }
    });
  }

  /**
   * Play video with error handling
   * @private
   * @param {HTMLElement} element - Container element
   * @param {Object} state - Component state
   * @param {string} reason - Reason for playing
   */
  async _playVideo(element, state, reason = 'manual') {
    const { video } = state;

    try {
      // Apply mute settings if specified
      if (state.muteWhenPlaying === true) {
        video.muted = true;
      } else if (state.muteWhenPlaying === false) {
        video.muted = false;
      }

      // Attempt to play
      const playPromise = video.play();

      if (playPromise !== undefined) {
        await playPromise;
      }

      state.isPlaying = true;

      this._emitVideoEvent(video, 'play', {
        reason,
        intersectionRatio: state.intersectionRatio,
        muted: video.muted,
      });

      this.logger?.debug('Video playing', {
        video: state.videoSelector || 'self',
        reason,
        intersectionRatio: state.intersectionRatio,
      });
    } catch (error) {
      this.logger?.warn('Failed to play video', {
        video: state.videoSelector || 'self',
        error: error.message,
        reason,
      });

      this._emitVideoEvent(video, 'play-error', {
        reason,
        error: error.message,
      });
    }
  }

  /**
   * Pause video
   * @private
   * @param {HTMLElement} element - Container element
   * @param {Object} state - Component state
   * @param {string} reason - Reason for pausing
   */
  _pauseVideo(element, state, reason = 'manual') {
    const { video } = state;

    try {
      video.pause();
      state.isPlaying = false;

      // Restore volume if requested
      if (state.restoreVolumeOnPause && !state.originalMuted) {
        video.muted = false;
        video.volume = state.originalVolume;
      }

      this._emitVideoEvent(video, 'pause', {
        reason,
        intersectionRatio: state.intersectionRatio,
      });

      this.logger?.debug('Video paused', {
        video: state.videoSelector || 'self',
        reason,
        intersectionRatio: state.intersectionRatio,
      });
    } catch (error) {
      this.logger?.warn('Failed to pause video', {
        video: state.videoSelector || 'self',
        error: error.message,
      });
    }
  }

  /**
   * Emit video-related events
   * @private
   * @param {HTMLVideoElement} video - Video element
   * @param {string} action - Action name
   * @param {Object} data - Event data
   */
  _emitVideoEvent(video, action, data) {
    // DOM event
    video.dispatchEvent(
      new CustomEvent(`videoplay:${action}`, {
        detail: data,
        bubbles: true,
      })
    );

    // Framework event
    this.eventBus?.emit(`videoplay:${action}`, {
      video,
      timestamp: performance.now(),
      ...data,
    });
  }

  /**
   * Pause all videos that don't allow background play
   * @private
   */
  _pauseAllBackgroundVideos() {
    const elements = document.querySelectorAll('[data-videoplay-enhanced="true"]');

    elements.forEach(element => {
      const state = this.getState(element);
      if (state && state.isPlaying && !state.enableInBackground) {
        this._pauseVideo(element, state, 'page-hidden');
      }
    });
  }

  /**
   * Resume videos that should be playing when page becomes visible
   * @private
   */
  _resumeVisibleVideos() {
    const elements = document.querySelectorAll('[data-videoplay-enhanced="true"]');

    elements.forEach(element => {
      const state = this.getState(element);
      if (
        state &&
        !state.isPlaying &&
        state.isIntersecting &&
        state.intersectionRatio >= state.playThreshold &&
        state.hasAutoplay
      ) {
        this._playVideo(element, state, 'page-visible');
      }
    });
  }

  /**
   * Manually play a video
   * @param {HTMLElement} element - Container element
   */
  async play(element) {
    const state = this.getState(element);
    if (!state) return;

    await this._playVideo(element, state, 'manual');
  }

  /**
   * Manually pause a video
   * @param {HTMLElement} element - Container element
   */
  pause(element) {
    const state = this.getState(element);
    if (!state) return;

    this._pauseVideo(element, state, 'manual');
  }

  /**
   * Check if video is currently playing
   * @param {HTMLElement} element - Container element
   * @returns {boolean} Whether the video is playing
   */
  isPlaying(element) {
    const state = this.getState(element);
    return state ? state.isPlaying : false;
  }

  /**
   * Get current intersection ratio
   * @param {HTMLElement} element - Container element
   * @returns {number} Intersection ratio (0.0 to 1.0)
   */
  getIntersectionRatio(element) {
    const state = this.getState(element);
    return state ? state.intersectionRatio : 0;
  }

  /**
   * Update play threshold dynamically
   * @param {HTMLElement} element - Container element
   * @param {number} threshold - New play threshold (0.0 to 1.0)
   */
  updatePlayThreshold(element, threshold) {
    const state = this.getState(element);
    if (!state) return;

    state.playThreshold = Math.max(0, Math.min(1, threshold));

    this.logger?.info('Videoplay threshold updated', {
      element,
      newThreshold: state.playThreshold,
    });
  }

  /**
   * Reset video to original state
   * @private
   * @param {HTMLVideoElement} video - Video element
   * @param {Object} state - Component state
   */
  _resetVideo(video, state) {
    try {
      // Remove event listeners
      if (state.playHandler) video.removeEventListener('play', state.playHandler);
      if (state.pauseHandler) video.removeEventListener('pause', state.pauseHandler);
      if (state.errorHandler) video.removeEventListener('error', state.errorHandler);
      if (state.userInteractionHandler) {
        video.removeEventListener('click', state.userInteractionHandler);
        video.removeEventListener('play', state.userInteractionHandler);
      }

      // Restore original video properties
      video.muted = state.originalMuted;
      video.volume = state.originalVolume;
    } catch (error) {
      this.logger?.warn('Error resetting video', { video, error });
    }
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const elements = document.querySelectorAll('[data-videoplay-enhanced="true"]');
    let playingCount = 0;
    let intersectingCount = 0;
    let autoplayCount = 0;
    let totalVideos = 0;

    elements.forEach(element => {
      const state = this.getState(element);
      if (state) {
        totalVideos++;
        if (state.isPlaying) playingCount++;
        if (state.isIntersecting) intersectingCount++;
        if (state.hasAutoplay) autoplayCount++;
      }
    });

    return {
      totalVideos,
      playingCount,
      intersectingCount,
      autoplayCount,
      pageVisible: this.isPageVisible,
      observerActive: !!this.observer,
      defaults: Videoplay.defaults,
    };
  }

  /**
   * Clean up intersection observer and page visibility handler
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    super.destroy();
    this.logger?.info('Videoplay destroyed');
  }

  /**
   * Enhance all videoplay elements on the page
   * @param {string} selector - CSS selector for videoplay elements
   * @param {Object} options - Component options
   * @returns {Videoplay} Component instance
   */
  static enhanceAll(selector = '[data-videoplay]', options) {
    const instance = new Videoplay(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Videoplay as default };
