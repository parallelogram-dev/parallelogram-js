import { BaseComponent } from '../core/BaseComponent.js';
import { prefersReducedMotion } from '../utils/motion.js';

/**
 * Videoplay - play videos as they scroll into view and pause them as they leave
 *
 * Only videos with the `autoplay` attribute are managed. They play once enough of the video is
 * visible and pause when it scrolls away or the page is hidden. A video the user pauses stays paused
 * until the user plays it again. Managed videos play inline, so iPhone Safari doesn't open them full
 * screen, and are muted for autoplay unless automute says otherwise. When the user prefers reduced
 * motion, autoplay is left off and the video's controls are shown instead. Videos with the same
 * thresholds share one IntersectionObserver.
 *
 * @example
 * <!-- Managed: plays when a third of it is visible -->
 * <video data-videoplay autoplay muted loop playsinline src="harbour.mp4"></video>
 *
 * <!-- Unmanaged: the user controls playback -->
 * <video data-videoplay controls src="harbour.mp4"></video>
 *
 * <!-- A video inside a card -->
 * <div data-videoplay data-videoplay-target="#hero-video" data-videoplay-threshold="0.5">
 *   <video id="hero-video" autoplay muted loop playsinline src="hero.mp4"></video>
 * </div>
 *
 * @attributes
 * - data-videoplay-target: selector for the video when the element isn't one or doesn't contain one
 * - data-videoplay-threshold: visible fraction that starts playback (default 0.3)
 * - data-videoplay-pause-threshold: visible fraction below which playback pauses (default 0.1)
 * - data-videoplay-autopause: "false" keeps playing after the video leaves the viewport (default true)
 * - data-videoplay-automute: "true" mutes and "false" unmutes when playing (default: mute only when
 *   autoplay needs it)
 * - data-videoplay-restore-volume: restore the original volume when pausing (default false)
 * - data-videoplay-background: keep playing while the page is hidden (default false)
 * - data-videoplay-preload: set `preload="metadata"` when mounting (default true)
 * - data-videoplay-require-interaction: manage playback only after the user has clicked, tapped or
 *   used a key on the video (default false)
 * - data-videoplay-playsinline: "false" lets iPhone Safari play full screen (default true)
 *
 * @events
 * - videoplay:play, videoplay:pause: dispatched on the video with `{ reason }`, and emitted once on
 *   the event bus
 * - videoplay:play-error, videoplay:error
 */
export default class Videoplay extends BaseComponent {
  static selector = 'data-videoplay';

  static get defaults() {
    return {
      playThreshold: 0.3,
      pauseThreshold: 0.1,
      pauseOnExit: true,
      muteWhenPlaying: null,
      restoreVolumeOnPause: false,
      rootMargin: '0px',
      enableInBackground: false,
      preloadOnMount: true,
      requireUserInteraction: false,
      playsInline: true,
    };
  }

  constructor(options = {}) {
    super(options);

    /** Observers keyed by their thresholds, with the elements each watches */
    this._observers = new Map();

    this.isPageVisible = !document.hidden;
    this._documentListeners = new AbortController();
    document.addEventListener('visibilitychange', () => this._onVisibilityChange(), {
      signal: this._documentListeners.signal,
    });
  }

  _init(element) {
    const state = super._init(element);

    const videoSelector = this.getAttr(element, 'target');
    const video = videoSelector
      ? document.querySelector(videoSelector)
      : element.tagName === 'VIDEO'
        ? element
        : element.querySelector('video');

    if (!video) {
      this.logger?.warn('Videoplay: No video element found', { element, selector: videoSelector });
      return state;
    }

    const defaults = Videoplay.defaults;
    Object.assign(state, {
      video,
      videoSelector,
      playThreshold: this.getNumberAttr(element, 'threshold', defaults.playThreshold),
      pauseThreshold: this.getNumberAttr(element, 'pause-threshold', defaults.pauseThreshold),
      pauseOnExit: this.getBoolAttr(element, 'autopause', defaults.pauseOnExit),
      muteWhenPlaying: this.getBoolAttr(element, 'automute', defaults.muteWhenPlaying),
      restoreVolumeOnPause: this.getBoolAttr(
        element,
        'restore-volume',
        defaults.restoreVolumeOnPause
      ),
      enableInBackground: this.getBoolAttr(element, 'background', defaults.enableInBackground),
      preloadOnMount: this.getBoolAttr(element, 'preload', defaults.preloadOnMount),
      requireUserInteraction: this.getBoolAttr(
        element,
        'require-interaction',
        defaults.requireUserInteraction
      ),
      playsInline: this.getBoolAttr(element, 'playsinline', defaults.playsInline),
      hasAutoplay: video.hasAttribute('autoplay'),
      reducedMotion: prefersReducedMotion(),
      isPlaying: !video.paused,
      isIntersecting: false,
      intersectionRatio: 0,
      originalMuted: video.muted,
      originalVolume: video.volume,
      originalControls: video.controls,
      originalPlaysInline: video.playsInline,
      hasUserInteracted: false,
      userPaused: false,
      expectingPlay: false,
      expectingPause: false,
      playReason: null,
      pauseReason: null,
      observerKey: null,
    });

    this._setupVideo(video, state);
    element.setAttribute('data-videoplay-enhanced', 'true');
    this._observe(element, state);

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      this._unobserve(element, state);
      baseCleanup();
      this._resetVideo(video, state);
      element.removeAttribute('data-videoplay-enhanced');
    };

    this.eventBus?.emit('videoplay:mount', {
      element,
      video,
      hasAutoplay: state.hasAutoplay,
      playThreshold: state.playThreshold,
      timestamp: performance.now(),
    });

    return state;
  }

  _setupVideo(video, state) {
    const { signal } = state.controller;

    if (state.preloadOnMount && !video.getAttribute('preload')) {
      video.preload = 'metadata';
    }

    if (state.hasAutoplay && state.playsInline) {
      video.playsInline = true;
    }

    /* Browsers only autoplay muted videos without a user gesture */
    if (state.muteWhenPlaying === null && state.hasAutoplay && !video.hasAttribute('muted')) {
      video.muted = true;
    }

    if (state.reducedMotion && state.hasAutoplay) {
      video.controls = true;
      if (!video.paused) {
        state.expectingPause = true;
        state.pauseReason = 'reduced-motion';
        video.pause();
      }
    }

    video.addEventListener(
      'play',
      () => {
        state.isPlaying = true;
        if (!state.expectingPlay) {
          state.userPaused = false;
        }
        this._emitVideoEvent(video, 'play', {
          reason: state.playReason ?? 'browser-play',
          intersectionRatio: state.intersectionRatio,
          muted: video.muted,
        });
        state.expectingPlay = false;
        state.playReason = null;
      },
      { signal }
    );

    video.addEventListener(
      'pause',
      () => {
        state.isPlaying = false;
        /* A pause the component didn't ask for, other than reaching the end, is the user's */
        if (!state.expectingPause && !video.ended) {
          state.userPaused = true;
        }
        this._emitVideoEvent(video, 'pause', {
          reason: state.pauseReason ?? (video.ended ? 'ended' : 'user'),
          intersectionRatio: state.intersectionRatio,
        });
        state.expectingPause = false;
        state.pauseReason = null;
      },
      { signal }
    );

    video.addEventListener(
      'error',
      event => {
        this.logger?.error('Video playback error', { video, error: event });
        this._emitVideoEvent(video, 'error', { error: event });
      },
      { signal }
    );

    for (const type of ['pointerdown', 'keydown', 'click']) {
      video.addEventListener(
        type,
        () => {
          state.hasUserInteracted = true;
        },
        { signal }
      );
    }
  }

  /**
   * Watch an element with the observer for its thresholds, creating it on first use
   */
  _observe(element, state) {
    const thresholds = [...new Set([0, state.pauseThreshold, state.playThreshold, 1])].sort(
      (a, b) => a - b
    );
    const key = thresholds.join('|');
    let entry = this._observers.get(key);

    if (!entry) {
      entry = {
        targets: new Set(),
        observer: new IntersectionObserver(entries => this._handleIntersection(entries), {
          rootMargin: Videoplay.defaults.rootMargin,
          threshold: thresholds,
        }),
      };
      this._observers.set(key, entry);
    }

    entry.targets.add(element);
    entry.observer.observe(element);
    state.observerKey = key;
  }

  _unobserve(element, state) {
    const key = state.observerKey;
    const entry = this._observers.get(key);
    state.observerKey = null;
    if (!entry) return;

    entry.observer.unobserve(element);
    entry.targets.delete(element);
    if (entry.targets.size === 0) {
      entry.observer.disconnect();
      this._observers.delete(key);
    }
  }

  _canManage(state) {
    return !state.requireUserInteraction || state.hasUserInteracted;
  }

  _shouldPlay(state) {
    return (
      state.hasAutoplay &&
      !state.reducedMotion &&
      !state.userPaused &&
      this._canManage(state) &&
      state.isIntersecting &&
      state.intersectionRatio >= state.playThreshold &&
      (this.isPageVisible || state.enableInBackground)
    );
  }

  _handleIntersection(entries) {
    for (const entry of entries) {
      const element = entry.target;
      const state = this.getState(element);
      if (!state?.video) continue;

      state.isIntersecting = entry.isIntersecting;
      state.intersectionRatio = entry.intersectionRatio;

      const shouldPause =
        state.pauseOnExit &&
        this._canManage(state) &&
        (!entry.isIntersecting || entry.intersectionRatio < state.pauseThreshold);

      if (this._shouldPlay(state) && !state.isPlaying) {
        this._playVideo(element, state, 'scroll-in');
      } else if (shouldPause && state.isPlaying) {
        this._pauseVideo(element, state, 'scroll-out');
      }
    }
  }

  async _playVideo(element, state, reason = 'manual') {
    const { video } = state;

    if (state.muteWhenPlaying === true) {
      video.muted = true;
    } else if (state.muteWhenPlaying === false) {
      video.muted = false;
    }

    state.expectingPlay = true;
    state.playReason = reason;

    try {
      await video.play();
    } catch (error) {
      this.logger?.warn('Failed to play video', { video: state.videoSelector || 'self', error });
      this._emitVideoEvent(video, 'play-error', { reason, error: error.message });
    } finally {
      state.expectingPlay = false;
      state.playReason = null;
    }
  }

  _pauseVideo(element, state, reason = 'manual') {
    const { video } = state;
    if (video.paused) return;

    state.expectingPause = true;
    state.pauseReason = reason;
    video.pause();

    if (state.restoreVolumeOnPause && !state.originalMuted) {
      video.muted = false;
      video.volume = state.originalVolume;
    }
  }

  _emitVideoEvent(video, action, data) {
    video.dispatchEvent(new CustomEvent(`videoplay:${action}`, { detail: data, bubbles: true }));
    this.eventBus?.emit(`videoplay:${action}`, { video, timestamp: performance.now(), ...data });
  }

  _onVisibilityChange() {
    this.isPageVisible = !document.hidden;

    for (const element of this.trackedElements()) {
      const state = this.getState(element);
      if (!state?.video) continue;

      if (!this.isPageVisible && state.isPlaying && !state.enableInBackground) {
        this._pauseVideo(element, state, 'page-hidden');
      } else if (this.isPageVisible && !state.isPlaying && this._shouldPlay(state)) {
        this._playVideo(element, state, 'page-visible');
      }
    }
  }

  /**
   * Play a video, even one the user paused
   * @param {HTMLElement} element - Container element
   */
  async play(element) {
    const state = this.getState(element);
    if (!state?.video) return;

    state.userPaused = false;
    await this._playVideo(element, state, 'manual');
  }

  /**
   * Pause a video
   * @param {HTMLElement} element - Container element
   */
  pause(element) {
    const state = this.getState(element);
    if (state?.video) this._pauseVideo(element, state, 'manual');
  }

  isPlaying(element) {
    return this.getState(element)?.isPlaying ?? false;
  }

  getIntersectionRatio(element) {
    return this.getState(element)?.intersectionRatio ?? 0;
  }

  /**
   * Update the visible fraction that starts playback
   * @param {HTMLElement} element - Container element
   * @param {number} threshold - 0 to 1
   */
  updatePlayThreshold(element, threshold) {
    const state = this.getState(element);
    if (!state?.video) return;

    this._unobserve(element, state);
    state.playThreshold = Math.max(0, Math.min(1, threshold));
    this._observe(element, state);
  }

  _resetVideo(video, state) {
    video.muted = state.originalMuted;
    video.volume = state.originalVolume;
    video.controls = state.originalControls;
    video.playsInline = state.originalPlaysInline;
  }

  getStatus() {
    const states = this.trackedElements()
      .map(element => this.getState(element))
      .filter(state => state?.video);

    return {
      totalVideos: states.length,
      playingCount: states.filter(state => state.isPlaying).length,
      intersectingCount: states.filter(state => state.isIntersecting).length,
      autoplayCount: states.filter(state => state.hasAutoplay).length,
      pageVisible: this.isPageVisible,
      observerActive: this._observers.size > 0,
      defaults: Videoplay.defaults,
    };
  }

  destroy() {
    super.destroy();
    for (const { observer } of this._observers.values()) {
      observer.disconnect();
    }
    this._observers.clear();
    this._documentListeners?.abort();
    this._documentListeners = null;
  }

  static enhanceAll(selector = '[data-videoplay]', options) {
    const instance = new Videoplay(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
