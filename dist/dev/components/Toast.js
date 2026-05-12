function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * Toast Component
 *
 * Handles data-toast-trigger elements and bridges to the existing PToasts web component
 * and AlertManager system.
 *
 * @example
 * HTML:
 * <button data-toast-trigger="info" data-toast-message="Hello World!">Show Toast</button>
 * <button data-toast-trigger="success"
 *         data-toast-message="Operation completed"
 *         data-toast-duration="5000">Success Toast</button>
 *
 * <p-toasts placement="top-right"></p-toasts>
 *
 * JavaScript (standalone):
 * import { Toast } from './components/Toast.js';
 * const toasts = new Toast();
 * document.querySelectorAll('[data-toast-trigger]')
 *   .forEach(trigger => toasts.mount(trigger));
 */
class Toast extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-toast';
  }

  /**
   * Default configuration for toast component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      defaultDuration: 4000,
      defaultType: 'info',
      fadeOutDuration: 300,
      typeMapping: {
        info: 'info',
        success: 'success',
        warn: 'warning',
        warning: 'warning',
        error: 'error',
        danger: 'error',
      },
    };
  }

  /**
   * Initialize the toast trigger on an element
   * @param {HTMLElement} element - Element with data-toast-trigger attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    const message = this.getAttr(element, 'message');
    const type = this.getAttr(element, 'trigger', Toast.defaults.defaultType);
    const duration = parseInt(
      this.getAttr(element, 'duration', Toast.defaults.defaultDuration)
    );
    const title = this.getAttr(element, 'title');
    const dismissible = this.getAttr(element, 'dismissible', 'true') !== 'false';

    if (!element.hasAttribute('data-toast-trigger')) {
      this.logger?.warn(
        'Toast component mounted on element without data-toast-trigger attribute',
        element
      );
      return state;
    }

    if (!message) {
      this.logger?.warn('Toast trigger missing data-toast-message attribute', element);
      return state;
    }

    // Store configuration in state
    state.message = message;
    state.type = type;
    state.duration = duration;
    state.title = title;
    state.dismissible = dismissible;

    // Create bound click handler for this specific element
    const clickHandler = event => this._handleClick(event, element);

    // Add click listener
    element.addEventListener('click', clickHandler);

    // Mark as enhanced
    element.setAttribute('data-toast-enhanced', 'true');
    element.classList.add('toast-trigger--enhanced');

    // Store cleanup function
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeEventListener('click', clickHandler);
      element.removeAttribute('data-toast-enhanced');
      element.classList.remove('toast-trigger--enhanced');
      originalCleanup();
    };

    // Emit mount event
    this.eventBus?.emit('toast:mount', {
      element,
      message,
      type,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toast trigger initialized', {
      element,
      message,
      type,
      duration,
    });

    return state;
  }

  /**
   * Handle click events on toast triggers
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The trigger element
   */
  _handleClick(event, element) {
    // Prevent default behavior
    event.preventDefault();

    const state = this.getState(element);
    if (!state) {
      this.logger?.warn('Toast trigger clicked but no state found', element);
      return;
    }

    // Map type if needed
    const alertType = Toast.defaults.typeMapping[state.type] || state.type;

    // Show the toast
    this._showToast({
      message: state.message,
      type: alertType,
      duration: state.duration,
      title: state.title,
      dismissible: state.dismissible,
      trigger: element,
    });
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type (info, success, warning, error)
   * @param {number} options.duration - Display duration in ms
   * @param {string} options.title - Optional title
   * @param {boolean} options.dismissible - Whether toast can be dismissed
   * @param {HTMLElement} options.trigger - Element that triggered the toast
   */
  _showToast(options) {
    const {
      message,
      type = Toast.defaults.defaultType,
      duration = Toast.defaults.defaultDuration,
      title,
      dismissible = true,
      trigger,
    } = options;

    try {
      // Use AlertManager if available, otherwise try direct PToasts
      if (window.alertManager && typeof window.alertManager.show === 'function') {
        window.alertManager.show({
          message,
          type,
          duration,
          title,
          dismissible,
        });
      } else {
        // Fallback: try to use PToasts directly
        const toastContainer = document.querySelector('p-toasts');
        if (toastContainer && typeof toastContainer.toast === 'function') {
          toastContainer.toast({
            message,
            type,
            duration,
            title,
            dismissible,
          });
        } else {
          // Final fallback: simple alert
          this.logger?.warn('No toast system available, falling back to alert');
          alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
        }
      }

      // Dispatch custom event on the trigger element
      this._dispatch(trigger, 'toast:shown', {
        message,
        type,
        duration,
        title,
      });

      // Emit success event
      this.eventBus?.emit('toast:show', {
        message,
        type,
        duration,
        title,
        trigger,
        timestamp: performance.now(),
      });

      this.logger?.info('Toast shown', { message, type, duration, title });
    } catch (error) {
      this.logger?.error('Failed to show toast', error);

      // Dispatch error event on the trigger element
      this._dispatch(trigger, 'toast:error', {
        error: error.message,
        message,
        type,
      });

      // Emit error event
      this.eventBus?.emit('toast:error', {
        error: error.message,
        options,
        trigger,
        timestamp: performance.now(),
      });

      // Fallback to alert
      alert(`${type.toUpperCase()}: ${title ? title + '\n' : ''}${message}`);
    }
  }

  /**
   * Programmatically trigger a toast (for use by other components)
   * @param {string} message - Toast message
   * @param {string} type - Toast type
   * @param {Object} options - Additional options
   */
  static show(message, type = 'info', options = {}) {
    const toast = new Toast();
    toast._showToast({
      message,
      type,
      ...options,
    });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const triggers = document.querySelectorAll('[data-toast-enhanced="true"]');

    return {
      mountedTriggers: triggers.length,
      availableTypes: Object.keys(Toast.defaults.typeMapping),
      alertManagerAvailable: !!(
        window.alertManager && typeof window.alertManager.show === 'function'
      ),
      xToastsAvailable: !!document.querySelector('p-toasts'),
      defaults: Toast.defaults,
    };
  }

  /**
   * Enhance all toast triggers on the page
   * @param {string} selector - CSS selector for toast triggers
   * @param {Object} options - Component options
   * @returns {Toast} Component instance
   */
  static enhanceAll(selector = '[data-toast-trigger][data-toast-message]', options) {
    const instance = new Toast(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Toast as default };
