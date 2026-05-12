function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

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
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-videoplay';
  }

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
    const videoSelector = this.getAttr(element, 'target');
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
    const playThreshold = this.getAttr(
      element,
      'threshold',
      Videoplay.defaults.playThreshold
    );
    const pauseThreshold = this.getAttr(
      element,
      'pause-threshold',
      Videoplay.defaults.pauseThreshold
    );
    const pauseOnExit = this.getAttr(
      element,
      'autopause',
      Videoplay.defaults.pauseOnExit
    );
    const muteWhenPlaying = this.getAttr(
      element,
      'automute',
      Videoplay.defaults.muteWhenPlaying
    );
    const restoreVolumeOnPause = this.getAttr(
      element,
      'restore-volume',
      Videoplay.defaults.restoreVolumeOnPause
    );
    const enableInBackground = this.getAttr(
      element,
      'background',
      Videoplay.defaults.enableInBackground
    );
    const preloadOnMount = this.getAttr(
      element,
      'preload',
      Videoplay.defaults.preloadOnMount
    );
    const requireUserInteraction = this.getAttr(
      element,
      'require-interaction',
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
