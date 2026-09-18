import { BaseComponent } from '../core/BaseComponent.js';

/** Validity flags, in the order their messages are chosen when several fail */
const CONSTRAINTS = [
  'valueMissing',
  'typeMismatch',
  'badInput',
  'patternMismatch',
  'tooShort',
  'tooLong',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'customError',
];

const tokens = value =>
  String(value ?? '')
    .split(/\s+/)
    .filter(Boolean);

const kebab = name => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

/** Submit buttons report willValidate too, but they have no value to check */
const BUTTON_TYPES = new Set(['submit', 'reset', 'button', 'image']);

const isValidated = field => field.willValidate === true && !BUTTON_TYPES.has(field.type);

/**
 * FormEnhancer - accessible error messages for the browser's own form validation
 *
 * Fields declare their rules with native attributes (`required`, `type`, `minlength`, `maxlength`,
 * `min`, `max`, `step` and `pattern`), so the form still validates when scripts don't run. Once
 * mounted, FormEnhancer sets `novalidate` on the form and shows the messages itself: after the user
 * leaves a field they changed, and for every field when they submit. A blocked submission moves
 * focus to the first invalid field.
 *
 * Each error is written to the form's `[data-error-for="<field name>"]` element, or to one created
 * after the field (after the `<fieldset>` contents for a group of radios or checkboxes). The field
 * gets `aria-invalid="true"` and an `aria-describedby` link to the message. An error stays visible
 * while the user corrects the field and clears as soon as the value is valid. Messages come from
 * the browser's localised `validationMessage` unless the field supplies its own.
 *
 * Custom rules use `setCustomValidity()` on the field, for example in an `input` listener.
 *
 * @example
 * <form data-form-enhancer>
 *   <label for="email">Email</label>
 *   <input id="email" name="email" type="email" required
 *          data-form-enhancer-message-value-missing="Tell us where to send your tickets">
 *   <p data-error-for="email" hidden></p>
 *   <button>Book</button>
 * </form>
 *
 * @attributes
 * - data-form-enhancer: on the form
 * - data-form-enhancer-validate-on-input: re-check a field that shows an error as it is edited
 *   (default true)
 * - data-form-enhancer-validate-on-blur: check a changed field when the user leaves it (default true)
 * - data-form-enhancer-show-errors-immediately: check fields while the user types (default false)
 * - data-form-enhancer-validate-debounce: typing pause in milliseconds before checking when errors
 *   show immediately (default 300)
 * - data-form-enhancer-error-class, data-form-enhancer-valid-class: classes added to checked fields
 *   (default is-invalid and is-valid)
 * - data-form-enhancer-message-class: class on a message element the form didn't supply itself
 *   (default form__error)
 * - data-form-enhancer-message: on a field, the message for any failure
 * - data-form-enhancer-message-value-missing, -type-mismatch, -bad-input, -pattern-mismatch,
 *   -too-short, -too-long, -range-underflow, -range-overflow, -step-mismatch: on a field, the message
 *   for one constraint
 * - data-error-for: on the element that shows a field's error, set to the field's name
 *
 * @events
 * - form-enhancer:mounted: with `{ element, fieldCount }`
 * - form-enhancer:submit-blocked: a submission was stopped, with `{ element, errors }` where errors
 *   is a list of `[fieldName, message]` pairs
 * - form-enhancer:submit-valid: every field passed and the submission goes ahead
 */
export class FormEnhancer extends BaseComponent {
  static selector = 'data-form-enhancer';

  static defaults = {
    validateOnInput: true,
    validateOnBlur: true,
    showErrorsImmediately: false,
    debounce: 300,
    errorClass: 'is-invalid',
    validClass: 'is-valid',
    messageClass: 'form__error',
  };

  _init(element) {
    const state = super._init(element);
    const { signal } = state.controller;

    state.config = this._getConfigFromAttrs(element, {
      validateOnInput: 'validate-on-input',
      validateOnBlur: 'validate-on-blur',
      showErrorsImmediately: 'show-errors-immediately',
      debounce: 'validate-debounce',
      errorClass: 'error-class',
      validClass: 'valid-class',
      messageClass: 'message-class',
    });
    state.noValidate = element.noValidate;
    state.dirty = new Set();
    state.touched = new Set();
    state.errors = new Map();
    state.timers = new Map();
    state.created = new Set();

    element.noValidate = true;
    element.addEventListener('submit', event => this._onSubmit(element, state, event), { signal });
    element.addEventListener('input', event => this._onEdit(element, state, event), { signal });
    element.addEventListener('change', event => this._onEdit(element, state, event), { signal });
    element.addEventListener('focusout', event => this._onLeave(element, state, event), { signal });
    element.addEventListener('reset', () => this._clearAll(element, state), { signal });

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      baseCleanup();
      this._clearAll(element, state);
      state.created.forEach(node => node.remove());
      element.noValidate = state.noValidate;
    };

    const fieldCount = this._groups(element).size;
    this._dispatch(element, 'form-enhancer:mounted', { element, fieldCount });
    return state;
  }

  /**
   * The form's validated fields grouped by name, so a group of radios reports one error
   *
   * @returns {Map<string, Element[]>}
   */
  _groups(form) {
    const groups = new Map();
    for (const field of form.elements) {
      if (!isValidated(field)) continue;
      const key = this._keyFor(field);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(field);
    }
    return groups;
  }

  _keyFor(field) {
    if (!field.name && !field.id) {
      field.id = this._generateId('form-enhancer-field');
    }
    return field.name || field.id;
  }

  _fieldFrom(form, event) {
    const field = event.target;
    return Array.prototype.includes.call(form.elements, field) && isValidated(field) ? field : null;
  }

  _onEdit(form, state, event) {
    const field = this._fieldFrom(form, event);
    if (!field) return;

    const key = this._keyFor(field);
    state.dirty.add(key);

    if (state.errors.has(key) && state.config.validateOnInput) {
      clearTimeout(state.timers.get(key));
      this._validateGroup(form, state, key);
    } else if (state.config.showErrorsImmediately && event.type === 'input') {
      clearTimeout(state.timers.get(key));
      state.timers.set(
        key,
        setTimeout(() => {
          state.timers.delete(key);
          state.touched.add(key);
          this._validateGroup(form, state, key);
        }, state.config.debounce)
      );
    }
  }

  _onLeave(form, state, event) {
    const field = this._fieldFrom(form, event);
    if (!field || !state.config.validateOnBlur) return;

    const key = this._keyFor(field);
    if (!state.dirty.has(key) && !state.errors.has(key)) return;

    clearTimeout(state.timers.get(key));
    state.touched.add(key);
    this._validateGroup(form, state, key);
  }

  _onSubmit(form, state, event) {
    /* A formnovalidate button skips validation, as it does without FormEnhancer */
    if (event.submitter?.formNoValidate) {
      return;
    }

    const errors = this._validateAll(form, state);

    if (errors.length === 0) {
      this._dispatch(form, 'form-enhancer:submit-valid', { element: form });
      return;
    }

    event.preventDefault();
    const firstInvalid = Array.prototype.find.call(
      form.elements,
      field => isValidated(field) && field.validity?.valid === false
    );
    firstInvalid?.focus();

    this._dispatch(form, 'form-enhancer:submit-blocked', { element: form, errors });
  }

  /**
   * Check every field and show the results
   *
   * @returns {Array<[string, string]>} The failing fields' names and messages
   */
  _validateAll(form, state) {
    const errors = [];
    for (const [key, fields] of this._groups(form)) {
      clearTimeout(state.timers.get(key));
      state.touched.add(key);
      const message = this._validateFields(form, state, key, fields);
      if (message) errors.push([key, message]);
    }
    return errors;
  }

  _validateGroup(form, state, key) {
    return this._validateFields(form, state, key, this._groups(form).get(key) ?? []);
  }

  /**
   * Check one group of fields and update their error message, ARIA attributes and classes
   *
   * @returns {string} The error message, or an empty string when the fields are valid
   */
  _validateFields(form, state, key, fields) {
    const { errorClass, validClass } = state.config;
    const invalid = new Set();
    let message = '';

    for (const field of fields) {
      if (field.validity?.valid === false) {
        invalid.add(field);
        message ||= this._messageFor(field);
      }
    }

    const container =
      message || state.errors.has(key) ? this._errorElement(form, state, key, fields) : null;

    for (const field of fields) {
      const fails = invalid.has(field);
      if (fails) {
        field.setAttribute('aria-invalid', 'true');
      } else {
        field.removeAttribute('aria-invalid');
      }
      tokens(errorClass).forEach(name => field.classList.toggle(name, fails));
      tokens(validClass).forEach(name => field.classList.toggle(name, !message));
      if (container) this._describe(field, container, fails);
    }

    if (container) {
      container.textContent = message;
      container.hidden = !message;
    }

    if (message) {
      state.errors.set(key, message);
    } else {
      state.errors.delete(key);
    }
    return message;
  }

  /**
   * The message for a field's first failing constraint, preferring the field's own wording
   */
  _messageFor(field) {
    const failed = CONSTRAINTS.find(constraint => field.validity[constraint]);
    return (
      (failed && field.getAttribute(`data-form-enhancer-message-${kebab(failed)}`)) ||
      field.getAttribute('data-form-enhancer-message') ||
      field.validationMessage ||
      'Please check this field'
    );
  }

  /**
   * The element that shows a group's error, created after the field when the form has none
   */
  _errorElement(form, state, key, fields) {
    let element = form.querySelector(`[data-error-for="${CSS.escape(key)}"]`);

    if (!element) {
      element = document.createElement('p');
      element.classList.add(...tokens(state.config.messageClass));
      element.dataset.errorFor = key;
      element.hidden = true;

      const last = fields.at(-1);
      const fieldset = fields.length > 1 ? last.closest('fieldset') : null;
      if (fieldset && form.contains(fieldset)) {
        fieldset.append(element);
      } else {
        (last.closest('label') ?? last).after(element);
      }
      state.created.add(element);
    }

    if (!element.id) {
      element.id = this._generateId('form-enhancer-error');
    }
    return element;
  }

  _describe(field, container, linked) {
    const ids = new Set(tokens(field.getAttribute('aria-describedby')));
    if (linked) {
      ids.add(container.id);
    } else {
      ids.delete(container.id);
    }

    if (ids.size > 0) {
      field.setAttribute('aria-describedby', [...ids].join(' '));
    } else {
      field.removeAttribute('aria-describedby');
    }
  }

  /**
   * Hide every error and forget which fields the user has changed
   */
  _clearAll(form, state) {
    const { errorClass, validClass } = state.config;
    const groups = this._groups(form);

    for (const key of new Set([...state.errors.keys(), ...state.touched])) {
      const container = form.querySelector(`[data-error-for="${CSS.escape(key)}"]`);
      for (const field of groups.get(key) ?? []) {
        field.removeAttribute('aria-invalid');
        field.classList.remove(...tokens(errorClass), ...tokens(validClass));
        if (container) this._describe(field, container, false);
      }
      if (container) {
        container.textContent = '';
        container.hidden = true;
      }
    }

    state.timers.forEach(timer => clearTimeout(timer));
    state.timers.clear();
    state.errors.clear();
    state.touched.clear();
    state.dirty.clear();
  }

  /**
   * Check every field in a mounted form and show the results
   *
   * @param {HTMLFormElement} element
   * @returns {boolean} Whether every field is valid
   */
  validate(element) {
    const state = this.getState(element);
    return state ? this._validateAll(element, state).length === 0 : false;
  }

  /**
   * The errors currently shown in a mounted form
   *
   * @param {HTMLFormElement} element
   * @returns {Array<[string, string]>} Field names and messages
   */
  getErrors(element) {
    const state = this.getState(element);
    return state ? Array.from(state.errors.entries()) : [];
  }

  static enhanceAll(selector = '[data-form-enhancer]', options) {
    const instance = new FormEnhancer(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default FormEnhancer;
