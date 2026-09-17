const STATES = ['closed', 'opening', 'open', 'closing'];
const ELEMENT_DETAIL = '{ element: HTMLElement }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Accordion',
  kind: 'enhancement',
  selector: 'data-accordion',
  module: 'components/Accordion',
  stylesheet: 'styles/accordion.css',
  summary: 'Animate native details elements as they open and close',
  description: `The markup is plain \`<details>\` and \`<summary>\`, so without JavaScript every item still opens and closes, instantly, and find in page can open a closed one. Accordion takes over the summary's click to animate the height of the item instead, and writes \`data-accordion-state\` for styles.

Details that share a \`name\` close each other with the same animation, including in browsers that don't support \`name\` on details yet. An item opened or closed another way, such as by find in page or a script setting \`open\`, changes at once. The animation is skipped when the user prefers reduced motion.`,
  states: STATES,
  /* Mounted by the framework only: this one has no static enhanceAll() */
  enhanceAll: false,
  attributes: [
    {
      name: 'data-accordion',
      type: 'flag',
      description: 'Marks a details element to animate',
    },
    {
      name: 'data-accordion-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      description: "The item's state",
    },
  ],
  methods: [
    {
      name: 'show',
      signature: '(element: HTMLElement) => void',
      description: 'Open an item, closing the others that share its name',
    },
    {
      name: 'hide',
      signature: '(element: HTMLElement) => void',
      description: 'Close an item',
    },
    {
      name: 'toggle',
      signature: '(element: HTMLElement) => void',
      description: 'Open a closed item or close an open one',
    },
  ],
  events: [
    {
      name: 'accordion:show',
      channel: 'both',
      detail: ELEMENT_DETAIL,
      description: 'An item started opening, or was opened another way',
    },
    {
      name: 'accordion:hide',
      channel: 'both',
      detail: ELEMENT_DETAIL,
      description: 'An item started closing, or was closed another way',
    },
  ],
  cssProperties: [
    {
      name: '--accordion-duration',
      default: '0.3s',
      description: 'Length of the open and close animation',
    },
    {
      name: '--accordion-easing',
      default: 'ease',
      description: 'Easing of the open and close animation',
    },
    {
      name: '--accordion-border-color',
      default: 'var(--surface-item-border-color, var(--color-border, #e2e8f0))',
      description: 'The lines between and around the items: the item border colour',
    },
    {
      name: '--accordion-summary-padding',
      default: '1rem 1.25rem',
      description: 'Padding around each summary',
    },
    {
      name: '--accordion-summary-color',
      default: 'var(--surface-item-color-text, #111827)',
      description: "Summary text colour: the item text colour, which is the page's text colour",
    },
    {
      name: '--accordion-summary-hover-bg',
      default: 'var(--color-hover, #f9fafb)',
      description: 'Summary background on hover: the hover tint',
    },
    {
      name: '--accordion-content-padding',
      default: '0 1.25rem 1.25rem',
      description: 'Padding around the content element after each summary',
    },
    {
      name: '--accordion-content-color',
      default: 'var(--surface-item-color-text, #374151)',
      description: "Content text colour: the item text colour, which is the page's text colour",
    },
    {
      name: '--accordion-icon',
      description: 'The icon image, used as a mask: a plus from Tabler Icons by default',
    },
    {
      name: '--accordion-icon-size',
      default: '1.25rem',
      description: 'Width and height of the icon',
    },
    {
      name: '--accordion-icon-color',
      default: 'currentColor',
      description: 'Icon colour, the summary text colour by default',
    },
    {
      name: '--accordion-icon-rotation',
      default: '45deg',
      description: 'How far the icon turns while the item is open',
    },
  ],
  accessibility:
    'The summary is the native disclosure control, so it is focusable, opens with Enter or Space, and reports expanded or collapsed without extra ARIA. Accordion only changes how the item animates.',
  examples: [
    {
      id: 'faq',
      title: 'One answer open at a time',
      description: 'Details that share a name close each other.',
      markup: `<details data-accordion name="faq">
  <summary>Can I change my order?</summary>
  <div>
    <p>Yes, until it leaves the warehouse. Change it from the confirmation email.</p>
  </div>
</details>
<details data-accordion name="faq">
  <summary>How long does delivery take?</summary>
  <div>
    <p>Orders arrive within two working days in most areas.</p>
  </div>
</details>
<details data-accordion name="faq">
  <summary>Can I return something?</summary>
  <div>
    <p>Send anything back within 30 days for a full refund.</p>
  </div>
</details>`,
    },
    {
      id: 'independent',
      title: 'Independent items',
      description: 'Without a name, each item opens and closes on its own.',
      markup: `<details data-accordion open>
  <summary>Ingredients</summary>
  <div>
    <p>Flour, water, salt and a sourdough starter.</p>
  </div>
</details>
<details data-accordion>
  <summary>Method</summary>
  <div>
    <p>Mix, rest overnight, shape and bake at 240°C for 40 minutes.</p>
  </div>
</details>`,
    },
  ],
};
