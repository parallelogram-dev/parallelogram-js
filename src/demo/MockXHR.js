import { DevLogger } from '../index.js';

/**
 * MockXHR - Mock XMLHttpRequest for demo file uploads
 * Simulates file upload with progress events without making real network requests
 */
export class MockXHR {
  constructor() {
    this.readyState = 0;
    this.status = 0;
    this.statusText = '';
    this.responseText = '';
    this.response = null;
    this.responseType = '';
    this.responseURL = '';

    this._listeners = {};
    this._method = null;
    this._url = null;
    this._uploadDelay = 1500; // 1.5 seconds upload simulation
    this._logger = new DevLogger('MockXHR', true);

    // Upload object with event listeners
    this.upload = {
      _listeners: {},

      addEventListener: (event, callback) => {
        this.upload._listeners[event] = this.upload._listeners[event] || [];
        this.upload._listeners[event].push(callback);
      },

      dispatchEvent: (event) => {
        const listeners = this.upload._listeners[event.type];
        if (listeners) {
          listeners.forEach(callback => callback(event));
        }
      }
    };
  }

  open(method, url) {
    this._method = method;
    this._url = url;
    this.readyState = 1;
    this._logger.debug('open', { method, url });
  }

  send(body) {
    this._logger.debug('send', { url: this._url, hasBody: !!body });

    // Get file from FormData
    let file = null;
    if (body instanceof FormData) {
      file = body.get('file');
    }

    if (!file) {
      this._handleError('No file provided');
      return;
    }

    // Simulate upload with progress events
    this._simulateUpload(file);
  }

  addEventListener(event, callback) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  }

  dispatchEvent(event) {
    const listeners = this._listeners[event.type];
    if (listeners) {
      listeners.forEach(callback => callback.call(this, event));
    }
  }

  setRequestHeader() {
    // Mock - do nothing
  }

  getResponseHeader() {
    return null;
  }

  getAllResponseHeaders() {
    return '';
  }

  abort() {
    this._logger.debug('abort');
  }

  async _simulateUpload(file) {
    const totalSize = file.size;
    const chunks = 20;
    const chunkDelay = this._uploadDelay / chunks;

    // Simulate progress in chunks
    for (let i = 0; i <= chunks; i++) {
      await this._delay(chunkDelay);

      const loaded = Math.min((i / chunks) * totalSize, totalSize);

      // Dispatch progress event
      const progressEvent = new ProgressEvent('progress', {
        lengthComputable: true,
        loaded: loaded,
        total: totalSize
      });

      this.upload.dispatchEvent(progressEvent);
    }

    // Generate mock response
    await this._generateMockResponse(file);
  }

  async _generateMockResponse(file) {
    const isImage = file.type.startsWith('image/');
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create preview URL for images
    let preview = null;
    if (isImage) {
      preview = await this._createImagePreview(file);
    }

    const responseData = {
      id: fileId,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      filename: file.name,
      preview: preview,
      info: this._formatFileSize(file.size) + ' • ' + file.type,
      type: isImage ? 'image' : 'document'
    };

    // Set response
    this.status = 200;
    this.statusText = 'OK';
    this.responseText = JSON.stringify(responseData);
    this.readyState = 4;

    this._logger.info('upload complete', responseData);

    // Dispatch load event
    this.dispatchEvent(new Event('load'));
  }

  _handleError(message) {
    this.status = 400;
    this.statusText = 'Bad Request';
    this.responseText = JSON.stringify({ error: message });
    this.readyState = 4;

    this._logger.error('upload error', message);

    this.dispatchEvent(new Event('error'));
  }

  _createImagePreview(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
