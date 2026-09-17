/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PUploader',
  kind: 'element',
  tag: 'p-uploader',
  module: 'components/PUploader',
  summary: 'Upload, order and describe a set of files',
  description: `Files are added by dropping them or through a button that opens the file picker, and each one uploads as multipart form data with its progress shown. Existing files are \`<p-uploader-file>\` children. Each feature appears only when its server address is set: uploading, editing fields, deleting and reordering.

With a sequence-action, each file has Move up and Move down buttons as a keyboard alternative to dragging. With \`max-files="1"\` and an upload-action, each file has a Replace button. Fields are shown only when \`<p-uploader-fields>\` declares them, and every field is edited in a panel that slides over the card's details. Requests send an \`X-CSRF-Token\` header from \`<meta name="csrf-token">\` unless \`requestHeaders\` is set.`,
  withoutJs: `The file input lives in this element's shadow root, so before the module loads there is no way to choose a file, and \`<p-uploader-file>\` children show nothing. The package stylesheet hides the element while scripts are running. An upload posts to its own endpoint rather than with the surrounding form, so there is nothing here to fall back to: where uploading has to work without scripts, render an ordinary \`<input type="file">\` form and use this element in place of it once the module is in.`,
  attributes: [
    {
      name: 'upload-action',
      type: 'url',
      description:
        'Receives each new file as multipart form data; files can be added only when set',
    },
    {
      name: 'update-action',
      type: 'url',
      description: 'Receives { id, field, value } as JSON when a field is saved',
    },
    {
      name: 'delete-action',
      type: 'url',
      description: 'Receives { id } as JSON when a file is deleted',
    },
    {
      name: 'sequence-action',
      type: 'url',
      description: 'Receives { sequence: [ids] } as JSON after files are reordered',
    },
    { name: 'max-files', type: 'number', default: 5, description: 'Most files allowed' },
    {
      name: 'accept-types',
      type: 'string',
      description:
        'Comma-separated MIME types, wildcards such as image/* or extensions such as .pdf',
    },
    {
      name: 'max-file-size',
      type: 'number',
      default: 10485760,
      description: 'Largest accepted file in bytes',
    },
    {
      name: 'input-name',
      type: 'string',
      default: 'file',
      description: 'Form data name each file is sent under',
    },
    {
      name: 'allow-edit',
      type: 'boolean',
      default: true,
      description: 'false or 0 turns off editing and deleting',
    },
    {
      name: 'allow-sort',
      type: 'boolean',
      default: true,
      description: 'false or 0 turns off reordering',
    },
    {
      name: 'full',
      type: 'flag',
      readonly: true,
      description: 'Set while the uploader holds max-files files; the drop zone is hidden',
    },
    {
      name: 'stacked',
      type: 'flag',
      description: 'Join the files into one list, rounding only its outer corners',
    },
  ],
  properties: [
    {
      name: 'requestHeaders',
      type: 'Record<string, string> | (() => Record<string, string>) | null',
      description: 'Headers sent with every request',
    },
  ],
  methods: [
    {
      name: 'getFieldSchema',
      signature:
        '() => Array<{ key: string; label: string; type: string; required: boolean; maxlength: number | null }>',
      description: 'The fields declared by <p-uploader-fields>',
    },
  ],
  events: [
    {
      name: 'p-uploader:upload-success',
      detail: '{ fileId: string; response: unknown }',
      description: 'A file finished uploading',
    },
    {
      name: 'p-uploader:upload-error',
      detail: '{ fileId: string; error: string }',
      description: 'A file failed to upload',
    },
    {
      name: 'p-uploader:sequence-update',
      detail: '{ sequence: string[] }',
      description: 'A new order was saved',
    },
    {
      name: 'p-uploader:limit',
      cancelable: true,
      detail: '{ maxFiles: number; accepted: File[]; rejected: File[] }',
      description: 'Files went beyond max-files; cancel it to show your own message',
    },
    {
      name: 'p-uploader:reject',
      cancelable: true,
      detail: "{ file: File; reason: 'type' | 'size' }",
      description: 'A file was refused; cancel it to show your own message',
    },
  ],
  slots: [
    { name: '', description: 'The <p-uploader-file> elements' },
    { name: 'field-definitions', description: 'A <p-uploader-fields> element' },
  ],
  parts: [
    { name: 'files', description: 'The list of files' },
    { name: 'selector', description: 'The drop zone' },
    { name: 'add-button', description: 'The button that opens the file picker' },
    { name: 'drag-chip', description: 'The chip that follows the cursor while a file is dragged' },
    { name: 'message', description: 'Messages about refused files and failed saves' },
  ],
  cssProperties: [
    { name: '--puploader-radius', description: 'Corner radius' },
    { name: '--puploader-border-width', description: 'Border width' },
    {
      name: '--puploader-border-color',
      default: 'var(--surface-panel-border-color)',
      description: 'Border colour: the panel border colour',
    },
    {
      name: '--puploader-bg',
      default: 'var(--surface-panel-color-bg)',
      description: 'Background: the panel surface',
    },
    {
      name: '--puploader-color',
      default: 'var(--surface-panel-color-text)',
      description: "Text colour: the panel text colour, which is the page's text colour",
    },
    {
      name: '--puploader-shadow',
      default: 'var(--surface-panel-shadow)',
      description: 'Shadow: the panel shadow',
    },
    { name: '--puploader-padding', description: 'Padding' },
    { name: '--puploader-files-gap', description: 'Space between files' },
    { name: '--uploader-file-radius-start', description: 'Top corners of a file card' },
    { name: '--uploader-file-radius-end', description: 'Bottom corners of a file card' },
  ],
  elements: [
    {
      tag: 'p-uploader-file',
      module: 'components/PUploaderFile',
      description: 'A file, uploaded or existing, with its preview, fields and actions',
      attributes: [
        { name: 'file-id', type: 'string', description: "The file's id on the server" },
        { name: 'filename', type: 'string', description: 'The file name shown on the card' },
        { name: 'preview', type: 'url', description: 'A preview image' },
        {
          name: 'state',
          type: 'enum',
          options: ['uploading', 'uploaded', 'error'],
          default: 'uploaded',
          description: 'Upload progress',
        },
        { name: 'progress', type: 'number', description: 'Upload progress from 0 to 100' },
        { name: 'error', type: 'string', description: 'Why the upload failed' },
        {
          name: 'allow-edit',
          type: 'boolean',
          default: true,
          description: 'false or 0 turns off editing and deleting for this file',
        },
        {
          name: 'data-current-panel',
          type: 'enum',
          options: ['info', 'error', 'edit', 'delete'],
          default: 'info',
          readonly: true,
          description: 'The panel the card shows',
        },
      ],
      events: [
        {
          name: 'p-uploader-file:update',
          detail: '{ fileId: string; field: string; value: string }',
          description: 'A field was saved',
        },
        {
          name: 'p-uploader-file:delete',
          detail: '{ fileId: string }',
          description: 'The file was deleted',
        },
      ],
      parts: [
        { name: 'preview', description: 'The preview image' },
        { name: 'progress', description: 'The upload progress bar' },
        { name: 'panel', description: 'Each panel: details, error, edit and delete confirmation' },
        { name: 'fields', description: 'The field list' },
        { name: 'field', description: 'Each field' },
        { name: 'filename', description: 'The file name' },
        { name: 'toolbar', description: 'The action buttons' },
        { name: 'pills', description: 'The Edit and Delete buttons, as one segmented pill' },
        { name: 'actions', description: 'Button rows in panels' },
        { name: 'edit-button', description: 'The Edit button' },
        { name: 'edit-panel', description: 'The panel holding the edit form' },
      ],
      slots: [
        { name: '', description: "The <p-uploader-data> elements holding the file's values" },
      ],
    },
    {
      tag: 'p-uploader-fields',
      description: 'Holds the field definitions; put it in the field-definitions slot',
    },
    {
      tag: 'p-uploader-field',
      description: 'Declares a field every file has',
      attributes: [
        { name: 'key', type: 'string', required: true, description: "The field's key" },
        { name: 'label', type: 'string', description: "The field's label" },
        {
          name: 'type',
          type: 'enum',
          options: ['text', 'textarea'],
          default: 'text',
          description: 'The input used to edit it',
        },
        { name: 'required', type: 'flag', description: 'The field must have a value' },
        { name: 'maxlength', type: 'number', description: 'Longest value allowed' },
      ],
    },
    {
      tag: 'p-uploader-data',
      description: "A file's value for one field, as text content",
      attributes: [{ name: 'key', type: 'string', required: true, description: "The field's key" }],
    },
  ],
  examples: [
    {
      id: 'gallery',
      title: 'Venue photos',
      description: 'Uploads, saves and deletes go to a mock server in this site.',
      markup: `<p-uploader
  max-files="4"
  accept-types="image/*"
  upload-action="/api/upload"
  update-action="/api/update"
  delete-action="/api/delete"
  sequence-action="/api/sequence"
>
  <p-uploader-fields slot="field-definitions">
    <p-uploader-field key="title" label="Title" required></p-uploader-field>
    <p-uploader-field key="caption" label="Caption" type="textarea"></p-uploader-field>
  </p-uploader-fields>

  <p-uploader-file file-id="terrace" filename="terrace.jpg" preview="images/terrace-640.jpg">
    <p-uploader-data key="title">The terrace</p-uploader-data>
    <p-uploader-data key="caption">Seats forty under heaters</p-uploader-data>
  </p-uploader-file>
  <p-uploader-file file-id="kitchen" filename="kitchen.jpg" preview="images/kitchen-640.jpg">
    <p-uploader-data key="title">The kitchen</p-uploader-data>
  </p-uploader-file>
</p-uploader>`,
      controls: [
        { attribute: 'max-files' },
        { attribute: 'allow-edit' },
        { attribute: 'allow-sort' },
        { attribute: 'stacked' },
      ],
    },
  ],
};
