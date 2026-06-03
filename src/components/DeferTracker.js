import { BaseComponent } from '@parallelogram-js/core';

/**
 * DeferTracker — declarative, deferred third-party trackers driven by inert JSON
 * embedded in the page.
 *
 * Each tracker is described by a data block that is never executed and not subject
 * to `script-src` CSP until an adapter boots it:
 *
 *   <script type="application/json" data-defer-tracker="meta-pixel">
 *     { "id": "1234567890", "events": ["PageView"] }
 *   </script>
 *
 * The component mounts one instance per `[data-defer-tracker]` node, parses its
 * JSON config, and defers booting the named adapter until the first genuine user
 * interaction (or an idle fallback). Lighthouse never synthesises interaction, so
 * tracker cost stays out of cold lab traces (TBT in particular) and off the
 * main thread for real users until they engage.
 *
 * Adapters are registered up front and only the ones a site imports are bundled:
 *
 *   import { registerTrackerAdapter } from '@parallelogram-js/core/components/DeferTracker';
 *   import metaPixel from '@parallelogram-js/core/adapters/meta-pixel';
 *
 *   registerTrackerAdapter('meta-pixel', metaPixel);
 *
 *   app.components.add('[data-defer-tracker]', () =>
 *     import('@parallelogram-js/core/components/DeferTracker'));
 *
 * The interaction gate is page-wide and shared across every mounted instance, so
 * one set of listeners serves the whole document. Booting is deduplicated by
 * adapter name, which makes it safe for router-injected fragments and repeat
 * mounts.
 *
 * @module @parallelogram-js/core/components/DeferTracker
 */

const DEFAULT_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'mousemove', 'scroll', 'click'];

/**
 * capture: see the gesture as early as possible. passive: never delay scroll.
 * Every listener is removed on first fire, so `once` is intentionally not used
 * (it would only remove the one listener that happened to fire).
 */
const LISTENER_OPTS = { capture: true, passive: true };

/**
 * Page-wide gate that runs queued callbacks on first interaction or an idle
 * fallback. Private to this module; a single shared instance backs every
 * DeferTracker instance. Refined from the standalone DeferManager draft — kept
 * internal so the component stays self-contained, but structured so it could be
 * promoted to a real manager later without changing callers.
 */
class InteractionGate {
  constructor() {
    this._events = DEFAULT_EVENTS;
    this._idleTimeout = 5000;
    this._queue = [];
    this._fired = false;
    this._armed = false;
    this._idleHandle = null;
    this._usedIdleCallback = false;
    this._fire = this._fire.bind(this);
  }

  /**
   * Override the gate's interaction events and idle fallback. Only effective
   * before the gate arms (i.e. before the first `until()` call).
   *
   * @param {{ events?: string[], idleTimeout?: number|null }} [options]
   */
  configure({ events, idleTimeout } = {}) {
    if (this._armed) return;
    if (Array.isArray(events)) this._events = events;
    if (idleTimeout !== undefined) this._idleTimeout = idleTimeout;
  }

  /**
   * Queue a callback to run on first interaction (or idle fallback). If the gate
   * has already fired, the callback runs on the next microtask so ordering stays
   * predictable.
   *
   * @param {() => void} callback
   * @returns {() => void} cancel — removes the callback if still pending
   */
  until(callback) {
    if (typeof callback !== 'function') return () => {};

    if (this._fired) {
      Promise.resolve().then(() => this._run(callback));
      return () => {};
    }

    this._queue.push(callback);
    this._arm();

    return () => {
      const i = this._queue.indexOf(callback);
      if (i !== -1) this._queue.splice(i, 1);
    };
  }

  _arm() {
    if (this._armed || typeof window === 'undefined') return;
    this._armed = true;

    this._events.forEach(type => window.addEventListener(type, this._fire, LISTENER_OPTS));

    if (this._idleTimeout) {
      if ('requestIdleCallback' in window) {
        this._usedIdleCallback = true;
        this._idleHandle = window.requestIdleCallback(this._fire, {
          timeout: this._idleTimeout,
        });
      } else {
        this._idleHandle = window.setTimeout(this._fire, this._idleTimeout);
      }
    }
  }

  _fire() {
    if (this._fired) return;
    this._fired = true;
    this._teardown();

    const queue = this._queue.slice();
    this._queue.length = 0;
    queue.forEach(cb => this._run(cb));
  }

  _run(callback) {
    try {
      callback();
    } catch {
      /* one failed task must never break the rest; per-task errors surface in _boot */
    }
  }

  _teardown() {
    if (typeof window === 'undefined') return;
    this._events.forEach(type => window.removeEventListener(type, this._fire, LISTENER_OPTS));
    if (this._idleHandle != null) {
      if (this._usedIdleCallback) window.cancelIdleCallback(this._idleHandle);
      else window.clearTimeout(this._idleHandle);
      this._idleHandle = null;
    }
  }
}

/** Shared adapter registry: adapter name -> boot fn. */
const adapters = new Map();

/** Adapter names already booted this page session (dedup across instances). */
const booted = new Set();

/** Single page-wide interaction gate shared by all instances. */
const gate = new InteractionGate();

/** Optional consent resolver; trackers carrying a `consent` category honour it. */
let consentResolver = null;

/**
 * Register a tracker adapter under a name matching the `data-defer-tracker`
 * value used in markup. Call before `app.run()`.
 *
 * @param {string} name
 * @param {(config: object, ctx: { logger?: object, eventBus?: object }) => void} boot
 */
export function registerTrackerAdapter(name, boot) {
  if (typeof name === 'string' && typeof boot === 'function') {
    adapters.set(name, boot);
  }
}

/**
 * Supply a consent resolver. When set, any tracker whose config carries a
 * `consent` category stays un-booted until the resolver returns true for that
 * category; it retries on the `consent:granted` eventBus event. When unset
 * (the default), the `consent` field is ignored entirely.
 *
 * @param {((category: string) => boolean)|null} fn
 */
export function setTrackerConsent(fn) {
  consentResolver = typeof fn === 'function' ? fn : null;
}

/**
 * Override the interaction gate's events and idle fallback. Must be called
 * before the first tracker mounts.
 *
 * @param {{ events?: string[], idleTimeout?: number|null }} [options]
 */
export function configureDeferTracker(options) {
  gate.configure(options);
}

/**
 * Test seam — clears booted state and the registry. Not part of the public API.
 */
export function _resetTrackers() {
  booted.clear();
  adapters.clear();
  consentResolver = null;
}

export default class DeferTracker extends BaseComponent {
  /**
   * Override _getSelector to prevent minification renaming the data attribute.
   *
   * @returns {string}
   */
  _getSelector() {
    return 'data-defer-tracker';
  }

  _init(element) {
    const state = super._init(element);
    const baseCleanup = state.cleanup;

    const name = this.getElementState(element);
    state.name = name;

    const config = this._parseConfig(element, name);
    if (config === null) {
      this.setAttr(element, 'status', 'error');
      return state;
    }

    state.config = config;
    this.setAttr(element, 'status', 'pending');

    state.cancel = gate.until(() => this._boot(element, name, config));

    state.cleanup = () => {
      state.cancel?.();
      baseCleanup();
    };

    this.logger?.info('DeferTracker armed', { name });
    return state;
  }

  /**
   * Parse the inert JSON config from the node's text content.
   *
   * @param {HTMLElement} element
   * @param {string} name
   * @returns {object|null} parsed config, or null on parse failure
   */
  _parseConfig(element, name) {
    const raw = (element.textContent || '').trim();
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch (error) {
      this.logger?.error('DeferTracker config parse failed', { name, error });
      return null;
    }
  }

  /**
   * Boot a single tracker. One-shot per adapter name across the page; a tracker
   * denied by consent stays un-booted so a later `consent:granted` retries it.
   *
   * @param {HTMLElement} element
   * @param {string} name
   * @param {object} config
   */
  _boot(element, name, config) {
    if (booted.has(name)) return;

    const adapter = adapters.get(name);
    if (!adapter) {
      this.logger?.warn('No tracker adapter registered', { name });
      this.setAttr(element, 'status', 'error');
      return;
    }

    if (config.consent && consentResolver && !consentResolver(config.consent)) {
      this.logger?.info('Tracker awaiting consent', { name, consent: config.consent });
      this.setAttr(element, 'status', 'awaiting-consent');
      this.eventBus?.once('consent:granted', () => this._boot(element, name, config));
      return;
    }

    booted.add(name);
    try {
      adapter(config, { logger: this.logger, eventBus: this.eventBus });
      this.setAttr(element, 'status', 'booted');
      this._dispatch(element, 'defer-tracker:booted', { name });
      this.logger?.info('Tracker booted', { name });
    } catch (error) {
      booted.delete(name);
      this.setAttr(element, 'status', 'error');
      this._dispatch(element, 'defer-tracker:error', { name, error });
      this.logger?.error('Tracker boot failed', { name, error });
    }
  }

  /**
   * Enhance all tracker nodes on the page without the full framework.
   *
   * @param {string} [selector]
   * @param {object} [options]
   * @returns {DeferTracker}
   */
  static enhanceAll(selector = '[data-defer-tracker]', options) {
    const instance = new DeferTracker(options || {});
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}
