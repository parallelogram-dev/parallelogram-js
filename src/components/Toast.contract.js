/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Toast',
  kind: 'enhancement',
  selector: 'data-toast',
  match: '[data-toast-trigger][data-toast-message]',
  module: 'components/Toast',
  summary: 'Show a toast when a trigger is clicked',
  description: `A small bridge from markup to AlertManager. Clicking a trigger shows its message through the page's \`<p-toasts>\`, which AlertManager creates when the page has none. The attributes are read on each click, so a page can change the message before it is shown.`,
  attributes: [
    {
      name: 'data-toast-trigger',
      type: 'enum',
      options: ['info', 'success', 'warning', 'error', 'warn', 'danger'],
      default: 'info',
      option: 'defaultType',
      description: 'The toast type; warn and danger are aliases',
    },
    { name: 'data-toast-message', type: 'string', required: true, description: 'The message' },
    { name: 'data-toast-title', type: 'string', description: 'A title above the message' },
    {
      name: 'data-toast-duration',
      type: 'number',
      description:
        'Milliseconds before the toast closes, or 0 to keep it; 4000 by default, and error toasts stay until dismissed',
    },
    {
      name: 'data-toast-dismissible',
      type: 'boolean',
      default: true,
      description: 'Show a dismiss button',
    },
  ],
  events: [
    {
      name: 'toast:shown',
      channel: 'both',
      detail:
        '{ message: string; type: string; title: string; duration: number; dismissible: boolean; timestamp: number }',
      description: 'Dispatched on the trigger when its toast is shown',
    },
    {
      name: 'toast:mount',
      channel: 'bus',
      detail: '{ element: HTMLElement; message: string | null; type: string; timestamp: number }',
      description: 'A trigger was set up',
    },
  ],
  examples: [
    {
      id: 'types',
      title: 'Toast types',
      markup: `<div class="button-row">
  <button type="button" data-toast-trigger="success" data-toast-message="Table booked for 7pm" data-toast-title="Booked">Book</button>
  <button type="button" data-toast-trigger="info" data-toast-message="We open at 7am tomorrow">Opening hours</button>
  <button type="button" data-toast-trigger="error" data-toast-message="That time is no longer available">Unavailable</button>
</div>`,
      controls: [
        { attribute: 'data-toast-trigger' },
        { attribute: 'data-toast-duration' },
        { attribute: 'data-toast-dismissible' },
      ],
    },
  ],
};
