/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Tabs',
  kind: 'enhancement',
  selector: 'data-tabs',
  module: 'components/Tabs',
  stylesheet: 'styles/tabs.css',
  summary: 'Tabbed panels built from a list of tab buttons or in-page links',
  description: `Without JavaScript the panels are ordinary stacked sections, and links used as tabs jump to them. While scripts are enabled but Tabs hasn't loaded yet, the shipped stylesheet shows only the first panel, so the page doesn't jump when it does. When another tab starts selected, through \`aria-selected="true"\` or \`data-tabs-default-tab\`, write \`data-tab-panel="active"\` on its panel too: the stylesheet shows that panel instead, and Tabs selects it when no tab has \`aria-selected="true"\`. CSS can't match a tab to its panel, so without the marker the first panel shows until Tabs mounts. If Tabs fails to load, every panel shows again; if it is never registered, the other panels stay hidden.

Once mounted, Tabs follows the WAI-ARIA tabs pattern: arrow keys, Home and End move focus between tabs, inactive panels get the \`hidden\` attribute, and a newly chosen panel fades in unless the user prefers reduced motion. Unmounting puts the markup back as it was.

Deep links keep working: when the address names a panel, or an element inside one, Tabs selects that panel's tab when it mounts and whenever the hash changes, ahead of \`aria-selected\` and the default tab. In nested tab sets, both the outer and inner tabs holding it are selected. Choosing a tab doesn't change the address.`,
  attributes: [
    { name: 'data-tabs', type: 'flag', description: 'Marks the container' },
    {
      name: 'data-tabs-list',
      type: 'flag',
      on: 'the element holding the tabs',
      description:
        'Marks the tab list. Tabs gives it aria-orientation="horizontal" unless it has one; the Up and Down arrow keys move between tabs only when it is "vertical"',
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
      description:
        "Marks a panel; Tabs sets it to the panel's state. Write active on the panel that starts selected to show it before Tabs loads",
    },
    {
      name: 'data-tabs-default-tab',
      type: 'string',
      default: null,
      option: 'defaultTab',
      description:
        'The id of the panel to show first when the address names no panel and no tab has aria-selected="true"',
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
    {
      name: '--tabs-color',
      default: 'var(--color-text-muted, #6b7280)',
      description: 'Tab text colour: the muted text colour',
    },
    {
      name: '--tabs-hover-color',
      default: 'var(--surface-panel-color-text, #374151)',
      description:
        "Tab text colour on hover: the panel text colour, which is the page's text colour",
    },
    {
      name: '--tabs-hover-bg',
      default: 'var(--color-hover, #f9fafb)',
      description: 'Tab background on hover: the hover tint',
    },
    {
      name: '--tabs-selected-color',
      default: 'var(--color-accent-hover, #0369a1)',
      description: "The chosen tab's text and underline colour: the stronger accent",
    },
    {
      name: '--tabs-selected-bg',
      default: 'transparent',
      description:
        "The chosen tab's background, transparent so its label keeps 4.5:1 contrast on light and grey pages",
    },
    {
      name: '--tabs-border-color',
      default: 'var(--surface-panel-border-color, var(--color-border, #e2e8f0))',
      description: 'The line under the tab list: the panel border colour',
    },
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
