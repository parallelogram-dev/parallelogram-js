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
    
    // Initialize file tracking
    this.files = new Map();
    
    // Get DOM elements
    this.selector = element.querySelector('[data-uploader-selector]');
    this.fileInput = element.querySelector('.uploader__fileinput');
    
    // Set up event listeners
    this._setupEventListeners(state.controller.signal);
    
    // Load any existing files
    this._loadExistingFiles();
    
    return state;
  }
  
  _setupEventListeners(signal) {
    if (!this.fileInput || !this.selector) return;
    
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this._handleFileSelect(e);
    }, { signal });
    
    // Drag and drop
    this.selector.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.selector.classList.add('dragover');
    }, { signal });
    
    this.selector.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.selector.classList.remove('dragover');
    }, { signal });
    
    this.selector.addEventListener('drop', (e) => {
      e.preventDefault();
      this.selector.classList.remove('dragover');
      this._handleFileDrop(e);
    }, { signal });
    
    // Button clicks (using event delegation)
    this.element.addEventListener('click', (e) => {
      this._handleButtonClick(e);
    }, { signal });
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
      }
    });
  }
  
  _handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this._processFiles(files);
    e.target.value = ''; // Reset input
  }
  
  _handleFileDrop(e) {
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
  
  _uploadFile(file) {
    const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    
    // Insert before selector
    this.element.insertBefore(fileElement, this.selector);
    
    // Start upload
    this._performUpload(fileData);
  }
  
  _createFileElement(fileData) {
    const div = document.createElement('div');
    div.className = 'uploader__file uploader__file--show';
    
    div.innerHTML = `
      <progress class="uploader__progress" max="100" value="${fileData.progress}"></progress>
      <input type="hidden" value="${fileData.id}" name="${this.config.inputName}">
      
      <picture class="uploader__preview">
        <img alt="" src="" style="display: none;">
      </picture>
      
      <div data-panel="info" class="uploader__panel uploader__panel--show">
        <div class="uploader__body">
          <p class="uploader__title"></p>
          <p class="uploader__caption"></p>
          <p class="uploader__link"></p>
          <p class="uploader__filename">${fileData.file ? fileData.file.name : ''}</p>
        </div>
        <div class="uploader__actions">
          ${this.config.allowEdit ? `
            <button class="uploader__btn uploader__btn--update" type="button">Update</button>Edit Title/Caption
            <button class="uploader__btn uploader__btn--link" type="button">Link</button>Edit website link
          ` : ''}
          <button class="uploader__btn uploader__btn--delete" type="button">Delete</button>Delete
        </div>
      </div>
      
      <div data-panel="error" class="uploader__panel">
        <div class="uploader__body">
          <p class="uploader__title">Upload Error</p>
          <p class="uploader__info"></p>
        </div>
        <button class="uploader__btn uploader__btn--cancel" type="button">Cancel</button>
      </div>
      
      <div data-panel="rename" class="uploader__panel">
        <div class="uploader__body">
          <input name="title" class="uploader__input" placeholder="Title" type="text">
          <textarea rows="6" name="caption" class="uploader__input" placeholder="Caption"></textarea>
        </div>
        <button class="uploader__btn uploader__btn--confirm" type="button">Confirm</button>
        <button class="uploader__btn uploader__btn--cancel" type="button">Cancel</button>
      </div>
      
      <div data-panel="link" class="uploader__panel">
        <div class="uploader__body">
          <input name="link" class="uploader__input" placeholder="E.g. https://example.com" type="text">
        </div>
        <button class="uploader__btn uploader__btn--confirm" type="button">Confirm</button>
        <button class="uploader__btn uploader__btn--cancel" type="button">Cancel</button>
      </div>
      
      <div data-panel="delete" class="uploader__panel">
        <div class="uploader__body">
          <p class="uploader__title">Delete this file?</p>
        </div>
        <button class="uploader__btn uploader__btn--delete" type="button">Delete</button>
        <button class="uploader__btn uploader__btn--cancel" type="button">Cancel</button>
      </div>
    `;
    
    return div;
  }
  
  _performUpload(fileData) {
    const formData = new FormData();
    formData.append('file', fileData.file);
    
    const xhr = new XMLHttpRequest();
    
    // Progress tracking
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        fileData.progress = progress;
        const progressBar = fileData.element.querySelector('.uploader__progress');
        if (progressBar) {
          progressBar.value = progress;
        }
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
  
  _handleUploadSuccess(fileData, response) {
    fileData.state = 'uploaded';
    fileData.serverData = response;
    
    // Update UI
    const preview = fileData.element.querySelector('.uploader__preview img');
    if (preview && response.preview) {
      preview.src = response.preview;
      preview.style.display = 'block';
      fileData.element.querySelector('.uploader__preview').classList.add('uploader__preview--show');
    }
    
    // Update hidden input with server ID
    const hiddenInput = fileData.element.querySelector('input[type="hidden"]');
    if (hiddenInput && response.id) {
      hiddenInput.value = response.id;
    }
    
    // Hide progress bar
    const progress = fileData.element.querySelector('.uploader__progress');
    if (progress) {
      progress.style.display = 'none';
    }
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
  }
  
  _handleButtonClick(e) {
    const button = e.target.closest('.uploader__btn');
    if (!button) return;
    
    const fileElement = button.closest('.uploader__file');
    if (!fileElement) return;
    
    const hiddenInput = fileElement.querySelector('input[type="hidden"]');
    const fileId = hiddenInput ? hiddenInput.value : null;
    const fileData = this.files.get(fileId);
    
    e.preventDefault();
    
    // Handle different button actions
    if (button.classList.contains('uploader__btn--update')) {
      this._showPanel(fileElement, 'rename');
    } else if (button.classList.contains('uploader__btn--link')) {
      this._showPanel(fileElement, 'link');
    } else if (button.classList.contains('uploader__btn--delete')) {
      this._showPanel(fileElement, 'delete');
    } else if (button.classList.contains('uploader__btn--confirm')) {
      this._handleConfirm(fileElement, fileData);
    } else if (button.classList.contains('uploader__btn--cancel')) {
      this._showPanel(fileElement, 'info');
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
      
      // TODO: Send to server
      
    } else if (panelType === 'link') {
      // Handle link update
      const link = currentPanel.querySelector('input[name="link"]').value;
      
      // Update UI
      fileElement.querySelector('.uploader__link').textContent = link;
      
      // TODO: Send to server
      
    } else if (panelType === 'delete') {
      // Handle deletion
      if (fileData) {
        this.files.delete(fileData.id);
      }
      fileElement.remove();
      
      // TODO: Send deletion to server
    }
    
    // Return to info panel
    this._showPanel(fileElement, 'info');
  }
}