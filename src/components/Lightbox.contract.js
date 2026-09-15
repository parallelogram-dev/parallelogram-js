const STATES = ['closed', 'opening', 'open', 'transitioning', 'closing'];

const classAttribute = (suffix, option, value, description) => ({
  name: `data-lightbox-${suffix}`,
  type: 'string',
  default: value,
  option,
  description,
});

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Lightbox',
  kind: 'enhancement',
  selector: 'data-lightbox',
  module: 'components/Lightbox',
  stylesheet: 'styles/lightbox.css',
  summary: 'Image gallery viewer shown in a native modal dialog',
  description: `Links that share a \`data-lightbox\` gallery name open one viewer. It is named "Image viewer", takes focus on its close button, keeps the rest of the page inert and returns focus to the link when it closes. The arrow keys move between images, Escape and the backdrop close it, the counter is announced as it changes, and slides are skipped when the user prefers reduced motion.

Each link's \`href\` is the full-size image, so without JavaScript the links still open the images.`,
  states: STATES,
  attributes: [
    {
      name: 'data-lightbox',
      type: 'string',
      required: true,
      on: 'a link to the full-size image',
      description: 'The gallery name; links with the same name browse together',
    },
    {
      name: 'data-lightbox-srcset',
      type: 'string',
      description: 'A source set for the full-size image',
    },
    {
      name: 'data-lightbox-sizes',
      type: 'string',
      description: 'Sizes for the source set (default 100vw)',
    },
    {
      name: 'data-lightbox-close-escape',
      type: 'boolean',
      default: true,
      option: 'closeOnEscape',
      description: 'Close with Escape',
    },
    {
      name: 'data-lightbox-close-backdrop',
      type: 'boolean',
      default: true,
      option: 'closeOnBackdrop',
      description: 'Close when the backdrop is clicked',
    },
    {
      name: 'data-lightbox-show-counter',
      type: 'boolean',
      default: true,
      option: 'showCounter',
      description: 'Show the image count, such as 2 of 5',
    },
    {
      name: 'data-lightbox-show-nav',
      type: 'boolean',
      default: true,
      option: 'showNavigation',
      description: 'Show the previous and next buttons',
    },
    {
      name: 'data-lightbox-key-nav',
      type: 'boolean',
      default: true,
      option: 'keyNavigation',
      description: 'Move between images with the arrow keys',
    },
    {
      name: 'data-lightbox-directional-transitions',
      type: 'boolean',
      default: true,
      option: 'useDirectionalTransitions',
      description: 'Slide images in the direction of travel',
    },
    {
      name: 'data-lightbox-preload',
      type: 'enum',
      options: ['adjacent', 'all', 'none'],
      default: 'adjacent',
      option: 'preloadStrategy',
      description: 'Which images to load ahead of time',
    },
    classAttribute('base-class', 'baseClass', 'lightbox', 'Class on the viewer'),
    classAttribute('overlay-class', 'overlayClass', 'lightbox__overlay', 'Class on the dialog'),
    classAttribute(
      'container-class',
      'containerClass',
      'lightbox__container',
      'Class on the inner container'
    ),
    classAttribute('close-class', 'closeClass', 'lightbox__close', 'Class on the close button'),
    classAttribute(
      'prev-class',
      'prevClass',
      'lightbox__nav lightbox__nav--prev',
      'Classes on the previous button'
    ),
    classAttribute(
      'next-class',
      'nextClass',
      'lightbox__nav lightbox__nav--next',
      'Classes on the next button'
    ),
    classAttribute('content-class', 'contentClass', 'lightbox__content', 'Class on the image area'),
    classAttribute('image-class', 'imageClass', 'lightbox__image', 'Class on the image'),
    classAttribute('counter-class', 'counterClass', 'lightbox__counter', 'Class on the counter'),
    classAttribute('state-closed-class', 'stateClosedClass', 'is-closed', 'Class while closed'),
    classAttribute('state-opening-class', 'stateOpeningClass', 'is-opening', 'Class while opening'),
    classAttribute('state-open-class', 'stateOpenClass', 'is-open', 'Class while open'),
    classAttribute(
      'state-transitioning-class',
      'stateTransitioningClass',
      'is-transitioning',
      'Class while changing image'
    ),
    classAttribute('state-closing-class', 'stateClosingClass', 'is-closing', 'Class while closing'),
    classAttribute('show-class', 'showClass', 'show', 'Class on a shown element'),
    classAttribute(
      'slide-left-class',
      'slideLeftClass',
      'slide-left',
      'Class for a slide to the left'
    ),
    classAttribute(
      'slide-right-class',
      'slideRightClass',
      'slide-right',
      'Class for a slide to the right'
    ),
    {
      name: 'data-lightbox-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      on: 'the viewer',
      description: "The viewer's state",
    },
  ],
  events: [
    {
      name: 'lightbox:mounted',
      channel: 'bus',
      detail: '{ element: HTMLElement; gallery: string }',
      description: 'A gallery link was set up',
    },
    {
      name: 'lightbox:opened',
      channel: 'bus',
      detail: '{ gallery: string; index: number; total: number }',
      description: 'The viewer opened',
    },
    {
      name: 'lightbox:closed',
      channel: 'bus',
      detail: 'Record<string, never>',
      description: 'The viewer closed',
    },
    {
      name: 'lightbox:stateChange',
      channel: 'bus',
      detail: '{ element: HTMLElement; oldState: string; newState: string; gallery: string }',
      description: "The viewer's state changed",
    },
  ],
  cssProperties: [
    {
      name: '--lightbox-transition-duration',
      description: 'Length of the open, close and slide animations',
    },
    { name: '--lightbox-transition-easing', description: 'Easing of the animations' },
  ],
  examples: [
    {
      id: 'gallery',
      title: 'Gallery',
      markup: `<div class="gallery">
  <a href="images/harbour-1280.jpg" data-lightbox="harbour">
    <img src="images/harbour-640.jpg" width="320" height="200" alt="Harbour at dawn">
  </a>
  <a href="images/terrace-1280.jpg" data-lightbox="harbour">
    <img src="images/terrace-640.jpg" width="320" height="200" alt="Terrace tables at dusk">
  </a>
  <a href="images/kitchen-1280.jpg" data-lightbox="harbour">
    <img src="images/kitchen-640.jpg" width="320" height="200" alt="The open kitchen">
  </a>
</div>`,
      controls: [
        { attribute: 'data-lightbox-show-counter' },
        { attribute: 'data-lightbox-show-nav' },
        { attribute: 'data-lightbox-close-backdrop' },
      ],
    },
  ],
};
