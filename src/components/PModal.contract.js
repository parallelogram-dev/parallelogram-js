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
      name: 'secondary',
      description:
        'A secondary action, such as deleting what the modal is about, held against the leading end of the footer and away from the buttons in actions; the footer shows while either slot has something in it',
    },
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
    {
      name: '--modal-close-inset',
      default: 'var(--modal-padding-y)',
      description:
        "Distance from the top of the panel to the close button, and the least height of the header, so the title sits on the button's line",
    },
    {
      name: '--modal-content-gap',
      default: 'var(--modal-space-xl)',
      description:
        "Space between the elements the page puts in the modal, which give up the margins the browser would give them so the content meets the panel's padding",
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
      title: 'No action',
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
      title: 'No title',
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
    {
      id: 'actions',
      title: 'Actions',
      description:
        'A button slotted into `secondary` is held against the leading end of the footer while the rest stay together at the other, so the markup says where a button belongs rather than how to push it. Nothing needs styling, and with nothing in `secondary` the buttons sit together as they always have.',
      markup: `<button type="button" data-modal data-modal-target="#edit-booking">Edit booking</button>

<p-modal id="edit-booking">
  <h2 slot="title">Edit booking</h2>
  <p>Table 12 on Friday at 7pm, for four.</p>
  <button type="button" class="btn btn--danger" slot="secondary" data-modal-close>Cancel booking</button>
  <button type="button" class="btn" slot="actions" data-modal-close>Close</button>
  <button type="button" class="btn btn--primary" slot="actions" data-modal-close>Save changes</button>
</p-modal>`,
      controls: [{ attribute: 'data-modal-size' }],
    },
    {
      id: 'terms',
      title: 'Long content',
      description:
        "Content taller than the panel scrolls inside it, while the close button stays where it is and the footer stays with it. The body is the page's own markup, spaced by the modal rather than by the margins the browser would give it.",
      markup: `<button type="button" data-modal data-modal-target="#booking-terms">Read the booking terms</button>

<p-modal id="booking-terms" data-modal-size="lg">
  <h2 slot="title">Booking terms</h2>

  <h3>Holding your table</h3>
  <p>A table is held for fifteen minutes past the time you booked. After that we may offer it to the waitlist, and we will text the number on the booking before we do.</p>

  <h3>Changing or cancelling</h3>
  <p>Change or cancel from the link in your confirmation email, at any time up to two hours before you are due. Inside two hours, please call the restaurant instead.</p>
  <ul>
    <li>Parties of six or more: one working day's notice</li>
    <li>Set menus and private rooms: three working days' notice</li>
    <li>New Year's Eve: no changes after 20 December</li>
  </ul>

  <h3>Deposits</h3>
  <p>A deposit is taken for parties of eight or more and for every booking on a public holiday. It comes off the bill on the night. A deposit is returned in full when a booking is cancelled with the notice above, and kept when it is not.</p>

  <h3>Groups and events</h3>
  <p>Parties of twelve or more eat from a set menu, chosen a week ahead. The private room seats twenty-four and has a minimum spend on Fridays and Saturdays, which we will quote when you enquire.</p>
  <p>We can hold a room for seven days without a deposit while you decide.</p>

  <h3>Children</h3>
  <p>Children are welcome until 8pm, and high chairs are free but limited, so please ask for one when you book. Half portions are available from most of the menu.</p>

  <h3>Gift vouchers</h3>
  <p>Vouchers are valid for two years from the day they are bought and can be used against any bill, including drinks. They cannot be exchanged for cash, and any balance stays on the voucher.</p>

  <h3>Your details</h3>
  <p>We keep your name, phone number and email so we can hold the booking and tell you if anything changes. We do not pass them to anyone else, and you can ask us to delete them at any time.</p>
  <p>Where you tell us about allergies or access needs, we keep those with the booking and share them with the kitchen and the floor team.</p>

  <small>Last updated 3 September 2026. These terms apply to bookings made through this site.</small>

  <div slot="actions">
    <button type="button" data-modal-close>Decline</button>
    <button type="button" class="btn btn--primary" data-modal-close>Accept</button>
  </div>
</p-modal>`,
      controls: [{ attribute: 'data-modal-size' }],
    },
  ],
};
