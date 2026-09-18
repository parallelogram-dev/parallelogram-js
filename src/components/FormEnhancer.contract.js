/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'FormEnhancer',
  kind: 'enhancement',
  selector: 'data-form-enhancer',
  match: 'form[data-form-enhancer]',
  module: 'components/FormEnhancer',
  summary: "Accessible error messages for the browser's own form validation",
  description: `Fields declare their rules with native attributes (\`required\`, \`type\`, \`minlength\`, \`maxlength\`, \`min\`, \`max\`, \`step\` and \`pattern\`), so the form still validates when scripts don't run. Once mounted, FormEnhancer sets \`novalidate\` on the form and shows the messages itself: after the user leaves a field they changed, and for every field when they submit. A blocked submission moves focus to the first invalid field.

Each error is written to the form's \`[data-error-for]\` element for that field, or to one created after it. The field gets \`aria-invalid="true"\` and an \`aria-describedby\` link to the message. Messages come from the browser's localised \`validationMessage\` unless the field supplies its own. Custom rules use \`setCustomValidity()\` on the field.`,
  attributes: [
    { name: 'data-form-enhancer', type: 'flag', on: 'the form', description: 'Marks the form' },
    {
      name: 'data-form-enhancer-validate-on-input',
      type: 'boolean',
      default: true,
      option: 'validateOnInput',
      description: 'Re-check a field that shows an error as it is edited',
    },
    {
      name: 'data-form-enhancer-validate-on-blur',
      type: 'boolean',
      default: true,
      option: 'validateOnBlur',
      description: 'Check a changed field when the user leaves it',
    },
    {
      name: 'data-form-enhancer-show-errors-immediately',
      type: 'boolean',
      default: false,
      option: 'showErrorsImmediately',
      description: 'Check fields while the user types',
    },
    {
      name: 'data-form-enhancer-validate-debounce',
      type: 'number',
      default: 300,
      option: 'debounce',
      description: 'Typing pause in milliseconds before checking, when errors show immediately',
    },
    {
      name: 'data-form-enhancer-error-class',
      type: 'string',
      default: 'is-invalid',
      option: 'errorClass',
      description: 'Class added to invalid fields',
    },
    {
      name: 'data-form-enhancer-valid-class',
      type: 'string',
      default: 'is-valid',
      option: 'validClass',
      description: 'Class added to checked fields that are valid',
    },
    {
      name: 'data-form-enhancer-message-class',
      type: 'string',
      default: 'form__error',
      option: 'messageClass',
      description: "Class on a message element the form didn't supply itself",
    },
    {
      name: 'data-form-enhancer-message',
      type: 'string',
      on: 'a field',
      description: 'The message for any failure',
    },
    {
      name: 'data-form-enhancer-message-<constraint>',
      type: 'string',
      on: 'a field',
      description:
        'The message for one constraint: value-missing, type-mismatch, bad-input, pattern-mismatch, too-short, too-long, range-underflow, range-overflow or step-mismatch',
    },
    {
      name: 'data-error-for',
      type: 'string',
      on: "the element that shows a field's error",
      description: "The field's name",
    },
  ],
  events: [
    {
      name: 'form-enhancer:mounted',
      channel: 'both',
      detail: '{ element: HTMLFormElement; fieldCount: number }',
      description: 'The form was set up',
    },
    {
      name: 'form-enhancer:submit-blocked',
      channel: 'both',
      detail: '{ element: HTMLFormElement; errors: Array<[string, string]> }',
      description: 'A submission was stopped; errors pairs each field name with its message',
    },
    {
      name: 'form-enhancer:submit-valid',
      channel: 'both',
      detail: '{ element: HTMLFormElement }',
      description: 'Every field passed and the submission goes ahead',
    },
  ],
  examples: [
    {
      id: 'booking',
      title: 'Booking form',
      description: 'Leave a field empty or submit to see the messages.',
      markup: `<form data-form-enhancer class="form" action="#booked">
  <div class="form__group">
    <label class="form__label" for="guest-name">Name</label>
    <div class="form__control">
      <input id="guest-name" name="name" required minlength="2" autocomplete="name">
    </div>
  </div>
  <div class="form__group">
    <label class="form__label" for="guest-email">Email</label>
    <div class="form__control">
      <input id="guest-email" name="email" type="email" required autocomplete="email"
             data-form-enhancer-message-value-missing="Tell us where to send your confirmation">
      <p data-error-for="email" hidden></p>
    </div>
  </div>
  <div class="form__group">
    <label class="form__label" for="guest-party">Party size</label>
    <div class="form__control">
      <input id="guest-party" name="party" type="number" min="1" max="12" required>
    </div>
  </div>
  <div class="form__actions">
    <button type="submit">Book</button>
  </div>
</form>`,
      controls: [
        { attribute: 'data-form-enhancer-validate-on-blur' },
        { attribute: 'data-form-enhancer-show-errors-immediately' },
      ],
    },
  ],
};
