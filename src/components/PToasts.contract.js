const TOAST_DETAIL = '{ id: number; type: string; message: string }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PToasts',
  kind: 'element',
  tag: 'p-toasts',
  module: 'components/PToasts',
  summary: 'A stack of toast notifications',
  description: `Toasts are announced through two live regions that exist from the moment the element is created: info and success messages politely, warnings and errors straight away. Toasts close after a timeout, except errors, which stay until dismissed, and every timer waits while the pointer or keyboard focus is on the stack.

Where popovers are supported the element shows itself as a manual popover and moves to the top of the top layer with each new toast. While a \`<p-modal>\` or modal \`<dialog>\` is open, the element moves inside it to show a toast, because everything outside an open modal is inert, and returns to its place when the modal closes, or with the next toast when the modal was removed without closing.`,
  attributes: [
    {
      name: 'placement',
      type: 'enum',
      options: [
        'top-right',
        'top-left',
        'top-center',
        'bottom-right',
        'bottom-left',
        'bottom-center',
      ],
      default: 'top-right',
      description: 'Where the stack sits on the screen',
    },
  ],
  methods: [
    {
      name: 'toast',
      signature:
        "(options: { message: string; type?: 'info' | 'success' | 'warning' | 'error' | 'warn' | 'danger'; title?: string; timeout?: number; dismissible?: boolean; allowHTML?: boolean }) => () => void",
      description:
        'Show a toast and return a function that closes it; timeout is in milliseconds, or 0 to keep it, and allowHTML treats the message as trusted HTML, inserted through the parallelogram Trusted Types policy',
    },
  ],
  events: [
    {
      name: 'p-toasts:show',
      detail: TOAST_DETAIL,
      description: 'A toast was shown; bubbles out of shadow roots',
    },
    {
      name: 'p-toasts:close',
      detail: TOAST_DETAIL,
      description: 'A toast closed; bubbles out of shadow roots',
    },
    {
      name: 'toast:show',
      detail: TOAST_DETAIL,
      description: 'The old name for p-toasts:show',
      deprecated: 'Listen for p-toasts:show. Removed in 0.6.0.',
    },
    {
      name: 'toast:close',
      detail: TOAST_DETAIL,
      description: 'The old name for p-toasts:close',
      deprecated: 'Listen for p-toasts:close. Removed in 0.6.0.',
    },
  ],
  parts: [
    { name: 'stack', description: 'The element holding the toasts' },
    { name: 'toast', description: 'Each toast' },
    { name: 'title', description: "A toast's title" },
    { name: 'close', description: "A toast's dismiss button" },
  ],
  cssProperties: [
    { name: '--toast-bg-info', description: 'Background of info toasts' },
    { name: '--toast-bg-success', description: 'Background of success toasts' },
    { name: '--toast-bg-warning', description: 'Background of warning toasts' },
    { name: '--toast-bg-error', description: 'Background of error toasts' },
    { name: '--toast-text-color', default: '#fff', description: 'Text colour' },
    { name: '--toast-border-radius', description: 'Corner radius' },
    { name: '--toast-shadow', description: 'Shadow' },
    { name: '--toast-padding', description: 'Space around the stack' },
    { name: '--toast-gap', description: 'Space between toasts' },
    { name: '--toast-item-padding', description: 'Padding inside each toast' },
    { name: '--toast-min-width', default: '300px', description: 'Narrowest a toast gets' },
    { name: '--toast-max-width', default: '500px', description: 'Widest a toast gets' },
    { name: '--toast-font', description: 'Font shorthand' },
    { name: '--toast-animation-duration', description: 'Length of the enter and leave animations' },
    { name: '--toast-z-index', description: "Stacking order where popovers aren't supported" },
  ],
  examples: [
    {
      id: 'stack',
      title: 'Toast stack',
      description: 'The buttons use the Toast component to show toasts in this stack.',
      markup: `<p-toasts placement="bottom-right"></p-toasts>

<div class="button-row">
  <button type="button" data-toast-trigger="success" data-toast-message="Table booked for 7pm">Success</button>
  <button type="button" data-toast-trigger="warning" data-toast-message="Only two tables left tonight">Warning</button>
  <button type="button" data-toast-trigger="error" data-toast-message="Payment was declined" data-toast-title="Booking not saved">Error</button>
</div>`,
      controls: [{ attribute: 'placement' }],
    },
  ],
};
