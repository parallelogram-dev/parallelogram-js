function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * CopyToClipboard Component - Copy text to clipboard
 *
 * @example
 * <button data-copytoclipboard data-copytoclipboard-target="#code-block">Copy Code</button>
 * <pre id="code-block">logger?.info('Hello World');</pre>
 */
class CopyToClipboard extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-copytoclipboard';
  }

  static get defaults() {
    return {
      successMessage: 'Copied!',
      errorMessage: 'Copy failed',
      successDuration: 2000,
      successClass: 'copy-success',
      errorClass: 'copy-error',
    };
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const target = this._getTarget(element);

    state.config = config;
    state.target = target;
    state.originalText = element.textContent;

    element.addEventListener('click', e => {
      e.preventDefault();
      this._handleCopy(element, state);
    });

    this.eventBus?.emit('copy-to-clipboard:mounted', { element, target });
    return state;
  }

  _getConfiguration(element) {
    return {
      successMessage: this.getAttr(
        element,
        'success-message',
        CopyToClipboard.defaults.successMessage
      ),
      errorMessage: this.getAttr(
        element,
        'error-message',
        CopyToClipboard.defaults.errorMessage
      ),
      successDuration: parseInt(
        this.getAttr(
          element,
          'success-duration',
          CopyToClipboard.defaults.successDuration
        )
      ),
      successClass: this.getAttr(
        element,
        'success-class',
        CopyToClipboard.defaults.successClass
      ),
      errorClass: this.getAttr(
        element,
        'error-class',
        CopyToClipboard.defaults.errorClass
      ),
    };
  }

  _getTarget(element) {
    const targetSelector = element.dataset.copyTarget;
    const textContent = element.dataset.copyText;

    if (textContent) {
      return { type: 'text', content: textContent };
    } else if (targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        return { type: 'element', element: targetElement };
      }
    }

    return { type: 'text', content: element.textContent };
  }

  async _handleCopy(element, state) {
    try {
      let textToCopy = '';

      if (state.target.type === 'text') {
        textToCopy = state.target.content;
      } else if (state.target.type === 'element') {
        // Try to get text content, fallback to input value
        textToCopy = state.target.element.value || state.target.element.textContent;
      }

      if (!textToCopy) {
        throw new Error('No text to copy');
      }

      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        this._fallbackCopy(textToCopy);
      }

      this._showSuccess(element, state);

      this.eventBus?.emit('copy-to-clipboard:success', {
        element,
        text: textToCopy,
      });
    } catch (error) {
      this._showError(element, state);

      this.eventBus?.emit('copy-to-clipboard:error', {
        element,
        error: error.message,
      });
    }
  }

  _fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  _showSuccess(element, state) {
    element.textContent = state.config.successMessage;
    element.classList.add(state.config.successClass);
    element.disabled = true;

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.successClass);
      element.disabled = false;
    }, state.config.successDuration);
  }

  _showError(element, state) {
    element.textContent = state.config.errorMessage;
    element.classList.add(state.config.errorClass);

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.errorClass);
    }, state.config.successDuration);
  }

  static enhanceAll(selector = '[data-copy-to-clipboard]', options) {
    const instance = new CopyToClipboard(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export { CopyToClipboard, CopyToClipboard as default };
