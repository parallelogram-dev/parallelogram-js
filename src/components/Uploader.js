import { BaseComponent } from '@peptolab/parallelogram';

/**
 * Uploader - File upload component with drag & drop, progress tracking, and sortable file management
 * Based on original legacy structure with asset__ class naming
 * 
 * Usage:
 * <div data-uploader 
 *      data-max-files="5" 
 *      data-upload-url="/upload" 
 *      data-sequence-url="/sequence">
 *   
 *   <div class="asset__selector" data-asset-selector>
 *     <input type="file" class="asset__fileinput" id="file-input">
 *     <label class="asset__label" for="file-input">
 *       + Add files by selecting or dragging here
 *     </label>
 *   </div>
 * </div>
 */
export default class Uploader extends BaseComponent {
  
  _init(element) {
    const state = super._init(element);

    // Store element reference
    this.element = element;

    // Parse configuration following data attribute standards
    this.config = {
      maxFiles: parseInt(element.dataset.uploaderMaxFiles) || 5,
      uploadUrl: element.dataset.uploaderUploadUrl || '/upload',
      sequenceUrl: element.dataset.uploaderSequenceUrl || '/sequence',
      inputName: element.dataset.uploaderInputName || 'files',
      acceptTypes: element.dataset.uploaderAcceptTypes || '*/*',
      maxFileSize: parseInt(element.dataset.uploaderMaxFileSize) || 10 * 1024 * 1024,
      allowEdit: element.dataset.uploaderAllowEdit !== 'false',
      allowSort: element.dataset.uploaderAllowSort !== 'false'
    };

    // XHR constructor set to null for lazy initialization
    this.XHRConstructor = null;

    // Initialize file tracking
    this.files = new Map();

    // Track dragging state
    this.draggedElement = null;
    this.draggedOverElement = null;
    this.placeholder = null;

    // Get DOM elements
    this.selector = element.querySelector('[data-uploader-selector]');
    this.fileInput = element.querySelector('.uploader__fileinput');
    this.filesContainer = element.querySelector('[data-uploader-files]') || element;

    if (this.logger) {
      this.logger.debug('Uploader initialized', {
        selector: !!this.selector,
        fileInput: !!this.fileInput,
        config: this.config
      });
    }

    // Set up event listeners
    this._setupEventListeners(state.controller.signal);

    // Load any existing files
    this._loadExistingFiles();

    return state;
  }

  /**
   * Set custom XHR constructor for uploads (useful for mocking/testing)
   * @param {Function} XHRClass - Constructor function for XMLHttpRequest or mock
   */
  setXHR(XHRClass) {
    this.XHRConstructor = XHRClass;
    if (this.logger) {
      this.logger.debug('Custom XHR constructor set', {
        isMock: XHRClass !== XMLHttpRequest
      });
    }
  }

  /**
   * Get XHR constructor instance (lazy initialization)
   * @returns {Function} XHR constructor to use for uploads
   */
  _getXHRConstructor() {
    if (this.XHRConstructor === null) {
      /* Check for MockXHR in window (for demo/testing) */
      if (window.MockXHR) {
        this.XHRConstructor = window.MockXHR;
        if (this.logger) {
          this.logger.debug('Using MockXHR constructor from window');
        }
      } else {
        /* Default to native XMLHttpRequest if not set */
        this.XHRConstructor = XMLHttpRequest;
        if (this.logger) {
          this.logger.debug('Using default XMLHttpRequest constructor');
        }
      }
    }
    return this.XHRConstructor;
  }

  _setupEventListeners(signal) {
    if (!this.fileInput || !this.selector) {
      if (this.logger) {
        this.logger.warn('Cannot set up event listeners - missing elements', {
          fileInput: !!this.fileInput,
          selector: !!this.selector
        });
      }
      return;
    }

    if (this.logger) {
      this.logger.debug('Setting up Uploader event listeners');
    }

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      if (this.logger) {
        this.logger.debug('File input changed', { fileCount: e.target.files.length });
      }
      this._handleFileSelect(e);
    }, { signal });
    
    // Drag and drop for file uploads - TEMPORARILY DISABLED FOR DEBUGGING
    // this.selector.addEventListener('dragover', (e) => {
    //   /* Don't show dragover state if we're reordering files */
    //   if (this.draggedElement) {
    //     e.preventDefault(); // Prevent default to stop browser from treating as file drop
    //     e.stopPropagation();
    //     return;
    //   }

    //   e.preventDefault();
    //   this.selector.classList.add('dragover');
    // }, { signal });

    // this.selector.addEventListener('dragleave', (e) => {
    //   /* Don't remove dragover state if we're reordering files */
    //   if (this.draggedElement) {
    //     return;
    //   }

    //   e.preventDefault();
    //   this.selector.classList.remove('dragover');
    // }, { signal });

    // this.selector.addEventListener('drop', (e) => {
    //   /* Only handle file drops, not reordering drags */
    //   if (this.draggedElement) {
    //     e.preventDefault(); /* Prevent browser default file drop behavior */
    //     e.stopPropagation(); /* Stop event from doing anything else */
    //     return; /* This is a reorder drag, not a file drop */
    //   }

    //   e.preventDefault();
    //   this.selector.classList.remove('dragover');
    //   this._handleFileDrop(e);
    // }, { signal });
    
    // Button clicks (using event delegation)
    this.element.addEventListener('click', (e) => {
      this._handleButtonClick(e);
    }, { signal });

    // Drag and drop reordering (only if sorting is enabled)
    if (this.config.allowSort && this.filesContainer) {
      this.filesContainer.addEventListener('dragstart', (e) => {
        this._handleDragStart(e);
      }, { signal });

      this.filesContainer.addEventListener('dragend', (e) => {
        this._handleDragEnd(e);
      }, { signal });

      this.filesContainer.addEventListener('dragover', (e) => {
        this._handleDragOver(e);
      }, { signal });

      this.filesContainer.addEventListener('dragenter', (e) => {
        this._handleDragEnter(e);
      }, { signal });

      this.filesContainer.addEventListener('dragleave', (e) => {
        this._handleDragLeave(e);
      }, { signal });

      this.filesContainer.addEventListener('drop', (e) => {
        this._handleDrop(e);
      }, { signal });
    }
  }
  
  _loadExistingFiles() {
    // Load existing uploader__file elements
    const existingFiles = this.element.querySelectorAll('.uploader__file');
    existingFiles.forEach((fileElement, index) => {
      const hiddenInput = fileElement.querySelector('input[type="hidden"]');
      if (hiddenInput) {
        const fileData = {
          id: hiddenInput.value,
          element: fileElement,
          state: 'uploaded',
          order: index
        };
        this.files.set(fileData.id, fileData);

        /* Make existing file elements draggable if sorting is enabled */
        if (this.config.allowSort && existingFiles.length > 1) {
          fileElement.setAttribute('draggable', 'true');
          fileElement.setAttribute('data-uploader-drag-handle', '');
        }
      }
    });
  }
  
  _handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this._processFiles(files);
    e.target.value = ''; // Reset input
  }
  
  _handleFileDrop(e) {
    /* Only process if there are actual files in the drop */
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    this._processFiles(files);
  }
  
  _processFiles(files) {
    if (this.files.size >= this.config.maxFiles) {
      alert(`Maximum ${this.config.maxFiles} files allowed`);
      return;
    }
    
    files.slice(0, this.config.maxFiles - this.files.size).forEach(file => {
      this._uploadFile(file);
    });
  }
  
  async _uploadFile(file) {
    const fileId = this._generateId('file');
    const fileData = {
      id: fileId,
      file: file,
      state: 'uploading',
      progress: 0
    };

    // Add to tracking
    this.files.set(fileId, fileData);

    // Create UI element
    const fileElement = this._createFileElement(fileData);
    fileData.element = fileElement;

    // Append to files container
    this.filesContainer.appendChild(fileElement);

    // Generate thumbnail if it's an image
    if (file.type.startsWith('image/')) {
      try {
        const thumbnailUrl = await this._createThumbnail(file, 240, 240);
        const preview = fileElement.querySelector('.uploader__preview img');
        if (preview) {
          preview.src = thumbnailUrl;
          preview.style.display = 'block';
          fileElement.querySelector('.uploader__preview').classList.add('uploader__preview--show');

          /* Store that we've set a client-side thumbnail */
          fileData.hasClientThumbnail = true;
        }
      } catch (error) {
        if (this.logger) {
          this.logger.warn('Failed to create thumbnail', { error });
        }
      }
    }

    // Start upload
    this._performUpload(fileData);
  }
  
  _createFileElement(fileData) {
    const div = document.createElement('div');
    div.className = 'uploader__file uploader__file--show';

    /* Make the entire file element draggable if sorting is enabled */
    if (this.config.allowSort) {
      div.setAttribute('draggable', 'true');
      div.setAttribute('data-uploader-drag-handle', '');
      div.style.userSelect = 'none';
      div.style.webkitUserSelect = 'none';
    }

    div.innerHTML = `
      <input type="hidden" value="${fileData.id}" name="${this.config.inputName}">

      <div class="uploader__overlay">
        <progress class="uploader__progress" max="100" value="${fileData.progress}">
          <span>0%</span>
        </progress>
      </div>

      <picture class="uploader__preview">
        <img alt="" draggable="false" src="" style="display: none;">
      </picture>

      <div data-panel="info" class="uploader__panel uploader__panel--show">
        <div class="uploader__body">
          <p class="uploader__filename">${fileData.file ? fileData.file.name : ''}</p>
          <p class="uploader__title"></p>
          <p class="uploader__caption"></p>
          <p class="uploader__link"></p>
        </div>
        <div class="uploader__actions">
          ${this.config.allowEdit ? `
            <button class="uploader__btn uploader__btn--update" type="button" data-uploader-action="show-rename">Edit Title/Caption</button>
            <button class="uploader__btn uploader__btn--link" type="button" data-uploader-action="show-link">Edit Link</button>
          ` : ''}
          <button class="uploader__btn uploader__btn--delete" type="button" data-uploader-action="show-delete">Delete</button>
        </div>
      </div>

      <div data-panel="error" class="uploader__panel">
        <div class="uploader__body">
          <p class="uploader__title">Upload Error</p>
          <p class="uploader__info"></p>
        </div>
        <button class="uploader__btn uploader__btn--secondary" type="button" data-uploader-action="cancel">Cancel</button>
      </div>

      <div data-panel="rename" class="uploader__panel">
        <div class="uploader__body">
          <input name="title" class="uploader__input" placeholder="Title" type="text">
          <textarea rows="6" name="caption" class="uploader__input" placeholder="Caption"></textarea>
        </div>
        <button class="uploader__btn uploader__btn--primary" type="button" data-uploader-action="confirm">Confirm</button>
        <button class="uploader__btn uploader__btn--secondary" type="button" data-uploader-action="cancel">Cancel</button>
      </div>

      <div data-panel="link" class="uploader__panel">
        <div class="uploader__body">
          <input name="link" class="uploader__input" placeholder="E.g. https://example.com" type="text">
        </div>
        <button class="uploader__btn uploader__btn--primary" type="button" data-uploader-action="confirm">Confirm</button>
        <button class="uploader__btn uploader__btn--secondary" type="button" data-uploader-action="cancel">Cancel</button>
      </div>

      <div data-panel="delete" class="uploader__panel">
        <div class="uploader__body">
          <p class="uploader__title">Delete this file?</p>
        </div>
        <button class="uploader__btn uploader__btn--delete" type="button" data-uploader-action="confirm">Delete</button>
        <button class="uploader__btn uploader__btn--secondary" type="button" data-uploader-action="cancel">Cancel</button>
      </div>
    `;
    
    return div;
  }
  
  _performUpload(fileData) {
    if (this.logger) {
      this.logger.warn('_performUpload called', {
        fileId: fileData.id,
        hasFile: !!fileData.file,
        fileName: fileData.file ? fileData.file.name : 'NO FILE'
      });
    }

    const formData = new FormData();
    formData.append('file', fileData.file);

    const XHRConstructor = this._getXHRConstructor();
    const xhr = new XHRConstructor();
    
    // Progress tracking
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        fileData.progress = progress;
        this._updateProgress(fileData.element, progress);
      }
    });
    
    // Upload complete
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
    
    // Upload error
    xhr.addEventListener('error', () => {
      this._handleUploadError(fileData, 'Network error');
    });
    
    xhr.open('POST', this.config.uploadUrl);
    xhr.send(formData);
  }
  
  _updateProgress(element, progress) {
    /* Update progress element */
    const progressBar = element.querySelector('.uploader__progress');
    if (progressBar) {
      progressBar.value = progress;

      /* Update progress percentage text inside progress element */
      const percentText = progressBar.querySelector('span');
      if (percentText) {
        percentText.textContent = Math.round(progress) + '%';
      }
    }
  }

  async _handleUploadSuccess(fileData, response) {
    fileData.state = 'uploaded';
    fileData.serverData = response;

    /* Hide upload overlay with transition */
    const overlay = fileData.element.querySelector('.uploader__overlay');
    if (overlay) {
      overlay.classList.add('hide');
      await this._waitForTransition(overlay);
      overlay.remove();
    }

    /* Update UI - only use server preview if we don't have a client thumbnail */
    const preview = fileData.element.querySelector('.uploader__preview img');
    if (preview && response.preview && !fileData.hasClientThumbnail) {
      preview.src = response.preview;
      preview.style.display = 'block';
      fileData.element.querySelector('.uploader__preview').classList.add('uploader__preview--show');
    }

    /* Update hidden input with server ID */
    const hiddenInput = fileData.element.querySelector('input[type="hidden"]');
    if (hiddenInput && response.id) {
      hiddenInput.value = response.id;
    }

    /* Enable dragging on all files if we now have 2+ files */
    this._updateDraggableState();

    /* Dispatch upload success event */
    this._dispatch(this.element, 'uploader:upload:success', {
      fileId: fileData.id,
      fileName: fileData.file ? fileData.file.name : null,
      response: response
    });
  }
  
  _handleUploadError(fileData, error) {
    fileData.state = 'error';
    fileData.error = error;

    // Show error panel
    this._showPanel(fileData.element, 'error');

    // Update error message
    const errorInfo = fileData.element.querySelector('[data-panel="error"] .uploader__info');
    if (errorInfo) {
      errorInfo.textContent = error;
    }

    /* Dispatch upload error event */
    this._dispatch(this.element, 'uploader:upload:error', {
      fileId: fileData.id,
      fileName: fileData.file ? fileData.file.name : null,
      error: error
    });
  }
  
  _handleButtonClick(e) {
    const button = e.target.closest('[data-uploader-action]');
    if (!button) return;

    const fileElement = button.closest('.uploader__file');
    if (!fileElement) return;

    const hiddenInput = fileElement.querySelector('input[type="hidden"]');
    const fileId = hiddenInput ? hiddenInput.value : null;
    const fileData = this.files.get(fileId);

    e.preventDefault();

    const action = button.dataset.uploaderAction;

    // Handle different button actions
    switch (action) {
      case 'show-rename':
        this._showPanel(fileElement, 'rename');
        break;
      case 'show-link':
        this._showPanel(fileElement, 'link');
        break;
      case 'show-delete':
        this._showPanel(fileElement, 'delete');
        break;
      case 'confirm':
        this._handleConfirm(fileElement, fileData);
        break;
      case 'cancel':
        this._showPanel(fileElement, 'info');
        break;
    }
  }
  
  _showPanel(fileElement, panelName) {
    // Hide all panels
    const panels = fileElement.querySelectorAll('.uploader__panel');
    panels.forEach(panel => panel.classList.remove('uploader__panel--show'));
    
    // Show requested panel
    const targetPanel = fileElement.querySelector(`[data-panel="${panelName}"]`);
    if (targetPanel) {
      targetPanel.classList.add('uploader__panel--show');
    }
  }
  
  _handleConfirm(fileElement, fileData) {
    const currentPanel = fileElement.querySelector('.uploader__panel.uploader__panel--show');
    const panelType = currentPanel.getAttribute('data-panel');

    if (panelType === 'rename') {
      // Handle title/caption update
      const title = currentPanel.querySelector('input[name="title"]').value;
      const caption = currentPanel.querySelector('textarea[name="caption"]').value;

      // Update UI
      fileElement.querySelector('.uploader__title').textContent = title;
      fileElement.querySelector('.uploader__caption').textContent = caption;

      /* Dispatch file edit event */
      this._dispatch(this.element, 'uploader:file:edit', {
        fileId: fileData ? fileData.id : null,
        title: title,
        caption: caption
      });

      // TODO: Send to server

    } else if (panelType === 'link') {
      // Handle link update
      const link = currentPanel.querySelector('input[name="link"]').value;

      // Update UI
      fileElement.querySelector('.uploader__link').textContent = link;

      /* Dispatch file link event */
      this._dispatch(this.element, 'uploader:file:link', {
        fileId: fileData ? fileData.id : null,
        link: link
      });

      // TODO: Send to server

    } else if (panelType === 'delete') {
      const deletedFileId = fileData ? fileData.id : null;

      // Handle deletion
      if (fileData) {
        this.files.delete(fileData.id);
      }
      fileElement.remove();

      /* Dispatch file delete event */
      this._dispatch(this.element, 'uploader:file:delete', {
        fileId: deletedFileId
      });

      // TODO: Send deletion to server
      return; // Don't show info panel after deletion
    }

    // Return to info panel
    this._showPanel(fileElement, 'info');
  }

  /* Update draggable state based on file count */
  _updateDraggableState() {
    if (!this.config.allowSort) return;

    const allFiles = this.element.querySelectorAll('.uploader__file');
    const shouldBeDraggable = allFiles.length > 1;

    allFiles.forEach(fileElement => {
      if (shouldBeDraggable) {
        fileElement.setAttribute('draggable', 'true');
        fileElement.setAttribute('data-uploader-drag-handle', '');
        fileElement.style.userSelect = 'none';
        fileElement.style.webkitUserSelect = 'none';

        /* Also disable dragging on images inside */
        const img = fileElement.querySelector('img');
        if (img) {
          img.setAttribute('draggable', 'false');
        }
      } else {
        fileElement.removeAttribute('draggable');
        fileElement.removeAttribute('data-uploader-drag-handle');
        fileElement.style.userSelect = '';
        fileElement.style.webkitUserSelect = '';
      }
    });
  }

  /* Drag and drop reordering handlers */

  _handleDragStart(e) {
    /* Prevent default browser drag behaviors */
    const img = e.target.closest('img');
    const link = e.target.closest('a');

    /* Don't allow dragging images or links */
    if (img || link) {
      e.preventDefault();
      return;
    }

    const dragHandle = e.target.closest('[data-uploader-drag-handle]');
    if (!dragHandle) return;

    const fileElement = dragHandle.closest('.uploader__file');
    if (!fileElement) return;

    this.draggedElement = fileElement;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', fileElement.innerHTML);

    /* Stop event from bubbling to parent containers */
    e.stopPropagation();

    /* Use requestAnimationFrame to add dragging class after ghost is created */
    requestAnimationFrame(() => {
      if (this.draggedElement) {
        this.draggedElement.classList.add('uploader__file--dragging');
      }
    });
  }

  _handleDragEnd(e) {
    if (!this.draggedElement) return;

    this.draggedElement.classList.remove('uploader__file--dragging');

    /* Remove all drag-over classes */
    const allFiles = this.element.querySelectorAll('.uploader__file');
    allFiles.forEach(el => el.classList.remove('uploader__file--drag-over'));

    this.draggedElement = null;
    this.draggedOverElement = null;
  }

  _handleDragOver(e) {
    if (!this.draggedElement) return;

    /* Stop the event from reaching selector's dragover handler */
    e.stopPropagation();

    const fileElement = e.target.closest('.uploader__file');
    if (!fileElement || fileElement === this.draggedElement) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  _handleDragEnter(e) {
    if (!this.draggedElement) return;

    /* Don't process if we're over the selector */
    if (e.target.closest('[data-uploader-selector]')) return;

    const fileElement = e.target.closest('.uploader__file');
    if (!fileElement || fileElement === this.draggedElement) return;

    /* Only update if we're entering a different element */
    if (fileElement === this.draggedOverElement) return;

    /* Remove drag-over from previous element */
    if (this.draggedOverElement) {
      this.draggedOverElement.classList.remove('uploader__file--drag-over');
    }

    /* Add drag-over to current element */
    fileElement.classList.add('uploader__file--drag-over');
    this.draggedOverElement = fileElement;

    /* Get all file elements (excluding dragged element) */
    const allFiles = Array.from(this.element.querySelectorAll('.uploader__file:not(.uploader__file--dragging)'));
    const draggedIndex = allFiles.indexOf(this.draggedElement);
    const targetIndex = allFiles.indexOf(fileElement);

    /* Swap elements in DOM to show live reordering */
    if (targetIndex !== -1) {
      if (targetIndex > draggedIndex) {
        /* Moving down - insert after target */
        fileElement.parentNode.insertBefore(this.draggedElement, fileElement.nextSibling);
      } else {
        /* Moving up - insert before target */
        fileElement.parentNode.insertBefore(this.draggedElement, fileElement);
      }
    }
  }

  _handleDragLeave(e) {
    if (!this.draggedElement) return;

    const fileElement = e.target.closest('.uploader__file');
    if (!fileElement) return;

    /* Only remove if we're actually leaving this element */
    if (fileElement === this.draggedOverElement && !fileElement.contains(e.relatedTarget)) {
      fileElement.classList.remove('uploader__file--drag-over');
      this.draggedOverElement = null;
    }
  }

  _handleDrop(e) {
    if (!this.draggedElement) return;

    e.preventDefault();
    e.stopPropagation();

    /* Element is already in final position from live swapping, just update server */
    this._updateSequence();
  }

  async _updateSequence() {
    /* Get current order of file IDs */
    const fileIds = Array.from(this.element.querySelectorAll('.uploader__file'))
      .map(el => {
        const hiddenInput = el.querySelector('input[type="hidden"]');
        return hiddenInput ? hiddenInput.value : null;
      })
      .filter(id => id !== null);

    if (this.logger) {
      this.logger.debug('Updating file sequence', { fileIds });
    }

    /* Send to server */
    const XHRConstructor = this._getXHRConstructor();
    const xhr = new XHRConstructor();

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        if (this.logger) {
          this.logger.debug('Sequence updated successfully');
        }

        /* Dispatch sequence update success event */
        this._dispatch(this.element, 'uploader:sequence:update', {
          sequence: fileIds
        });
      } else {
        if (this.logger) {
          this.logger.error('Failed to update sequence', { status: xhr.status });
        }

        /* Dispatch sequence update error event */
        this._dispatch(this.element, 'uploader:sequence:error', {
          sequence: fileIds,
          status: xhr.status
        });
      }
    });

    xhr.addEventListener('error', () => {
      if (this.logger) {
        this.logger.error('Network error updating sequence');
      }
    });

    xhr.open('POST', this.config.sequenceUrl);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ sequence: fileIds }));
  }

  /**
   * Create a thumbnail from an image file
   * @param {File} file - The image file
   * @param {number} maxWidth - Maximum width of thumbnail
   * @param {number} maxHeight - Maximum height of thumbnail
   * @returns {Promise<string>} Data URL of the thumbnail
   */
  async _createThumbnail(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          /* Calculate dimensions maintaining aspect ratio */
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          /* Create canvas and draw resized image */
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          /* Convert to data URL */
          const thumbnailUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.9);
          resolve(thumbnailUrl);
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
}