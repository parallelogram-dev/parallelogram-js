function e(e){return e.replace(/-([a-z])/g,e=>e[1].toUpperCase())}function t(e=document){return Array.from(e.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:e,logger:t,router:n}){this.eventBus=e,this.logger=t,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(e){if(this.elements.has(e))return this.update(e);const t=this._init(e);this.elements.set(e,t);}update(e){}unmount(e){const t=this.elements.get(e);if(t)try{t.cleanup?.();}finally{this.elements.delete(e);}}destroy(){for(const e of this._elementsKeys())this.unmount(e);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(e){this._keys||(this._keys=new Set),this._keys.add(e);}_untrack(e){this._keys?.delete(e);}_init(e){const t=new AbortController;return this._track(e),{cleanup:()=>{t.abort(),this._untrack(e);},controller:t}}getState(e){return this.elements.get(e)}_getDataAttr(t,n,r){return function(t,n,r){const o=n.includes("-")?e(n):n,s=t.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(t,n,r)}_camelCase(t){return e(t)}_debounce(e,t=300){return function(e,t=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),e.apply(this,r);},t);}}(e,t)}_throttle(e,t=100){return function(e,t=100){let n;return function(...r){n||(e.apply(this,r),n=true,setTimeout(()=>{n=false;},t));}}(e,t)}_delay(e){return function(e){return new Promise(t=>setTimeout(t,e))}(e)}_getTargetElement(e,t,n={}){const r=`${t}-view`,o=this.getAttr(e,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required&&this.logger?.warn(`Target element with data-view="${o}" not found`,{viewName:o,element:e,attribute:r}),t}const s=this.getAttr(e,t);if(!s)return n.required&&this.logger?.warn(`No ${t} or ${r} attribute found`,e),null;const i=document.querySelector(s);return !i&&n.required&&this.logger?.warn("Target element not found",{selector:s,element:e}),i}_getConfigFromAttrs(e,t){const n={};for(const[r,o]of Object.entries(t)){const t=this.constructor.defaults?.[r];n[r]=this.getAttr(e,o,t);}return n}_requireState(e,t="method"){const n=this.getState(e);return n||this.logger?.warn(`${t}: No state found for element`,e),n}_generateId(e="elem"){return function(e="elem"){return `${e}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(e)}async _waitForTransition(e,t=2e3){return async function(e,t=2e3){return new Promise(n=>{const r=()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();};e.addEventListener("animationend",r,{once:true}),e.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{e.removeEventListener("animationend",r),e.removeEventListener("transitionend",r),n();},t);})}(e,t)}async _fadeIn(e,t=300){return async function(e,t=300){return e.style.opacity="0",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="1",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}async _fadeOut(e,t=300){return async function(e,t=300){return e.style.opacity="1",e.style.transition=`opacity ${t}ms ease-in-out`,e.offsetHeight,e.style.opacity="0",new Promise(n=>{setTimeout(()=>{e.style.transition="",n();},t);})}(e,t)}_getFocusableElements(e=document){return t(e)}_trapFocus(e,n){return function(e,n){const r=t(e);if(!r.length)return;const o=r[0],s=r[r.length-1],i=e.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(e,n)}_restoreFocus(e){return function(e){e&&"function"==typeof e.focus&&requestAnimationFrame(()=>e.focus());}(e)}_createElement(e,t={},n=""){return function(e,t={},n=""){const r=document.createElement(e);for(const[e,n]of Object.entries(t))"className"===e||"class"===e?r.className=n:"style"===e&&"object"==typeof n?Object.assign(r.style,n):"dataset"===e&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(e,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(e,t,n)}_dispatch(e,t,n){const r=new CustomEvent(t,{detail:n,bubbles:true,cancelable:true});return e.dispatchEvent(r),this.eventBus?.emit(t,{element:e,...n}),r}_getSelector(){if(this._selector)return this._selector;const e=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${e}`,this._selector}setState(e,t){e.setAttribute(this._getSelector(),t);}getElementState(e){return e.getAttribute(this._getSelector())}setAttr(e,t,n){e.setAttribute(`${this._getSelector()}-${t}`,String(n));}getAttr(e,t,n=null){const r=e.getAttribute(`${this._getSelector()}-${t}`);return null!==r?r:n}removeAttr(e,t){e.removeAttribute(`${this._getSelector()}-${t}`);}hasAttr(e,t){return e.hasAttribute(`${this._getSelector()}-${t}`)}}

/**
 * FormValidator Component - Real-time form validation
 *
 * @example
 * <form data-form-validator>
 *   <input data-validate="required|email"
 *          data-validate-message="Please enter a valid email"
 *          name="email">
 *   <div data-error-for="email"></div>
 * </form>
 */
class FormEnhancer extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-form-enhancer';
  }

  static get defaults() {
    return {
      validateOnInput: true,
      validateOnBlur: true,
      showErrorsImmediately: false,
      errorClass: 'error',
      validClass: 'valid',
      debounce: 300, // milliseconds
    };
  }

  static get rules() {
    return {
      required: value => value.trim().length > 0,
      email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      min: (value, param) => value.length >= parseInt(param),
      max: (value, param) => value.length <= parseInt(param),
      minnum: (value, param) => parseFloat(value) >= parseFloat(param),
      maxnum: (value, param) => parseFloat(value) <= parseFloat(param),
      number: value => !isNaN(parseFloat(value)) && isFinite(value),
      url: value => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      pattern: (value, param) => new RegExp(param).test(value),
    };
  }

  constructor(options = {}) {
    super(options);
    this.debounceTimers = new Map();
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const fields = this._getValidatedFields(element);

    state.config = config;
    state.fields = fields;
    state.errors = new Map();
    state.touched = new Set();

    // Set up event listeners
    fields.forEach(field => this._setupFieldValidation(field, state));

    // Form submission handler
    element.addEventListener('submit', e => {
      this._handleSubmit(e, element, state);
    });

    this.eventBus?.emit('form-validator:mounted', { element, fieldCount: fields.length });
    return state;
  }

  _getConfiguration(element) {
    return {
      validateOnInput: this.getAttr(
        element,
        'validate-on-input',
        FormEnhancer.defaults.validateOnInput
      ),
      validateOnBlur: this.getAttr(
        element,
        'validate-on-blur',
        FormEnhancer.defaults.validateOnBlur
      ),
      showErrorsImmediately: this.getAttr(
        element,
        'show-errors-immediately',
        FormEnhancer.defaults.showErrorsImmediately
      ),
      debounce: parseInt(
        this.getAttr(element, 'validate-debounce', FormEnhancer.defaults.debounce)
      ),
    };
  }

  _getValidatedFields(element) {
    return Array.from(element.querySelectorAll('[data-validate]'));
  }

  _setupFieldValidation(field, state) {
    const fieldName = field.name || field.id;

    if (state.config.validateOnInput) {
      field.addEventListener('input', () => {
        this._debounceValidation(field, state, fieldName);
      });
    }

    if (state.config.validateOnBlur) {
      field.addEventListener('blur', () => {
        state.touched.add(fieldName);
        this._validateField(field, state);
      });
    }

    field.addEventListener('focus', () => {
      this._clearFieldError(field, state);
    });
  }

  _debounceValidation(field, state, fieldName) {
    clearTimeout(this.debounceTimers.get(fieldName));

    this.debounceTimers.set(
      fieldName,
      setTimeout(() => {
        if (state.touched.has(fieldName) || state.config.showErrorsImmediately) {
          this._validateField(field, state);
        }
      }, state.config.debounce)
    );
  }

  _validateField(field, state) {
    const rules = field.dataset.validate.split('|');
    const value = field.value;
    const fieldName = field.name || field.id;

    for (const rule of rules) {
      const [ruleName, param] = rule.split(':');
      const validator = FormEnhancer.rules[ruleName];

      if (validator && !validator(value, param)) {
        const message = this._getErrorMessage(field, ruleName, param);
        this._showFieldError(field, state, message);
        state.errors.set(fieldName, message);
        return false;
      }
    }

    this._showFieldValid(field, state);
    state.errors.delete(fieldName);
    return true;
  }

  _getErrorMessage(field, ruleName, param) {
    // Custom message from data attribute
    const customMessage = field.dataset.validateMessage;
    if (customMessage) return customMessage;

    // Default messages
    const messages = {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      min: `Minimum ${param} characters required`,
      max: `Maximum ${param} characters allowed`,
      minnum: `Value must be at least ${param}`,
      maxnum: `Value must be no more than ${param}`,
      number: 'Please enter a valid number',
      url: 'Please enter a valid URL',
      pattern: 'Invalid format',
    };

    return messages[ruleName] || 'Invalid value';
  }

  _showFieldError(field, state, message) {
    field.classList.add(state.config.errorClass);
    field.classList.remove(state.config.validClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  _showFieldValid(field, state) {
    field.classList.remove(state.config.errorClass);
    field.classList.add(state.config.validClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  _clearFieldError(field, state) {
    field.classList.remove(state.config.errorClass);

    const errorContainer = this._getErrorContainer(field);
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  _getErrorContainer(field) {
    const fieldName = field.name || field.id;
    return document.querySelector(`[data-error-for="${fieldName}"]`);
  }

  _handleSubmit(e, element, state) {
    let isValid = true;

    // Validate all fields
    state.fields.forEach(field => {
      const fieldName = field.name || field.id;
      state.touched.add(fieldName);

      if (!this._validateField(field, state)) {
        isValid = false;
      }
    });

    if (!isValid) {
      e.preventDefault();

      this.eventBus?.emit('form-validator:submit-blocked', {
        element,
        errors: Array.from(state.errors.entries()),
      });
    } else {
      this.eventBus?.emit('form-validator:submit-valid', { element });
    }
  }

  // Public API
  validate(element) {
    const state = this.getState(element);
    if (!state) return false;

    let isValid = true;
    state.fields.forEach(field => {
      if (!this._validateField(field, state)) {
        isValid = false;
      }
    });

    return isValid;
  }

  getErrors(element) {
    const state = this.getState(element);
    return state ? Array.from(state.errors.entries()) : [];
  }

  static enhanceAll(selector = '[data-form-validator]', options) {
    const instance = new FormEnhancer(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export { FormEnhancer, FormEnhancer as default };
