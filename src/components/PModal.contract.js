const STATES = ['closed', 'opening', 'open', 'closing'];
const MODAL_DETAIL = '{ modal: HTMLElement }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PModal',
  kind: 'element',
  tag: 'p-modal',
  module: 'components/PModal',
  summary: 'Modal dialog built on the native <dialog> element',
  description: `Opening calls \`showModal()\`, so the dialog renders in the top layer, the rest of the page is inert and focus stays inside it. The dialog is named after its title slot. Escape and the backdrop close it unless its settings say otherwise, focus returns to the element that had it before opening once no other modal is still open, and page scroll stays locked while any modal is open.

Open it with the \`open\` attribute, the \`open()\` method, or a \`[data-modal]\` trigger handled by the Modal component.`,
  states: STATES,
  attributes: [
    {
      name: 'open',
      type: 'flag',
      description: 'Present while the modal is open; add or remove it to open or close the modal',
    },
    {
      name: 'data-modal-size',
      type: 'enum',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'fullscreen'],
      default: 'md',
      description: 'The panel width',
    },
    {
      name: 'data-modal-closable',
      type: 'boolean',
      default: true,
      description:
        'false hides the close button and ignores Escape and the backdrop; data-modal-close buttons still close the modal',
    },
    {
      name: 'data-modal-backdrop-close',
      type: 'boolean',
      default: true,
      description: 'Close when the backdrop is clicked',
    },
    {
      name: 'data-modal-keyboard',
      type: 'boolean',
      default: true,
      description: 'Close with Escape',
    },
    {
      name: 'data-modal-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      description: "The modal's state",
    },
  ],
  methods: [
    {
      name: 'open',
      signature: '(options?: { returnFocus?: HTMLElement | null }) => void',
      description:
        'Open the modal; returnFocus is the element to focus when it closes, or null to leave focus alone',
    },
    {
      name: 'close',
      signature: '() => void',
      description: 'Close the modal once its closing animation has finished',
    },
    {
      name: 'toggle',
      signature: '(force?: boolean) => void',
      description: 'Open or close the modal',
    },
  ],
  events: [
    {
      name: 'p-modal:open',
      detail: MODAL_DETAIL,
      description: 'The modal opened; bubbles out of shadow roots',
    },
    {
      name: 'p-modal:close',
      detail: MODAL_DETAIL,
      description: 'The modal has closed; bubbles out of shadow roots',
    },
  ],
  slots: [
    { name: 'title', description: 'The title, which also names the dialog' },
    { name: '', description: 'The content' },
    {
      name: 'actions',
      description: 'Footer buttons; any element with data-modal-close closes the modal',
    },
  ],
  parts: [
    {
      name: 'panel',
      description: 'The <dialog>; style the page behind with ::part(panel)::backdrop',
    },
    { name: 'header', description: 'The title row' },
    { name: 'title', description: 'The title container' },
    { name: 'close', description: 'The close button' },
    { name: 'content', description: 'The scrolling content area' },
    { name: 'footer', description: 'The actions row' },
  ],
  cssProperties: [
    {
      name: '--modal-animation-duration',
      default: '0.2s',
      description: 'Length of the opening and closing animations',
    },
    { name: '--modal-animation-easing', description: 'Easing of the animations' },
    {
      name: '--modal-backdrop-bg',
      default: 'color-mix(in srgb, var(--color-surface) 95%, transparent)',
      description:
        'Colour of the page behind the modal; the page surface at 95%, so white in light mode and the dark surface in dark mode',
    },
    {
      name: '--modal-panel-bg',
      default: 'var(--surface-dialog-color-bg)',
      description: 'Panel background',
    },
    {
      name: '--modal-panel-color',
      default: 'var(--surface-dialog-color-text)',
      description: 'Panel text colour',
    },
    { name: '--modal-radius', description: 'Panel corner radius' },
    {
      name: '--modal-shadow',
      default: 'var(--surface-dialog-shadow)',
      description: 'Panel shadow',
    },
    { name: '--modal-padding-x', description: 'Horizontal padding' },
    { name: '--modal-padding-y', description: 'Vertical padding' },
    {
      name: '--modal-max-height',
      description: 'Tallest the panel gets before its content scrolls',
    },
    { name: '--modal-size-sm', description: 'Width of the sm size; xs, md, lg and xl match' },
  ],
  accessibility:
    'The dialog is modal, named by its title, and returns focus when it closes. Give every modal a title.',
  examples: [
    {
      id: 'confirm',
      title: 'Confirmation',
      markup: `<button type="button" data-modal data-modal-target="#release-table">Release table</button>

<p-modal id="release-table">
  <h2 slot="title">Release this table?</h2>
  <p>The 7pm booking for four will be offered to the waitlist.</p>
  <div slot="actions">
    <button type="button" data-modal-close>Keep it</button>
    <button type="button" data-modal-close>Release table</button>
  </div>
</p-modal>`,
      controls: [
        { attribute: 'data-modal-size' },
        { attribute: 'data-modal-closable' },
        { attribute: 'data-modal-backdrop-close' },
        { attribute: 'data-modal-keyboard' },
      ],
    },
    {
      id: 'no-actions',
      title: 'Without actions',
      description:
        'With nothing slotted into `actions` the footer is left out, so a modal that only tells the reader something ends at its content. The close button in the header still closes it, as do Escape and a click on the backdrop.',
      markup: `<button type="button" data-modal data-modal-target="#booking-confirmed">Show confirmation</button>

<p-modal id="booking-confirmed">
  <h2 slot="title">Booking confirmed</h2>
  <p>Table 12 is held until 7.15pm. The details are on their way by email.</p>
</p-modal>`,
      controls: [{ attribute: 'data-modal-size' }],
    },
    {
      id: 'no-title',
      title: 'Without a title',
      description:
        'A modal with nothing in `title` shows no heading at all. It is still named "Dialog" for assistive technology, which is all anyone using a screen reader will hear when it opens, so give a modal a title wherever you can.',
      markup: `<button type="button" data-modal data-modal-target="#held-note">Open the note</button>

<p-modal id="held-note">
  <p>Table 12 is held until 7.15pm.</p>
  <div slot="actions">
    <button type="button" class="btn btn--primary" data-modal-close>Close</button>
  </div>
</p-modal>`,
      controls: [{ attribute: 'data-modal-size' }],
    },
  ],
};
