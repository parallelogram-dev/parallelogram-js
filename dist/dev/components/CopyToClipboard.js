function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,r){return function(e,n,r){const o=n.includes("-")?t(n):n,s=e.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,r)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,r);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...r){n||(t.apply(this,r),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const r=`${e}-view`,o=this.getAttr(t,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[r,o]of Object.entries(e)){const e=this.constructor.defaults?.[r];n[r]=this.getAttr(t,o,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const r=()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();};t.addEventListener("animationend",r,{once:true}),t.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const r=e(t);if(!r.length)return;const o=r[0],s=r[r.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const r=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?r.className=n:"style"===t&&"object"==typeof n?Object.assign(r.style,n):"dataset"===t&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(t,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(t,e,n)}_dispatch(t,e,n){const r=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(r),this.eventBus?.emit(e,{element:t,...n}),r}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const r=t.getAttribute(`${this._getSelector()}-${e}`);return null!==r?r:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
