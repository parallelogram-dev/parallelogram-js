const STATES = ['closed', 'opening', 'open', 'closing'];
const TOGGLE_DETAIL = '{ target: HTMLElement; trigger: HTMLElement; timestamp: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Toggle',
  kind: 'enhancement',
  selector: 'data-toggle',
  module: 'components/Toggle',
  stylesheet: 'styles/toggle.css',
  summary: 'Show and hide a target element from one or more trigger buttons',
  description: `This is the disclosure pattern: triggers get \`aria-expanded\` and an \`aria-controls\` link to the target, which is given an id when it has none. The target has the \`open\` class while open and the \`hidden\` attribute while closed. The shipped stylesheet keeps closed targets hidden whatever display page styles give them, leaves open targets their own display, and animates the change. Toggle waits for those animations instead of a fixed delay, so the duration lives only in CSS.

Toggles are independent unless they share a group, in which case opening one closes the others. A capture toggle, such as a dropdown, also closes when the user clicks or moves focus outside it. Escape closes the open toggle that holds focus and returns focus to its trigger, and following a page link inside an open target closes it. Unmounting a trigger puts back the attributes Toggle gave it, and unmounting the last trigger for a target does the same for the target.

For new dropdowns consider \`<button popovertarget>\` with \`popover\`, and for accordions Accordion, which animates \`<details name="…">\`; both work without JavaScript.`,
  states: STATES,
  attributes: [
    { name: 'data-toggle', type: 'flag', description: 'Marks a button as a trigger' },
    {
      name: 'data-toggle-target',
      type: 'selector',
      required: true,
      description: 'The element the trigger shows and hides',
    },
    {
      name: 'data-toggle-group',
      type: 'string',
      description: 'Toggles that share a group name close each other',
    },
    {
      name: 'data-toggle-capture',
      type: 'boolean',
      default: false,
      option: 'capture',
      description: 'Close on a click or focus outside the trigger and target',
    },
    {
      name: 'data-toggle-close-navigation',
      type: 'boolean',
      default: true,
      option: 'closeOnNavigation',
      description: 'Close when a page link inside the target is followed',
    },
    {
      name: 'data-toggle-close-escape',
      type: 'boolean',
      default: true,
      option: 'closeOnEscape',
      description:
        'Close with Escape while focus is in the trigger or target, or rests on the page',
    },
    {
      name: 'data-toggle-manual',
      type: 'boolean',
      default: false,
      option: 'manual',
      description: 'Close only from a trigger or the group; also allowed on the target',
    },
    {
      name: 'data-toggle-animate',
      type: 'boolean',
      default: true,
      option: 'animateToggle',
      description: "Wait for the stylesheet's animations before changing state",
    },
    {
      name: 'data-toggle-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      on: 'target',
      description: "The target's state",
    },
  ],
  events: [
    {
      name: 'toggle:show',
      channel: 'both',
      detail: TOGGLE_DETAIL,
      description: 'Dispatched on the trigger when its target opens',
    },
    {
      name: 'toggle:hide',
      channel: 'both',
      detail: TOGGLE_DETAIL,
      description: 'Dispatched on the trigger when its target closes',
    },
    {
      name: 'toggle:mount',
      channel: 'bus',
      detail: '{ element: HTMLElement; target: HTMLElement; isOpen: boolean; timestamp: number }',
      description: 'A trigger was set up',
    },
  ],
  cssProperties: [
    {
      name: '--toggle-transition-duration',
      default: '0.75s',
      description: 'Length of the open and close animations',
    },
    { name: '--toggle-transition-easing', description: 'Easing of the open and close animations' },
  ],
  accessibility:
    'Triggers must be buttons. Toggle sets aria-expanded and aria-controls, closes on Escape and returns focus to the trigger that opened the target.',
  examples: [
    {
      id: 'menu',
      title: 'Dropdown menu',
      description: 'A capture toggle closes when you click or tab outside it.',
      markup: `<button type="button" class="button" data-toggle data-toggle-target="#account-menu" data-toggle-capture>
  Account
</button>
<nav id="account-menu" class="menu">
  <a href="#profile">Profile</a>
  <a href="#bookings">Bookings</a>
  <a href="#sign-out">Sign out</a>
</nav>`,
      controls: [
        { attribute: 'data-toggle-capture' },
        { attribute: 'data-toggle-close-escape' },
        { attribute: 'data-toggle-animate' },
      ],
    },
    {
      id: 'accordion',
      title: 'Accordion',
      description: 'Toggles in the same group close each other.',
      markup: `<div class="accordion">
  <button type="button" data-toggle data-toggle-target="#refunds" data-toggle-group="faq">Can I get a refund?</button>
  <div id="refunds"><p>Yes, up to 48 hours before your booking.</p></div>
  <button type="button" data-toggle data-toggle-target="#groups" data-toggle-group="faq">Do you take group bookings?</button>
  <div id="groups"><p>Tables of up to twelve can be booked online.</p></div>
</div>`,
      controls: [{ attribute: 'data-toggle-group' }],
    },
  ],
};
