/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'SelectLoader',
  kind: 'enhancement',
  selector: 'data-selectloader',
  module: 'components/SelectLoader',
  summary: "Load an HTML fragment into a target when a select's choice changes",
  description: `Each option's value is the URL of a fragment, fetched through RouterManager, so the page needs the framework's router. A choice made before the router has loaded, including one selected in the page's HTML, waits for it to start. A newer choice cancels a load that is still running, the target is marked \`aria-busy\` while loading, and the loaded content is announced.

Fragments are inserted as HTML, through the \`parallelogram\` policy on pages that enforce Trusted Types, so they must come from a trusted, same-origin source; sanitise anything else first, for example with DOMPurify.`,
  attributes: [
    { name: 'data-selectloader', type: 'flag', on: 'a <select>', description: 'Marks the select' },
    {
      name: 'data-selectloader-target',
      type: 'selector',
      description: 'The element that receives the content',
    },
    {
      name: 'data-selectloader-target-view',
      type: 'string',
      description: "The target's data-view name, instead of a selector",
    },
    {
      name: 'data-selectloader-transition',
      type: 'enum',
      options: ['fade', 'slide', 'none'],
      default: 'fade',
      option: 'transition',
      description: 'How new content appears; skipped under reduced motion',
    },
    {
      name: 'data-selectloader-transition-duration',
      type: 'number',
      default: 300,
      option: 'transitionDuration',
      description: 'Length of the transition in milliseconds',
    },
    {
      name: 'data-selectloader-retain-scroll',
      type: 'boolean',
      default: false,
      option: 'retainScroll',
      description: "Keep the target's scroll position",
    },
    {
      name: 'data-selectloader-empty-message',
      type: 'string',
      default: 'Please select an option',
      option: 'emptyMessage',
      description: 'Text shown when nothing is chosen',
    },
    {
      name: 'data-selectloader-loading-class',
      type: 'string',
      default: 'loading',
      option: 'loadingClass',
      description: 'Class on the target while loading',
    },
    {
      name: 'data-selectloader-error-class',
      type: 'string',
      default: 'error',
      option: 'errorClass',
      description: 'Class on the target after a failed load',
    },
  ],
  methods: [
    {
      name: 'load',
      signature: '(element: HTMLSelectElement, url: string) => void',
      description: 'Choose a URL and load its fragment',
    },
    {
      name: 'reload',
      signature: '(element: HTMLSelectElement) => void',
      description: 'Load the current choice again',
    },
    {
      name: 'clear',
      signature: '(element: HTMLSelectElement) => void',
      description: 'Choose nothing, cancel a running load and show the empty message',
    },
    {
      name: 'getLoadState',
      signature:
        '(element: HTMLSelectElement) => { isLoading: boolean; currentUrl: string | null; hasContent: boolean; hasError: boolean } | null',
      description:
        'Whether a load is running, the current URL, and whether the target has content or an error',
    },
  ],
  events: [
    {
      name: 'selectloader:before-change',
      channel: 'both',
      cancelable: true,
      detail: '{ value: string; previousUrl: string | null; targetElement: HTMLElement }',
      description: 'The choice is about to load; cancelling puts the previous choice back',
    },
    {
      name: 'selectloader:cleared',
      channel: 'both',
      detail: '{ targetElement: HTMLElement }',
      description: 'The empty choice was selected',
    },
    {
      name: 'selectloader:loading',
      channel: 'both',
      detail: '{ url: string; targetElement: HTMLElement }',
      description: 'A fragment started loading',
    },
    {
      name: 'selectloader:loaded',
      channel: 'both',
      detail: '{ url: string; targetElement: HTMLElement; html: string }',
      description: 'A fragment was inserted',
    },
    {
      name: 'selectloader:error',
      channel: 'both',
      detail: '{ url: string; error: Error; targetElement: HTMLElement }',
      description: 'A fragment failed to load',
    },
    {
      name: 'selectloader:complete',
      channel: 'both',
      detail: '{ url: string; success: boolean }',
      description: 'A load finished, successfully or not',
    },
    {
      name: 'selectloader:content-loaded',
      channel: 'bus',
      detail: '{ element: HTMLSelectElement; url: string; targetElement: HTMLElement }',
      description: 'A fragment was inserted',
    },
    {
      name: 'app:notification',
      channel: 'bus',
      detail: "{ type: 'error'; message: string; duration: number }",
      description: 'A message for the page to show when a load fails',
    },
  ],
  examples: [
    {
      id: 'menus',
      title: 'Menu picker',
      description: 'Choose another menu, then Reset puts back and loads the breakfast menu.',
      markup: `<form class="form" action="#menu">
  <label for="menu-choice">Menu</label>
  <select id="menu-choice" data-selectloader data-selectloader-target="#menu-panel">
    <option value="">Choose a menu</option>
    <option value="fragments/breakfast.html" selected>Breakfast</option>
    <option value="fragments/lunch.html">Lunch</option>
    <option value="fragments/missing.html">A menu that fails to load</option>
  </select>
  <button type="reset">Reset</button>
</form>
<div id="menu-panel" class="panel"></div>`,
      controls: [
        { attribute: 'data-selectloader-transition' },
        { attribute: 'data-selectloader-transition-duration' },
      ],
    },
  ],
};
