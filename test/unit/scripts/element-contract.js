/**
 * An element contract exercising every member the declaration and manifest generators read
 *
 * @param {Partial<import('../../../src/contract.js').ComponentContract>} [overrides]
 * @returns {import('../../../src/contract.js').ComponentContract}
 */
export const elementContract = (overrides = {}) => ({
  name: 'PWidget',
  kind: 'element',
  tag: 'p-widget',
  module: 'components/PWidget',
  summary: 'A widget',
  description: 'Shows */ things',
  attributes: [
    {
      name: 'size',
      type: 'enum',
      options: ['sm', 'md'],
      default: 'md',
      property: 'size',
      description: 'The size',
    },
    {
      name: 'data-widget-state',
      type: 'enum',
      options: ['closed', 'open'],
      readonly: true,
      description: "The widget's state",
    },
  ],
  properties: [
    {
      name: 'form',
      type: 'HTMLFormElement | null',
      readonly: true,
      description: 'The owning form',
    },
  ],
  methods: [
    {
      name: 'open',
      signature: '(options?: { focus?: boolean }) => void',
      description: 'Open the widget',
    },
  ],
  events: [
    { name: 'change', detail: '{ value: string }', description: 'The value changed' },
    { name: 'input', description: 'The value is changing' },
    { name: 'p-widget:open', detail: '{ widget: HTMLElement }', description: 'The widget opened' },
    {
      name: 'widget:open',
      detail: '{ widget: HTMLElement }',
      description: 'The old name for p-widget:open',
      deprecated: 'Listen for p-widget:open. Removed in 0.6.0.',
    },
    { name: 'widget:mount', channel: 'bus', description: 'The widget was set up' },
  ],
  slots: [{ name: '', description: 'The content' }],
  parts: [{ name: 'panel', description: 'The panel' }],
  cssProperties: [{ name: '--widget-gap', default: '1rem', description: 'Space between items' }],
  elements: [{ tag: 'p-widget-part', description: 'A part of the widget' }],
  examples: [{ id: 'basic', title: 'Basic', markup: '<p-widget></p-widget>' }],
  ...overrides,
});
