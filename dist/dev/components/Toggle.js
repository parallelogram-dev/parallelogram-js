function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * ComponentStates - Standard state values for component lifecycle
 *
 * These states are used in data attributes to track component initialization
 * and lifecycle. Each component uses its selector attribute (e.g., data-lazysrc)
 * to store its current state.
 *
 * @example
 * // Initial HTML
 * <img data-lazysrc data-lazysrc-src="/image.jpg">
 *
 * // After mounting
 * <img data-lazysrc="mounted" data-lazysrc-src="/image.jpg">
 *
 * // After loading
 * <img data-lazysrc="loaded" data-lazysrc-src="/image.jpg" src="/image.jpg">
 *
 * @example
 * // CSS Hooks
 * [data-lazysrc="loading"] { opacity: 0.5; }
 * [data-lazysrc="loaded"] { opacity: 1; }
 * [data-lazysrc="error"] { border: 2px solid red; }
 */


/**
 * Extended states for specific component behaviors
 * Components can use these in addition to core states
 */
const ExtendedStates = {
  // Interactive states (for Toggle, Modal, etc.)
  OPEN: 'open',
  CLOSED: 'closed',
  OPENING: 'opening',
  CLOSING: 'closing'};

/**
 * Toggle Component
 *
 * Progressive enhancement for toggle functionality with show/hide states.
 * Supports dropdowns, modals, accordion panels, and other toggleable content.
 * Includes auto-close functionality for navigation links.
 *
 * @example
 * HTML:
 * <button data-toggle data-toggle-target="#dropdown-menu">Toggle Menu</button>
 * <div id="dropdown-menu" class="dropdown hidden">
 *   <p>Dropdown content here</p>
 * </div>
 *
 * <!-- Dropdown with outside click capture -->
 * <button data-toggle
 *         data-toggle-target="#dropdown"
 *         data-toggle-capture="true">Dropdown</button>
 * <div id="dropdown" class="dropdown">Menu items</div>
 *
 * <!-- Navigation menu that auto-closes when links are clicked -->
 * <button data-toggle data-toggle-target="#navbar-navigation">Menu</button>
 * <nav id="navbar-navigation">
 *   <a href="/page1">Page 1</a>
 *   <a href="/page2">Page 2</a>
 *   <a href="#section">Anchor link (won't close)</a>
 *   <a href="https://external.com" target="_blank">External (won't close)</a>
 * </nav>
 *
 * <!-- Disable navigation auto-close -->
 * <button data-toggle
 *         data-toggle-target="#persistent-nav"
 *         data-toggle-close-navigation="false">Persistent Nav</button>
 * <nav id="persistent-nav">Navigation links won't auto-close this</nav>
 *
 * <!-- Manual toggle (won't auto-close at all) -->
 * <button data-toggle data-toggle-target="#persistent">Persistent Toggle</button>
 * <div id="persistent" data-toggle-manual="true">This won't auto-close</div>
 *
 * <!-- Accordion panel -->
 * <button data-toggle data-toggle-target="#panel-1" aria-expanded="false">Panel 1</button>
 * <div id="panel-1" class="panel">Panel 1 content</div>
 *
 * JavaScript (standalone):
 * import { Toggle } from './components/Toggle.js';
 * const toggles = new Toggle();
 * document.querySelectorAll('[data-toggle]')
 *   .forEach(trigger => toggles.mount(trigger));
 */
class Toggle extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-toggle';
  }

  /**
   * Default configuration for toggle component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      openClass: 'open',
      transitioningClass: 'transitioning',
      transitionDuration: 750,
      capture: false, // Whether to capture outside clicks
      manual: false, // Whether to prevent auto-closing
      multiple: false, // Allow multiple toggles open at once
      animateToggle: true,
      closeOnEscape: true,
      closeOnNavigation: true, // Auto-close when navigation links are clicked
    };
  }

  /**
   * Initialize the toggle functionality on a trigger element
   * @param {HTMLElement} element - Trigger element with data-toggle attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target element
    const targetSelector = this.getAttr(element, 'target');
    if (!targetSelector) {
      this.logger?.warn('Toggle: No data-toggle-target attribute found', element);
      return state;
    }

    const target = document.querySelector(targetSelector);
    if (!target) {
      this.logger?.warn('Toggle: Target element not found', { selector: targetSelector, element });
      return state;
    }

    // Get configuration from data attributes
    const capture = this.getAttr(element, 'capture', Toggle.defaults.capture);
    const manual =
      target.hasAttribute('data-toggle-manual') ||
      this.getAttr(element, 'manual', Toggle.defaults.manual);
    const multiple = this.getAttr(element, 'multiple', Toggle.defaults.multiple);
    const animateToggle = this.getAttr(
      element,
      'animate',
      Toggle.defaults.animateToggle
    );
    const closeOnNavigation = this.getAttr(
      element,
      'close-navigation',
      Toggle.defaults.closeOnNavigation
    );

    // Store state
    state.target = target;
    state.targetSelector = targetSelector;
    state.capture = capture;
    state.manual = manual;
    state.multiple = multiple;
    state.animateToggle = animateToggle;
    state.closeOnNavigation = closeOnNavigation;
    state.isOpen = target.classList.contains(Toggle.defaults.openClass);
    state.transitionTimer = null;

    // Set initial state attribute on target
    const initialState = state.isOpen ? ExtendedStates.OPEN : ExtendedStates.CLOSED;
    this.setAttr(target, 'target', initialState);

    // Set up click handler
    const clickHandler = e => this._handleClick(e, element, state);
    element.addEventListener('click', clickHandler);

    // Mark as enhanced for status tracking
    element.setAttribute('data-toggle-enhanced', 'true');

    // Set up ARIA attributes
    element.setAttribute('aria-expanded', String(state.isOpen));
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', targetSelector.replace('#', ''));
    }

    // Set up escape key handler if enabled
    if (Toggle.defaults.closeOnEscape) {
      const escapeHandler = e => this._handleEscape(e, element, state);
      document.addEventListener('keydown', escapeHandler);
      state.escapeHandler = escapeHandler;
    }

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeEventListener('click', clickHandler);
      if (state.escapeHandler) {
        document.removeEventListener('keydown', state.escapeHandler);
      }
      this._clearTransitionTimer(state);
      this._removeGlobalListeners(state);
      originalCleanup();
    };

    this.eventBus?.emit('toggle:mount', {
      element,
      target,
      isOpen: state.isOpen,
      timestamp: performance.now(),
    });

    this.logger?.info('Toggle initialized', {
      element,
      target: targetSelector,
      capture,
      manual,
      isOpen: state.isOpen,
    });

    return state;
  }

  /**
   * Handle click events on toggle triggers
   * @private
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleClick(event, element, state) {
    event.preventDefault();
    event.stopPropagation();

    this.toggle(element);
  }

  /**
   * Handle escape key to close toggles
   * @private
   * @param {Event} event - Keydown event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleEscape(event, element, state) {
    if (event.key === 'Escape' && state.isOpen && !state.manual) {
      this.hide(element);
    }
  }

  /**
   * Toggle the open/closed state
   * @param {HTMLElement} element - Trigger element
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check the actual target state, not just this trigger's stored state
    const isActuallyOpen = state.target.classList.contains(Toggle.defaults.openClass);

    if (isActuallyOpen) {
      this.hide(element);
    } else {
      this.show(element);
    }
  }

  /**
   * Show/open the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  show(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check current state to prevent transitions during animation
    const currentState = this.getAttr(state.target, 'target');
    if (currentState === ExtendedStates.OPENING || currentState === ExtendedStates.OPEN) {
      return;
    }

    // Close other toggles if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherToggles(element);
    }

    // Update internal state for this trigger
    state.isOpen = true;

    // Update state for all triggers targeting the same element
    this._syncTriggerStates(state.targetSelector, true);

    // Update ARIA attributes
    element.setAttribute('aria-expanded', 'true');
    this._updateRelatedTriggers(state.targetSelector, true);

    // Set up global listeners for outside click capture or navigation link detection
    if (state.capture || state.closeOnNavigation) {
      this._setupGlobalListeners(element, state);
    }

    // Handle state transitions with animation
    if (state.animateToggle) {
      // Set opening state
      this.setAttr(state.target, 'target', ExtendedStates.OPENING);
      state.target.classList.add(Toggle.defaults.openClass);

      // Transition to fully open after animation
      state.transitionTimer = setTimeout(() => {
        this.setAttr(state.target, 'target', ExtendedStates.OPEN);
        state.transitionTimer = null;
      }, Toggle.defaults.transitionDuration);
    } else {
      // No animation - set open state immediately
      this.setAttr(state.target, 'target', ExtendedStates.OPEN);
      state.target.classList.add(Toggle.defaults.openClass);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:show', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:show', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle shown', { element, target: state.targetSelector });
  }

  /**
   * Hide/close the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  hide(element) {
    const state = this.getState(element);
    if (!state) return;

    // Check current state to prevent transitions during animation
    const currentState = this.getAttr(state.target, 'target');
    if (currentState === ExtendedStates.CLOSING || currentState === ExtendedStates.CLOSED) {
      return;
    }

    // Update internal state for this trigger
    state.isOpen = false;

    // Update state for all triggers targeting the same element
    this._syncTriggerStates(state.targetSelector, false);

    // Update ARIA attributes
    element.setAttribute('aria-expanded', 'false');
    this._updateRelatedTriggers(state.targetSelector, false);

    // Remove global listeners
    this._removeGlobalListeners(state);

    // Remove open class immediately
    state.target.classList.remove(Toggle.defaults.openClass);

    // Handle state transitions with animation
    if (state.animateToggle) {
      // Set closing state
      this.setAttr(state.target, 'target', ExtendedStates.CLOSING);

      // Wait for animation before setting closed state
      state.transitionTimer = setTimeout(() => {
        this.setAttr(state.target, 'target', ExtendedStates.CLOSED);
        state.transitionTimer = null;
      }, Toggle.defaults.transitionDuration);
    } else {
      // No animation - set closed state immediately
      this.setAttr(state.target, 'target', ExtendedStates.CLOSED);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:hide', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:hide', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle hidden', { element, target: state.targetSelector });
  }

  /**
   * Hide all non-manual toggles
   */
  hideAll() {
    // Get all mounted elements
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      const state = this.getState(element);
      if (state && state.isOpen && !state.manual) {
        this.hide(element);
      }
    });
  }

  /**
   * Check if a toggle is currently open
   * @param {HTMLElement} element - Trigger element
   * @returns {boolean} Whether the toggle is open
   */
  isOpen(element) {
    const state = this.getState(element);
    return state ? state.isOpen : false;
  }

  /**
   * Update ARIA attributes for related triggers
   * @private
   * @param {string} targetSelector - Target selector
   * @param {boolean} isOpen - Whether the toggle is open
   */
  _updateRelatedTriggers(targetSelector, isOpen) {
    const relatedTriggers = document.querySelectorAll(
      `[data-toggle-target="${targetSelector}"]`
    );
    relatedTriggers.forEach(trigger => {
      trigger.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /**
   * Set up global event listeners for outside click capture
   * @private
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _setupGlobalListeners(element, state) {
    // Handle clicks inside the target
    const targetClickHandler = e => {
      // Check for navigation links if closeOnNavigation is enabled
      if (state.closeOnNavigation && !state.manual && this._isNavigationLink(e.target)) {
        this.hide(element);
        return;
      }
      // Otherwise prevent clicks inside the target from closing
      e.stopPropagation();
    };

    // Close on outside click (only if not manual mode)
    const documentClickHandler = e => {
      if (!state.manual && !element.contains(e.target) && !state.target.contains(e.target)) {
        this.hide(element);
      }
    };

    state.target.addEventListener('click', targetClickHandler);
    document.addEventListener('click', documentClickHandler);

    // Store handlers for cleanup
    state.targetClickHandler = targetClickHandler;
    state.documentClickHandler = documentClickHandler;
  }

  /**
   * Remove global event listeners
   * @private
   * @param {Object} state - Component state
   */
  _removeGlobalListeners(state) {
    if (state.targetClickHandler) {
      state.target.removeEventListener('click', state.targetClickHandler);
      state.targetClickHandler = null;
    }

    if (state.documentClickHandler) {
      document.removeEventListener('click', state.documentClickHandler);
      state.documentClickHandler = null;
    }
  }

  /**
   * Check if an element is a navigation link that should trigger toggle closure
   * @private
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether the element is a navigation link
   */
  _isNavigationLink(element) {
    // Walk up the DOM tree to find a link element
    let current = element;
    while (current && current !== document.body) {
      if (current.tagName === 'A') {
        const href = current.getAttribute('href');
        // Check if it's a navigation link (has href and causes page navigation)
        if (href &&
            !href.startsWith('#') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !current.hasAttribute('download') &&
            current.getAttribute('target') !== '_blank') {
          return true;
        }
        break;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Clear transition timer
   * @private
   * @param {Object} state - Component state
   */
  _clearTransitionTimer(state) {
    if (state.transitionTimer) {
      clearTimeout(state.transitionTimer);
      state.transitionTimer = null;
    }
  }

  /**
   * Close other open toggles when multiple is disabled
   * @private
   * @param {HTMLElement} currentElement - Current trigger element
   */
  _closeOtherToggles(currentElement) {
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      if (element !== currentElement) {
        const state = this.getState(element);
        if (state && state.isOpen && !state.manual) {
          this.hide(element);
        }
      }
    });
  }

  /**
   * Sync state for all triggers targeting the same element
   * @private
   * @param {string} targetSelector - Target selector to sync
   * @param {boolean} isOpen - Whether the target is open
   */
  _syncTriggerStates(targetSelector, isOpen) {
    const triggers = document.querySelectorAll(
      `[data-toggle-target="${targetSelector}"][data-toggle-enhanced="true"]`
    );

    triggers.forEach(trigger => {
      const triggerState = this.getState(trigger);
      if (triggerState) {
        triggerState.isOpen = isOpen;
      }
    });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const triggers = document.querySelectorAll('[data-toggle-enhanced="true"]');
    let openCount = 0;
    let captureCount = 0;
    let manualCount = 0;

    triggers.forEach(trigger => {
      const state = this.getState(trigger);
      if (state) {
        if (state.isOpen) openCount++;
        if (state.capture) captureCount++;
        if (state.manual) manualCount++;
      }
    });

    return {
      totalTriggers: triggers.length,
      openCount,
      captureCount,
      manualCount,
      defaults: Toggle.defaults,
    };
  }

  /**
   * Enhance all toggle triggers on the page
   * @param {string} selector - CSS selector for toggle triggers
   * @param {Object} options - Component options
   * @returns {Toggle} Component instance
   */
  static enhanceAll(selector = '[data-toggle]', options) {
    const instance = new Toggle(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Toggle as default };
