function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,r){return function(e,n,r){const o=n.includes("-")?t(n):n,s=e.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,r)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,r);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...r){n||(t.apply(this,r),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const r=`${e}-view`,o=this.getAttr(t,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[r,o]of Object.entries(e)){const e=this.constructor.defaults?.[r];n[r]=this.getAttr(t,o,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const r=()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();};t.addEventListener("animationend",r,{once:true}),t.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const r=e(t);if(!r.length)return;const o=r[0],s=r[r.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const r=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?r.className=n:"style"===t&&"object"==typeof n?Object.assign(r.style,n):"dataset"===t&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(t,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(t,e,n)}_dispatch(t,e,n){const r=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(r),this.eventBus?.emit(e,{element:t,...n}),r}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const r=t.getAttribute(`${this._getSelector()}-${e}`);return null!==r?r:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

/**
 * Scrollreveal Component with FIFO Queue Staggering
 *
 * Elements are revealed in the order they enter the viewport with simple staggering
 */
class Scrollreveal extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-reveal';
  }

  static get defaults() {
    return {
      threshold: 0.1,
      rootMargin: '0px',
      once: true,
      delay: 0,
      stagger: 100, // Default 50ms stagger between elements
      initialState: 'hidden',
    };
  }

  constructor(options = {}) {
    super(options);
    this.transitionManager = options.transitionManager;

    // Simple FIFO queue for staggered reveals
    this.revealQueue = [];
    this.isProcessingQueue = false;

    this._createObserver();
  }

  _createObserver() {
    const observerOptions = {
      root: null,
      rootMargin: Scrollreveal.defaults.rootMargin,
      threshold: Scrollreveal.defaults.threshold,
    };

    this.observer = new IntersectionObserver(this._handleIntersection.bind(this), observerOptions);

    this.logger?.info('Scrollreveal intersection observer created', observerOptions);
  }

  _init(element) {
    const state = super._init(element);

    // Get configuration from data attributes
    const threshold = this.getAttr(
      element,
      'threshold',
      Scrollreveal.defaults.threshold
    );
    const once = this.getAttr(element, 'once', Scrollreveal.defaults.once);
    const delay = this.getAttr(element, 'delay', Scrollreveal.defaults.delay);
    const stagger = this.getAttr(
      element,
      'stagger',
      Scrollreveal.defaults.stagger
    );
    const initialState = this.getAttr(
      element,
      'initial',
      Scrollreveal.defaults.initialState
    );

    // Store state
    state.threshold = parseFloat(threshold);
    state.once = Boolean(once);
    state.delay = parseInt(delay, 10);
    state.stagger = parseInt(stagger, 10);
    state.initialState = initialState;
    state.hasBeenRevealed = false;
    state.isRevealing = false;

    // For staggering, each element is treated as a single item
    state.items = [element];

    // Set initial state
    this._setInitialState(element, state);

    // Mark as enhanced for status tracking
    this.setAttr(element, 'enhanced', 'true');

    // Create observer with element-specific threshold if needed
    if (state.threshold !== Scrollreveal.defaults.threshold) {
      state.customObserver = new IntersectionObserver(this._handleIntersection.bind(this), {
        root: null,
        rootMargin: Scrollreveal.defaults.rootMargin,
        threshold: state.threshold,
      });
      state.customObserver.observe(element);
    } else {
      this.observer.observe(element);
    }

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      if (state.customObserver) {
        state.customObserver.unobserve(element);
        state.customObserver.disconnect();
      } else {
        this.observer.unobserve(element);
      }

      // Remove from reveal queue
      this.revealQueue = this.revealQueue.filter(item => item.element !== element);

      originalCleanup();
    };

    this.eventBus?.emit('scrollreveal:mount', {
      element,
      threshold: state.threshold,
      stagger: state.stagger,
      timestamp: performance.now(),
    });

    this.logger?.info('Scrollreveal initialized', {
      element,
      threshold: state.threshold,
      once: state.once,
      stagger: state.stagger,
    });

    return state;
  }

  _setInitialState(element, state) {
    if (state.initialState === 'hidden') {
      // Check if using CSS class animation
      const revealClass = element.dataset.revealClass;

      if (!revealClass) {
        // Only set inline styles if not using CSS classes
        element.style.opacity = '0';

        // Get transition settings for initial transform
        const y = element.dataset.transitionY || '1rem';
        element.style.transform = `translateY(${y})`;
      }

      // Mark as not yet revealed
      this.setAttr(element, 'state', 'hidden');
    }
  }

  _handleIntersection(entries) {
    entries.forEach(entry => {
      const element = entry.target;
      const state = this.getState(element);

      if (!state) return;

      if (entry.isIntersecting && !state.hasBeenRevealed && !state.isRevealing) {
        // Add to FIFO queue for staggered animation
        if (state.stagger > 0) {
          this._addToRevealQueue(element, state);
        } else {
          // Reveal immediately if no stagger
          this._revealElement(element, state);
        }
      } else if (!entry.isIntersecting && !state.once && state.hasBeenRevealed) {
        this._hideElement(element, state);
      }
    });
  }

  /**
   * Add element to FIFO reveal queue
   * @private
   * @param {HTMLElement} element - Element to reveal
   * @param {Object} state - Component state
   */
  _addToRevealQueue(element, state) {
    // Simply push to end of queue
    this.revealQueue.push({ element, state, timestamp: performance.now() });

    // Process queue if not already processing
    this._processRevealQueue();
  }

  /**
   * Process the reveal queue with FIFO staggering
   * @private
   */
  _processRevealQueue() {
    if (this.isProcessingQueue || this.revealQueue.length === 0) return;

    this.isProcessingQueue = true;

    // Use RAF to ensure we're processing on the next frame
    requestAnimationFrame(() => {
      this._processNextInQueue();
    });
  }

  /**
   * Process the next element in the queue
   * @private
   */
  _processNextInQueue() {
    if (this.revealQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    // Pop first element from queue (FIFO)
    const { element, state } = this.revealQueue.shift();

    if (state.isRevealing || state.hasBeenRevealed) {
      // Skip and process next immediately
      this._scheduleNextQueueItem(0);
      return;
    }

    // Start revealing this element (don't await it)
    this._revealElement(element, state, true).catch(error => {
      this.logger?.error('Queue reveal failed', { element, error });
    });

    // Immediately schedule next item with just the stagger delay
    this._scheduleNextQueueItem(state.stagger);
  }

  /**
   * Schedule processing of next queue item
   * @private
   * @param {number} delay - Delay before processing next item
   */
  _scheduleNextQueueItem(delay = 0) {
    if (delay > 0) {
      setTimeout(() => {
        this._processNextInQueue();
      }, delay);
    } else {
      // Use RAF for immediate next item
      requestAnimationFrame(() => {
        this._processNextInQueue();
      });
    }
  }

  /**
   * Reveal an element with animation
   * @private
   * @param {HTMLElement} element - Element to reveal
   * @param {Object} state - Component state
   * @param {boolean} applyDelay - Whether to apply the element's delay
   */
  async _revealElement(element, state, applyDelay = true) {
    state.isRevealing = true;

    this.eventBus?.emit('scrollreveal:reveal-start', {
      element,
      timestamp: performance.now(),
    });

    try {
      // Apply element-specific delay
      if (applyDelay && state.delay > 0) {
        await this._delay(state.delay);
      }

      // Animate the element
      await this._revealItems([element], element);

      // Mark as revealed
      state.hasBeenRevealed = true;

      // Stop observing if once is true
      if (state.once) {
        if (state.customObserver) {
          state.customObserver.unobserve(element);
        } else {
          this.observer.unobserve(element);
        }
      }

      this.eventBus?.emit('scrollreveal:reveal-complete', {
        element,
        timestamp: performance.now(),
      });

      this.logger?.debug('Scrollreveal animation completed', { element });
    } catch (error) {
      this.logger?.error('Scrollreveal animation failed', { element, error });

      this.eventBus?.emit('scrollreveal:reveal-error', {
        element,
        error,
        timestamp: performance.now(),
      });
    } finally {
      state.isRevealing = false;
    }
  }

  /**
   * Hide an element with animation (for non-once reveals)
   * @private
   * @param {HTMLElement} element - Container element
   * @param {Object} state - Component state
   */
  async _hideElement(element, state) {
    if (state.once) return;

    try {
      await this._hideItems([element], element);
      state.hasBeenRevealed = false;

      this.eventBus?.emit('scrollreveal:hide-complete', {
        element,
        timestamp: performance.now(),
      });
    } catch (error) {
      this.logger?.error('Scrollreveal hide animation failed', { element, error });
    }
  }

  /**
   * Reveal items using CSS class or TransitionManager
   * @private
   * @param {HTMLElement[]} items - Items to reveal
   * @param {HTMLElement} container - Container element
   */
  async _revealItems(items, container) {
    const promises = items.map(async item => {
      this.setAttr(item, 'state', 'revealing');

      try {
        // Check for CSS class-based animation first
        const revealClass = item.dataset.revealClass;

        if (revealClass) {
          // Use CSS class animation
          await this._animateWithClass(item, revealClass);
        } else if (this.transitionManager) {
          // Use TransitionManager JS animation
          await this.transitionManager.enter(item);
        } else {
          // Fallback to simple opacity/transform
          item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }
        this.setAttr(item, 'state', 'visible');
      } catch (error) {
        this.setAttr(item, 'state', 'error');
        throw error;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Hide items using CSS class or TransitionManager
   * @private
   * @param {HTMLElement[]} items - Items to hide
   * @param {HTMLElement} container - Container element
   */
  async _hideItems(items, container) {
    const promises = items.map(async item => {
      this.setAttr(item, 'state', 'hiding');

      try {
        const revealClass = item.dataset.revealClass;
        const exitClass = item.dataset.revealExitClass;

        if (exitClass) {
          await this._animateWithClass(item, exitClass);
        } else if (revealClass) {
          const classNames = revealClass.split(' ').filter(cls => cls.trim());
          item.classList.remove(...classNames);
        } else if (this.transitionManager) {
          await this.transitionManager.exit(item);
        } else {
          const y = item.dataset.transitionY || '1rem';
          item.style.opacity = '0';
          item.style.transform = `translateY(${y})`;
        }
        this.setAttr(item, 'state', 'hidden');
      } catch (error) {
        this.setAttr(item, 'state', 'error');
        throw error;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Animate element with CSS class
   * @private
   * @param {HTMLElement} element - Element to animate
   * @param {string} className - CSS class name
   * @returns {Promise} Animation completion promise
   */
  _animateWithClass(element, className) {
    return new Promise(resolve => {
      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('transitionend', handleAnimationEnd);
        resolve();
      };

      element.addEventListener('animationend', handleAnimationEnd, { once: true });
      element.addEventListener('transitionend', handleAnimationEnd, { once: true });

      const classNames = className.split(' ').filter(cls => cls.trim());
      element.classList.add(...classNames);

      // Fallback timeout
      setTimeout(() => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('transitionend', handleAnimationEnd);
        resolve();
      }, 2000);
    });
  }

  /**
   * Create a delay promise
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set stagger delay
   * @param {number} delay - Stagger delay in milliseconds
   */
  setStagger(delay) {
    this.staggerDelay = delay;
  }

  /**
   * Clear the reveal queue (useful for page transitions)
   */
  clearQueue() {
    this.revealQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Manually trigger reveal animation
   * @param {HTMLElement} element - Container element
   */
  async reveal(element) {
    const state = this.getState(element);
    if (!state || state.hasBeenRevealed || state.isRevealing) return;

    await this._revealElement(element, state);
  }

  /**
   * Manually trigger hide animation
   * @param {HTMLElement} element - Container element
   */
  async hide(element) {
    const state = this.getState(element);
    if (!state || !state.hasBeenRevealed) return;

    await this._hideElement(element, state);
  }

  /**
   * Reset element to initial state
   * @param {HTMLElement} element - Container element
   */
  reset(element) {
    const state = this.getState(element);
    if (!state) return;

    // Reset state
    state.hasBeenRevealed = false;
    state.isRevealing = false;

    // Reset visual state
    this._setInitialState(element, state);

    // Resume observing if needed
    if (state.once) {
      if (state.customObserver) {
        state.customObserver.observe(element);
      } else {
        this.observer.observe(element);
      }
    }

    this.logger?.debug('Scrollreveal reset', { element });
  }

  /**
   * Check if element has been revealed
   * @param {HTMLElement} element - Container element
   * @returns {boolean} Whether the element has been revealed
   */
  isRevealed(element) {
    const state = this.getState(element);
    return state ? state.hasBeenRevealed : false;
  }

  /**
   * Update intersection observer threshold
   * @param {HTMLElement} element - Container element
   * @param {number} threshold - New threshold (0.0 to 1.0)
   */
  updateThreshold(element, threshold) {
    const state = this.getState(element);
    if (!state) return;

    state.threshold = threshold;

    // Recreate observer with new threshold
    if (state.customObserver) {
      state.customObserver.disconnect();
    }

    state.customObserver = new IntersectionObserver(this._handleIntersection.bind(this), {
      root: null,
      rootMargin: Scrollreveal.defaults.rootMargin,
      threshold,
    });

    state.customObserver.observe(element);

    this.logger?.info('Scrollreveal threshold updated', { element, threshold });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const selector = `[${this._getSelector()}-enhanced="true"]`;
    const elements = document.querySelectorAll(selector);
    let revealedCount = 0;
    let revealingCount = 0;

    elements.forEach(element => {
      const state = this.getState(element);
      if (state) {
        if (state.hasBeenRevealed) revealedCount++;
        if (state.isRevealing) revealingCount++;
      }
    });

    return {
      totalElements: elements.length,
      revealedCount,
      revealingCount,
      queuedCount: this.revealQueue.length,
      observerActive: !!this.observer,
      defaults: Scrollreveal.defaults,
    };
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.revealQueue = [];
    this.isProcessingQueue = false;

    super.destroy();
    this.logger?.info('Scrollreveal destroyed');
  }

  static enhanceAll(selector = '[data-reveal]', options) {
    const instance = new Scrollreveal(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Scrollreveal as default };
