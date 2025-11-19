function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,o){return function(e,n,o){const r=n.includes("-")?t(n):n,s=e.dataset[r];return void 0===s?o:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,o)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...o){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,o);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...o){n||(t.apply(this,o),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const o=`${e}-view`,r=this.getAttr(t,o);if(r){const t=document.querySelector(`[data-view="${r}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[o,r]of Object.entries(e)){const e=this.constructor.defaults?.[o];n[o]=this.getAttr(t,r,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const o=()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();};t.addEventListener("animationend",o,{once:true}),t.addEventListener("transitionend",o,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const o=e(t);if(!o.length)return;const r=o[0],s=o[o.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==r&&i?n.shiftKey||i!==s||(r.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const o=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?o.className=n:"style"===t&&"object"==typeof n?Object.assign(o.style,n):"dataset"===t&&"object"==typeof n?Object.assign(o.dataset,n):o.setAttribute(t,n);return "string"==typeof n?o.textContent=n:n instanceof HTMLElement&&o.appendChild(n),o}(t,e,n)}_dispatch(t,e,n){const o=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(o),o}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const o=t.getAttribute(`${this._getSelector()}-${e}`);return null!==o?o:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
