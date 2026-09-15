const VISIBILITY_DETAIL =
  '{ target: HTMLElement; scrollY: number; reason: string; timestamp: number }';
const OVERLAY_DETAIL = '{ target: HTMLElement; scrollY: number; timestamp: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Scrollhide',
  kind: 'enhancement',
  selector: 'data-scrollhide',
  module: 'components/Scrollhide',
  summary: 'Hide an element while the page scrolls down and show it again on scrolling up',
  description: `The target gets the scrolled class while hidden, and the overlay class once the page has scrolled past the overlay threshold. Both start from the scroll position the page already has when the component mounts. Movements smaller than the tolerance are ignored, which avoids flicker from elastic scrolling, and a hidden target is shown again when keyboard focus moves into it. Your stylesheet decides what the classes look like.`,
  attributes: [
    { name: 'data-scrollhide', type: 'flag', description: 'Marks the element' },
    {
      name: 'data-scrollhide-target',
      type: 'selector',
      description: 'Another element to hide instead of this one',
    },
    {
      name: 'data-scrollhide-scroll-threshold',
      type: 'number',
      default: 50,
      option: 'scrollThreshold',
      description: 'Pixels scrolled before the target can hide',
    },
    {
      name: 'data-scrollhide-overlay-threshold',
      type: 'number',
      default: 100,
      option: 'overlayThreshold',
      description: 'Pixels scrolled before the overlay class is added',
    },
    {
      name: 'data-scrollhide-tolerance',
      type: 'number',
      default: 5,
      option: 'tolerance',
      description: 'Smallest movement in pixels that hides or shows the target',
    },
    {
      name: 'data-scrollhide-scrolled-class',
      type: 'string',
      default: 'scrollhide',
      option: 'scrolledClass',
      description: 'Class on the target while it is hidden',
    },
    {
      name: 'data-scrollhide-overlay-class',
      type: 'string',
      default: 'scrolloverlay',
      option: 'overlayClass',
      description: 'Class on the target past the overlay threshold',
    },
    {
      name: 'data-scrollhide-enhanced',
      type: 'flag',
      readonly: true,
      description: 'Set once the element is watched',
    },
  ],
  events: [
    {
      name: 'scrollhide:hidden',
      channel: 'both',
      detail: VISIBILITY_DETAIL,
      description: 'The target was hidden',
    },
    {
      name: 'scrollhide:shown',
      channel: 'both',
      detail: VISIBILITY_DETAIL,
      description: 'The target was shown again; reason is scroll-up, top, focus or manual',
    },
    {
      name: 'scrollhide:overlay-added',
      channel: 'both',
      detail: OVERLAY_DETAIL,
      description: 'The page scrolled past the overlay threshold',
    },
    {
      name: 'scrollhide:overlay-removed',
      channel: 'both',
      detail: OVERLAY_DETAIL,
      description: 'The page scrolled back above the overlay threshold',
    },
    {
      name: 'scrollhide:mount',
      channel: 'bus',
      detail:
        '{ element: HTMLElement; target: HTMLElement; scrollThreshold: number; overlayThreshold: number; timestamp: number }',
      description: 'The element was set up',
    },
  ],
  examples: [
    {
      id: 'header',
      title: 'Site header',
      description: 'Scroll the page down and up to see the header hide and return.',
      markup: `<header class="demo-header" data-scrollhide data-scrollhide-scroll-threshold="50">
  <strong>Harbourside</strong>
  <a href="#book">Book a table</a>
</header>`,
      controls: [
        { attribute: 'data-scrollhide-scroll-threshold' },
        { attribute: 'data-scrollhide-overlay-threshold' },
        { attribute: 'data-scrollhide-tolerance' },
      ],
    },
  ],
};
