import { afterEach, describe, expect, it } from 'vitest';
import PSelect from '../../../src/components/PSelect.js';

const renderForm = markup => {
  const form = document.createElement('form');
  form.innerHTML = markup;
  document.body.append(form);
  return { form, select: form.querySelector('p-select') };
};

const COUNTRIES = `
  <p-select name="country">
    <option value="us">United States</option>
    <option value="uk" selected>United Kingdom</option>
  </p-select>
`;

const PRIORITY = `
  <p-select name="priority" required>
    <option value="">-- Select priority --</option>
    <option value="high">High</option>
  </p-select>
`;

describe('p-select', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('is a form-associated custom element', () => {
    const { form, select } = renderForm(COUNTRIES);

    expect(select).toBeInstanceOf(PSelect);
    expect(select.form).toBe(form);
  });

  it('submits the option that is selected in markup', () => {
    const { form } = renderForm(COUNTRIES);

    expect(new FormData(form).get('country')).toBe('uk');
  });

  it('submits a value set through the value property', () => {
    const { form, select } = renderForm(COUNTRIES);

    select.value = 'us';

    expect(new FormData(form).get('country')).toBe('us');
  });

  it('submits a value set through the value attribute', () => {
    const { form, select } = renderForm(COUNTRIES);

    select.setAttribute('value', 'us');

    expect(new FormData(form).get('country')).toBe('us');
  });

  it('keeps an empty placeholder option empty', () => {
    const { form, select } = renderForm(PRIORITY);

    select.select('');

    expect(new FormData(form).get('priority')).toBe('');
  });

  it('blocks form submission when required and nothing is chosen', () => {
    const { form, select } = renderForm(PRIORITY);

    expect(form.checkValidity()).toBe(false);
    expect(select.validity.valueMissing).toBe(true);
  });

  it('becomes valid once a required value is chosen', () => {
    const { form, select } = renderForm(PRIORITY);

    select.select('high');

    expect(form.checkValidity()).toBe(true);
  });

  it('restores the selection from markup when the form is reset', () => {
    const { form, select } = renderForm(COUNTRIES);
    select.select('us');

    form.reset();

    expect(select.value).toBe('uk');
    expect(new FormData(form).get('country')).toBe('uk');
  });

  it('disables its text input inside a disabled fieldset', () => {
    const { select } = renderForm(`<fieldset disabled>${COUNTRIES}</fieldset>`);

    expect(select.shadowRoot.querySelector('.input').disabled).toBe(true);
  });
});
