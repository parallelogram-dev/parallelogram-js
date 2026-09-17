const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const TOOLTIP_DETAIL = '{ element: HTMLElement; tooltip: HTMLElement; placement: string }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Tooltip',
  kind: 'enhancement',
  selector: 'data-tooltip',
  module: 'components/Tooltip',
  stylesheet: 'styles/tooltip.css',
  summary:
    'A short description of a control, shown beside it while the pointer rests on it or it has focus',
  description: `The tooltip is the text of the \`data-tooltip\` attribute, or the content of an element named by \`data-tooltip-target\` when the text is empty. It appears above the control after a short delay under the pointer and at once on keyboard focus, and goes when the pointer leaves, focus moves, the control is pressed, or Escape is pressed. It is a description, not a name: a control with only an icon still needs its own \`aria-label\`. The control gets \`aria-describedby\` pointing at the tooltip while it is shown.

The tooltip sits where \`data-tooltip-placement\` says and flips to the opposite side when there is no room, staying inside the viewport; the triangle keeps pointing at the control. It fades and moves into place over the framework's transition, and appears at once for a visitor who prefers reduced motion. Touch gets nothing: a tooltip under a finger has nowhere to be, so a control that needs its description on a phone should say it in its label.`,
  attributes: [
    {
      name: 'data-tooltip',
      type: 'string',
      required: true,
      description:
        'The text of the tooltip; empty when data-tooltip-target names the content instead',
    },
    {
      name: 'data-tooltip-target',
      type: 'string',
      description:
        'A selector for an element whose content is the tooltip, for a description with markup; hide the element on the page yourself',
    },
    {
      name: 'data-tooltip-placement',
      type: 'enum',
      options: PLACEMENTS,
      default: 'top',
      option: 'placement',
      description: 'Which side of the control the tooltip sits on; it flips when there is no room',
    },
    {
      name: 'data-tooltip-arrow',
      type: 'boolean',
      default: true,
      option: 'arrow',
      description: 'The triangle pointing at the control',
    },
    {
      name: 'data-tooltip-delay',
      type: 'number',
      default: 150,
      option: 'delay',
      description:
        'Milliseconds the pointer rests before the tooltip shows; focus shows it at once',
    },
    {
      name: 'data-tooltip-offset',
      type: 'number',
      default: 8,
      option: 'offset',
      description: 'Pixels between the control and the tooltip',
    },
    {
      name: 'data-tooltip-state',
      type: 'enum',
      options: ['open', 'closed'],
      readonly: true,
      description: 'Whether the tooltip is shown',
    },
  ],
  events: [
    {
      name: 'tooltip:show',
      channel: 'both',
      detail: TOOLTIP_DETAIL,
      description: 'Dispatched on the control when its tooltip appears, with the side it took',
    },
    {
      name: 'tooltip:hide',
      channel: 'both',
      detail: TOOLTIP_DETAIL,
      description: 'Dispatched on the control when its tooltip goes',
    },
    {
      name: 'tooltip:mount',
      channel: 'bus',
      detail: '{ element: HTMLElement; timestamp: number }',
      description: 'A control was set up',
    },
  ],
  cssProperties: [
    { name: '--tooltip-bg', default: 'var(--color-inverse-surface)', description: 'Background' },
    { name: '--tooltip-color', default: 'var(--color-inverse-text)', description: 'Text colour' },
    {
      name: '--tooltip-radius',
      default: 'var(--surface-control-radius)',
      description: 'Corner radius',
    },
    { name: '--tooltip-padding', default: '0.35em 0.6em', description: 'Padding' },
    { name: '--tooltip-font-size', default: '0.8125rem', description: 'Font size' },
    {
      name: '--tooltip-max-width',
      default: '18rem',
      description: 'Widest a tooltip grows before wrapping',
    },
    { name: '--tooltip-arrow-size', default: '0.5rem', description: 'Side of the triangle' },
    { name: '--tooltip-shadow', default: 'var(--surface-panel-shadow)', description: 'Shadow' },
    {
      name: '--tooltip-z-index',
      default: '2147483646',
      description: 'Stacking; one under the toasts',
    },
    {
      name: '--tooltip-transition-duration',
      default: 'var(--framework-transition-duration)',
      description: 'How long the fade and move in take; none under prefers-reduced-motion',
    },
  ],
  examples: [
    {
      id: 'basic',
      title: 'A described button',
      description: 'Rest the pointer on the button, or tab to it.',
      markup: `<button type="button" class="btn" data-tooltip="Copies the booking reference">Copy reference</button>`,
      controls: [
        { attribute: 'data-tooltip-placement' },
        { attribute: 'data-tooltip-arrow' },
        { attribute: 'data-tooltip-delay' },
      ],
    },
    {
      id: 'placements',
      title: 'Each side',
      description: 'The same tooltip on each side of its control, and one without the triangle.',
      markup: `<div class="button-row">
  <button type="button" class="btn" data-tooltip="Above" data-tooltip-placement="top">Top</button>
  <button type="button" class="btn" data-tooltip="Below" data-tooltip-placement="bottom">Bottom</button>
  <button type="button" class="btn" data-tooltip="To the left" data-tooltip-placement="left">Left</button>
  <button type="button" class="btn" data-tooltip="To the right" data-tooltip-placement="right">Right</button>
  <button type="button" class="btn" data-tooltip="No triangle" data-tooltip-arrow="false">Plain</button>
</div>`,
    },
    {
      id: 'rich',
      title: 'Content from an element',
      description: 'A description with markup, taken from a hidden element on the page.',
      markup: `<button type="button" class="btn" data-tooltip="" data-tooltip-target="#shortcut-tip">Save</button>
<div id="shortcut-tip" hidden>Saves the draft. <kbd>⌘</kbd> <kbd>S</kbd></div>`,
    },
  ],
};
