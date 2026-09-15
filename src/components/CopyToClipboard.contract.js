/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'CopyToClipboard',
  kind: 'enhancement',
  selector: 'data-copytoclipboard',
  module: 'components/CopyToClipboard',
  summary: 'Copy text to the clipboard from a button',
  description: `Copies the value or text of the target element, the literal text attribute, or the button's own text. The button stays enabled and focused, the result is announced to screen readers, and \`data-copytoclipboard-state\` says whether it worked. When the button contains a \`[data-copytoclipboard-label]\` element, only its text is swapped for the message.`,
  attributes: [
    { name: 'data-copytoclipboard', type: 'flag', on: 'a button', description: 'Marks the button' },
    {
      name: 'data-copytoclipboard-target',
      type: 'selector',
      description: 'The element whose value or text is copied',
    },
    {
      name: 'data-copytoclipboard-text',
      type: 'string',
      description: 'Text to copy instead of a target',
    },
    {
      name: 'data-copytoclipboard-success-message',
      type: 'string',
      default: 'Copied!',
      option: 'successMessage',
      description: 'Shown and announced after copying',
    },
    {
      name: 'data-copytoclipboard-error-message',
      type: 'string',
      default: 'Copy failed',
      option: 'errorMessage',
      description: 'Shown and announced when copying fails',
    },
    {
      name: 'data-copytoclipboard-success-duration',
      type: 'number',
      default: 2000,
      option: 'successDuration',
      description: 'Milliseconds before the label returns',
    },
    {
      name: 'data-copytoclipboard-success-class',
      type: 'string',
      default: 'copy-success',
      option: 'successClass',
      description: 'Class on the button after copying',
    },
    {
      name: 'data-copytoclipboard-error-class',
      type: 'string',
      default: 'copy-error',
      option: 'errorClass',
      description: 'Class on the button when copying fails',
    },
    {
      name: 'data-copytoclipboard-label',
      type: 'flag',
      on: 'an element inside the button',
      description: 'The text to swap for the message',
    },
    {
      name: 'data-copytoclipboard-state',
      type: 'enum',
      options: ['copied', 'failed'],
      readonly: true,
      description: 'The result of the last copy, until the label returns',
    },
  ],
  events: [
    {
      name: 'copy-to-clipboard:mounted',
      channel: 'bus',
      detail:
        "{ element: HTMLElement; target: { type: 'text'; content: string } | { type: 'element'; element: Element } }",
      description: 'A button was set up',
    },
    {
      name: 'copy-to-clipboard:success',
      channel: 'bus',
      detail: '{ element: HTMLElement; text: string }',
      description: 'The text was copied',
    },
    {
      name: 'copy-to-clipboard:error',
      channel: 'bus',
      detail: '{ element: HTMLElement; error: string }',
      description: 'Copying failed',
    },
  ],
  examples: [
    {
      id: 'reference',
      title: 'Booking reference',
      markup: `<p>Your reference is <code id="booking-reference">HB-2026-0417</code></p>
<button type="button" data-copytoclipboard data-copytoclipboard-target="#booking-reference">
  <span data-copytoclipboard-label>Copy reference</span>
</button>`,
      controls: [
        { attribute: 'data-copytoclipboard-success-message' },
        { attribute: 'data-copytoclipboard-success-duration' },
      ],
    },
  ],
};
