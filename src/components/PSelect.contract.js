/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PSelect',
  kind: 'element',
  tag: 'p-select',
  module: 'components/PSelect',
  summary: 'A select that can be searched, built as an editable combobox',
  description: `Follows the WAI-ARIA combobox pattern with list autocomplete. The text input carries the combobox role and is named after the element's \`aria-label\` or its \`<label for>\`. Typing filters the options and announces how many match; the arrow keys, Home and End move through them; Enter or Tab chooses the highlighted option; Escape closes the list and puts the chosen label back.

Options come from \`<option>\` and \`<optgroup>\` children, which are watched for changes, or from a URL that returns JSON: an array of \`{ value, label, disabled?, group? }\`, or an object with those in \`options\`. The element is form-associated: it submits its value under its \`name\`, supports \`required\`, and restores its \`value\` attribute, or else its selected option, when the form resets.`,
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
      description: 'URL for remote options, with {q} replaced by the search text',
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
        '(options: Array<{ value: string; label: string; disabled?: boolean; group?: string }>) => void',
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
      detail: '{ value: string; label: string }',
      description: 'A different option was chosen; bubbles out of shadow roots',
    },
    { name: 'p-select:open', description: 'The list opened' },
    { name: 'p-select:close', description: 'The list closed' },
  ],
  parts: [
    { name: 'input', description: 'The text input' },
    { name: 'listbox', description: 'The list of options' },
  ],
  cssProperties: [
    { name: '--select-text', description: 'Text colour' },
    { name: '--select-border-color', description: 'Input border colour' },
    { name: '--select-focus-color', description: 'Focus ring colour' },
    { name: '--select-hover-bg', description: 'Background of a hovered option' },
    { name: '--select-current-bg', description: 'Background of the highlighted option' },
    { name: '--select-selected-bg', description: 'Background of the chosen option' },
    { name: '--menu-bg', description: 'List background' },
    { name: '--menu-border-color', description: 'List border colour' },
    { name: '--menu-border-radius', description: 'List corner radius' },
    { name: '--menu-shadow', description: 'List shadow' },
  ],
  examples: [
    {
      id: 'form',
      title: 'In a form',
      markup: `<form class="form" action="#chosen">
  <label for="dining-area">Dining area</label>
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
  <button type="submit">Continue</button>
  <button type="reset">Reset</button>
</form>`,
      controls: [
        { attribute: 'placeholder' },
        { attribute: 'required' },
        { attribute: 'disabled' },
        { attribute: 'data-select-open-on-focus' },
      ],
    },
  ],
};
