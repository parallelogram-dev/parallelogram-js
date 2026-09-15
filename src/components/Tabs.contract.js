/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Tabs',
  kind: 'enhancement',
  selector: 'data-tabs',
  module: 'components/Tabs',
  stylesheet: 'styles/tabs.css',
  summary: 'Tabbed panels built from a list of tab buttons or in-page links',
  description: `Without JavaScript the panels are ordinary stacked sections, and links used as tabs jump to them. While scripts are enabled but Tabs hasn't loaded yet, the shipped stylesheet shows only the first panel, so the page doesn't jump when it does. If Tabs fails to load, every panel shows again; if it is never registered, the other panels stay hidden.

Once mounted, Tabs follows the WAI-ARIA tabs pattern: arrow keys, Home and End move focus between tabs, inactive panels get the \`hidden\` attribute, and a newly chosen panel fades in unless the user prefers reduced motion. Unmounting puts the markup back as it was.`,
  attributes: [
    { name: 'data-tabs', type: 'flag', description: 'Marks the container' },
    {
      name: 'data-tabs-list',
      type: 'flag',
      on: 'the element holding the tabs',
      description: 'Marks the tab list',
    },
    { name: 'data-tab', type: 'string', on: 'each tab', description: "The id of the tab's panel" },
    {
      name: 'data-tabs-panels',
      type: 'flag',
      on: 'the element holding the panels',
      description: 'Marks the panel container',
    },
    {
      name: 'data-tab-panel',
      type: 'enum',
      options: ['active', 'entering', 'inactive'],
      on: 'each panel',
      description: "Marks a panel; Tabs sets it to the panel's state",
    },
    {
      name: 'data-tabs-default-tab',
      type: 'string',
      default: null,
      option: 'defaultTab',
      description: 'The id of the panel to show first when no tab has aria-selected="true"',
    },
    {
      name: 'data-tabs-keyboard',
      type: 'boolean',
      default: true,
      option: 'keyboardNavigation',
      description: 'Move between tabs with the arrow keys, Home and End',
    },
    {
      name: 'data-tabs-activation',
      type: 'enum',
      options: ['auto', 'manual'],
      default: 'auto',
      option: 'activation',
      description: 'auto selects a tab when it receives focus; manual selects it on Enter or Space',
    },
    {
      name: 'data-tabs-enhanced',
      type: 'flag',
      readonly: true,
      description: 'Set once Tabs has mounted',
    },
  ],
  events: [
    {
      name: 'tabs:change',
      channel: 'both',
      detail:
        '{ activeTab: string; previousTab: string | null; tab: HTMLElement; panel: HTMLElement; timestamp: number }',
      description: 'A different tab was selected',
    },
    {
      name: 'tabs:mount',
      channel: 'bus',
      detail: '{ element: HTMLElement; tabCount: number; panelCount: number; timestamp: number }',
      description: 'The tabs were set up',
    },
  ],
  cssProperties: [
    {
      name: '--tabs-transition-duration',
      default: '0.2s',
      description: 'Length of the panel fade and tab colour changes',
    },
    { name: '--tabs-color', description: 'Tab text colour' },
    { name: '--tabs-hover-color', description: 'Tab text colour on hover' },
    { name: '--tabs-hover-bg', description: 'Tab background on hover' },
    { name: '--tabs-selected-color', description: "The chosen tab's text and underline colour" },
    { name: '--tabs-selected-bg', description: "The chosen tab's background" },
    { name: '--tabs-border-color', description: 'The line under the tab list' },
  ],
  examples: [
    {
      id: 'links',
      title: 'Tabs from in-page links',
      description: 'Without JavaScript the links jump to stacked sections.',
      markup: `<div data-tabs>
  <div data-tabs-list>
    <a href="#shipping" data-tab="shipping">Shipping</a>
    <a href="#returns" data-tab="returns">Returns</a>
    <a href="#warranty" data-tab="warranty">Warranty</a>
  </div>
  <div data-tabs-panels>
    <section id="shipping" data-tab-panel><h3>Shipping</h3><p>Orders leave the warehouse within two working days.</p></section>
    <section id="returns" data-tab-panel><h3>Returns</h3><p>Send anything back within 30 days for a full refund.</p></section>
    <section id="warranty" data-tab-panel><h3>Warranty</h3><p>Every product is covered for two years.</p></section>
  </div>
</div>`,
      controls: [
        { attribute: 'data-tabs-activation' },
        { attribute: 'data-tabs-keyboard' },
        { attribute: 'data-tabs-default-tab' },
      ],
    },
  ],
};
