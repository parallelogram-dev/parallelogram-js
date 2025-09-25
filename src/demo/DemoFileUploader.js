import { BaseComponent } from '../core/BaseComponent.js';

/**
 * DemoFileUploader - Demo page functionality for FileUploader component
 * Handles event logging and provides mock API responses for demonstration
 */
export class DemoFileUploader extends BaseComponent {
  
  _init(element) {
    const state = super._init(element);
    
    // Store element reference for later use
    this.element = element;
    
    // Set up event listeners for file uploader events
    this._setupEventListeners(element, state.controller.signal);
    
    // Set up mock API endpoints for demo
    this._setupMockAPI();
    
    // Initialize event logging
    this._initEventLogging();
    
    // Notify page loaded
    this.notifyPageLoaded();
    
    return state;
  }
  
  _setupEventListeners(element, signal) {
    // Listen for file uploader events
    const fileUploadEvents = [
      'uploader:mounted',
      'uploader:files-added',
      'uploader:upload-progress',
      'uploader:file-uploaded',
      'uploader:file-error',
      'uploader:file-updated',
      'uploader:file-deleted',
      'uploader:files-reordered',
      'uploader:drag-enter',
      'uploader:drag-leave',
      'uploader:ui-updated',
      'uploader:error'
    ];
    
    fileUploadEvents.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        this.addEventToLog(eventType, e.detail);
      }, { signal });
    });
    
    // Handle clear event log button
    element.addEventListener('click', (e) => {
      if (e.target.matches('[data-btn-action="clearEventLog"]')) {
        this.clearEventLog();
      }
    }, { signal });
  }
  
  _setupMockAPI() {
    // Mock the upload API for demo purposes
    this._mockUploadAPI();
  }
  
  _mockUploadAPI() {
    // Intercept fetch requests to upload endpoints for demo
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options) => {
      // Handle upload API endpoints
      if (url.includes('/api/upload') || url.includes('/api/gallery-upload')) {
        return this._handleMockUpload(url, options);
      }
      
      // Handle sequence API endpoints  
      if (url.includes('/api/sequence') || url.includes('/api/gallery-sequence')) {
        return this._handleMockSequence(url, options);
      }
      
      // Pass through other requests
      return originalFetch(url, options);
    };
    
    // Also mock XMLHttpRequest for the component's upload functionality
    this._mockXMLHttpRequest();
  }
  
  _mockXMLHttpRequest() {
    const OriginalXMLHttpRequest = window.XMLHttpRequest;
    
    window.XMLHttpRequest = class MockXMLHttpRequest {
      constructor() {
        this.readyState = 0;
        this.status = 0;
        this.responseText = '';
        this.upload = {
          addEventListener: (event, callback) => {
            this._uploadEventListeners = this._uploadEventListeners || {};
            this._uploadEventListeners[event] = callback;
          }
        };
        this._eventListeners = {};
      }
      
      open(method, url, async) {
        this.method = method;
        this.url = url;
        this.async = async;
      }
      
      addEventListener(event, callback) {
        this._eventListeners[event] = callback;
      }
      
      send(data) {
        // Simulate upload progress
        this._simulateUpload(data);
      }
      
      _simulateUpload(formData) {
        const action = formData.get('action');
        
        // Simulate progress events
        setTimeout(() => {
          if (this._uploadEventListeners?.progress) {
            this._uploadEventListeners.progress({ loaded: 25, total: 100, lengthComputable: true });
          }
        }, 200);
        
        setTimeout(() => {
          if (this._uploadEventListeners?.progress) {
            this._uploadEventListeners.progress({ loaded: 75, total: 100, lengthComputable: true });
          }
        }, 600);
        
        setTimeout(() => {
          if (this._uploadEventListeners?.progress) {
            this._uploadEventListeners.progress({ loaded: 100, total: 100, lengthComputable: true });
          }
        }, 1000);
        
        // Simulate completion
        setTimeout(() => {
          this.readyState = 4;
          
          if (action === 'upload') {
            // Simulate successful upload
            this.status = 200;
            const file = formData.get('file');
            this.responseText = JSON.stringify({
              id: this._generateId(),
              title: file?.name?.split('.')[0] || 'Uploaded File',
              filename: file?.name || 'unknown.file',
              preview: file?.type?.startsWith('image/') ? this._generatePreviewURL() : null,
              info: `${this._formatFileSize(file?.size || 1024)} • ${this._getFileTypeLabel(file)}`,
              type: file?.type?.startsWith('image/') ? 'image' : 'document'
            });
          } else if (action === 'update') {
            // Simulate successful update
            this.status = 200;
            this.responseText = JSON.stringify({
              id: formData.get('id'),
              title: formData.get('title'),
              info: 'Updated successfully'
            });
          } else if (action === 'delete') {
            // Simulate successful delete
            this.status = 200;
            this.responseText = 'OK';
          }
          
          if (this._eventListeners.readystatechange) {
            this._eventListeners.readystatechange();
          }
        }, 1200);
      }
      
      _generateId() {
        return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      _generatePreviewURL() {
        const randomId = Math.floor(Math.random() * 1000);
        return `https://picsum.photos/200/200?random=${randomId}`;
      }
      
      _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }
      
      _getFileTypeLabel(file) {
        if (!file?.type) return 'Unknown';
        
        if (file.type.startsWith('image/')) return 'Image';
        if (file.type.includes('pdf')) return 'PDF';
        if (file.type.includes('document') || file.type.includes('word')) return 'Document';
        if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'Spreadsheet';
        if (file.type.includes('presentation') || file.type.includes('powerpoint')) return 'Presentation';
        
        return 'File';
      }
    };
  }
  
  async _handleMockUpload(url, options) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const formData = await options.body;
    const action = formData.get('action');
    
    if (action === 'upload') {
      const file = formData.get('file');
      return new Response(JSON.stringify({
        id: this._generateId(),
        title: file.name.split('.')[0],
        filename: file.name,
        preview: file.type.startsWith('image/') ? this._generatePreviewURL() : null,
        info: `${this._formatFileSize(file.size)} • ${this._getFileTypeLabel(file)}`,
        type: file.type.startsWith('image/') ? 'image' : 'document'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'update') {
      return new Response(JSON.stringify({
        id: formData.get('id'),
        title: formData.get('title'),
        info: 'Updated via mock API'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'delete') {
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Invalid action', { status: 400 });
  }
  
  async _handleMockSequence(url, options) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Just return success - in a real app this would update the database
    return new Response('OK', { status: 200 });
  }
  
  _initEventLogging() {
    // Debug: Check if uploader elements exist
    const uploaderElements = document.querySelectorAll('[data-uploader]');
    console.log('DemoFileUploader: Found uploader elements:', uploaderElements.length);
    uploaderElements.forEach((el, i) => console.log(`Uploader ${i}:`, el));
    
    // Debug: Check component registry
    if (window.pageManager) {
      console.log('DemoFileUploader: PageManager exists');
      const registry = window.componentRegistry || window.pageManager.registry;
      if (registry) {
        console.log('DemoFileUploader: Component registry:', registry);
        
        // Check if uploader component is registered
        if (registry.components) {
          const uploaderComponent = registry.components.find(c => c.name === 'uploader');
          console.log('DemoFileUploader: Found uploader in registry:', uploaderComponent);
          
          // Try to manually test if the selector works
          if (uploaderComponent) {
            const matches = document.querySelectorAll(uploaderComponent.selector);
            console.log('DemoFileUploader: Selector matches:', uploaderComponent.selector, '→', matches.length, 'elements');
          }
        }
        
        // Try to manually trigger a scan for uploader components
        console.log('DemoFileUploader: Attempting manual scan...');
        if (window.pageManager.scanAndMount) {
          window.pageManager.scanAndMount();
        }
      } else {
        console.log('DemoFileUploader: No component registry found');
      }
    } else {
      console.log('DemoFileUploader: No pageManager found');
    }
    
    // Initialize event log
    const eventLogContent = this.element.querySelector('.event__content');
    if (eventLogContent) {
      eventLogContent.innerHTML = `
        <div class="event__item">
          <div class="event__entry">
            <div>
              <strong>demo:initialized</strong>
              <pre>{"page": "/file-uploader", "mockAPI": true}</pre>
            </div>
            <small class="event__timestamp">${new Date().toLocaleTimeString()}</small>
          </div>
        </div>
      `;
    }
  }
  
  addEventToLog(eventType, data) {
    const eventLogContent = this.element.querySelector('.event__content');
    if (!eventLogContent) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const eventElement = document.createElement('div');
    eventElement.className = 'event__item';
    
    // Sanitize data for display
    const sanitizedData = this._sanitizeEventData(data);
    
    eventElement.innerHTML = `
      <div class="event__entry">
        <div>
          <strong style="color: #2563eb;">${eventType}</strong>
          <pre style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #666; background: #f8f9fa; padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(sanitizedData, null, 2)}</pre>
        </div>
        <small class="event__timestamp" style="color: #999; margin-left: 1rem; white-space: nowrap;">${timestamp}</small>
      </div>
    `;
    
    eventLogContent.insertBefore(eventElement, eventLogContent.firstChild);
    
    // Keep only last 15 events
    const items = eventLogContent.querySelectorAll('.event__item');
    if (items.length > 15) {
      items[items.length - 1].remove();
    }
  }
  
  clearEventLog() {
    const eventLogContent = this.element.querySelector('.event__content');
    if (eventLogContent) {
      eventLogContent.innerHTML = `
        <div class="event__item">
          <div class="event__entry">
            <div>
              <em>Event log cleared</em>
            </div>
            <small class="event__timestamp">${new Date().toLocaleTimeString()}</small>
          </div>
        </div>
      `;
    }
  }
  
  _sanitizeEventData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'target' || key === 'element') {
        // Show basic element info
        sanitized[key] = value ? {
          tagName: value.tagName,
          id: value.id || undefined,
          className: value.className || undefined
        } : null;
      } else if (key === 'fileData' && value) {
        // Show file info without sensitive data
        sanitized[key] = {
          id: value.id,
          filename: value.filename,
          type: value.type,
          state: value.state
        };
      } else if (typeof value === 'object' && value !== null) {
        // Limit object depth
        if (Array.isArray(value)) {
          sanitized[key] = value.slice(0, 5); // First 5 items only
        } else {
          sanitized[key] = Object.keys(value).length > 0 ? '[Object]' : value;
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  notifyPageLoaded() {
    if (window.eventBus) {
      window.eventBus.emit('page:loaded', {
        page: '/file-uploader',
        components: ['file-uploader'],
        mockAPI: true,
        timestamp: performance.now()
      });
    }
  }
  
  // Utility methods
  _generateId() {
    return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  _generatePreviewURL() {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/200/200?random=${randomId}`;
  }
  
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  _getFileTypeLabel(file) {
    if (!file?.type) return 'Unknown';
    
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.includes('pdf')) return 'PDF';
    if (file.type.includes('document') || file.type.includes('word')) return 'Document';
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return 'Spreadsheet';
    if (file.type.includes('presentation') || file.type.includes('powerpoint')) return 'Presentation';
    
    return 'File';
  }
}