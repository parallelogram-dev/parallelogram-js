import { generateId } from '../utils/dom-utils.js';
import hostStyles from '../styles/framework/components/PUploaderHost.scss';
import { adoptStyles, setStaticHTML } from '../utils/shadow.js';
import { dispatchComponentEvent } from '../utils/events.js';
import { boolAttr, errorMessage } from '../utils/uploader.js';
import { PUploaderFile } from './PUploaderFile.js';

export { PUploaderFile };

/**
 * A byte count as a short size such as `5 MB`
 */
const formatBytes = bytes => {
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${Number(size.toFixed(1))} ${units[unit]}`;
};

/**
 * PUploader - uploads, orders and describes a set of files
 *
 * @usage
 * <p-uploader
 *   max-files="5"
 *   upload-action="/api/upload"
 *   update-action="/api/update"
 *   delete-action="/api/delete"
 *   sequence-action="/api/sequence"
 *   accept-types="image/*"
 *   max-file-size="5242880"
 * >
 *   <p-uploader-fields slot="field-definitions">
 *     <p-uploader-field key="title" label="Title" type="text" required></p-uploader-field>
 *     <p-uploader-field key="caption" label="Caption" type="textarea"></p-uploader-field>
 *   </p-uploader-fields>
 *
 *   <p-uploader-file file-id="existing1" filename="image.jpg" preview="https://...">
 *     <p-uploader-data key="title">My Title</p-uploader-data>
 *     <p-uploader-data key="caption">My Caption</p-uploader-data>
 *   </p-uploader-file>
 * </p-uploader>
 *
 * @attributes
 * - upload-action: URL that receives each new file as multipart form data. Files can only be added
 *   when it is set.
 * - update-action: URL that receives `{ id, field, value }` as JSON when a field is saved. Editing is
 *   offered only when it is set.
 * - delete-action: URL that receives `{ id }` as JSON when a file is deleted. Deleting is offered only
 *   when it is set.
 * - sequence-action: URL that receives `{ sequence: [ids] }` as JSON after files are reordered.
 *   Reordering is offered only when it is set.
 * - max-files: number (default 5)
 * - accept-types: comma-separated MIME types, wildcards (`image/*`) or extensions (`.pdf`)
 *   (default any type)
 * - max-file-size: largest accepted file in bytes (default 10 MB)
 * - input-name: form data name each uploaded file is sent under (default `file`)
 * - allow-edit: `"false"` or `"0"` turns off editing and deleting
 * - allow-sort: `"false"` or `"0"` turns off reordering
 * - full: set by the component while it holds `max-files` files; the drop zone is hidden meanwhile
 * - stacked: joins the files into one list with no gap, rounding only its outer corners
 *
 * With a sequence-action, each file has Move up and Move down buttons as a keyboard alternative to
 * dragging. With max-files="1" and an upload-action, each file has a Replace button, and the new
 * file takes the old one's place (deleted through delete-action) once it has uploaded.
 *
 * @properties
 * - requestHeaders: headers for every request, as an object or a function returning one. Without it,
 *   an `X-CSRF-Token` header is sent from `<meta name="csrf-token">` when the page has one.
 *
 * @events
 * Events bubble out of shadow roots.
 * - p-uploader:upload-success, p-uploader:upload-error: a file finished uploading, with
 *   `{ fileId, response }` or `{ fileId, error }`
 * - p-uploader:sequence-update: a new order was saved, with `{ sequence }`
 * - p-uploader-file:update, p-uploader-file:delete: dispatched by `p-uploader-file` after a save,
 *   with `{ fileId, field, value }`, or a delete, with `{ fileId }`
 * - p-uploader:limit: files went beyond `max-files`; cancelable, with `{ maxFiles, accepted, rejected }`.
 *   Cancel it to show your own message.
 * - p-uploader:reject: a file was refused; cancelable, with `{ file, reason }` where reason is
 *   `"type"` or `"size"`
 *
 * @csspart files - the list of files
 * @csspart selector - the drop zone
 * @csspart add-button - the button that opens the file picker
 * @csspart message - messages about refused files and failed saves
 *
 * @cssprop --puploader-radius - host corner radius
 * @cssprop --puploader-border-width - host border width
 * @cssprop --puploader-border-color - host border colour
 * @cssprop --puploader-bg - host background
 * @cssprop --puploader-color - host text colour
 * @cssprop --puploader-shadow - host shadow
 * @cssprop --puploader-padding - host padding
 * @cssprop --puploader-files-gap - space between files (default the small spacing step)
 *
 * Files are `p-uploader-file` elements, which expose the parts `preview`, `progress`, `panel`,
 * `fields`, `field`, `filename`, `toolbar`, `actions`, `edit-button` and `dialog`. Fields are shown only when
 * `p-uploader-fields` declares them; read-only files hide fields that have no value, and
 * editable files edit every field in one dialog.
 */
export default class PUploader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /* File tracking */
    this.files = new Map();
    this.fieldSchema = null;
    this.draggedElement = null;
    this.draggedOverElement = null;
    this.XHRConstructor = null;
    this.eventBus = null;
    this.logger = null;
    this.requestHeaders = null;
    this._inFlight = new Set();
    this._dropAccepted = false;

    /* Render initial structure */
    this._render();
  }

  connectedCallback() {
    this._setupEventListeners();
    this._loadFieldDefinitions();
    this._loadExistingFiles();
    this._updateFullState();

    /* Defer validation to ensure child elements have fully initialized */
    setTimeout(() => {
      this._validateFiles();
    }, 0);
  }

  disconnectedCallback() {
    this.abortController?.abort();
    for (const request of this._inFlight) {
      request.abort();
    }
    this._inFlight.clear();
  }

  static get observedAttributes() {
    return [
      'max-files',
      'upload-action',
      'update-action',
      'delete-action',
      'sequence-action',
      'accept-types',
      'max-file-size',
      'allow-edit',
      'allow-sort',
      'input-name',
    ];
  }

  attributeChangedCallback(name) {
    if (name === 'accept-types') {
      this.shadowRoot.querySelector('.uploader__fileinput').accept = this.config.acceptTypes;
    } else if (name === 'max-files' && this.isConnected) {
      this._updateFullState();
    }
  }

  get config() {
    const getAttr = (name, defaultValue) => this.getAttribute(name) || defaultValue;
    const getIntAttr = (name, defaultValue) => parseInt(this.getAttribute(name)) || defaultValue;

    return {
      maxFiles: getIntAttr('max-files', 5),
      uploadAction: getAttr('upload-action', ''),
      updateAction: getAttr('update-action', ''),
      deleteAction: getAttr('delete-action', ''),
      sequenceAction: getAttr('sequence-action', ''),
      inputName: getAttr('input-name', 'file'),
      acceptTypes: getAttr('accept-types', '*/*'),
      maxFileSize: getIntAttr('max-file-size', 10 * 1024 * 1024),
      allowEdit: boolAttr(this, 'allow-edit', true),
      allowSort: boolAttr(this, 'allow-sort', true),
    };
  }

  setXHR(XHRClass) {
    this.XHRConstructor = XHRClass;
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  _getXHRConstructor() {
    return this.XHRConstructor ?? XMLHttpRequest;
  }

  /**
   * Headers added to every request: `requestHeaders` when set, otherwise an `X-CSRF-Token` header
   * from `<meta name="csrf-token">` when the page has one
   *
   * @returns {Record<string, string>}
   */
  _requestHeaders() {
    const headers =
      typeof this.requestHeaders === 'function' ? this.requestHeaders() : this.requestHeaders;
    if (headers) {
      return { ...headers };
    }

    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    return token ? { 'X-CSRF-Token': token } : {};
  }

  /**
   * POST JSON to an action URL with the request headers, cancelled if the uploader is removed
   *
   * @returns {Promise<Response>}
   */
  async _postJson(url, body) {
    const controller = new AbortController();
    this._inFlight.add(controller);
    try {
      return await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...this._requestHeaders() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      this._inFlight.delete(controller);
    }
  }

  _canSort() {
    return this.config.allowSort && Boolean(this.config.sequenceAction);
  }

  _canReplace() {
    return this.config.maxFiles === 1 && Boolean(this.config.uploadAction);
  }

  /**
   * Move a file one place up or down, keep focus on the control that moved it, announce the new
   * position and save the order
   */
  _moveFile(file, offset) {
    const files = [...this.querySelectorAll('p-uploader-file')];
    const target = files[files.indexOf(file) + offset];
    if (!this._canSort() || !target) return;

    const action = file.shadowRoot.activeElement?.dataset.action;
    if (!this._sequenceSaving) {
      this._confirmedOrder = files;
    }
    if (offset < 0) {
      target.before(file);
    } else {
      target.after(file);
    }
    this._updateDraggableState();

    const controls = [action, 'move-up', 'move-down'].map(name =>
      file.shadowRoot.querySelector(`[data-action="${name}"]`)
    );
    controls.find(control => control && !control.disabled)?.focus();

    const position = [...this.querySelectorAll('p-uploader-file')].indexOf(file) + 1;
    this._showMessage(
      `Moved ${file.getAttribute('filename') || 'the file'} to position ${position} of ${files.length}.`
    );
    this._updateSequence();
  }

  /**
   * Open the file picker to choose a file that takes the place of an existing one
   */
  _startReplace(file) {
    this._replaceTarget = file;
    this.shadowRoot.querySelector('.uploader__fileinput').click();
  }

  _updateFullState() {
    this.toggleAttribute(
      'full',
      this.querySelectorAll('p-uploader-file').length >= this.config.maxFiles
    );
  }

  _showMessage(text) {
    this.shadowRoot.querySelector('.uploader__message').textContent = text;
  }

  _loadFieldDefinitions() {
    const fieldContainer = this.querySelector('p-uploader-fields[slot="field-definitions"]');

    if (!fieldContainer) {
      this.fieldSchema = new Map();
      return;
    }

    const fieldElements = fieldContainer.querySelectorAll('p-uploader-field');
    this.fieldSchema = new Map();

    fieldElements.forEach(field => {
      const key = field.getAttribute('key');
      const label = field.getAttribute('label');
      const type = field.getAttribute('type') || 'text';
      const required = field.hasAttribute('required');
      const maxlength = field.getAttribute('maxlength');

      if (!key) {
        if (this.logger) {
          this.logger.error('PUploader: Field missing required "key" attribute', field);
        }
        return;
      }

      this.fieldSchema.set(key, {
        key,
        label: label || key,
        type,
        required,
        maxlength: maxlength ? parseInt(maxlength) : null,
        element: field,
      });
    });
  }

  _validateFiles() {
    const files = this.querySelectorAll('p-uploader-file');

    files.forEach(fileElement => {
      const dataElements = fileElement.querySelectorAll('p-uploader-data');
      const fileData = new Map();

      dataElements.forEach(dataEl => {
        const key = dataEl.getAttribute('key');
        const value = dataEl.textContent.trim();

        if (!this.fieldSchema.has(key)) {
          if (this.logger) {
            this.logger.warn(
              `PUploader: Unknown field key "${key}" in file ${fileElement.getAttribute('file-id')}`
            );
          }
          return;
        }

        const fieldDef = this.fieldSchema.get(key);

        if (fieldDef.required && !value) {
          if (this.logger) {
            this.logger.error(
              `PUploader: Required field "${key}" is empty in file ${fileElement.getAttribute('file-id')}`
            );
          }
        }

        if (fieldDef.maxlength && value.length > fieldDef.maxlength) {
          if (this.logger) {
            this.logger.warn(
              `PUploader: Field "${key}" exceeds maxlength of ${fieldDef.maxlength}`
            );
          }
        }

        if (fieldDef.type === 'url' && value) {
          try {
            new URL(value);
          } catch {
            if (this.logger) {
              this.logger.error(`PUploader: Field "${key}" has invalid URL: ${value}`);
            }
          }
        }

        fileData.set(key, value);
      });

      this.fieldSchema.forEach((fieldDef, key) => {
        if (fieldDef.required && !fileData.has(key)) {
          if (this.logger) {
            this.logger.error(
              `PUploader: Missing required field "${key}" in file ${fileElement.getAttribute('file-id')}`
            );
          }
        }
      });

      fileElement._fieldData = fileData;
      fileElement._fieldSchema = this.fieldSchema;

      /* Trigger re-render to show fields */
      if (fileElement._render) {
        fileElement._render();
      }
    });
  }

  getFieldSchema() {
    return this.fieldSchema;
  }

  _render() {
    setStaticHTML(
      this.shadowRoot,
      `
      <slot name="field-definitions"></slot>

      <div class="uploader__files" part="files">
        <slot></slot>
      </div>

      <div class="uploader__selector" part="selector">
        <input type="file" multiple class="uploader__fileinput" tabindex="-1" aria-hidden="true">
        <button type="button" class="uploader__add" part="add-button">+ Add files</button>
        <span class="uploader__hint">or drag them here</span>
      </div>

      <p class="uploader__message" part="message" role="status"></p>
    `
    );
    adoptStyles(this.shadowRoot, hostStyles);
    this.shadowRoot.querySelector('.uploader__fileinput').accept =
      this.getAttribute('accept-types') || '*/*';
  }

  _setupEventListeners() {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const fileInput = this.shadowRoot.querySelector('.uploader__fileinput');
    const selector = this.shadowRoot.querySelector('.uploader__selector');

    fileInput.addEventListener('change', e => this._handleFileSelect(e), { signal });
    fileInput.addEventListener(
      'cancel',
      () => {
        this._replaceTarget = null;
      },
      { signal }
    );

    /* The add button, and anywhere else in the drop zone, opens the file picker */
    selector.addEventListener(
      'click',
      event => {
        if (event.target !== fileInput) {
          fileInput.click();
        }
      },
      { signal }
    );

    selector.addEventListener(
      'dragover',
      e => {
        if (this.draggedElement) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        selector.classList.add('dragover');
      },
      { signal }
    );

    selector.addEventListener(
      'dragleave',
      e => {
        if (this.draggedElement) return;
        e.preventDefault();
        selector.classList.remove('dragover');
      },
      { signal }
    );

    selector.addEventListener(
      'drop',
      e => {
        if (this.draggedElement) {
          e.preventDefault();
          e.stopPropagation();
          this._dropAccepted = true;
          return;
        }
        e.preventDefault();
        selector.classList.remove('dragover');
        this._handleFileDrop(e);
      },
      { signal }
    );

    this.addEventListener(
      'dragover',
      e => {
        if (this.draggedElement) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      },
      { signal }
    );

    this.addEventListener('dragstart', e => this._handleDragStart(e), { signal });
    this.addEventListener('dragend', () => this._handleDragEnd(), { signal });
    this.addEventListener('dragenter', e => this._handleDragEnter(e), { signal });
    this.addEventListener('dragleave', e => this._handleDragLeave(e), { signal });
    this.addEventListener('drop', e => this._handleDrop(e), { signal });

    this.addEventListener(
      'p-uploader-file:delete',
      e => {
        const fileId = e.detail.fileId;
        if (fileId && this.files.has(fileId)) {
          this.files.delete(fileId);
        }
        this._updateFullState();
      },
      { signal }
    );
  }

  _loadExistingFiles() {
    const existingFiles = this.querySelectorAll('p-uploader-file');
    existingFiles.forEach((fileElement, index) => {
      const fileId = fileElement.getAttribute('file-id');
      if (fileId) {
        this.files.set(fileId, {
          id: fileId,
          element: fileElement,
          state: 'uploaded',
          order: index,
        });

        if (this._canSort() && existingFiles.length > 1) {
          fileElement.setAttribute('draggable', 'true');
        }
      }

      /* A file defined before this uploader rendered without its configuration */
      fileElement._render?.();
    });
  }

  _handleFileSelect(e) {
    this._processFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  _handleFileDrop(e) {
    if (e.dataTransfer?.files?.length) {
      this._processFiles(Array.from(e.dataTransfer.files));
    }
  }

  _processFiles(files) {
    const messages = [];

    if (!this.config.uploadAction) {
      this._showMessage('Files can’t be added because no upload-action is set.');
      this.logger?.error('PUploader: set upload-action to add files');
      return;
    }

    const replacing = this._replaceTarget?.parentNode === this ? this._replaceTarget : null;
    this._replaceTarget = null;

    const accepted = files.filter(file => {
      const reason = this._rejectionReason(file);
      if (!reason) return true;

      const rejection = new CustomEvent('p-uploader:reject', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { file, reason },
      });
      if (this.dispatchEvent(rejection)) {
        messages.push(
          reason === 'size'
            ? `${file.name} is larger than ${formatBytes(this.config.maxFileSize)}.`
            : `${file.name} isn’t an accepted file type.`
        );
      }
      return false;
    });

    const { maxFiles } = this.config;
    const count = this.querySelectorAll('p-uploader-file').length - (replacing ? 1 : 0);
    const available = Math.max(0, maxFiles - count);
    const toUpload = accepted.slice(0, available);
    const overLimit = accepted.slice(available);

    if (overLimit.length > 0) {
      const limit = new CustomEvent('p-uploader:limit', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { maxFiles, accepted: toUpload, rejected: overLimit },
      });
      if (this.dispatchEvent(limit)) {
        messages.push(`You can add up to ${maxFiles} file${maxFiles === 1 ? '' : 's'}.`);
      }
    }

    this._showMessage(messages.join(' '));
    toUpload.forEach(file => this._uploadFile(file, replacing));
  }

  /**
   * Why a file can't be uploaded, or null when it can
   *
   * @returns {'type'|'size'|null}
   */
  _rejectionReason(file) {
    const patterns = this.config.acceptTypes
      .split(',')
      .map(pattern => pattern.trim().toLowerCase())
      .filter(Boolean);
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    const typeAccepted =
      patterns.length === 0 ||
      patterns.some(pattern => {
        if (pattern === '*/*' || pattern === '*') return true;
        if (pattern.startsWith('.')) return name.endsWith(pattern);
        if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
        return type === pattern;
      });

    if (!typeAccepted) return 'type';
    if (file.size > this.config.maxFileSize) return 'size';
    return null;
  }

  async _uploadFile(file, replacing = null) {
    const fileId = generateId('file');
    const fileData = {
      id: fileId,
      file: file,
      state: 'uploading',
      progress: 0,
      replaces: replacing,
    };

    this.files.set(fileId, fileData);

    const fileElement = document.createElement('p-uploader-file');
    fileElement.setAttribute('file-id', fileId);
    fileElement.setAttribute('filename', file.name);
    fileElement.setAttribute('state', 'uploading');
    fileElement.setAttribute('allow-edit', this.config.allowEdit);
    fileElement._fieldSchema = this.fieldSchema;
    fileElement._fieldData = new Map();

    fileData.element = fileElement;

    if (replacing) {
      replacing.before(fileElement);
    } else {
      this.appendChild(fileElement);
    }
    this._updateFullState();

    if (file.type.startsWith('image/')) {
      try {
        const thumbnailUrl = await this._createThumbnail(file, 240, 240);
        fileElement.setAttribute('preview', thumbnailUrl);
      } catch (error) {
        if (this.logger) {
          this.logger.warn('Failed to create thumbnail', error);
        }
      }
    }

    this._performUpload(fileData);
  }

  _performUpload(fileData) {
    const formData = new FormData();
    formData.append(this.config.inputName, fileData.file);

    const XHRConstructor = this._getXHRConstructor();
    const xhr = new XHRConstructor();
    this._inFlight.add(xhr);
    const settle = () => this._inFlight.delete(xhr);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        fileData.progress = progress;
        fileData.element.setAttribute('progress', Math.round(progress));
      }
    });

    xhr.addEventListener('load', () => {
      settle();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          this._handleUploadSuccess(fileData, response);
        } catch {
          this._handleUploadError(fileData, 'Invalid server response');
        }
      } else {
        this._handleUploadError(fileData, errorMessage(xhr.responseText, 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      settle();
      this._handleUploadError(fileData, 'Network error');
    });
    xhr.addEventListener('abort', settle);

    xhr.open('POST', this.config.uploadAction);
    for (const [name, value] of Object.entries(this._requestHeaders())) {
      xhr.setRequestHeader(name, value);
    }
    xhr.send(formData);
  }

  _handleUploadSuccess(fileData, response) {
    fileData.state = 'uploaded';
    fileData.serverData = response;

    fileData.element.setAttribute('state', 'uploaded');

    if (response.preview) {
      fileData.element.setAttribute('preview', response.preview);
    }
    if (response.id) {
      fileData.element.setAttribute('file-id', response.id);
    }

    /* A replacement takes the old file's place once it has uploaded */
    fileData.replaces?._handleConfirmDelete();
    this._updateDraggableState();

    dispatchComponentEvent(this, 'p-uploader:upload-success', { fileId: fileData.id, response });
  }

  _handleUploadError(fileData, error) {
    fileData.state = 'error';
    fileData.error = error;

    fileData.element.setAttribute('state', 'error');
    fileData.element.setAttribute('error', error);

    dispatchComponentEvent(this, 'p-uploader:upload-error', { fileId: fileData.id, error });
  }

  _updateDraggableState() {
    const files = [...this.querySelectorAll('p-uploader-file')];
    const draggable = this._canSort() && files.length > 1;

    files.forEach(file => {
      const panelOpen = (file.getAttribute('data-current-panel') || 'info') !== 'info';
      if (draggable && !panelOpen) {
        file.setAttribute('draggable', 'true');
      } else {
        file.removeAttribute('draggable');
      }
      file._syncOrderButtons?.();
    });
  }

  _handleDragStart(e) {
    const fileElement = e.target.closest('p-uploader-file');
    if (!fileElement || !fileElement.hasAttribute('draggable')) return;

    this.draggedElement = fileElement;
    e.dataTransfer.effectAllowed = 'move';

    /* Capture the order before the drag, to put the files back if it is abandoned */
    this._dragStartOrder = Array.from(this.querySelectorAll('p-uploader-file'));
    if (!this._sequenceSaving) {
      this._confirmedOrder = this._dragStartOrder;
    }

    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      if (this.draggedElement) {
        fileElement.setAttribute('dragging', '');
      }
    }, 0);
  }

  /**
   * Save the new order after a drop inside the uploader, or put the files back when the drag was
   * abandoned
   */
  _handleDragEnd() {
    if (!this.draggedElement) return;

    this.draggedElement.removeAttribute('dragging');
    const files = [...this.querySelectorAll('p-uploader-file')];
    files.forEach(el => el.removeAttribute('drag-over'));

    const dropped = this._dropAccepted;
    this.draggedElement = null;
    this.draggedOverElement = null;
    this._dropAccepted = false;

    const previous = this._dragStartOrder;
    this._dragStartOrder = null;
    const moved = previous?.some((file, index) => files[index] !== file);
    if (!moved) return;

    if (dropped) {
      this._updateSequence();
    } else {
      this._restoreOrder(previous);
    }
  }

  _handleDragEnter(e) {
    if (!this.draggedElement) return;

    const fileElement = e.target.closest('p-uploader-file');
    if (!fileElement || fileElement === this.draggedElement) return;

    if (fileElement === this.draggedOverElement) return;

    if (this.draggedOverElement) {
      this.draggedOverElement.removeAttribute('drag-over');
    }

    fileElement.setAttribute('drag-over', '');
    this.draggedOverElement = fileElement;

    const allFiles = Array.from(this.querySelectorAll('p-uploader-file'));
    const draggedIndex = allFiles.indexOf(this.draggedElement);
    const targetIndex = allFiles.indexOf(fileElement);

    if (targetIndex !== -1) {
      if (targetIndex > draggedIndex) {
        fileElement.parentNode.insertBefore(this.draggedElement, fileElement.nextSibling);
      } else {
        fileElement.parentNode.insertBefore(this.draggedElement, fileElement);
      }
    }
  }

  _handleDragLeave(e) {
    if (!this.draggedElement) return;

    const fileElement = e.target.closest('p-uploader-file');
    if (!fileElement) return;

    if (fileElement === this.draggedOverElement && !fileElement.contains(e.relatedTarget)) {
      fileElement.removeAttribute('drag-over');
      this.draggedOverElement = null;
    }
  }

  _handleDrop(e) {
    if (!this.draggedElement) return;

    e.preventDefault();
    e.stopPropagation();
    this._dropAccepted = true;
  }

  /**
   * Save the current order. Saves run one at a time so the server ends on the latest order: a move
   * made while a save is in flight is sent once that save settles, and the earlier response only
   * records the order the server confirmed. When the latest save fails, the files go back to the
   * last confirmed order.
   */
  async _updateSequence() {
    this._sequenceQueued = true;
    if (this._sequenceSaving) return;

    this._sequenceSaving = true;
    let sequence;
    let failure;
    try {
      while (this._sequenceQueued) {
        this._sequenceQueued = false;
        const files = [...this.querySelectorAll('p-uploader-file')];
        sequence = files.map(el => el.getAttribute('file-id')).filter(id => id !== null);
        failure = null;
        try {
          const response = await this._postJson(this.config.sequenceAction, { sequence });
          if (!response.ok) {
            throw new Error(errorMessage(await response.text(), `HTTP ${response.status}`));
          }
          this._confirmedOrder = files;
        } catch (error) {
          if (error.name === 'AbortError') return;
          failure = error;
        }
      }
    } finally {
      this._sequenceSaving = false;
    }

    if (failure) {
      this._restoreOrder(this._confirmedOrder);
      this._sequenceFailed = true;
      this._showMessage(
        'The new order couldn’t be saved, so the files are back in their previous order.'
      );
      this.logger?.error('Failed to update sequence:', failure);
      return;
    }

    if (this._sequenceFailed) {
      this._sequenceFailed = false;
      this._showMessage('');
    }
    dispatchComponentEvent(this, 'p-uploader:sequence-update', { sequence });
  }

  _restoreOrder(order) {
    /* Light-DOM order is slot order, so appending the files in their old order restores it */
    this.append(...(order ?? []).filter(file => file.parentNode === this));
    this._updateDraggableState();
  }

  async _createThumbnail(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        const img = new Image();

        img.onload = () => {
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          const width = img.width * scale;
          const height = img.height * scale;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(file.type || 'image/jpeg', 0.9));
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

/* Helper components for field definitions and data */
export class PUploaderFields extends HTMLElement {}
export class PUploaderField extends HTMLElement {}
export class PUploaderData extends HTMLElement {}

if (!customElements.get('p-uploader')) {
  customElements.define('p-uploader', PUploader);
}

if (!customElements.get('p-uploader-fields')) {
  customElements.define('p-uploader-fields', PUploaderFields);
}

if (!customElements.get('p-uploader-field')) {
  customElements.define('p-uploader-field', PUploaderField);
}

if (!customElements.get('p-uploader-data')) {
  customElements.define('p-uploader-data', PUploaderData);
}
