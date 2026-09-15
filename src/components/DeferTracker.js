import { BaseComponent } from '../core/BaseComponent.js';

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
 * interaction: a pointer press, touch, key press or click. Without interaction, trackers boot after a fallback: once the page
 * has loaded, then `idleTimeout` milliseconds (5 seconds by default), then the
 * browser's next idle period where `requestIdleCallback` is supported. Tracker
 * cost therefore stays off the main thread during page load, and out of cold lab
 * traces such as Lighthouse's, which never interact with the page.
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
 * Register adapters from the same module specifier the component is loaded from,
 * because the registry lives in that module. Blocks must sit inside the element the
 * framework observes (the body by default), not in `<head>`. Blocks elsewhere are never
 * mounted, so the first tracker to start logs a warning listing them.
 *
 * A tracker is identified by its adapter name and its config's `id` (or `site`,
 * `domain` or `scriptId`), so two properties of the same kind both boot. A second
 * block for a tracker already on the page is passed to the adapter's optional
 * `block` step when its config differs, such as a conversion alongside a
 * remarketing tag, and is otherwise marked `duplicate`. An adapter loads
 * once per page session. When the router shows a new page, or a block for a
 * tracker that has already loaded mounts on a later page, the adapter's optional
 * `page` step runs instead, for page views and conversions that the vendor script
 * doesn't record itself. Its `mounted` flag is true when a block has just mounted on
 * the new page, so the events in that block's config should be sent, and false when
 * the page changed around a block that stayed.
 *
 * `data-defer-tracker-status` moves through pending, awaiting-consent, loading,
 * booted, duplicate and error.
 *
 * @module @parallelogram-js/core/components/DeferTracker
 */

/**
 * Input that only a person can cause. Scroll and mousemove are left out: scroll restoration on
 * reload or back and forward, a jump to a `#hash`, and a pointer resting over the page as it loads
 * fire them without a gesture. Sites can add them back through `configureDeferTracker({ events })`.
 */
const DEFAULT_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'click'];

/**
 * capture: see the gesture as early as possible. passive: never delay scroll.
 * Every listener is removed on first fire, so `once` is intentionally not used
 * (it would only remove the one listener that happened to fire).
 */
const LISTENER_OPTS = { capture: true, passive: true };

/** Longest wait, in milliseconds, for an idle period once the fallback delay has passed. */
const IDLE_DEADLINE = 2000;

/**
 * Page-wide gate that runs queued callbacks on first interaction or an idle
 * fallback. Private to this module; a single shared instance backs every
 * DeferTracker instance.
 */
class InteractionGate {
  constructor() {
    this._events = DEFAULT_EVENTS;
    this._idleTimeout = 5000;
    this._queue = [];
    this._fired = false;
    this._armed = false;
    this._timer = null;
    this._idleHandle = null;
    this._loadListener = null;
    this._fire = this._fire.bind(this);
  }

  /**
   * Override the gate's interaction events and idle fallback. Only effective
   * before the gate arms (i.e. before the first `until()` call).
   *
   * `events` replaces the window events that count as interaction, which are
   * pointerdown, touchstart, keydown and click by default. `idleTimeout` is the
   * minimum delay after the page's load event before trackers boot without
   * interaction; `null` or `0` disables the fallback.
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
      Promise.resolve().then(callback);
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
      this._afterLoad(() => {
        this._timer = window.setTimeout(() => {
          this._timer = null;
          if (typeof window.requestIdleCallback === 'function') {
            this._idleHandle = window.requestIdleCallback(this._fire, { timeout: IDLE_DEADLINE });
          } else {
            this._fire();
          }
        }, this._idleTimeout);
      });
    }
  }

  /**
   * Run the callback once the page's load event has fired.
   *
   * @param {() => void} callback
   */
  _afterLoad(callback) {
    if (document.readyState === 'complete') {
      callback();
      return;
    }

    this._loadListener = new AbortController();
    window.addEventListener('load', callback, { once: true, signal: this._loadListener.signal });
  }

  _fire() {
    if (this._fired) return;
    this._fired = true;
    this._teardown();

    const queue = this._queue.slice();
    this._queue.length = 0;
    queue.forEach(callback => callback());
  }

  _teardown() {
    if (typeof window === 'undefined') return;
    this._events.forEach(type => window.removeEventListener(type, this._fire, LISTENER_OPTS));
    this._loadListener?.abort();
    this._loadListener = null;
    window.clearTimeout(this._timer);
    this._timer = null;
    if (this._idleHandle != null) {
      window.cancelIdleCallback?.(this._idleHandle);
      this._idleHandle = null;
    }
  }
}

/** Shared adapter registry: adapter name -> boot fn, which may carry `page` and `block` steps. */
const adapters = new Map();

/** Trackers that have started loading this page session, keyed by name and id. */
const trackers = new Map();

/** Single page-wide interaction gate shared by all instances. */
const gate = new InteractionGate();

/** Trackers waiting for consent, each with a function that tries again. */
const waitingForConsent = new Set();

let consentResolver = null;
let requireConsentCategory = false;
let trackerNonce;
let placementChecked = false;

/**
 * Register a tracker adapter under a name matching the `data-defer-tracker`
 * value used in markup. Call before `app.run()`.
 *
 * The adapter loads the vendor script and runs the first page's tracking. It can
 * return a Promise that settles when the script loads, so the tracker reports
 * `loading` until then and `error` if it fails. An optional `boot.page(config, ctx,
 * { url, mounted })` step runs for later pages. An optional `boot.block(config, ctx)`
 * step runs for a second block for the tracker on the same page whose config differs
 * from the blocks already there; without it, that block is marked `duplicate`. Leave
 * it out when a second block would only repeat the tracker's page view.
 *
 * @param {string} name
 * @param {(config: object, ctx: { logger?: object, eventBus?: object, nonce?: string }) => void|Promise<unknown>} boot
 */
export function registerTrackerAdapter(name, boot) {
  if (typeof name === 'string' && typeof boot === 'function') {
    adapters.set(name, boot);
  }
}

/**
 * Supply a consent resolver. Trackers whose config carries a `consent` category
 * stay un-booted until the resolver returns true for it, and try again on the
 * `consent:granted` event bus event or `reevaluateTrackerConsent()`. With
 * `requireCategory`, trackers without a category wait too, so a missing or
 * misspelt `consent` field fails closed.
 *
 * Consent is checked again before each page step, so a tracker whose consent is
 * withdrawn stops recording later pages. A vendor script that has already loaded
 * can't be unloaded, so also call the vendor's own consent update, such as
 * `gtag('consent', 'update', …)` or `fbq('consent', 'revoke')`.
 *
 * @param {((category: string) => boolean)|null} fn
 * @param {{ requireCategory?: boolean }} [options]
 */
export function setTrackerConsent(fn, { requireCategory = false } = {}) {
  consentResolver = typeof fn === 'function' ? fn : null;
  requireConsentCategory = Boolean(consentResolver && requireCategory);
}

/**
 * Check consent again for every tracker that is waiting for it, for example after a
 * consent banner closes. Works with or without an event bus.
 */
export function reevaluateTrackerConsent() {
  for (const entry of [...waitingForConsent]) {
    waitingForConsent.delete(entry);
    entry.retry();
  }
}

/**
 * Override the interaction gate's events and idle fallback, and set the CSP nonce
 * adapters give the scripts they add. Call before the first tracker mounts.
 *
 * @param {{ events?: string[], idleTimeout?: number|null, nonce?: string }} [options]
 */
export function configureDeferTracker({ nonce, ...options } = {}) {
  gate.configure(options);
  if (nonce !== undefined) {
    trackerNonce = nonce;
  }
}

/**
 * Test seam — clears booted state and the registry. Not part of the public API.
 */
export function _resetTrackers() {
  trackers.clear();
  adapters.clear();
  waitingForConsent.clear();
  consentResolver = null;
  requireConsentCategory = false;
  trackerNonce = undefined;
  placementChecked = false;
}

const trackerKey = (name, config) => {
  const id = config.id ?? config.site ?? config.domain ?? config.scriptId;
  return id === undefined ? name : `${name}:${id}`;
};

export default class DeferTracker extends BaseComponent {
  static selector = 'data-defer-tracker';

  _init(element) {
    const state = super._init(element);
    const baseCleanup = state.cleanup;

    const name = element.getAttribute(this._getSelector());
    state.name = name;

    const config = this._parseConfig(element, name);
    if (config === null) {
      this.setAttr(element, 'status', 'error');
      return state;
    }

    state.config = config;
    state.key = trackerKey(name, config);
    this.setAttr(element, 'status', 'pending');

    state.cancel = gate.until(() => this._activate(element, state));
    this._listenForNavigation();

    state.cleanup = () => {
      state.cancel?.();
      if (state.consentEntry) {
        waitingForConsent.delete(state.consentEntry);
      }
      trackers.get(state.key)?.elements.delete(element);
      baseCleanup();
    };

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

  _listenForNavigation() {
    if (this._navigation || !this.eventBus) return;

    this._navigation = new AbortController();
    /* The navigation ends once the new page is swapped in and its blocks have mounted, so those
       blocks run their own page step first and are not handed the old page's */
    this.eventBus.on(
      'router:navigate-end',
      ({ status }) => {
        if (status === 'success') {
          this._onNavigate();
        }
      },
      { signal: this._navigation.signal }
    );
  }

  /**
   * Run the page step of every loaded tracker still on the page that hasn't seen this URL
   */
  _onNavigate() {
    const url = location.href;

    for (const tracker of trackers.values()) {
      if (tracker.status === 'error' || tracker.pageUrl === url) continue;

      const element = [...tracker.elements].find(candidate => candidate.isConnected);
      if (element) {
        this._runPage(tracker, element, url, false);
      }
    }
  }

  /**
   * Boot a tracker, or run its page step if it already loaded on an earlier page
   */
  _activate(element, state) {
    this._checkPlacement();
    if (!this.getState(element)) return;

    const { name, config, key } = state;
    if (!adapters.has(name)) {
      this.logger?.warn('No tracker adapter registered', { name });
      this.setAttr(element, 'status', 'error');
      return;
    }

    if (!this._consentGranted(name, config)) {
      this._waitForConsent(element, state);
      return;
    }

    const tracker = trackers.get(key);
    const url = location.href;

    if (!tracker) {
      this._boot(element, state, url);
      return;
    }

    if (tracker.pageUrl === url) {
      const others = [...tracker.elements].filter(other => other !== element && other.isConnected);
      if (others.length > 0 && !this._runBlock(tracker, element, config, others)) {
        this.logger?.warn('Duplicate tracker block ignored', { name, key });
        this.setAttr(element, 'status', 'duplicate');
        return;
      }
    } else {
      this._runPage(tracker, element, url, true);
    }

    tracker.elements.add(element);
    this.setAttr(element, 'status', tracker.status);
  }

  /**
   * Warn once about blocks that were never mounted, such as blocks in `<head>` or outside the
   * element the framework observes. Runs when trackers first start, after the page's blocks mount.
   */
  _checkPlacement() {
    if (placementChecked) return;
    placementChecked = true;

    const selector = this._getSelector();
    const unmounted = document.querySelectorAll(`[${selector}]:not([${selector}-status])`);
    if (unmounted.length > 0) {
      this.logger?.warn(
        'Tracker blocks outside the element the framework observes, such as in <head>, never load',
        { elements: [...unmounted] }
      );
    }
  }

  _consentGranted(name, config) {
    if (!consentResolver) return true;
    if (!config.consent) return !requireConsentCategory;

    try {
      return Boolean(consentResolver(config.consent));
    } catch (error) {
      this.logger?.warn('Tracker consent check failed, waiting for consent', { name, error });
      return false;
    }
  }

  _waitForConsent(element, state) {
    this.logger?.info('Tracker awaiting consent', {
      name: state.name,
      consent: state.config.consent,
    });
    this.setAttr(element, 'status', 'awaiting-consent');

    if (state.consentEntry) {
      waitingForConsent.delete(state.consentEntry);
    }
    const entry = { retry: () => this._activate(element, state) };
    state.consentEntry = entry;
    waitingForConsent.add(entry);

    this.eventBus?.once(
      'consent:granted',
      () => {
        if (waitingForConsent.delete(entry)) {
          entry.retry();
        }
      },
      { signal: state.controller.signal }
    );
  }

  _boot(element, state, url) {
    const { name, config, key } = state;
    const adapter = adapters.get(name);
    const tracker = {
      name,
      config,
      key,
      status: 'loading',
      pageUrl: url,
      elements: new Set([element]),
    };
    trackers.set(key, tracker);
    this.setAttr(element, 'status', 'loading');

    let result;
    try {
      result = adapter(config, this._context(element));
    } catch (error) {
      this._failed(tracker, element, error);
      return;
    }

    Promise.resolve(result).then(
      () => {
        tracker.status = 'booted';
        this._showStatus(tracker);
        this._dispatch(element, 'defer-tracker:booted', { name });
        this.logger?.info('Tracker booted', { name });
      },
      error => this._failed(tracker, element, error)
    );
  }

  _runPage(tracker, element, url, mounted) {
    tracker.pageUrl = url;
    const page = adapters.get(tracker.name)?.page;
    if (typeof page !== 'function') return;

    const config = this.getState(element)?.config ?? tracker.config;
    if (!this._consentGranted(tracker.name, config)) return;

    try {
      page(config, this._context(element), { url, mounted });
    } catch (error) {
      this.logger?.error('Tracker page step failed', { name: tracker.name, error });
    }
  }

  /**
   * Hand a second block for a tracker already on this page to the adapter's block step
   *
   * @returns {boolean} false when the adapter has no block step or the block repeats one on the page
   */
  _runBlock(tracker, element, config, others) {
    const block = adapters.get(tracker.name)?.block;
    if (typeof block !== 'function') return false;

    const json = JSON.stringify(config);
    const repeated = others.some(
      other => JSON.stringify(this.getState(other)?.config ?? tracker.config) === json
    );
    if (repeated) return false;

    try {
      block(config, this._context(element));
    } catch (error) {
      this.logger?.error('Tracker block step failed', { name: tracker.name, error });
    }
    return true;
  }

  _failed(tracker, element, error) {
    tracker.status = 'error';
    trackers.delete(tracker.key);
    this._showStatus(tracker);
    this._dispatch(element, 'defer-tracker:error', { name: tracker.name, error });
    this.logger?.error('Tracker boot failed', { name: tracker.name, error });
  }

  _showStatus(tracker) {
    for (const element of tracker.elements) {
      if (this.getState(element)) {
        this.setAttr(element, 'status', tracker.status);
      }
    }
  }

  _context(element) {
    return {
      logger: this.logger,
      eventBus: this.eventBus,
      nonce: trackerNonce ?? (element.nonce || undefined),
    };
  }

  destroy() {
    this._navigation?.abort();
    this._navigation = null;
    super.destroy();
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
