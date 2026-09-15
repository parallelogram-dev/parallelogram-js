const FORMATS = [
  'iso',
  'iso-tz',
  'iso-datetime',
  'iso-datetime-tz',
  'us-date',
  'us-datetime',
  'eu-date',
  'eu-datetime',
  'mysql',
];

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PDatetime',
  kind: 'element',
  tag: 'p-datetime',
  module: 'components/PDatetime',
  summary: 'Date, time and date range picker with a calendar dialog',
  description: `The value fields and the calendar button open a dialog with a day grid and, in datetime and time modes, time selects. Values are local and follow the native inputs: \`yyyy-mm-dd\` in date mode, \`yyyy-mm-ddThh:mm\` in datetime mode like \`datetime-local\`, and \`hh:mm\` in time mode, with \`:ss\` when the seconds are set. An ISO instant with \`Z\` or an offset is read as the local date and time it stands for. The element is form-associated: it submits its value, and in range mode the end of the range under \`range-to\`, in that format or the one \`format\` names.

\`min\` and \`max\` disable days outside them, and \`min-from-field\` and \`max-from-field\` follow another field, such as a check-in date limiting check-out.`,
  attributes: [
    {
      name: 'mode',
      type: 'enum',
      options: ['date', 'datetime', 'time'],
      default: 'date',
      property: 'mode',
      description: 'What the picker chooses',
    },
    {
      name: 'value',
      type: 'string',
      property: 'value',
      description:
        'The value, or the start of the range, in local time: yyyy-mm-dd in date mode, yyyy-mm-ddThh:mm in datetime mode and hh:mm in time mode. An ISO instant with Z or an offset is read as the local date and time',
    },
    { name: 'name', type: 'string', property: 'name', description: 'The form field name' },
    {
      name: 'time-format',
      type: 'enum',
      options: ['12', '24'],
      default: '24',
      property: 'timeFormat',
      description: 'Hour format of the time selects',
    },
    {
      name: 'show-quick-dates',
      type: 'flag',
      property: 'showQuickDates',
      description: 'Show quick date buttons',
    },
    {
      name: 'quick-dates',
      type: 'string',
      default: 'yesterday,today,tomorrow',
      property: 'quickDates',
      description: 'Comma-separated quick dates',
    },
    { name: 'range', type: 'flag', property: 'range', description: 'Choose a start and end' },
    {
      name: 'range-to',
      type: 'string',
      property: 'rangeTo',
      description: 'Form field name for the end of the range',
    },
    {
      name: 'range-to-value',
      type: 'string',
      property: 'rangeToValue',
      description: 'The end of the range, in the same format as value',
    },
    {
      name: 'from-label',
      type: 'string',
      default: 'From',
      property: 'fromLabel',
      description: 'Label for the start of the range',
    },
    {
      name: 'to-label',
      type: 'string',
      default: 'To',
      property: 'toLabel',
      description: 'Label for the end of the range',
    },
    {
      name: 'min',
      type: 'string',
      property: 'min',
      description: 'Earliest selectable date, as yyyy-mm-dd, a local date and time, or ISO',
    },
    {
      name: 'max',
      type: 'string',
      property: 'max',
      description: 'Latest selectable date, as yyyy-mm-dd, a local date and time, or ISO',
    },
    {
      name: 'min-from-field',
      type: 'string',
      property: 'minFromField',
      description: 'Name of a field whose value also sets the earliest date',
    },
    {
      name: 'max-from-field',
      type: 'string',
      property: 'maxFromField',
      description: 'Name of a field whose value also sets the latest date',
    },
    {
      name: 'format',
      type: 'string',
      property: 'format',
      description: `Format of the submitted value: ${FORMATS.join(', ')}, or tokens yyyy mm dd hh ii ss tz tzz`,
    },
    {
      name: 'required',
      type: 'flag',
      property: 'required',
      description: 'The value, both ends in range mode, must be set for the form to submit',
    },
    {
      name: 'disabled',
      type: 'flag',
      property: 'disabled',
      description: 'Disables the picker; a disabled fieldset does the same',
    },
  ],
  properties: [
    {
      name: 'value',
      type: 'string',
      description:
        'The value, or the start of the range, as a local string in the format of the mode',
    },
    {
      name: 'rangeToValue',
      type: 'string',
      description: 'The end of the range, in the same format as value',
    },
    { name: 'range', type: 'boolean', description: 'Reflects the range attribute' },
    {
      name: 'form',
      type: 'HTMLFormElement | null',
      readonly: true,
      description: 'The owning form',
    },
    { name: 'validity', type: 'ValidityState', readonly: true, description: 'The validity state' },
  ],
  methods: [
    { name: 'open', signature: '() => void', description: 'Open the calendar dialog' },
    {
      name: 'close',
      signature: '(options?: { returnFocus?: boolean }) => void',
      description: 'Close the dialog, optionally returning focus to the control that opened it',
    },
    { name: 'toggle', signature: '() => void', description: 'Open or close the dialog' },
    { name: 'checkValidity', signature: '() => boolean', description: 'Check the value' },
    {
      name: 'reportValidity',
      signature: '() => boolean',
      description: 'Check the value and show the browser message',
    },
  ],
  events: [
    {
      name: 'change',
      detail: '{ value: string; complete: boolean; toValue?: string; from?: string; to?: string }',
      description:
        'The value changed; complete is true once both ends of a range are set. Bubbles out of shadow roots',
    },
    {
      name: 'p-datetime:open',
      detail: '{ value: string; toValue?: string }',
      description: 'The dialog opened',
    },
    {
      name: 'p-datetime:close',
      detail: '{ changed: boolean; value: string; toValue?: string }',
      description: 'The dialog closed; changed says whether the value differs from when it opened',
    },
  ],
  cssProperties: [
    {
      name: '--datetime-accent',
      default: 'var(--color-accent)',
      description: 'Selected days, focus rings and primary buttons',
    },
    {
      name: '--datetime-bg',
      default: 'var(--surface-dropdown-color-bg)',
      description: 'Field and panel background',
    },
    { name: '--datetime-text', default: 'currentColor', description: 'Text colour' },
    { name: '--datetime-muted', default: 'var(--color-text-muted)', description: 'Muted text' },
    {
      name: '--datetime-border',
      default: 'var(--color-border)',
      description: 'Field and panel border',
    },
    { name: '--datetime-radius', description: 'Corner radius' },
    {
      name: '--datetime-shadow',
      default: '0 4px 6px var(--color-shadow)',
      description: 'Panel shadow',
    },
    {
      name: '--datetime-hover',
      default: 'var(--color-hover)',
      description: 'Background of hovered days and buttons',
    },
    { name: '--datetime-cell-size', description: 'Size of each day in the grid' },
    { name: '--datetime-panel-min-width', description: 'Narrowest the panel gets' },
    { name: '--datetime-animation-duration', description: 'Length of the panel animation' },
  ],
  accessibility:
    'In the day grid the arrow keys move by day and week, Home and End go to the start and end of the week, Page Up and Page Down change month (with Shift, year), Enter or Space picks the focused day, and Escape closes the dialog and returns focus. In the month and year views the arrow keys move between months or years, and Home and End go to the start and end of the row. Moving focus outside the picker closes the dialog.',
  examples: [
    {
      id: 'date',
      title: 'Booking date',
      markup: `<form class="form" action="#chosen">
  <label for="visit-date">Date</label>
  <p-datetime id="visit-date" name="date" mode="date" show-quick-dates required></p-datetime>
  <button type="submit">Continue</button>
</form>`,
      controls: [
        { attribute: 'mode' },
        { attribute: 'time-format' },
        { attribute: 'show-quick-dates' },
        { attribute: 'required' },
        { attribute: 'disabled' },
      ],
    },
    {
      id: 'datetime',
      title: 'Appointment',
      description:
        'Submits the local date and time chosen, such as `2024-01-15T14:30`, as `<input type="datetime-local">` does. In time mode it submits `hh:mm`, and `format` changes what is sent.',
      markup: `<form class="form" action="#chosen">
  <label for="appointment">Appointment</label>
  <p-datetime id="appointment" name="appointment" mode="datetime" value="2024-01-15T14:30"></p-datetime>
  <button type="submit">Book</button>
</form>`,
      controls: [{ attribute: 'mode' }, { attribute: 'time-format' }, { attribute: 'format' }],
    },
    {
      id: 'range',
      title: 'Stay dates',
      markup: `<form class="form" action="#chosen">
  <p-datetime name="check-in" range range-to="check-out" from-label="Check in" to-label="Check out"></p-datetime>
  <button type="submit">Search rooms</button>
</form>`,
      controls: [{ attribute: 'from-label' }, { attribute: 'to-label' }],
    },
  ],
};
