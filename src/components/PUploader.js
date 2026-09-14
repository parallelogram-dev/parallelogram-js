import { generateId } from '../utils/dom-utils.js';
import hostStyles from '../styles/framework/components/PUploaderHost.scss';
import fileStyles from '../styles/framework/components/PUploader.scss';

/**
 * Create an element whose attributes and text are set through DOM APIs, so
 * values from attributes, server responses or user input are never parsed as HTML.
 *
 * @param {string} tag
 * @param {Record<string, string>} [attributes]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
const el = (tag, attributes = {}, text) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

/**
 * Turn a failed response body into a short message that is safe to show.
 *
 * JSON bodies contribute their `message` or `error` string. Plain-text bodies
 * are used when short and free of markup; anything else (such as an HTML error
 * page) falls back to the generic message.
 *
 * @param {string|null|undefined} body
 * @param {string} fallback
 * @returns {string}
 */
const errorMessage = (body, fallback) => {
  const content = body?.trim();
  if (!content) return fallback;

  if (content.startsWith('{')) {
    try {
      const { message, error } = JSON.parse(content);
      return [message, error].find(value => typeof value === 'string' && value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return content.length <= 200 && !content.includes('<') ? content : fallback;
};

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

let fileTemplate;

/**
 * Static structure of a file card. Per-file data is filled in afterwards.
 *
 * @returns {HTMLTemplateElement}
 */
const getFileTemplate = () => {
  if (!fileTemplate) {
    fileTemplate = document.createElement('template');
    fileTemplate.innerHTML = `
      <style>${fileStyles}</style>
      <slot></slot>
      <div class="uploader__overlay">
        <progress class="uploader__progress" max="100" value="0"></progress>
      </div>
      <div class="uploader__container">
        <picture class="uploader__preview"><img alt=""></picture>
        <div class="uploader__content">
          <div data-panel="error" class="uploader__panel" role="alert" aria-live="assertive">
            <div class="uploader__alert">
              <div class="error-message"></div>
              <div class="uploader__actions"></div>
            </div>
          </div>
          <div data-panel="info" class="uploader__panel" role="region">
            <div class="uploader__body">
              <div class="uploader__fields">
                <h1 class="uploader__filename"></h1>
              </div>
            </div>
          </div>
          <div data-panel="delete" class="uploader__panel" role="dialog">
            <div class="uploader__alert">
              <h2 class="uploader__heading">Delete this file?</h2>
              <div class="uploader__actions">
                <button class="uploader__btn uploader__btn--delete" data-action="confirm-delete" aria-label="Confirm delete">Delete</button>
                <button class="uploader__btn uploader__btn--secondary" data-action="cancel" aria-label="Cancel delete">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return fileTemplate;
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
 * - allow-edit: `"false"` turns off editing and deleting
 * - allow-sort: `"false"` turns off reordering
 * - full: set by the component while it holds `max-files` files; the drop zone is hidden meanwhile
 *
 * @properties
 * - requestHeaders: headers for every request, as an object or a function returning one. Without it,
 *   an `X-CSRF-Token` header is sent from `<meta name="csrf-token">` when the page has one.
 *
 * @events
 * - upload:success, upload:error: a file finished uploading, with `{ fileId, response }` or `{ fileId, error }`
 * - sequence:update: a new order was saved, with `{ sequence }`
 * - file:update, file:delete: dispatched by `p-uploader-file` after a save or delete
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
    const getBoolAttr = name => this.getAttribute(name) !== 'false';

    return {
      maxFiles: getIntAttr('max-files', 5),
      uploadAction: getAttr('upload-action', ''),
      updateAction: getAttr('update-action', ''),
      deleteAction: getAttr('delete-action', ''),
      sequenceAction: getAttr('sequence-action', ''),
      inputName: getAttr('input-name', 'file'),
      acceptTypes: getAttr('accept-types', '*/*'),
      maxFileSize: getIntAttr('max-file-size', 10 * 1024 * 1024),
      allowEdit: getBoolAttr('allow-edit'),
      allowSort: getBoolAttr('allow-sort'),
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
      if (this.logger) {
        this.logger.warn('PUploader: No field definitions found. Using defaults.');
      }
      this.fieldSchema = this._getDefaultFields();
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

  _getDefaultFields() {
    return new Map([
      ['title', { key: 'title', label: 'Title', type: 'text', required: false }],
      ['caption', { key: 'caption', label: 'Caption', type: 'textarea', required: false }],
      ['link', { key: 'link', label: 'Link', type: 'url', required: false }],
    ]);
  }

  getFieldSchema() {
    return this.fieldSchema;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>

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
    `;
    this.shadowRoot.querySelector('.uploader__fileinput').accept =
      this.getAttribute('accept-types') || '*/*';
  }

  _setupEventListeners() {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const fileInput = this.shadowRoot.querySelector('.uploader__fileinput');
    const selector = this.shadowRoot.querySelector('.uploader__selector');

    fileInput.addEventListener('change', e => this._handleFileSelect(e), { signal });

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
      'file:delete',
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
    const available = Math.max(0, maxFiles - this.querySelectorAll('p-uploader-file').length);
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
    toUpload.forEach(file => this._uploadFile(file));
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

  async _uploadFile(file) {
    const fileId = generateId('file');
    const fileData = {
      id: fileId,
      file: file,
      state: 'uploading',
      progress: 0,
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

    this.appendChild(fileElement);
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

    this._updateDraggableState();

    this.dispatchEvent(
      new CustomEvent('upload:success', {
        detail: { fileId: fileData.id, response },
        bubbles: true,
      })
    );
  }

  _handleUploadError(fileData, error) {
    fileData.state = 'error';
    fileData.error = error;

    fileData.element.setAttribute('state', 'error');
    fileData.element.setAttribute('error', error);

    this.dispatchEvent(
      new CustomEvent('upload:error', {
        detail: { fileId: fileData.id, error },
        bubbles: true,
      })
    );
  }

  _updateDraggableState() {
    if (!this._canSort()) return;

    const allFiles = this.querySelectorAll('p-uploader-file');
    const shouldBeDraggable = allFiles.length > 1;

    allFiles.forEach(fileElement => {
      const currentPanel = fileElement.getAttribute('data-current-panel') || 'info';
      const isPanelActive = currentPanel !== 'info';

      if (shouldBeDraggable && !isPanelActive) {
        fileElement.setAttribute('draggable', 'true');
      } else {
        fileElement.removeAttribute('draggable');
      }
    });
  }

  _handleDragStart(e) {
    const fileElement = e.target.closest('p-uploader-file');
    if (!fileElement || !fileElement.hasAttribute('draggable')) return;

    this.draggedElement = fileElement;
    e.dataTransfer.effectAllowed = 'move';

    /* Capture the original order before any drag operations */
    this.originalFileOrder = Array.from(this.querySelectorAll('p-uploader-file'));

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

    const moved = this.originalFileOrder?.some((file, index) => files[index] !== file);
    if (!moved) {
      this.originalFileOrder = null;
    } else if (dropped) {
      this._updateSequence();
    } else {
      this._revertSequence();
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

  async _updateSequence() {
    const fileIds = [...this.querySelectorAll('p-uploader-file')]
      .map(el => el.getAttribute('file-id'))
      .filter(id => id !== null);

    try {
      const response = await this._postJson(this.config.sequenceAction, { sequence: fileIds });
      if (!response.ok) {
        throw new Error(errorMessage(await response.text(), `HTTP ${response.status}`));
      }

      this.originalFileOrder = null;
      this._showMessage('');
      this.dispatchEvent(
        new CustomEvent('sequence:update', {
          detail: { sequence: fileIds },
          bubbles: true,
        })
      );
    } catch (error) {
      if (error.name === 'AbortError') return;

      this._revertSequence();
      this._showMessage(
        'The new order couldn’t be saved, so the files are back in their previous order.'
      );
      this.logger?.error('Failed to update sequence:', error);
    }
  }

  _revertSequence() {
    if (this.originalFileOrder) {
      /* Light-DOM order is slot order, so appending the files in their old order restores it */
      this.append(...this.originalFileOrder.filter(file => file.parentNode === this));
    }
    this.originalFileOrder = null;
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

/* Child Web Component for individual files */
export class PUploaderFile extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._fieldSchema = null;
    this._fieldData = new Map();
    this._render();
  }

  static get observedAttributes() {
    return [
      'state',
      'progress',
      'preview',
      'error',
      'filename',
      'allow-edit',
      'data-current-panel',
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'data-current-panel') {
        this._updatePanelVisibility(newValue);
      } else if (name === 'state') {
        this._updateState(newValue);
      } else if (name === 'preview') {
        this._updatePreview(newValue);
      } else if (name === 'progress') {
        this._updateProgress(newValue);
      } else {
        this._render();
      }
    }
  }

  _render() {
    const state = this.getAttribute('state') || 'uploaded';
    const progress = parseInt(this.getAttribute('progress')) || 0;
    const preview = this.getAttribute('preview') || '';
    const error = this.getAttribute('error') || '';
    const filename = this.getAttribute('filename') || '';
    const permissions = this._permissions();
    const currentPanel = this.getAttribute('data-current-panel') || 'info';

    /* Load field data from slotted elements */
    const dataSlot = this.querySelector('p-uploader-data');
    if (dataSlot && !this._fieldData.size) {
      this._loadFieldData();
    }

    const root = document.importNode(getFileTemplate().content, true);

    root
      .querySelector('.uploader__overlay')
      .classList.toggle('uploader__overlay--show', state === 'uploading');
    root.querySelector('.uploader__progress').value = progress;

    const picture = root.querySelector('.uploader__preview');
    picture.style.display = preview ? 'block' : 'none';
    const image = picture.querySelector('img');
    image.alt = filename;
    if (preview) {
      image.src = preview;
    }

    const errorPanel = root.querySelector('[data-panel="error"]');
    errorPanel.classList.toggle(
      'uploader__panel--show',
      currentPanel === 'error' || state === 'error'
    );
    errorPanel.querySelector('.error-message').textContent = error;
    errorPanel.querySelector('.uploader__actions').append(
      state === 'error'
        ? el(
            'button',
            {
              class: 'uploader__btn uploader__btn--delete',
              'data-action': 'confirm-delete',
              'aria-label': 'Remove file',
            },
            'Remove'
          )
        : el(
            'button',
            {
              class: 'uploader__btn uploader__btn--secondary',
              'data-action': 'cancel',
              'aria-label': 'Cancel',
            },
            'Cancel'
          )
    );

    const infoPanel = root.querySelector('[data-panel="info"]');
    infoPanel.classList.toggle(
      'uploader__panel--show',
      currentPanel === 'info' && state === 'uploaded'
    );
    infoPanel.setAttribute('aria-label', `File information for ${filename}`);
    root.querySelector('.uploader__filename').textContent = filename;
    this._syncDeleteButton(infoPanel, permissions.remove);
    if (state === 'uploaded') {
      root.querySelector('.uploader__fields').append(...this._createFields(permissions.edit));
    }

    const deletePanel = root.querySelector('[data-panel="delete"]');
    deletePanel.classList.toggle('uploader__panel--show', currentPanel === 'delete');
    this._deleteHeadingId ??= generateId('delete-heading');
    deletePanel.setAttribute('aria-labelledby', this._deleteHeadingId);
    deletePanel.querySelector('.uploader__heading').id = this._deleteHeadingId;
    if (state === 'uploaded') {
      deletePanel.before(...this._createEditPanels());
    }

    this.shadowRoot.replaceChildren(root);
    this._setupFileEventListeners();
  }

  /**
   * What the owning uploader lets this file offer: editing needs an update-action and deleting a
   * delete-action, and allow-edit="false" turns both off
   */
  _permissions() {
    const allowEdit = this.getAttribute('allow-edit') !== 'false';
    const config = this.closest('p-uploader')?.config ?? {};
    return {
      edit: allowEdit && Boolean(config.updateAction),
      remove: allowEdit && Boolean(config.deleteAction),
    };
  }

  _syncDeleteButton(infoPanel, show) {
    const existing = infoPanel.querySelector('.uploader__delete-icon');
    if (show && !existing) {
      infoPanel.querySelector('.uploader__body').prepend(
        el('button', {
          type: 'button',
          class: 'uploader__delete-icon',
          'data-action': 'show-delete',
          title: 'Delete file',
          'aria-label': 'Delete file',
        })
      );
    } else if (!show) {
      existing?.remove();
    }
  }

  _loadFieldData() {
    const dataElements = this.querySelectorAll('p-uploader-data');
    dataElements.forEach(dataEl => {
      const key = dataEl.getAttribute('key');
      const value = dataEl.textContent.trim();
      if (key) {
        this._fieldData.set(key, value);
      }
    });
  }

  /**
   * @returns {HTMLElement[]} One read-only row per field in the schema
   */
  _createFields(allowEdit) {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return [];
    }

    return [...this._fieldSchema].map(([key, fieldDef]) => {
      const field = el('div', { class: 'uploader__field' });
      const value = el('span', { class: 'field__value' });
      this._setFieldValue(value, this._fieldData.get(key));

      field.append(el('label', { class: 'field__label' }, fieldDef.label), value);

      if (allowEdit) {
        value.classList.add('field__value--editable');
        value.dataset.action = 'edit-field';
        value.dataset.field = key;
        field.append(
          el('button', {
            class: 'field__edit',
            'data-action': 'edit-field',
            'data-field': key,
            title: `Edit ${fieldDef.label}`,
          })
        );
      }

      return field;
    });
  }

  /**
   * @returns {HTMLElement[]} One edit panel per field in the schema
   */
  _createEditPanels() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return [];
    }

    const currentPanel = this.getAttribute('data-current-panel') || 'info';

    return [...this._fieldSchema].map(([key, fieldDef]) => {
      const panel = el('div', {
        'data-panel': `edit-${key}`,
        class: 'uploader__panel',
        role: 'dialog',
        'aria-label': `Edit ${fieldDef.label}`,
      });
      panel.classList.toggle('uploader__panel--show', currentPanel === `edit-${key}`);

      const control =
        fieldDef.type === 'textarea'
          ? el('textarea', { class: 'uploader__textarea', rows: '3' })
          : el('input', { type: fieldDef.type, class: 'uploader__input' });
      control.name = key;
      control.placeholder = fieldDef.label;
      control.setAttribute('aria-label', fieldDef.label);
      control.value = this._fieldData.get(key) || '';

      const actions = el('div', { class: 'uploader__actions' });
      actions.append(
        el(
          'button',
          {
            class: 'uploader__btn uploader__btn--primary',
            'data-action': 'confirm-edit',
            'data-field': key,
            'aria-label': `Save ${fieldDef.label}`,
          },
          'Save'
        ),
        el(
          'button',
          {
            class: 'uploader__btn uploader__btn--secondary',
            'data-action': 'cancel',
            'aria-label': 'Cancel editing',
          },
          'Cancel'
        )
      );

      const body = el('div', { class: 'uploader__body' });
      body.append(control, actions);
      panel.append(body);
      return panel;
    });
  }

  _setFieldValue(element, value) {
    element.replaceChildren(value || el('em', {}, '-'));
  }

  _updatePanelVisibility(currentPanel) {
    const panels = this.shadowRoot.querySelectorAll('.uploader__panel');
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');

    panels.forEach(panel => {
      const panelName = panel.getAttribute('data-panel');
      if (
        panelName === currentPanel ||
        (panelName === 'error' && this.getAttribute('state') === 'error') ||
        (panelName === 'info' &&
          currentPanel === 'info' &&
          this.getAttribute('state') === 'uploaded')
      ) {
        panel.classList.add('uploader__panel--show');

        /* Mark info panel as activated when it's first shown */
        if (panelName === 'info' && infoPanel) {
          infoPanel.classList.add('uploader__panel--activated');
        }
      } else {
        panel.classList.remove('uploader__panel--show');
      }
    });
  }

  _updateState(newState) {
    const overlay = this.shadowRoot.querySelector('.uploader__overlay');

    if (newState === 'uploading') {
      /* Show progress overlay */
      if (overlay) {
        overlay.classList.add('uploader__overlay--show');
      }
    } else if (newState === 'uploaded') {
      /* Hide progress overlay and show info panel */
      if (overlay) {
        overlay.classList.remove('uploader__overlay--show');
      }

      /* Render fields in the info panel for newly uploaded files */
      this._renderInfoPanelFields();

      /* Show the info panel after overlay fades out */
      setTimeout(() => {
        this.setAttribute('data-current-panel', 'info');
      }, 375); /* Match the transition duration */
    } else if (newState === 'error') {
      /* Hide progress overlay and show error panel */
      if (overlay) {
        overlay.classList.remove('uploader__overlay--show');
      }
      this.setAttribute('data-current-panel', 'error');
    }
  }

  _updatePreview(previewUrl) {
    const preview = this.shadowRoot.querySelector('.uploader__preview');
    if (preview) {
      if (previewUrl) {
        preview.style.display = 'block';
        const img = preview.querySelector('img');
        if (img) {
          img.src = previewUrl;
        }
      } else {
        preview.style.display = 'none';
      }
    }
  }

  _updateProgress(progressValue) {
    const progressBar = this.shadowRoot.querySelector('.uploader__progress');
    if (progressBar) {
      progressBar.value = parseInt(progressValue) || 0;
    }
  }

  _updateFieldDisplay(fieldKey, newValue) {
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');
    if (infoPanel) {
      const fieldValueElement = infoPanel.querySelector(
        `[data-field="${CSS.escape(fieldKey)}"].field__value`
      );
      if (fieldValueElement) {
        this._setFieldValue(fieldValueElement, newValue);
      }
    }
  }

  _renderInfoPanelFields() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return;
    }

    const permissions = this._permissions();
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');
    const fieldsContainer = infoPanel?.querySelector('.uploader__fields');
    if (infoPanel) {
      this._syncDeleteButton(infoPanel, permissions.remove);
    }

    if (!fieldsContainer) {
      return;
    }

    /* Find the filename element and insert fields after it */
    const filenameElement = fieldsContainer.querySelector('.uploader__filename');
    if (filenameElement) {
      /* Remove any existing fields */
      const existingFields = fieldsContainer.querySelectorAll('.uploader__field');
      existingFields.forEach(field => field.remove());

      /* Insert new fields after filename */
      filenameElement.after(...this._createFields(permissions.edit));
    }

    /* Also render the edit panels if they don't exist */
    this._renderEditPanelsIfNeeded();
  }

  _renderEditPanelsIfNeeded() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return;
    }

    /* Check if edit panels already exist */
    const existingEditPanel = this.shadowRoot.querySelector(
      '.uploader__panel[data-panel^="edit-"]'
    );
    if (existingEditPanel) {
      return; /* Edit panels already exist */
    }

    /* Find the delete panel to insert edit panels before it */
    const deletePanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="delete"]');
    if (!deletePanel) {
      return;
    }

    deletePanel.before(...this._createEditPanels());
  }

  _setupFileEventListeners() {
    this.shadowRoot.removeEventListener('click', this._clickHandler);

    /* Remove old keydown listeners if they exist */
    if (this._escapeKeyHandler) {
      this.removeEventListener('keydown', this._escapeKeyHandler);
    }
    if (this._enterKeyHandler) {
      this.shadowRoot.removeEventListener('keydown', this._enterKeyHandler);
    }

    this._clickHandler = e => {
      const action = e.target.dataset.action;
      if (!action) return;

      const actions = {
        'edit-field': () => this._setPanel(`edit-${e.target.dataset.field}`),
        'show-delete': () => this._setPanel('delete'),
        cancel: () => this._setPanel('info'),
        'confirm-edit': () => this._handleConfirmEdit(e.target.dataset.field),
        'confirm-delete': () => this._handleConfirmDelete(),
      };

      actions[action]?.();
    };

    /* Escape key handler on host element (works anywhere) */
    this._escapeKeyHandler = e => {
      const currentPanel = this.getAttribute('data-current-panel') || 'info';

      if (e.key === 'Escape') {
        if (currentPanel !== 'info' && currentPanel !== 'error') {
          e.preventDefault();
          this._setPanel('info');
        }
      }
    };

    /* Enter key handler on shadow root (only for inputs) */
    this._enterKeyHandler = e => {
      const currentPanel = this.getAttribute('data-current-panel') || 'info';

      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && currentPanel.startsWith('edit-')) {
        e.preventDefault();
        const fieldKey = currentPanel.replace('edit-', '');
        this._handleConfirmEdit(fieldKey);
      }
    };

    this.shadowRoot.addEventListener('click', this._clickHandler);
    this.addEventListener('keydown', this._escapeKeyHandler);
    this.shadowRoot.addEventListener('keydown', this._enterKeyHandler);
  }

  _setPanel(panel) {
    this.setAttribute('data-current-panel', panel);
    this._notifyDraggableStateChange();

    /* Make component focusable for keyboard events */
    if (panel !== 'info' && panel !== 'error') {
      this.setAttribute('tabindex', '-1');
      this.focus();
    } else {
      this.removeAttribute('tabindex');
    }

    /* Auto-focus the input field in edit panels */
    if (panel.startsWith('edit-')) {
      setTimeout(() => {
        const fieldKey = panel.replace('edit-', '');
        const input = this.shadowRoot.querySelector(`[name="${CSS.escape(fieldKey)}"]`);
        if (input) {
          input.focus();
          /* Select all text in input for easy editing */
          if (input.tagName === 'INPUT') {
            input.select();
          }
        }
      }, 400); /* Delay to ensure panel animation completes */
    }
  }

  _notifyDraggableStateChange() {
    const uploader = this.closest('p-uploader');
    if (uploader && uploader._updateDraggableState) {
      uploader._updateDraggableState();
    }
  }

  async _handleConfirmEdit(fieldKey) {
    const input = this.shadowRoot.querySelector(`[name="${CSS.escape(fieldKey)}"]`);

    if (input) {
      const newValue = input.value;
      const oldValue = this._fieldData.get(fieldKey) || '';

      /* Optimistically update the UI */
      this._fieldData.set(fieldKey, newValue);

      /* Update the slotted data element */
      let dataElement = this.querySelector(`p-uploader-data[key="${CSS.escape(fieldKey)}"]`);
      if (!dataElement) {
        dataElement = document.createElement('p-uploader-data');
        dataElement.setAttribute('key', fieldKey);
        this.appendChild(dataElement);
      }
      const oldElementValue = dataElement.textContent;
      dataElement.textContent = newValue;

      /* Send update to server */
      const uploader = this.closest('p-uploader');
      if (uploader && uploader.config.updateAction) {
        try {
          const response = await uploader._postJson(uploader.config.updateAction, {
            id: this.getAttribute('file-id'),
            field: fieldKey,
            value: newValue,
          });

          if (response.ok) {
            /* Update the field display in the info panel */
            this._updateFieldDisplay(fieldKey, newValue);

            this.dispatchEvent(
              new CustomEvent('file:update', {
                detail: {
                  fileId: this.getAttribute('file-id'),
                  field: fieldKey,
                  value: newValue,
                },
                bubbles: true,
                composed: true,
              })
            );
            this.setAttribute('data-current-panel', 'info');
            this._notifyDraggableStateChange();
          } else {
            /* Revert the changes on failure */
            this._fieldData.set(fieldKey, oldValue);
            dataElement.textContent = oldElementValue;

            const errorText = await response.text();
            if (uploader.logger) {
              uploader.logger.error('Failed to update field:', errorText);
            }
            this.setAttribute('error', `Update failed: ${errorMessage(errorText, 'Server error')}`);
            this.setAttribute('data-current-panel', 'error');
          }
        } catch (error) {
          if (error.name === 'AbortError') return;

          /* Revert the changes on network error */
          this._fieldData.set(fieldKey, oldValue);
          dataElement.textContent = oldElementValue;

          if (uploader.logger) {
            uploader.logger.error('Failed to update field:', error);
          }
          this.setAttribute('error', `Update failed: ${error.message || 'Network error'}`);
          this.setAttribute('data-current-panel', 'error');
        }
      } else {
        this.setAttribute('data-current-panel', 'info');
        this._notifyDraggableStateChange();
      }
    }
  }

  async _handleConfirmDelete() {
    const uploader = this.closest('p-uploader');
    const fileId = this.getAttribute('file-id');
    const currentState = this.getAttribute('state');

    /* If file is in error state or was never uploaded, just remove it locally */
    if (currentState === 'error' || currentState === 'uploading') {
      this._removeFile();
      return;
    }

    if (!uploader || !uploader.config.deleteAction) {
      /* No delete action configured, just remove locally */
      this._removeFile();
      return;
    }

    try {
      const response = await uploader._postJson(uploader.config.deleteAction, {
        id: fileId,
      });

      if (response.ok) {
        /* Delete successful, remove the file */
        this._removeFile();

        this.dispatchEvent(
          new CustomEvent('file:delete', {
            detail: { fileId: fileId },
            bubbles: true,
            composed: true,
          })
        );
      } else {
        /* Delete failed, show error */
        const errorText = await response.text();
        if (uploader.logger) {
          uploader.logger.error('Failed to delete file:', errorText);
        }
        this.setAttribute('error', `Delete failed: ${errorMessage(errorText, 'Server error')}`);
        this.setAttribute('data-current-panel', 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      /* Network error, show error */
      if (uploader.logger) {
        uploader.logger.error('Failed to delete file:', error);
      }
      this.setAttribute('error', `Delete failed: ${error.message || 'Network error'}`);
      this.setAttribute('data-current-panel', 'error');
    }
  }

  _removeFile() {
    const uploader = this.closest('p-uploader');
    const fileId = this.getAttribute('file-id');

    /* Clean up from parent's file tracking */
    if (uploader && fileId && uploader.files.has(fileId)) {
      uploader.files.delete(fileId);
    }

    /* Remove element from DOM */
    this.remove();

    /* Update draggable and full state */
    uploader?._updateDraggableState?.();
    uploader?._updateFullState?.();
  }
}

/* Helper components for field definitions and data */
export class PUploaderFields extends HTMLElement {}
export class PUploaderField extends HTMLElement {}
export class PUploaderData extends HTMLElement {}

if (!customElements.get('p-uploader')) {
  customElements.define('p-uploader', PUploader);
}

if (!customElements.get('p-uploader-file')) {
  customElements.define('p-uploader-file', PUploaderFile);
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
