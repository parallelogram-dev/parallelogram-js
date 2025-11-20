function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,r){return function(e,n,r){const o=n.includes("-")?t(n):n,s=e.dataset[o];return void 0===s?r:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,r)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...r){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,r);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...r){n||(t.apply(this,r),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const r=`${e}-view`,o=this.getAttr(t,r);if(o){const t=document.querySelector(`[data-view="${o}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[r,o]of Object.entries(e)){const e=this.constructor.defaults?.[r];n[r]=this.getAttr(t,o,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const r=()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();};t.addEventListener("animationend",r,{once:true}),t.addEventListener("transitionend",r,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",r),t.removeEventListener("transitionend",r),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const r=e(t);if(!r.length)return;const o=r[0],s=r[r.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==o&&i?n.shiftKey||i!==s||(o.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const r=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?r.className=n:"style"===t&&"object"==typeof n?Object.assign(r.style,n):"dataset"===t&&"object"==typeof n?Object.assign(r.dataset,n):r.setAttribute(t,n);return "string"==typeof n?r.textContent=n:n instanceof HTMLElement&&r.appendChild(n),r}(t,e,n)}_dispatch(t,e,n){const r=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(r),this.eventBus?.emit(e,{element:t,...n}),r}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const r=t.getAttribute(`${this._getSelector()}-${e}`);return null!==r?r:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
