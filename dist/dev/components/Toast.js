function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,o){return function(e,n,o){const r=n.includes("-")?t(n):n,s=e.dataset[r];return void 0===s?o:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,o)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...o){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,o);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...o){n||(t.apply(this,o),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const o=`${e}-view`,r=this.getAttr(t,o);if(r){const t=document.querySelector(`[data-view="${r}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[o,r]of Object.entries(e)){const e=this.constructor.defaults?.[o];n[o]=this.getAttr(t,r,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const o=()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();};t.addEventListener("animationend",o,{once:true}),t.addEventListener("transitionend",o,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const o=e(t);if(!o.length)return;const r=o[0],s=o[o.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==r&&i?n.shiftKey||i!==s||(r.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const o=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?o.className=n:"style"===t&&"object"==typeof n?Object.assign(o.style,n):"dataset"===t&&"object"==typeof n?Object.assign(o.dataset,n):o.setAttribute(t,n);return "string"==typeof n?o.textContent=n:n instanceof HTMLElement&&o.appendChild(n),o}(t,e,n)}_dispatch(t,e,n){const o=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(o),o}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const o=t.getAttribute(`${this._getSelector()}-${e}`);return null!==o?o:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
