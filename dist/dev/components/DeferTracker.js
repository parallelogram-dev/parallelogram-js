function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,r){return function(e,n,r){const o=n.includes("-")?t(n):n,s=e.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,r)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,r);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...r){n||(t.apply(this,r),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const r=`${e}-view`,o=this.getAttr(t,r);if(o){const e=document.querySelector(`[data-view="${o}"]`);return !e&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:t,attribute:r}),e}const s=this.getAttr(t,e);if(!s)return n.required&&this.logger?.warn(`No ${e} or ${r} attribute found`,t),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:t}),i}_getConfigFromAttrs(t,e){const n={};for(const[r,o]of Object.entries(e)){const e=this.constructor.defaults?.[r];n[r]=this.getAttr(t,o,e);}return n}_requireState(t,e="method"){const n=this.getState(t);return n||this.logger?.warn(`${e}: No state found for element`,t),n}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const r=()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();};t.addEventListener("animationend",r,{once:true}),t.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const r=e(t);if(!r.length)return;const o=r[0],s=r[r.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const r=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?r.className=n:"style"===t&&"object"==typeof n?Object.assign(r.style,n):"dataset"===t&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(t,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(t,e,n)}_dispatch(t,e,n){const r=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(r),this.eventBus?.emit(e,{element:t,...n}),r}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const r=t.getAttribute(`${this._getSelector()}-${e}`);return null!==r?r:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
function registerTrackerAdapter(name, boot) {
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
function setTrackerConsent(fn) {
  consentResolver = typeof fn === 'function' ? fn : null;
}

/**
 * Override the interaction gate's events and idle fallback. Must be called
 * before the first tracker mounts.
 *
 * @param {{ events?: string[], idleTimeout?: number|null }} [options]
 */
function configureDeferTracker(options) {
  gate.configure(options);
}

/**
 * Test seam — clears booted state and the registry. Not part of the public API.
 */
function _resetTrackers() {
  booted.clear();
  adapters.clear();
  consentResolver = null;
}

class DeferTracker extends BaseComponent {
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

export { _resetTrackers, configureDeferTracker, DeferTracker as default, registerTrackerAdapter, setTrackerConsent };
