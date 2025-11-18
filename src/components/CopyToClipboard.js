import { BaseComponent } from '@parallelogram-js/core';

/**
 * CopyToClipboard Component - Copy text to clipboard
 *
 * @example
 * <button data-copy-to-clipboard data-copy-target="#code-block">Copy Code</button>
 * <pre id="code-block">logger?.info('Hello World');</pre>
 */
export class CopyToClipboard extends BaseComponent {
  static get defaults() {
    return {
      successMessage: 'Copied!',
      errorMessage: 'Copy failed',
      successDuration: 2000,
      successClass: 'copy-success',
      errorClass: 'copy-error',
    };
  }

  _init(element) {
    const state = super._init(element);

    const config = this._getConfiguration(element);
    const target = this._getTarget(element);

    state.config = config;
    state.target = target;
    state.originalText = element.textContent;

    element.addEventListener('click', e => {
      e.preventDefault();
      this._handleCopy(element, state);
    });

    this.eventBus?.emit('copy-to-clipboard:mounted', { element, target });
    return state;
  }

  _getConfiguration(element) {
    return {
      successMessage: this._getDataAttr(
        element,
        'copy-success-message',
        CopyToClipboard.defaults.successMessage
      ),
      errorMessage: this._getDataAttr(
        element,
        'copy-error-message',
        CopyToClipboard.defaults.errorMessage
      ),
      successDuration: parseInt(
        this._getDataAttr(
          element,
          'copy-success-duration',
          CopyToClipboard.defaults.successDuration
        )
      ),
      successClass: this._getDataAttr(
        element,
        'copy-success-class',
        CopyToClipboard.defaults.successClass
      ),
      errorClass: this._getDataAttr(
        element,
        'copy-error-class',
        CopyToClipboard.defaults.errorClass
      ),
    };
  }

  _getTarget(element) {
    const targetSelector = element.dataset.copyTarget;
    const textContent = element.dataset.copyText;

    if (textContent) {
      return { type: 'text', content: textContent };
    } else if (targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        return { type: 'element', element: targetElement };
      }
    }

    return { type: 'text', content: element.textContent };
  }

  async _handleCopy(element, state) {
    try {
      let textToCopy = '';

      if (state.target.type === 'text') {
        textToCopy = state.target.content;
      } else if (state.target.type === 'element') {
        // Try to get text content, fallback to input value
        textToCopy = state.target.element.value || state.target.element.textContent;
      }

      if (!textToCopy) {
        throw new Error('No text to copy');
      }

      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        this._fallbackCopy(textToCopy);
      }

      this._showSuccess(element, state);

      this.eventBus?.emit('copy-to-clipboard:success', {
        element,
        text: textToCopy,
      });
    } catch (error) {
      this._showError(element, state);

      this.eventBus?.emit('copy-to-clipboard:error', {
        element,
        error: error.message,
      });
    }
  }

  _fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  _showSuccess(element, state) {
    element.textContent = state.config.successMessage;
    element.classList.add(state.config.successClass);
    element.disabled = true;

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.successClass);
      element.disabled = false;
    }, state.config.successDuration);
  }

  _showError(element, state) {
    element.textContent = state.config.errorMessage;
    element.classList.add(state.config.errorClass);

    setTimeout(() => {
      element.textContent = state.originalText;
      element.classList.remove(state.config.errorClass);
    }, state.config.successDuration);
  }

  static enhanceAll(selector = '[data-copy-to-clipboard]', options) {
    const instance = new CopyToClipboard(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default CopyToClipboard;
