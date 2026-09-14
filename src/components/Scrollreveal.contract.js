const STATES = ['hidden', 'revealing', 'visible', 'hiding', 'error'];
const ELEMENT_DETAIL = '{ element: HTMLElement; timestamp: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Scrollreveal',
  kind: 'enhancement',
  selector: 'data-reveal',
  module: 'components/Scrollreveal',
  stylesheet: 'styles/reveal.css',
  summary: 'Reveal elements as they scroll into view, one after another',
  description: `Each element moves through \`data-reveal-state\` and the stylesheet draws the fade and slide, so nothing is written to its inline styles. Elements that come into view together are revealed in order, the stagger apart. \`data-reveal-class\` animates with a class instead. Under reduced motion elements are shown at once, and without JavaScript the stylesheet never hides them.`,
  states: STATES,
  attributes: [
    { name: 'data-reveal', type: 'flag', description: 'Marks an element to reveal' },
    {
      name: 'data-reveal-threshold',
      type: 'number',
      default: 0.1,
      option: 'threshold',
      description: 'Visible fraction that starts the reveal',
    },
    {
      name: 'data-reveal-root-margin',
      type: 'string',
      default: '0px',
      option: 'rootMargin',
      description: 'Grows or shrinks the viewport used to detect the element',
    },
    {
      name: 'data-reveal-once',
      type: 'boolean',
      default: true,
      option: 'once',
      description: 'Stay revealed; false hides the element again when it leaves the viewport',
    },
    {
      name: 'data-reveal-delay',
      type: 'number',
      default: 0,
      option: 'delay',
      description: 'Milliseconds to wait before revealing',
    },
    {
      name: 'data-reveal-stagger',
      type: 'number',
      default: 100,
      option: 'stagger',
      description: 'Milliseconds between elements revealed together',
    },
    {
      name: 'data-reveal-initial',
      type: 'enum',
      options: ['hidden', 'visible'],
      default: 'hidden',
      option: 'initialState',
      description: 'visible leaves the element showing until it is revealed',
    },
    {
      name: 'data-reveal-class',
      type: 'string',
      description: 'Classes to animate the reveal with instead of the stylesheet',
    },
    {
      name: 'data-reveal-exit-class',
      type: 'string',
      description: 'Classes to animate hiding with',
    },
    {
      name: 'data-reveal-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      description: 'Reveal progress',
    },
    {
      name: 'data-reveal-enhanced',
      type: 'flag',
      readonly: true,
      description: 'Set once the element is watched',
    },
  ],
  events: [
    {
      name: 'scrollreveal:mount',
      channel: 'bus',
      detail: '{ element: HTMLElement; threshold: number; stagger: number; timestamp: number }',
      description: 'An element was set up',
    },
    {
      name: 'scrollreveal:reveal-start',
      channel: 'bus',
      detail: ELEMENT_DETAIL,
      description: 'An element started revealing',
    },
    {
      name: 'scrollreveal:reveal-complete',
      channel: 'bus',
      detail: ELEMENT_DETAIL,
      description: 'An element finished revealing',
    },
    {
      name: 'scrollreveal:reveal-error',
      channel: 'bus',
      detail: '{ element: HTMLElement; error: unknown; timestamp: number }',
      description: 'Revealing an element failed',
    },
    {
      name: 'scrollreveal:hide-complete',
      channel: 'bus',
      detail: ELEMENT_DETAIL,
      description: 'An element finished hiding again',
    },
  ],
  cssProperties: [
    { name: '--reveal-distance', description: 'How far elements slide as they reveal' },
    { name: '--reveal-transition-duration', description: 'Length of the reveal' },
    { name: '--reveal-transition-easing', description: 'Easing of the reveal' },
  ],
  examples: [
    {
      id: 'cards',
      title: 'Staggered cards',
      description: 'Scroll the cards out of view and back to see them reveal in order.',
      markup: `<div class="card-grid">
  <article class="card" data-reveal>Breakfast from 7am</article>
  <article class="card" data-reveal>Lunch from noon</article>
  <article class="card" data-reveal>Dinner from 6pm</article>
</div>`,
      controls: [
        { attribute: 'data-reveal-once' },
        { attribute: 'data-reveal-delay' },
        { attribute: 'data-reveal-threshold' },
      ],
    },
  ],
};
