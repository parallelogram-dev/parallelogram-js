import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FormEnhancer from '../../../src/components/FormEnhancer.js';

const build = html => {
  const holder = document.createElement('div');
  holder.innerHTML = html.trim();
  document.body.append(holder);
  return holder.firstElementChild;
};

const type = (field, value) => {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
};

const leave = field => field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

const errorFor = field => {
  const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const described = ids.map(id => document.getElementById(id)).find(Boolean);
  return described && !described.hidden ? described.textContent : null;
};

describe('FormEnhancer', () => {
  let enhancer;
  let submissions;
  const recordSubmit = event => {
    submissions.push(event.defaultPrevented);
    event.preventDefault();
  };

  beforeEach(() => {
    enhancer = new FormEnhancer();
    submissions = [];
    window.addEventListener('submit', recordSubmit);
  });

  afterEach(() => {
    enhancer.destroy();
    window.removeEventListener('submit', recordSubmit);
    document.body.replaceChildren();
  });

  it('blocks submission on native constraints and focuses the first invalid field', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="name" required>
        <input name="email" type="email" required>
        <button>Send</button>
      </form>`);
    enhancer.mount(form);
    type(form.elements.name, 'Ada');
    type(form.elements.email, 'not-an-address');

    form.requestSubmit();

    expect([submissions, document.activeElement, form.elements.email.ariaInvalid]).toEqual([
      [true],
      form.elements.email,
      'true',
    ]);
  });

  it('lets a formnovalidate button submit without checking the fields', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="title" required>
        <button>Publish</button>
        <button formnovalidate>Save draft</button>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit(form.querySelector('[formnovalidate]'));

    expect([submissions, errorFor(form.elements.title)]).toEqual([[false], null]);
  });

  it('links the error message to its field', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
        <p data-error-for="email"></p>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    const field = form.elements.email;
    expect([errorFor(field), field.getAttribute('aria-describedby')]).toEqual([
      field.validationMessage,
      form.querySelector('[data-error-for]').id,
    ]);
  });

  it('creates an error message element when the form has none', () => {
    const form = build(`
      <form data-form-enhancer>
        <label>Email <input name="email" type="email" required></label>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    expect(errorFor(form.elements.email)).toBe(form.elements.email.validationMessage);
  });

  it('keeps an error visible while the field is corrected and clears it once valid', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
      </form>`);
    enhancer.mount(form);
    const field = form.elements.email;
    form.requestSubmit();

    field.dispatchEvent(new FocusEvent('focus'));
    const whileFocused = errorFor(field);
    type(field, 'ada@example.com');

    expect([Boolean(whileFocused), errorFor(field), field.hasAttribute('aria-invalid')]).toEqual([
      true,
      null,
      false,
    ]);
  });

  it('uses a message written for the constraint that failed', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required
               data-form-enhancer-message-value-missing="Tell us where to send the tickets">
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    expect(errorFor(form.elements.email)).toBe('Tell us where to send the tickets');
  });

  it('lets an empty optional field through', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="website" type="url">
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    expect(submissions).toEqual([false]);
  });

  it('keeps errors inside the form they belong to', () => {
    const first = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
        <p data-error-for="email"></p>
      </form>`);
    const second = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
        <p data-error-for="email"></p>
      </form>`);
    enhancer.mount(first);
    enhancer.mount(second);

    second.requestSubmit();

    expect([
      first.querySelector('[data-error-for]').textContent,
      Boolean(errorFor(second.elements.email)),
    ]).toEqual(['', true]);
  });

  it('shows an error once the user leaves a field they changed', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
        <input name="phone" type="tel" required>
      </form>`);
    enhancer.mount(form);

    type(form.elements.email, 'not-an-address');
    leave(form.elements.email);
    leave(form.elements.phone);

    expect([Boolean(errorFor(form.elements.email)), errorFor(form.elements.phone)]).toEqual([
      true,
      null,
    ]);
  });

  it('marks every option in a required radio group and reports it once', () => {
    const form = build(`
      <form data-form-enhancer>
        <fieldset>
          <legend>Size</legend>
          <label><input type="radio" name="size" value="s" required> Small</label>
          <label><input type="radio" name="size" value="m"> Medium</label>
        </fieldset>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    const radios = [...form.querySelectorAll('input')];
    expect([
      radios.map(radio => radio.ariaInvalid),
      form.querySelectorAll('[data-error-for]').length,
      document.activeElement,
    ]).toEqual([['true', 'true'], 1, radios[0]]);
  });

  it('clears errors when the form is reset', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
      </form>`);
    enhancer.mount(form);
    form.requestSubmit();

    form.reset();

    expect([
      errorFor(form.elements.email),
      form.elements.email.hasAttribute('aria-invalid'),
    ]).toEqual([null, false]);
  });

  it('reports the errors when it blocks a submission', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required
               data-form-enhancer-message="Add your email">
      </form>`);
    const blocked = [];
    form.addEventListener('form-enhancer:submit-blocked', event =>
      blocked.push(event.detail.errors)
    );
    enhancer.mount(form);

    form.requestSubmit();

    expect(blocked).toEqual([[['email', 'Add your email']]]);
  });

  it('creates a message element with the default class', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    expect(form.querySelector('[data-error-for="email"]').className).toBe('form-enhancer__error');
  });

  it('puts the classes the form names on a message element it creates', () => {
    const form = build(`
      <form data-form-enhancer data-form-enhancer-message-class="form__errors form__errors--live">
        <input name="email" type="email" required>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    expect([...form.querySelector('[data-error-for="email"]').classList]).toEqual([
      'form__errors',
      'form__errors--live',
    ]);
  });

  it('gives validation back to the browser once unmounted', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
      </form>`);
    enhancer.mount(form);
    const whileMounted = form.noValidate;

    enhancer.unmount(form);
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect([whileMounted, form.noValidate, submissions]).toEqual([true, false, [false]]);
  });

  it('leaves buttons alone when it checks the fields', () => {
    const form = build(`
      <form data-form-enhancer>
        <input name="email" type="email" required>
        <button type="submit">Book</button>
      </form>`);
    enhancer.mount(form);

    form.requestSubmit();

    const button = form.querySelector('button');
    expect([button.className, button.id, enhancer.getErrors(form).map(([name]) => name)]).toEqual([
      '',
      '',
      ['email'],
    ]);
  });
});
