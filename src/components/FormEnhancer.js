import { BaseComponent } from '@peptolab/parallelogram';

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
export class FormEnhancer extends BaseComponent {
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
      validateOnInput: this._getDataAttr(
        element,
        'validate-on-input',
        FormEnhancer.defaults.validateOnInput
      ),
      validateOnBlur: this._getDataAttr(
        element,
        'validate-on-blur',
        FormEnhancer.defaults.validateOnBlur
      ),
      showErrorsImmediately: this._getDataAttr(
        element,
        'show-errors-immediately',
        FormEnhancer.defaults.showErrorsImmediately
      ),
      debounce: parseInt(
        this._getDataAttr(element, 'validate-debounce', FormEnhancer.defaults.debounce)
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

export default FormEnhancer;
