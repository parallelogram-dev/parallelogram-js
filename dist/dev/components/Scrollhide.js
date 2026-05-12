function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * Scrollhide Component
 *
 * Progressive enhancement for scroll-responsive element behavior.
 * Hides/shows elements based on scroll direction and position with overlay effects.
 *
 * @example
 * HTML:
 * <!-- Basic scroll-hiding menu -->
 * <nav data-scrollhide class="main-nav">
 *   <a href="/">Home</a>
 *   <a href="/about">About</a>
 * </nav>
 *
 * <!-- Custom configuration -->
 * <header data-scrollhide
 *         data-scroll-threshold="50"
 *         data-overlay-threshold="100"
 *         class="site-header">
 *   Navigation content
 * </header>
 *
 * <!-- Manual targeting -->
 * <div data-scrollhide data-scrollhide-target="#floating-menu">
 *   <nav id="floating-menu">Menu items</nav>
 * </div>
 *
 * JavaScript (standalone):
 * import { Scrollhide } from './components/Scrollhide.js';
 * const scrollhide = new Scrollhide();
 * document.querySelectorAll('[data-scrollhide]')
 *   .forEach(element => scrollhide.mount(element));
 */
class Scrollhide extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-scrollhide';
  }

  /**
   * Default configuration for scrollhide component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      scrollThreshold: 50, // Pixels scrolled before hiding/showing
      overlayThreshold: 100, // Pixels scrolled before adding overlay class
      scrolledClass: 'scrollhide', // Class added when element should hide
      overlayClass: 'scrolloverlay', // Class added for overlay effect
      debounce: 16, // Scroll event debouncing (60fps = ~16ms)
      passive: true, // Use passive scroll listeners
    };
  }

  /**
   * Initialize the scrollhide functionality on an element
   * @param {HTMLElement} element - Element with data-scrollhide attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target element (could be self or specified target)
    const targetSelector = this.getAttr(element, 'target');
    const target = targetSelector ? document.querySelector(targetSelector) : element;

    if (!target) {
      this.logger?.warn('Scrollhide: Target element not found', {
        selector: targetSelector,
        element,
      });
      return state;
    }

    // Get configuration from data attributes
    const scrollThreshold = this.getAttr(
      element,
      'scroll-threshold',
      Scrollhide.defaults.scrollThreshold
    );
    const overlayThreshold = this.getAttr(
      element,
      'overlay-threshold',
      Scrollhide.defaults.overlayThreshold
    );
    const scrolledClass = this.getAttr(
      element,
      'scrolled-class',
      Scrollhide.defaults.scrolledClass
    );
    const overlayClass = this.getAttr(
      element,
      'overlay-class',
      Scrollhide.defaults.overlayClass
    );
    const debounce = this.getAttr(element, 'debounce', Scrollhide.defaults.debounce);

    // Store state
    state.target = target;
    state.targetSelector = targetSelector;
    state.scrollThreshold = parseInt(scrollThreshold, 10);
    state.overlayThreshold = parseInt(overlayThreshold, 10);
    state.scrolledClass = scrolledClass;
    state.overlayClass = overlayClass;
    state.currentY = 0;
    state.lastY = 0;
    state.ticking = false;

    // Create throttled scroll handler
    const scrollHandler = this._createScrollHandler(element, state);
    const throttledHandler = this._throttle(scrollHandler, debounce);

    // Set up scroll listener
    window.addEventListener('scroll', throttledHandler, {
      passive: Scrollhide.defaults.passive,
    });

    // Store handler for cleanup
    state.scrollHandler = throttledHandler;

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      window.removeEventListener('scroll', state.scrollHandler);
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
      }
      originalCleanup();
    };

    // Initial position check
    this._updateElementState(element, state);

    // Mark as enhanced for status tracking
    element.setAttribute('data-scrollhide-enhanced', 'true');

    this.eventBus?.emit('scrollhide:mount', {
      element,
      target,
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
      timestamp: performance.now(),
    });

    this.logger?.info('Scrollhide initialized', {
      element,
      target: targetSelector || 'self',
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
    });

    return state;
  }

  /**
   * Create scroll event handler for an element
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   * @returns {Function} Scroll handler function
   */
  _createScrollHandler(element, state) {
    return () => {
      if (!state.ticking) {
        state.animationFrame = requestAnimationFrame(() => {
          this._onScroll(element, state);
          state.ticking = false;
        });
        state.ticking = true;
      }
    };
  }

  /**
   * Handle scroll events
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   */
  _onScroll(element, state) {
    state.currentY = window.scrollY;

    this._updateElementState(element, state);

    // Update last position for next comparison
    state.lastY = state.currentY;
  }

  /**
   * Update element state based on scroll position
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} state - Component state
   */
  _updateElementState(element, state) {
    const {
      target,
      currentY,
      lastY,
      scrollThreshold,
      overlayThreshold,
      scrolledClass,
      overlayClass,
    } = state;

    // Handle overlay class (for background/styling effects)
    const hasOverlay = target.classList.contains(overlayClass);
    if (currentY > overlayThreshold && !hasOverlay) {
      target.classList.add(overlayClass);
      this._emitStateChange(element, 'overlay-added', { scrollY: currentY });
    } else if (currentY <= overlayThreshold && hasOverlay) {
      target.classList.remove(overlayClass);
      this._emitStateChange(element, 'overlay-removed', { scrollY: currentY });
    }

    // Handle scroll hide/show behavior
    const isHidden = target.classList.contains(scrolledClass);

    // Show element when at top of page
    if (currentY <= 0) {
      if (isHidden) {
        target.classList.remove(scrolledClass);
        this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'top' });
      }
      return;
    }

    // Hide element when scrolling down past threshold
    if (currentY > scrollThreshold && currentY > lastY && !isHidden) {
      target.classList.add(scrolledClass);
      this._emitStateChange(element, 'hidden', { scrollY: currentY, reason: 'scroll-down' });
    }
    // Show element when scrolling up
    else if (currentY < lastY && isHidden) {
      target.classList.remove(scrolledClass);
      this._emitStateChange(element, 'shown', { scrollY: currentY, reason: 'scroll-up' });
    }
  }

  /**
   * Emit state change events
   * @private
   * @param {HTMLElement} element - Element with scrollhide
   * @param {string} action - Action that occurred
   * @param {Object} data - Additional event data
   */
  _emitStateChange(element, action, data) {
    const state = this.getState(element);

    // DOM event
    this._dispatch(element, `scrollhide:${action}`, {
      target: state.target,
      ...data,
    });

    // Framework event
    this.eventBus?.emit(`scrollhide:${action}`, {
      element,
      target: state.target,
      timestamp: performance.now(),
      ...data,
    });

    this.logger?.debug(`Scrollhide ${action}`, {
      element,
      target: state.targetSelector || 'self',
      ...data,
    });
  }

  /**
   * Manually show the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  show(element) {
    const state = this.getState(element);
    if (!state) return;

    state.target.classList.remove(state.scrolledClass);
    this._emitStateChange(element, 'shown', {
      scrollY: state.currentY,
      reason: 'manual',
    });
  }

  /**
   * Manually hide the element
   * @param {HTMLElement} element - Element with scrollhide
   */
  hide(element) {
    const state = this.getState(element);
    if (!state) return;

    state.target.classList.add(state.scrolledClass);
    this._emitStateChange(element, 'hidden', {
      scrollY: state.currentY,
      reason: 'manual',
    });
  }

  /**
   * Toggle element visibility
   * @param {HTMLElement} element - Element with scrollhide
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state) return;

    if (this.isHidden(element)) {
      this.show(element);
    } else {
      this.hide(element);
    }
  }

  /**
   * Check if element is currently hidden
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {boolean} Whether the element is hidden
   */
  isHidden(element) {
    const state = this.getState(element);
    return state ? state.target.classList.contains(state.scrolledClass) : false;
  }

  /**
   * Check if element has overlay effect active
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {boolean} Whether the overlay is active
   */
  hasOverlay(element) {
    const state = this.getState(element);
    return state ? state.target.classList.contains(state.overlayClass) : false;
  }

  /**
   * Get current scroll position
   * @param {HTMLElement} element - Element with scrollhide
   * @returns {number} Current scroll Y position
   */
  getScrollPosition(element) {
    const state = this.getState(element);
    return state ? state.currentY : window.scrollY;
  }

  /**
   * Update thresholds dynamically
   * @param {HTMLElement} element - Element with scrollhide
   * @param {Object} options - New threshold values
   * @param {number} [options.scrollThreshold] - New scroll threshold
   * @param {number} [options.overlayThreshold] - New overlay threshold
   */
  updateThresholds(element, { scrollThreshold, overlayThreshold }) {
    const state = this.getState(element);
    if (!state) return;

    if (typeof scrollThreshold === 'number') {
      state.scrollThreshold = scrollThreshold;
    }

    if (typeof overlayThreshold === 'number') {
      state.overlayThreshold = overlayThreshold;
    }

    // Re-evaluate current state with new thresholds
    this._updateElementState(element, state);

    this.logger?.info('Scrollhide thresholds updated', {
      element,
      scrollThreshold: state.scrollThreshold,
      overlayThreshold: state.overlayThreshold,
    });
  }

  /**
   * Create a throttled function
   * @private
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  _throttle(func, delay) {
    let timeoutId = null;
    let lastExecTime = 0;

    return function (...args) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(
          () => {
            func.apply(this, args);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime)
        );
      }
    };
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const elements = document.querySelectorAll('[data-scrollhide-enhanced="true"]');
    let hiddenCount = 0;
    let overlayCount = 0;

    elements.forEach(element => {
      const state = this.getState(element);
      if (state) {
        if (this.isHidden(element)) hiddenCount++;
        if (this.hasOverlay(element)) overlayCount++;
      }
    });

    return {
      totalElements: elements.length,
      hiddenCount,
      overlayCount,
      currentScrollY: window.scrollY,
      defaults: Scrollhide.defaults,
    };
  }

  /**
   * Enhance all scrollhide elements on the page
   * @param {string} selector - CSS selector for scrollhide elements
   * @param {Object} options - Component options
   * @returns {Scrollhide} Component instance
   */
  static enhanceAll(selector = '[data-scrollhide]', options) {
    const instance = new Scrollhide(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Scrollhide as default };
