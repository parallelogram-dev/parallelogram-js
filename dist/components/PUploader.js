/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */


/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * PUploader - Web Component for file uploads with configurable fields
 *
 * Usage:
 * <p-uploader
 *   max-files="5"
 *   upload-action="/api/upload"
 *   update-action="/api/update"
 *   delete-action="/api/delete"
 *   sequence-action="/api/sequence"
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
 */
class PUploader extends HTMLElement {
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

    /* Render initial structure */
    this._render();
  }

  connectedCallback() {
    this._setupEventListeners();
    this._loadFieldDefinitions();
    this._loadExistingFiles();

    /* Defer validation to ensure child elements have fully initialized */
    setTimeout(() => {
      this._validateFiles();
    }, 0);
  }

  disconnectedCallback() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  static get observedAttributes() {
    return ['max-files', 'upload-action', 'update-action', 'delete-action', 'sequence-action', 'accept-types', 'max-file-size', 'allow-edit', 'allow-sort'];
  }

  get config() {
    const getAttr = (name, defaultValue) => this.getAttribute(name) || defaultValue;
    const getIntAttr = (name, defaultValue) => parseInt(this.getAttribute(name)) || defaultValue;
    const getBoolAttr = (name) => this.getAttribute(name) !== 'false';

    return {
      maxFiles: getIntAttr('max-files', 5),
      uploadAction: getAttr('upload-action', '/upload'),
      updateAction: getAttr('update-action', '/update'),
      deleteAction: getAttr('delete-action', '/delete'),
      sequenceAction: getAttr('sequence-action', '/sequence'),
      inputName: getAttr('input-name', 'files'),
      acceptTypes: getAttr('accept-types', '*/*'),
      maxFileSize: getIntAttr('max-file-size', 10 * 1024 * 1024),
      allowEdit: getBoolAttr('allow-edit'),
      allowSort: getBoolAttr('allow-sort')
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
    if (this.XHRConstructor === null) {
      this.XHRConstructor = window.MockXHR || XMLHttpRequest;
    }
    return this.XHRConstructor;
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

    fieldElements.forEach((field) => {
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
        element: field
      });
    });
  }

  _validateFiles() {
    const files = this.querySelectorAll('p-uploader-file');

    files.forEach((fileElement) => {
      const dataElements = fileElement.querySelectorAll('p-uploader-data');
      const fileData = new Map();

      dataElements.forEach((dataEl) => {
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
      ['link', { key: 'link', label: 'Link', type: 'url', required: false }]
    ]);
  }

  getFieldSchema() {
    return this.fieldSchema;
  }

  _render() {
    const acceptTypes = this.getAttribute('accept-types') || '*/*';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: inherit;
          display: block;
          position: relative;
          padding: 0.375rem;
          border: 2px solid #000;
        }

        .uploader__files {
          display: grid;
          gap: 0.375rem;
          margin-bottom: 0.375rem;
        }

        .uploader__selector {
          border: 2px solid #cbd5e1;
          padding: 2rem;
          text-align: center;
          background: #f8fafc;
          transition: all 0.2s;
          cursor: pointer;
        }

        .uploader__selector:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }

        .uploader__selector.dragover {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .uploader__fileinput {
          display: none;
        }

        .uploader__label {
          font-size: 1rem;
          cursor: pointer;
        }

        ::slotted(p-uploader-file) {
          display: block;
        }

        ::slotted(p-uploader-fields) {
          display: none;
        }
      </style>

      <slot name="field-definitions"></slot>

      <div class="uploader__files">
        <slot></slot>
      </div>

      <div class="uploader__selector" part="selector">
        <input type="file" multiple accept="${acceptTypes}" class="uploader__fileinput" id="file-input">
        <label class="uploader__label" for="file-input">
          + Add files by selecting or dragging here
        </label>
      </div>
    `;
  }

  _setupEventListeners() {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const fileInput = this.shadowRoot.querySelector('.uploader__fileinput');
    const selector = this.shadowRoot.querySelector('.uploader__selector');

    fileInput.addEventListener('change', (e) => this._handleFileSelect(e), { signal });

    selector.addEventListener(
      'dragover',
      (e) => {
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
      (e) => {
        if (this.draggedElement) return;
        e.preventDefault();
        selector.classList.remove('dragover');
      },
      { signal }
    );

    selector.addEventListener(
      'drop',
      (e) => {
        if (this.draggedElement) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        selector.classList.remove('dragover');
        this._handleFileDrop(e);
      },
      { signal }
    );

    if (this.config.allowSort) {
      this.addEventListener(
        'dragover',
        (e) => {
          if (this.draggedElement) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        },
        { signal }
      );

      this.addEventListener('dragstart', (e) => this._handleDragStart(e), { signal });
      this.addEventListener('dragend', (e) => this._handleDragEnd(e), { signal });
      this.addEventListener('dragenter', (e) => this._handleDragEnter(e), { signal });
      this.addEventListener('dragleave', (e) => this._handleDragLeave(e), { signal });
      this.addEventListener('drop', (e) => this._handleDrop(e), { signal });
    }

    this.addEventListener(
      'file:delete',
      (e) => {
        const fileId = e.detail.fileId;
        if (fileId && this.files.has(fileId)) {
          this.files.delete(fileId);
        }
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
          order: index
        });

        if (this.config.allowSort && existingFiles.length > 1) {
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
    const currentFileCount = this.querySelectorAll('p-uploader-file').length;
    const availableSlots = this.config.maxFiles - currentFileCount;

    if (availableSlots <= 0) {
      alert(`Maximum ${this.config.maxFiles} files allowed`);
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);

    if (files.length > availableSlots) {
      alert(
        `Only ${availableSlots} more file${availableSlots === 1 ? '' : 's'} can be added (${this.config.maxFiles} max)`
      );
    }

    filesToUpload.forEach((file) => {
      this._uploadFile(file);
    });
  }

  async _uploadFile(file) {
    const fileId = generateId('file');
    const fileData = {
      id: fileId,
      file: file,
      state: 'uploading',
      progress: 0
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
    formData.append('file', fileData.file);

    const XHRConstructor = this._getXHRConstructor();
    const xhr = new XHRConstructor();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        fileData.progress = progress;
        fileData.element.setAttribute('progress', Math.round(progress));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          this._handleUploadSuccess(fileData, response);
        } catch (e) {
          this._handleUploadError(fileData, 'Invalid server response');
        }
      } else {
        this._handleUploadError(fileData, xhr.responseText || 'Upload failed');
      }
    });

    xhr.addEventListener('error', () => {
      this._handleUploadError(fileData, 'Network error');
    });

    xhr.open('POST', this.config.uploadAction);
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
        bubbles: true
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
        bubbles: true
      })
    );
  }

  _updateDraggableState() {
    if (!this.config.allowSort) return;

    const allFiles = this.querySelectorAll('p-uploader-file');
    const shouldBeDraggable = allFiles.length > 1;

    allFiles.forEach((fileElement) => {
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

    try {
      if (document.selection) {
        document.selection.empty();
      } else {
        window.getSelection().removeAllRanges();
      }
    } catch (err) {}

    setTimeout(() => {
      if (this.draggedElement) {
        fileElement.setAttribute('dragging', '');
      }
    }, 0);
  }

  _handleDragEnd(e) {
    if (!this.draggedElement) return;

    this.draggedElement.removeAttribute('dragging');

    const allFiles = this.querySelectorAll('p-uploader-file');
    allFiles.forEach((el) => el.removeAttribute('drag-over'));

    this.draggedElement = null;
    this.draggedOverElement = null;
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

    this._updateSequence();
  }

  async _updateSequence() {
    /* Get the new order after drag */
    const currentFiles = Array.from(this.querySelectorAll('p-uploader-file'));
    const fileIds = currentFiles
      .map((el) => el.getAttribute('file-id'))
      .filter((id) => id !== null);

    try {
      const response = await fetch(this.config.sequenceAction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sequence: fileIds })
      });

      if (response.ok) {
        /* Success - clear the original order backup */
        this.originalFileOrder = null;

        this.dispatchEvent(
          new CustomEvent('sequence:update', {
            detail: { sequence: fileIds },
            bubbles: true
          })
        );
      } else {
        /* Revert to original order on failure */
        if (this.originalFileOrder) {
          this._revertSequence();
        }

        const errorText = await response.text();
        if (this.logger) {
          this.logger.error('Failed to update sequence:', errorText);
        }
      }
    } catch (error) {
      /* Revert to original order on network error */
      if (this.originalFileOrder) {
        this._revertSequence();
      }

      if (this.logger) {
        this.logger.error('Failed to update sequence:', error);
      }
    }
  }

  _revertSequence() {
    if (!this.originalFileOrder) return;

    /* Restore the original order by re-appending elements */
    const fragment = document.createDocumentFragment();

    /* Remove all file elements and add them to fragment in original order */
    this.originalFileOrder.forEach((fileElement) => {
      if (fileElement.parentNode) {
        fileElement.parentNode.removeChild(fileElement);
      }
      fragment.appendChild(fileElement);
    });

    /* Re-append in original order */
    const selector = this.shadowRoot.querySelector('.uploader__selector');
    this.insertBefore(fragment, selector);

    /* Clear the backup */
    this.originalFileOrder = null;
  }

  async _createThumbnail(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
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
class PUploaderFile extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._fieldSchema = null;
    this._fieldData = new Map();
    this._render();
  }

  static get observedAttributes() {
    return ['state', 'progress', 'preview', 'error', 'filename', 'allow-edit', 'data-current-panel'];
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
    const allowEdit = this.getAttribute('allow-edit') !== 'false';
    const currentPanel = this.getAttribute('data-current-panel') || 'info';

    /* Load field data from slotted elements */
    const dataSlot = this.querySelector('p-uploader-data');
    if (dataSlot && !this._fieldData.size) {
      this._loadFieldData();
    }

    this.shadowRoot.innerHTML = `
      <style>
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        :host {
          display: block;
          position: relative;
          border: 2px solid #e2e8f0;
          padding: 0.375rem;
          background: white;
          transition: border-color 0.2s ease-out, background-color 0.2s ease-out;
          font-family: inherit;
        }

        :host([dragging]) {
          opacity: 0.5;
          transition: none;
        }

        :host([drag-over]) {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: translateY(-4px);
        }

        :host([draggable="true"]) {
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }

        :host([draggable="true"]:active) {
          cursor: grabbing;
        }
        
        button, textarea, input {
          font-family: inherit;
        }

        .uploader__overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          padding: 0 0.375rem 0 6.75rem;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.375s cubic-bezier(0.5, 0, 0, 1);
        }

        .uploader__overlay--show {
          opacity: 1;
          pointer-events: auto;
        }

        .uploader__progress {
          width: 100%;
          height: 0.5rem;
        }

        .uploader__container {
          display: flex;
          gap: 0.375rem;
          position: relative;
        }

        .uploader__preview {
          flex-shrink: 0;
          width: 6rem;
          height: 6rem;
          display: ${preview ? 'block' : 'none'};
          pointer-events: none;
          user-select: none;
        }

        .uploader__preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .uploader__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          position: relative;
          height: 6rem;
          overflow: hidden;
        }

        .uploader__panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          height: 6rem;
          background: white;
          transform: translateY(-100%);
          transition: transform 0.375s cubic-bezier(0.5, 0, 0, 1);
          will-change: transform;
        }

        .uploader__panel--show {
          transform: translateY(0);
        }

        .uploader__panel[data-panel="info"] {
          transform: translateY(100%);
        }

        .uploader__panel[data-panel="info"].uploader__panel--activated {
          transform: translateY(-100%);
        }

        .uploader__panel[data-panel="info"].uploader__panel--show {
          transform: translateY(0);
        }

        .uploader__panel[data-panel="delete"],
        .uploader__panel[data-panel^="edit-"] {
          transform: translateY(100%);
        }

        .uploader__panel[data-panel="delete"].uploader__panel--show,
        .uploader__panel[data-panel^="edit-"].uploader__panel--show {
          transform: translateY(0);
        }

        .uploader__body,
        .uploader__alert {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding-left: 0.375rem;
          min-height: 6rem;
          position: relative;
        }
        
        .uploader__alert {
          justify-content: space-between;
        }
        
        .uploader__fields {
          display: flex;
          flex-direction: column;
        }

        .uploader__filename,
        .uploader__heading {
          font-weight: 600;
          font-size: 0.75rem;
          padding-right: 2rem;
          height: 1.125rem;
          line-height: 1.125rem;
          margin: 0 0 0.5rem;
          display: flex;
          align-items: center;
        }

        .uploader__filename {
          font-family: monospace;
        }

        .uploader__field {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 0.375rem;
          height: 1rem;
          padding-top: 0.1875rem;
          padding-bottom: 0.1875rem;
          margin: 0;
        }

        .uploader__field-label {
          opacity: 0.5;
          font-weight: 600;
          font-size: 0.75rem;
          min-width: 4rem;
        }

        .uploader__field-value {
          opacity: 0.5;
          font-size: 0.75rem;
          line-height: 0.75rem;
          word-break: break-word;
        }

        .uploader__field-value--editable {
          cursor: pointer;
        }

        .uploader__field-value--editable:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .uploader__delete-icon,
        .uploader__field-edit {
          width: 1.75rem;
          height: 1.75rem;
          border: none;
          background-size: contain;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='none' d='M0 0h24v24H0V0z'/%3E%3Cpath fill='red' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z'/%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3C/svg%3E");
          background-color: white;
          background-repeat: no-repeat;
          background-position: center;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          pointer-events: auto;
          padding: 0;
        }

        .uploader__delete-icon {
          position: absolute;
          top: 0;
          right: 0;
        }

        .uploader__delete-icon:hover,
        .uploader__field-edit:hover {
          opacity: 1;
        }

        .uploader__field-edit {
          width: 1rem;
          height: 1rem;
          background-size: contain;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z'/%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3C/svg%3E");
        }

        .uploader__actions {
          display: flex;
          gap: 0.375rem;
          justify-content: flex-end;
          padding-left: 0.375rem;
        }

        .uploader__btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #cbd5e1;
          background: white;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;
          pointer-events: auto;
        }

        .uploader__btn:hover {
          background: #f1f5f9;
        }

        .uploader__btn--secondary {
          background: transparent;
          border-color: currentColor;
        }

        .uploader__btn--delete {
          color: #dc2626;
          border-color: #dc2626;
        }

        .uploader__btn--delete:hover {
          background: #fee2e2;
        }

        .uploader__btn--primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .uploader__btn--primary:hover {
          background: #2563eb;
        }

        .uploader__input,
        .uploader__textarea {
          width: 100%;
          padding: 0.375rem;
          border: 1px solid #cbd5e1;
          margin: 0;
          font-family: inherit;
          font-size: 0.75rem;
          pointer-events: auto;
        }

        .uploader__textarea {
          resize: vertical;
          min-height: 60px;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 0.5rem;
          font-size: 0.75rem;
        }

        slot {
          display: none;
        }
      </style>

      <slot></slot>

      <div class="uploader__overlay ${state === 'uploading' ? 'uploader__overlay--show' : ''}">
        <progress class="uploader__progress" max="100" value="${progress}"></progress>
      </div>

      <div class="uploader__container">
        <picture class="uploader__preview">
          <img src="${preview || ''}" alt="${filename}">
        </picture>

        <div class="uploader__content">
          <div data-panel="error" class="uploader__panel ${currentPanel === 'error' || state === 'error' ? 'uploader__panel--show' : ''}" role="alert" aria-live="assertive">
            <div class="uploader__alert">
              <div class="error-message">${error}</div>
              <div class="uploader__actions">
                ${state === 'error' ? '<button class="uploader__btn uploader__btn--delete" data-action="confirm-delete" aria-label="Remove file">Remove</button>' : '<button class="uploader__btn uploader__btn--secondary" data-action="cancel" aria-label="Cancel">Cancel</button>'}
              </div>
            </div>
          </div>

          <div data-panel="info" class="uploader__panel ${currentPanel === 'info' && state === 'uploaded' ? 'uploader__panel--show' : ''}" role="region" aria-label="File information for ${filename}">
            <div class="uploader__body">
              ${allowEdit ? '<button class="uploader__delete-icon" data-action="show-delete" title="Delete file" aria-label="Delete file"></button>' : ''}
              <div class="uploader__fields">
                <h1 class="uploader__filename">${filename}</h1>
                ${state === 'uploaded' ? this._renderFields(allowEdit) : ''}
              </div>
            </div>
          </div>

          ${state === 'uploaded' ? this._renderEditPanels() : ''}

          <div data-panel="delete" class="uploader__panel ${currentPanel === 'delete' ? 'uploader__panel--show' : ''}" role="dialog" aria-labelledby="delete-heading-${filename}">
            <div class="uploader__alert">
              <h2 id="delete-heading-${filename}" class="uploader__heading">Delete this file?</h2>
              <div class="uploader__actions">
                <button class="uploader__btn uploader__btn--delete" data-action="confirm-delete" aria-label="Confirm delete">Delete</button>
                <button class="uploader__btn uploader__btn--secondary" data-action="cancel" aria-label="Cancel delete">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._setupFileEventListeners();
  }

  _loadFieldData() {
    const dataElements = this.querySelectorAll('p-uploader-data');
    dataElements.forEach((dataEl) => {
      const key = dataEl.getAttribute('key');
      const value = dataEl.textContent.trim();
      if (key) {
        this._fieldData.set(key, value);
      }
    });
  }

  _renderFields(allowEdit) {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return '';
    }

    let html = '';
    this._fieldSchema.forEach((fieldDef, key) => {
      const value = this._fieldData.get(key) || '';
      html += `
        <div class="uploader__field">
          <label class="uploader__field-label">${fieldDef.label}</label>
          <span class="uploader__field-value ${allowEdit ? 'uploader__field-value--editable' : ''}" ${allowEdit ? `data-action="edit-field" data-field="${key}"` : ''}>${value || '<em>-</em>'}</span>
          ${
            allowEdit
              ? `<button class="uploader__field-edit" data-action="edit-field" data-field="${key}" title="Edit ${fieldDef.label}"></button>`
              : ''
          }
        </div>
      `;
    });
    return html;
  }

  _renderEditPanels() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return '';
    }

    const currentPanel = this.getAttribute('data-current-panel') || 'info';
    let html = '';

    this._fieldSchema.forEach((fieldDef, key) => {
      const value = this._fieldData.get(key) || '';
      const isActive = currentPanel === `edit-${key}`;

      html += `
        <div data-panel="edit-${key}" class="uploader__panel ${isActive ? 'uploader__panel--show' : ''}" role="dialog" aria-label="Edit ${fieldDef.label}">
          <div class="uploader__body">
            ${
              fieldDef.type === 'textarea'
                ? `<textarea class="uploader__textarea" name="${key}" placeholder="${fieldDef.label}" rows="3" aria-label="${fieldDef.label}">${value}</textarea>`
                : `<input type="${fieldDef.type}" class="uploader__input" name="${key}" placeholder="${fieldDef.label}" value="${value}" aria-label="${fieldDef.label}">`
            }
            <div class="uploader__actions">
              <button class="uploader__btn uploader__btn--primary" data-action="confirm-edit" data-field="${key}" aria-label="Save ${fieldDef.label}">Save</button>
              <button class="uploader__btn uploader__btn--secondary" data-action="cancel" aria-label="Cancel editing">Cancel</button>
            </div>
          </div>
        </div>
      `;
    });

    return html;
  }

  _updatePanelVisibility(currentPanel) {
    const panels = this.shadowRoot.querySelectorAll('.uploader__panel');
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');

    panels.forEach(panel => {
      const panelName = panel.getAttribute('data-panel');
      if (
        (panelName === currentPanel) ||
        (panelName === 'error' && this.getAttribute('state') === 'error') ||
        (panelName === 'info' && currentPanel === 'info' && this.getAttribute('state') === 'uploaded')
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
      const fieldValueElement = infoPanel.querySelector(`[data-field="${fieldKey}"].uploader__field-value`);
      if (fieldValueElement) {
        fieldValueElement.innerHTML = newValue || '<em>-</em>';
      }
    }
  }

  _renderInfoPanelFields() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return;
    }

    const allowEdit = this.getAttribute('allow-edit') !== 'false';
    const infoPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="info"]');
    const fieldsContainer = infoPanel?.querySelector('.uploader__fields');

    if (!fieldsContainer) {
      return;
    }

    /* Build the fields HTML */
    const fieldsHTML = this._renderFields(allowEdit);

    /* Find the filename element and insert fields after it */
    const filenameElement = fieldsContainer.querySelector('.uploader__filename');
    if (filenameElement) {
      /* Remove any existing fields */
      const existingFields = fieldsContainer.querySelectorAll('.uploader__field');
      existingFields.forEach(field => field.remove());

      /* Insert new fields after filename */
      filenameElement.insertAdjacentHTML('afterend', fieldsHTML);
    }

    /* Also render the edit panels if they don't exist */
    this._renderEditPanelsIfNeeded();
  }

  _renderEditPanelsIfNeeded() {
    if (!this._fieldSchema || this._fieldSchema.size === 0) {
      return;
    }

    /* Check if edit panels already exist */
    const existingEditPanel = this.shadowRoot.querySelector('.uploader__panel[data-panel^="edit-"]');
    if (existingEditPanel) {
      return; /* Edit panels already exist */
    }

    /* Find the delete panel to insert edit panels before it */
    const deletePanel = this.shadowRoot.querySelector('.uploader__panel[data-panel="delete"]');
    if (!deletePanel) {
      return;
    }

    /* Build edit panels HTML */
    const editPanelsHTML = this._renderEditPanels();

    /* Insert edit panels before delete panel */
    deletePanel.insertAdjacentHTML('beforebegin', editPanelsHTML);
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

    this._clickHandler = (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      const actions = {
        'edit-field': () => this._setPanel(`edit-${e.target.dataset.field}`),
        'show-delete': () => this._setPanel('delete'),
        'cancel': () => this._setPanel('info'),
        'confirm-edit': () => this._handleConfirmEdit(e.target.dataset.field),
        'confirm-delete': () => this._handleConfirmDelete()
      };

      actions[action]?.();
    };

    /* Escape key handler on host element (works anywhere) */
    this._escapeKeyHandler = (e) => {
      const currentPanel = this.getAttribute('data-current-panel') || 'info';

      if (e.key === 'Escape') {
        if (currentPanel !== 'info' && currentPanel !== 'error') {
          e.preventDefault();
          this._setPanel('info');
        }
      }
    };

    /* Enter key handler on shadow root (only for inputs) */
    this._enterKeyHandler = (e) => {
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
        const input = this.shadowRoot.querySelector(`[name="${fieldKey}"]`);
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
    const input = this.shadowRoot.querySelector(`[name="${fieldKey}"]`);

    if (input) {
      const newValue = input.value;
      const oldValue = this._fieldData.get(fieldKey) || '';

      /* Optimistically update the UI */
      this._fieldData.set(fieldKey, newValue);

      /* Update the slotted data element */
      let dataElement = this.querySelector(`p-uploader-data[key="${fieldKey}"]`);
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
          const response = await fetch(uploader.config.updateAction, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: this.getAttribute('file-id'),
              field: fieldKey,
              value: newValue
            })
          });

          if (response.ok) {
            /* Update the field display in the info panel */
            this._updateFieldDisplay(fieldKey, newValue);

            this.dispatchEvent(
              new CustomEvent('file:update', {
                detail: {
                  fileId: this.getAttribute('file-id'),
                  field: fieldKey,
                  value: newValue
                },
                bubbles: true,
                composed: true
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
            this.setAttribute('error', `Update failed: ${errorText || 'Server error'}`);
            this.setAttribute('data-current-panel', 'error');
          }
        } catch (error) {
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

    if (!uploader || !uploader.config.deleteAction) {
      /* No delete action configured, just remove locally */
      this._removeFile();
      return;
    }

    try {
      const response = await fetch(uploader.config.deleteAction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: fileId
        })
      });

      if (response.ok) {
        /* Delete successful, remove the file */
        this._removeFile();

        this.dispatchEvent(
          new CustomEvent('file:delete', {
            detail: { fileId: fileId },
            bubbles: true,
            composed: true
          })
        );
      } else {
        /* Delete failed, show error */
        const errorText = await response.text();
        if (uploader.logger) {
          uploader.logger.error('Failed to delete file:', errorText);
        }
        this.setAttribute('error', `Delete failed: ${errorText || 'Server error'}`);
        this.setAttribute('data-current-panel', 'error');
      }
    } catch (error) {
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

    /* Update draggable state */
    if (uploader && uploader._updateDraggableState) {
      uploader._updateDraggableState();
    }
  }
}

/* Helper components for field definitions and data */
class PUploaderFields extends HTMLElement {}
class PUploaderField extends HTMLElement {}
class PUploaderData extends HTMLElement {}

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

export { PUploaderData, PUploaderField, PUploaderFields, PUploaderFile, PUploader as default };
