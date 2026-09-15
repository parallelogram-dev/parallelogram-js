const MODAL_DETAIL = '{ trigger: HTMLElement; modal: HTMLElement }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Modal',
  kind: 'enhancement',
  selector: 'data-modal',
  match: '[data-modal][data-modal-target]',
  module: 'components/Modal',
  summary: 'Buttons that open a <p-modal>',
  description: `Settings belong on the \`<p-modal>\`; a trigger only overrides the ones it sets itself, while it has the modal open, and the modal's own values come back when it closes. Opening a modal closes the others unless the trigger allows several, and focus returns to the trigger when the modal closes. Several triggers can open the same modal; every one gets \`aria-haspopup\`, \`aria-controls\` and an \`aria-expanded\` that follows the modal.

Load the \`<p-modal>\` element as well; see its page for the dialog itself.`,
  attributes: [
    { name: 'data-modal', type: 'flag', on: 'the trigger', description: 'Marks a trigger' },
    {
      name: 'data-modal-target',
      type: 'selector',
      required: true,
      description: 'The <p-modal> to open',
    },
    {
      name: 'data-modal-size',
      type: 'enum',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'fullscreen'],
      default: 'md',
      option: 'size',
      description: "Overrides the modal's size",
    },
    {
      name: 'data-modal-closable',
      type: 'boolean',
      default: true,
      option: 'closable',
      description: 'Overrides whether the modal can be closed',
    },
    {
      name: 'data-modal-backdrop-close',
      type: 'boolean',
      default: true,
      option: 'backdropClose',
      description: 'Overrides whether a backdrop click closes the modal',
    },
    {
      name: 'data-modal-keyboard',
      type: 'boolean',
      default: true,
      option: 'keyboard',
      description: 'Overrides whether Escape closes the modal',
    },
    {
      name: 'data-modal-focus',
      type: 'boolean',
      default: true,
      option: 'focus',
      description: 'Return focus to the trigger when the modal closes',
    },
    {
      name: 'data-modal-multiple',
      type: 'boolean',
      default: false,
      option: 'multiple',
      description: 'Leave other open modals open',
    },
    {
      name: 'data-modal-close',
      type: 'flag',
      on: 'a button inside the modal',
      description: 'Closes the modal when clicked',
    },
  ],
  events: [
    {
      name: 'modal:opened',
      channel: 'both',
      detail: MODAL_DETAIL,
      description:
        'Dispatched once on the trigger that opened the modal when it opens. When a script opens the modal, dispatched on its first mounted trigger',
    },
    {
      name: 'modal:closed',
      channel: 'both',
      detail: MODAL_DETAIL,
      description:
        'Dispatched once when the modal has closed, on the same trigger as its `modal:opened`',
    },
  ],
  examples: [
    {
      id: 'trigger',
      title: 'Opening a modal',
      markup: `<button type="button" data-modal data-modal-target="#cancel-booking">Cancel booking</button>

<p-modal id="cancel-booking" data-modal-size="sm">
  <h2 slot="title">Cancel this booking?</h2>
  <p>Your table for four on 2 October will be released.</p>
  <div slot="actions">
    <button type="button" data-modal-close>Keep booking</button>
    <button type="button" data-modal-close>Cancel booking</button>
  </div>
</p-modal>`,
      controls: [
        { attribute: 'data-modal-size' },
        { attribute: 'data-modal-closable' },
        { attribute: 'data-modal-focus' },
      ],
    },
  ],
};
