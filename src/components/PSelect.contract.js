/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PSelect',
  kind: 'element',
  tag: 'p-select',
  module: 'components/PSelect',
  summary: 'A select that can be searched, built as an editable combobox',
  description: `Follows the WAI-ARIA combobox pattern with list autocomplete. The text input carries the combobox role and is named after the element's \`aria-label\` or its \`<label for>\`. Typing filters the options and announces how many match; the arrow keys, Home and End move through them, and Page Up and Page Down move ten at a time; Enter or Tab chooses the highlighted option; Alt+Down Arrow opens the list without moving the highlight and Alt+Up Arrow chooses the highlighted option and closes it; Escape closes the list and puts the chosen label back.

Options come from \`<option>\` and \`<optgroup>\` children, which are watched for changes, or from a URL that returns JSON: an array of \`{ value, label, disabled?, group?, secondary?, description?, image? }\`, or an object with those in \`options\`. An option may carry a \`secondary\` text, shown muted after its label and searched along with it, a \`description\`, shown smaller beneath, and an \`image\` URL, shown as a round thumbnail before the text; in markup they are the \`data-secondary\`, \`data-description\` and \`data-image\` attributes of the \`<option>\`. The input shows the label alone. The element is form-associated: it submits its value under its \`name\`, supports \`required\`, and restores its \`value\` attribute, or else its selected option, when the form resets.`,
  withoutJs: `Until the module loads this element is empty markup with no control in it, and the package stylesheet hides it while scripts are running, so the page never shows a bare element nobody can use. It is the form field, so a form submitted before it upgrades carries no value for it and \`required\` cannot hold the form back. Where that matters, render an ordinary \`<select>\` on the server and replace it once the module is in.`,
  attributes: [
    { name: 'name', type: 'string', property: 'name', description: 'The form field name' },
    {
      name: 'value',
      type: 'string',
      property: 'value',
      description:
        'The initial value, restored when the form resets; takes precedence over a selected option',
    },
    { name: 'placeholder', type: 'string', description: 'Shown when nothing is chosen' },
    { name: 'disabled', type: 'flag', property: 'disabled', description: 'Disables the select' },
    {
      name: 'required',
      type: 'flag',
      property: 'required',
      description: 'A value must be chosen for the form to submit',
    },
    {
      name: 'aria-label',
      type: 'string',
      description: 'Names the input when there is no <label for>',
    },
    {
      name: 'data-select-src',
      type: 'url',
      description:
        'URL for remote options, with {q} replaced by the search text. With {page} in it the list is paged: page 1 first, then the next page whenever the list is scrolled to its end or the arrow keys reach the last option, for as long as the response says `more: true`. {limit} is replaced by data-select-limit.',
    },
    {
      name: 'data-select-min',
      type: 'number',
      default: 0,
      description: 'Characters to type before a remote search',
    },
    {
      name: 'data-select-debounce',
      type: 'number',
      default: 200,
      description: 'Milliseconds to wait after typing before a remote search',
    },
    {
      name: 'data-select-limit',
      type: 'number',
      default: 25,
      description: 'Rows per page, replacing {limit} in data-select-src',
    },
    {
      name: 'data-select-open-on-focus',
      type: 'boolean',
      default: false,
      description: 'Open the list when the input receives focus',
    },
  ],
  properties: [
    { name: 'value', type: 'string', description: 'The chosen value' },
    { name: 'name', type: 'string', description: 'The form field name' },
    { name: 'required', type: 'boolean', description: 'Reflects the required attribute' },
    { name: 'disabled', type: 'boolean', description: 'Reflects the disabled attribute' },
    {
      name: 'form',
      type: 'HTMLFormElement | null',
      readonly: true,
      description: 'The owning form',
    },
    { name: 'labels', type: 'NodeList', readonly: true, description: 'Labels for the element' },
    { name: 'validity', type: 'ValidityState', readonly: true, description: 'The validity state' },
    {
      name: 'validationMessage',
      type: 'string',
      readonly: true,
      description: 'The validation message',
    },
    {
      name: 'willValidate',
      type: 'boolean',
      readonly: true,
      description: 'Whether the element is validated',
    },
  ],
  methods: [
    { name: 'open', signature: '() => void', description: 'Open the list' },
    { name: 'close', signature: '() => void', description: 'Close the list' },
    { name: 'toggle', signature: '() => void', description: 'Open or close the list' },
    {
      name: 'select',
      signature: '(value: string) => void',
      description:
        'Choose an option as the user would, dispatching input, change and p-select:change when the value changes',
    },
    {
      name: 'setOptions',
      signature:
        '(options: Array<{ value: string; label: string; disabled?: boolean; group?: string; secondary?: string; description?: string; image?: string }>) => void',
      description: 'Replace the options',
    },
    { name: 'getValue', signature: '() => string', description: 'The chosen value' },
    { name: 'clear', signature: '() => void', description: 'Clear the choice' },
    {
      name: 'refreshOptions',
      signature: '() => void',
      description: 'Read the child options again',
    },
    { name: 'checkValidity', signature: '() => boolean', description: 'Check the value' },
    {
      name: 'reportValidity',
      signature: '() => boolean',
      description: 'Check the value and show the browser message',
    },
  ],
  events: [
    {
      name: 'input',
      description: 'The user chose a different option; bubbles out of shadow roots',
    },
    {
      name: 'change',
      description: 'The user chose a different option; bubbles out of shadow roots',
    },
    {
      name: 'p-select:change',
      detail:
        '{ value: string; label: string; secondary?: string; description?: string; image?: string }',
      description:
        'A different option was chosen, with its secondary text, description and image when it has them; bubbles out of shadow roots',
    },
    { name: 'p-select:open', description: 'The list opened' },
    { name: 'p-select:close', description: 'The list closed' },
  ],
  parts: [
    { name: 'input', description: 'The text input' },
    { name: 'clear', description: 'The button that clears the selection' },
    { name: 'listbox', description: 'The list of options' },
  ],
  cssProperties: [
    {
      name: '--select-text',
      default: 'var(--surface-control-color-text)',
      description: 'Text colour',
    },
    {
      name: '--select-border-color',
      default: 'var(--surface-control-border-color)',
      description: 'Input border colour',
    },
    {
      name: '--select-focus-color',
      default: 'var(--color-accent)',
      description: 'Focus ring colour',
    },
    {
      name: '--select-hover-bg',
      default: 'var(--surface-dropdown-item-hover-bg)',
      description: 'Background of a hovered option',
    },
    {
      name: '--select-current-bg',
      default: 'var(--surface-dropdown-item-current-bg)',
      description: 'Background of the highlighted option',
    },
    {
      name: '--select-selected-bg',
      default: 'var(--surface-dropdown-item-selected-bg)',
      description: 'Background of the chosen option',
    },
    {
      name: '--select-description-color',
      default: 'var(--color-text-muted)',
      description: "Colour of an option's description",
    },
    {
      name: '--select-image-size',
      default: '1.5rem',
      description: "Width and height of an option's thumbnail",
    },
    {
      name: '--select-disabled-opacity',
      default: 'var(--form-control-disabled-opacity, 0.3)',
      description: 'Opacity while the select is disabled',
    },
    {
      name: '--menu-bg',
      default: 'var(--surface-dropdown-color-bg)',
      description: 'List background',
    },
    {
      name: '--menu-border-color',
      default: 'var(--surface-dropdown-border-color)',
      description: 'List border colour',
    },
    { name: '--menu-border-radius', description: 'List corner radius' },
    {
      name: '--menu-shadow',
      default: 'var(--surface-dropdown-shadow)',
      description: 'List shadow',
    },
  ],
  examples: [
    {
      id: 'form',
      title: 'In a form',
      markup: `<form class="form" action="#chosen">
  <div class="form__group">
    <label class="form__label" for="dining-area">Dining area</label>
    <div class="form__control">
      <p-select id="dining-area" name="area" placeholder="Choose an area" required>
        <optgroup label="Inside">
          <option value="bar">Bar</option>
          <option value="main">Main room</option>
        </optgroup>
        <optgroup label="Outside">
          <option value="terrace" selected>Terrace</option>
          <option value="garden" disabled>Garden (closed for winter)</option>
        </optgroup>
      </p-select>
    </div>
  </div>
  <div class="form__actions">
    <button type="submit">Continue</button>
    <button type="reset">Reset</button>
  </div>
</form>`,
      controls: [
        { attribute: 'placeholder' },
        { attribute: 'required' },
        { attribute: 'disabled' },
        { attribute: 'data-select-open-on-focus' },
      ],
    },
    {
      id: 'people',
      title: 'People',
      description:
        'An option can carry more than its label: `data-secondary` is shown muted after the label and searched with it, so typing an email finds the person; `data-description` is a smaller line beneath; `data-image` is a round thumbnail before the text. The input shows the label alone once someone is chosen. Remote options carry the same fields as `secondary`, `description` and `image`.',
      markup: `<div class="form">
  <div class="form__group">
    <label class="form__label" for="owner">Owner</label>
    <div class="form__control">
      <p-select id="owner" name="owner" placeholder="Choose an owner">
        <option
          value="amelia"
          data-secondary="amelia@example.com"
          data-description="Account manager, Sydney"
          data-image="images/harbour-640.jpg"
        >
          Amelia Nguyen
        </option>
        <option
          value="hudson"
          data-secondary="hudson@example.com"
          data-description="Head chef, Melbourne"
          data-image="images/kitchen-640.jpg"
        >
          Hudson Ferraro
        </option>
        <option
          value="priya"
          data-secondary="priya@example.com"
          data-description="Events, Brisbane"
          data-image="images/terrace-640.jpg"
        >
          Priya Rahman
        </option>
        <option value="unassigned" data-description="Leave the record with no owner">Unassigned</option>
      </p-select>
    </div>
  </div>
</div>`,
      controls: [{ attribute: 'placeholder' }, { attribute: 'data-select-open-on-focus' }],
    },
    {
      id: 'long-list',
      title: 'A long list',
      description:
        'Around a hundred options, loaded from a URL so the sample stays readable. The list scrolls once it outgrows its maximum height, typing narrows it and the arrow keys, Page Up and Page Down walk it. With `data-select-min="0"` the options arrive as soon as the list opens.',
      markup: `<div class="form">
  <div class="form__group">
    <label class="form__label" for="delivery-suburb">Delivery suburb</label>
    <div class="form__control">
      <p-select
        id="delivery-suburb"
        name="suburb"
        placeholder="Choose a suburb"
        data-select-src="/api/places?q={q}"
        data-select-min="0"
      ></p-select>
    </div>
  </div>
</div>`,
      controls: [
        { attribute: 'placeholder' },
        { attribute: 'data-select-min' },
        { attribute: 'data-select-open-on-focus' },
      ],
    },
    {
      id: 'remote-search',
      title: 'Searching a database',
      description:
        'The search runs on the server: each query is sent to `data-select-src` with `{q}` replaced by the typed text, and the options that come back replace the list. The URL also carries `{page}` and `{limit}`, so the server sends a page at a time — 25 rows here, from `data-select-limit` — and answers `more: true` while there are further pages; scrolling to the end of the list, or arrowing onto its last row, asks for the next one. Each row carries an email as its `secondary` and a role as its `description`, so the list shows both and a search on `nguyen`, `perth` or an address like `noah.tran` finds its person. Type two characters to start a search, and the list shows its busy state while the request is out and "No results found" when nothing matches.',
      markup: `<div class="form">
  <div class="form__group">
    <label class="form__label" for="customer">Customer</label>
    <div class="form__control">
      <p-select
        id="customer"
        name="customer"
        placeholder="Search customers"
        data-select-src="/api/directory?q={q}&page={page}&limit={limit}"
        data-select-min="2"
        data-select-debounce="300"
      ></p-select>
    </div>
  </div>
</div>`,
      controls: [
        { attribute: 'placeholder' },
        { attribute: 'data-select-min' },
        { attribute: 'data-select-debounce' },
        { attribute: 'data-select-limit' },
      ],
    },
  ],
};
