/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'PUploader',
  kind: 'element',
  tag: 'p-uploader',
  module: 'components/PUploader',
  summary: 'Upload, order and describe a set of files',
  description: `Files are added by dropping them or through a button that opens the file picker, and each one uploads as multipart form data with its progress shown. Existing files are \`<p-uploader-file>\` children. Each feature appears only when its server address is set: uploading, editing fields, deleting and reordering.

With a sequence-action, each file has Move up and Move down buttons as a keyboard alternative to dragging. With \`max-files="1"\` and an upload-action, each file has a Replace button. Fields are shown only when \`<p-uploader-fields>\` declares them, and every field is edited in a panel that slides over the card's details. Requests send an \`X-CSRF-Token\` header from \`<meta name="csrf-token">\` unless \`requestHeaders\` is set.

The upload endpoint must answer with JSON carrying an \`id\`, which is written to the file's \`file-id\` and is the id every later update, delete and sequence request sends. Without it an upload looks like it worked and nothing that follows can name the file. A \`preview\` in the same response becomes the card's thumbnail, which is worth returning for a file the browser cannot draw itself. Everything else in the response is kept and passed to \`p-uploader:upload-success\` as \`response\`.

A failed request is read for something worth showing: JSON contributes its \`message\` or \`error\`, plain text is used as it is when it is under 200 characters and contains no \`<\`, and anything else -- an HTML error page, or a 2xx whose body will not parse -- falls back to the generic message, so a stack trace never reaches the page.`,
  withoutJs: `The file input lives in this element's shadow root, so before the module loads there is no way to choose a file, and \`<p-uploader-file>\` children show nothing. The package stylesheet hides the element while scripts are running. An upload posts to its own endpoint rather than with the surrounding form, so there is nothing here to fall back to: where uploading has to work without scripts, render an ordinary \`<input type="file">\` form and use this element in place of it once the module is in.`,
  attributes: [
    {
      name: 'upload-action',
      type: 'url',
      description:
        'Receives each new file as multipart form data and must answer with JSON carrying an id; files can be added only when set',
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
    {
      name: 'add-label',
      type: 'string',
      default: 'Drag/Add files',
      option: 'addLabel',
      description: 'The drop zone, when more than one file may be added',
    },
    {
      name: 'add-one-label',
      type: 'string',
      default: 'Drag/Add file',
      option: 'addOneLabel',
      description: 'The drop zone when max-files is 1',
    },
    {
      name: 'no-action-message',
      type: 'string',
      default: 'Files can’t be added because no upload-action is set.',
      option: 'noActionMessage',
      description: 'Shown when a file is added and there is no upload-action',
    },
    {
      name: 'too-large-message',
      type: 'string',
      default: '{file} is larger than {size}.',
      option: 'tooLargeMessage',
      description: 'Shown for a file over max-file-size, with {file} its name and {size} the limit',
    },
    {
      name: 'wrong-type-message',
      type: 'string',
      default: '{file} isn’t an accepted file type.',
      option: 'wrongTypeMessage',
      description: 'Shown for a file outside accept-types',
    },
    {
      name: 'limit-message',
      type: 'string',
      default: 'You can add up to {count} files.',
      option: 'limitMessage',
      description: 'Shown for files beyond max-files, with {count} the limit',
    },
    {
      name: 'limit-one-message',
      type: 'string',
      default: 'You can add up to {count} file.',
      option: 'limitOneMessage',
      description: 'The same when max-files is 1',
    },
    {
      name: 'moved-message',
      type: 'string',
      default: 'Moved {file} to position {position} of {count}.',
      option: 'movedMessage',
      description: 'Announced after a file is moved',
    },
    {
      name: 'unnamed-file',
      type: 'string',
      default: 'the file',
      option: 'unnamedFile',
      description: 'Stands for {file} in that message when the file has no name',
    },
    {
      name: 'order-error',
      type: 'string',
      default: 'The new order couldn’t be saved, so the files are back in their previous order.',
      option: 'orderError',
      description: 'Shown when sequence-action fails',
    },
    {
      name: 'upload-error',
      type: 'string',
      default: 'Upload failed',
      option: 'uploadError',
      description: 'Shown on a card whose upload failed with a response carrying no message',
    },
    {
      name: 'invalid-response-message',
      type: 'string',
      default: 'Invalid server response',
      option: 'invalidResponseMessage',
      description: 'Shown on a card whose upload answered with something that is not JSON',
    },
    {
      name: 'server-error',
      type: 'string',
      default: 'Server error',
      option: 'serverError',
      description: 'The same for a failed save or delete',
    },
    {
      name: 'delete-error',
      type: 'string',
      default: 'Delete failed: {error}',
      option: 'deleteError',
      description: 'Shown on a card whose delete failed, with {error} the reason',
    },
    {
      name: 'save-error',
      type: 'string',
      default: 'Changes couldn’t be saved: {error}',
      option: 'saveError',
      description: 'Shown in the edit panel when a save fails',
    },
    {
      name: 'progress-label',
      type: 'string',
      default: 'Upload progress',
      option: 'progressLabel',
      description: 'The accessible name of the progress bar',
    },
    {
      name: 'delete-heading',
      type: 'string',
      default: 'Delete this file?',
      option: 'deleteHeading',
      description: 'The delete panel’s heading',
    },
    {
      name: 'cancel-delete-label',
      type: 'string',
      default: 'Cancel delete',
      option: 'cancelDeleteLabel',
      description: 'The delete panel’s cancel button',
    },
    {
      name: 'confirm-delete-label',
      type: 'string',
      default: 'Confirm delete',
      option: 'confirmDeleteLabel',
      description: 'The delete panel’s confirm button',
    },
    {
      name: 'edit-label',
      type: 'string',
      default: 'Edit details',
      option: 'editLabel',
      description: 'The edit button, and the accessible name of the edit panel',
    },
    {
      name: 'cancel-edit-label',
      type: 'string',
      default: 'Cancel editing',
      option: 'cancelEditLabel',
      description: 'The edit panel’s cancel button',
    },
    {
      name: 'save-label',
      type: 'string',
      default: 'Save details',
      option: 'saveLabel',
      description: 'The edit panel’s save button',
    },
    {
      name: 'remove-label',
      type: 'string',
      default: 'Remove file',
      option: 'removeLabel',
      description: 'The button that removes a card whose upload failed',
    },
    {
      name: 'cancel-upload-label',
      type: 'string',
      default: 'Cancel',
      option: 'cancelUploadLabel',
      description: 'The button that cancels a failed delete',
    },
    {
      name: 'move-up-label',
      type: 'string',
      default: 'Move up',
      option: 'moveUpLabel',
      description: 'The move up button',
    },
    {
      name: 'move-down-label',
      type: 'string',
      default: 'Move down',
      option: 'moveDownLabel',
      description: 'The move down button',
    },
    {
      name: 'replace-label',
      type: 'string',
      default: 'Replace',
      option: 'replaceLabel',
      description: 'The replace button',
    },
    {
      name: 'delete-label',
      type: 'string',
      default: 'Delete file',
      option: 'deleteLabel',
      description: 'The button that opens the delete panel',
    },
    {
      name: 'file-info-label',
      type: 'string',
      default: 'File information for {file}',
      option: 'fileInfoLabel',
      description: 'The accessible name of the card’s info panel, with {file} its name',
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
    { name: '--uploader-radius', description: 'Corner radius' },
    { name: '--uploader-border-width', description: 'Border width' },
    {
      name: '--uploader-border-color',
      default: 'var(--surface-panel-border-color)',
      description: 'Border colour: the panel border colour',
    },
    {
      name: '--uploader-bg',
      default: 'var(--surface-panel-color-bg)',
      description: 'Background: the panel surface',
    },
    {
      name: '--uploader-color',
      default: 'var(--surface-panel-color-text)',
      description: "Text colour: the panel text colour, which is the page's text colour",
    },
    {
      name: '--uploader-shadow',
      default: 'var(--surface-panel-shadow)',
      description: 'Shadow: the panel shadow',
    },
    { name: '--uploader-padding', description: 'Padding' },
    { name: '--uploader-files-gap', description: 'Space between files' },
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
        {
          name: 'toolbar',
          description: 'The Move up and Move down buttons; absent when neither is allowed',
        },
        {
          name: 'pills',
          description: 'The Edit, Replace and Delete buttons, as one segmented pill',
        },
        { name: 'actions', description: 'Button rows in panels' },
        { name: 'edit-button', description: 'The Edit button' },
        { name: 'replace-button', description: 'The Replace button' },
        { name: 'delete-button', description: 'The Delete button that asks for confirmation' },
        { name: 'move-up-button', description: 'The Move up button' },
        { name: 'move-down-button', description: 'The Move down button' },
        { name: 'cancel-button', description: 'The button that backs out of a panel' },
        { name: 'confirm-button', description: 'The button that confirms a delete' },
        { name: 'save-button', description: 'The button that saves the edited fields' },
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
