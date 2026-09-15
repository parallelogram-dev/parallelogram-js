const ELEMENT_DETAIL = '{ element: HTMLElement; timestamp: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Lazysrc',
  kind: 'enhancement',
  selector: 'data-lazysrc',
  match: '[data-lazysrc]:not([data-lazysrc-complete])',
  module: 'components/Lazysrc',
  stylesheet: 'styles/lazysrc.css',
  summary: 'Lazy image loading built on the browser\'s own loading="lazy"',
  description: `The browser decides when images load. Markup that already has a real \`src\` or \`srcset\` is never stripped, so it works without JavaScript; Lazysrc only adds \`loading="lazy"\` and \`decoding="async"\` when they are missing. Sources held in data attributes, on the image or on the \`<source>\` elements of its \`<picture>\`, are copied onto the elements as soon as the image mounts. Without JavaScript those images stay empty, so follow them with a \`<noscript>\` copy that has real sources, such as \`<noscript><img src="harbour.jpg" alt="Harbour at dawn"></noscript>\`. Background images have no native lazy loading, so they load through an IntersectionObserver shortly before they scroll into view.

Failed loads are retried with a growing delay. Don't lazy load the largest image above the fold: give it a plain \`src\` and \`fetchpriority="high"\` instead.`,
  states: ['loading', 'loaded', 'error'],
  attributes: [
    {
      name: 'data-lazysrc',
      type: 'flag',
      description: 'Marks an image, or an element with a background image',
    },
    { name: 'data-lazysrc-src', type: 'url', description: 'Source copied onto the image' },
    {
      name: 'data-lazysrc-srcset',
      type: 'string',
      description: 'Source set copied onto the image or a <source>',
    },
    {
      name: 'data-lazysrc-sizes',
      type: 'string',
      description: 'Sizes copied onto the image or a <source>',
    },
    {
      name: 'data-lazysrc-bg',
      type: 'url',
      description: 'Background image, loaded shortly before the element scrolls into view',
    },
    {
      name: 'data-lazysrc-fetchpriority',
      type: 'enum',
      options: ['high', 'low', 'auto'],
      description: "Copied to the image's fetchpriority",
    },
    {
      name: 'data-lazysrc-root-margin',
      type: 'string',
      default: '600px 0px',
      option: 'rootMargin',
      description: 'How far outside the viewport background images start loading',
    },
    {
      name: 'data-lazysrc-threshold',
      type: 'number',
      default: 0,
      option: 'threshold',
      description: 'Visible fraction at which a background image starts loading',
    },
    {
      name: 'data-lazysrc-retry-attempts',
      type: 'number',
      default: 3,
      option: 'retryAttempts',
      description: 'Retries after a failed load',
    },
    {
      name: 'data-lazysrc-retry-delay',
      type: 'number',
      default: 1000,
      option: 'retryDelay',
      description: 'Milliseconds before the first retry, multiplied by the attempt number after',
    },
    {
      name: 'data-lazysrc-fade-duration',
      type: 'number',
      default: 300,
      option: 'fadeInDuration',
      description: 'Fade length in milliseconds, set as --lazy-transition-duration',
    },
    {
      name: 'data-lazysrc-loading-class',
      type: 'string',
      default: 'lazysrc--loading',
      option: 'loadingClass',
      description: 'Class added while loading',
    },
    {
      name: 'data-lazysrc-loaded-class',
      type: 'string',
      default: 'lazysrc--loaded',
      option: 'loadedClass',
      description: 'Class added once loaded',
    },
    {
      name: 'data-lazysrc-error-class',
      type: 'string',
      default: 'lazysrc--error',
      option: 'errorClass',
      description: 'Class added when every retry failed',
    },
    {
      name: 'data-lazysrc-state',
      type: 'enum',
      options: ['loading', 'loaded', 'error'],
      readonly: true,
      description: 'Loading progress',
    },
  ],
  events: [
    {
      name: 'lazysrc:mounted',
      channel: 'both',
      detail: '{ element: HTMLElement; config: object; timestamp: number }',
      description: 'The element was set up',
    },
    {
      name: 'lazysrc:loading-start',
      channel: 'both',
      detail: ELEMENT_DETAIL,
      description: 'Sources were handed to the browser, or a background image started loading',
    },
    {
      name: 'lazysrc:loaded',
      channel: 'both',
      detail: '{ element: HTMLElement; loadTime: number | null; timestamp: number }',
      description:
        'The image loaded; loadTime is the download time from Resource Timing, or null when the browser has no entry for it',
    },
    {
      name: 'lazysrc:error',
      channel: 'both',
      detail: '{ element: HTMLElement; error: string; timestamp: number }',
      description: 'Every retry failed, or the element has no source to load',
    },
    {
      name: 'lazysrc:detached',
      channel: 'both',
      detail: ELEMENT_DETAIL,
      description: "A loaded element's listeners were released",
    },
    {
      name: 'lazysrc:forceLoad',
      inbound: true,
      description: 'Dispatch this on an element to load it straight away',
    },
  ],
  cssProperties: [
    { name: '--lazy-transition-duration', default: '0.3s', description: 'Length of the fade' },
    { name: '--lazy-transition-easing', description: 'Easing of the fade' },
    { name: '--lazy-loading-opacity', default: '0.7', description: 'Opacity while loading' },
    {
      name: '--lazy-placeholder-bg',
      default: 'var(--color-surface-muted)',
      description: 'Background while loading: the muted surface',
    },
    {
      name: '--lazy-error-bg',
      default: 'var(--color-danger-bg)',
      description: 'Background after an error: the danger tint',
    },
    {
      name: '--lazy-error-color',
      default: 'var(--color-danger)',
      description: 'Outline colour after an error: the danger colour',
    },
  ],
  examples: [
    {
      id: 'responsive',
      title: 'Responsive image',
      description: 'Real sources work without JavaScript; Lazysrc adds native lazy loading.',
      markup: `<img data-lazysrc
     src="images/harbour-640.jpg"
     srcset="images/harbour-640.jpg 640w, images/harbour-1280.jpg 1280w"
     sizes="(max-width: 640px) 100vw, 640px"
     width="640" height="400" alt="Harbour at dawn">`,
      controls: [{ attribute: 'data-lazysrc-fade-duration' }],
    },
    {
      id: 'background',
      title: 'Background image',
      description: 'Loads through an observer shortly before it scrolls into view.',
      markup: `<div class="hero" data-lazysrc data-lazysrc-bg="images/harbour-1280.jpg">
  <p>Book a table by the water</p>
</div>`,
      controls: [
        { attribute: 'data-lazysrc-root-margin' },
        { attribute: 'data-lazysrc-threshold' },
      ],
    },
  ],
};
