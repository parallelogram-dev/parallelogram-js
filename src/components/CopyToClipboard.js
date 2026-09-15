import { BaseComponent } from '../core/BaseComponent.js';
import { announce } from '../utils/announce.js';

/**
 * CopyToClipboard Component - Copy text to clipboard
 *
 * Copies the value or text of the element named by data-copytoclipboard-target,
 * or the literal data-copytoclipboard-text. The trigger stays enabled and
 * focused; progress is exposed through data-copytoclipboard-state ("copied" or
 * "failed") and announced to screen readers. If the trigger contains a
 * [data-copytoclipboard-label] element, only its text is swapped for the
 * success or error message.
 *
 * @example
 * <button data-copytoclipboard data-copytoclipboard-target="#code-block">
 *   <svg aria-hidden="true">...</svg>
 *   <span data-copytoclipboard-label>Copy code</span>
 * </button>
 * <pre id="code-block">logger.info('Hello World');</pre>
 */
export class CopyToClipboard extends BaseComponent {
  static selector = 'data-copytoclipboard';

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
    const baseCleanup = state.cleanup;

    state.config = this._getConfiguration(element);
    state.busy = false;
    state.resetTimer = null;
    state.restoreLabel = null;

    element.addEventListener(
      'click',
      event => {
        event.preventDefault();
        this._handleCopy(element, state);
      },
      { signal: state.controller.signal }
    );

    state.cleanup = () => {
      this._resetFeedback(element, state);
      baseCleanup();
    };

    this.eventBus?.emit('copy-to-clipboard:mounted', { element, target: this._getTarget(element) });
    return state;
  }

  _getConfiguration(element) {
    return {
      successMessage: this.getAttr(
        element,
        'success-message',
        CopyToClipboard.defaults.successMessage
      ),
      errorMessage: this.getAttr(element, 'error-message', CopyToClipboard.defaults.errorMessage),
      successDuration: this.getNumberAttr(
        element,
        'success-duration',
        CopyToClipboard.defaults.successDuration
      ),
      successClass: this.getAttr(element, 'success-class', CopyToClipboard.defaults.successClass),
      errorClass: this.getAttr(element, 'error-class', CopyToClipboard.defaults.errorClass),
    };
  }

  /**
   * Resolve what to copy at click time.
   *
   * The legacy data-copy-text and data-copy-target spellings are still read
   * so markup written against earlier releases keeps working.
   */
  _getTarget(element) {
    const text = this.getAttr(element, 'text') ?? element.getAttribute('data-copy-text');
    if (text) {
      return { type: 'text', content: text };
    }

    const selector = this.getAttr(element, 'target') ?? element.getAttribute('data-copy-target');
    const targetElement = selector ? document.querySelector(selector) : null;
    if (targetElement) {
      return { type: 'element', element: targetElement };
    }

    return { type: 'text', content: element.textContent.trim() };
  }

  async _handleCopy(element, state) {
    if (state.busy) return;
    state.busy = true;

    try {
      const target = this._getTarget(element);
      const textToCopy =
        target.type === 'element'
          ? 'value' in target.element
            ? target.element.value
            : target.element.textContent
          : target.content;

      if (!textToCopy) {
        throw new Error('No text to copy');
      }

      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        this._fallbackCopy(textToCopy);
      }

      this._showFeedback(element, state, 'copied');
      this.eventBus?.emit('copy-to-clipboard:success', { element, text: textToCopy });
    } catch (error) {
      this._showFeedback(element, state, 'failed');
      this.eventBus?.emit('copy-to-clipboard:error', { element, error: error.message });
    } finally {
      state.busy = false;
    }
  }

  /**
   * Copy with the legacy execCommand API on pages without the async Clipboard API.
   *
   * @throws {Error} If the browser reports that the copy did not happen.
   */
  _fallbackCopy(text) {
    const previousFocus = document.activeElement;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      if (!document.execCommand('copy')) {
        throw new Error('Copy command was rejected');
      }
    } finally {
      textArea.remove();
      previousFocus?.focus?.({ preventScroll: true });
    }
  }

  _showFeedback(element, state, outcome) {
    const { config } = state;
    const message = outcome === 'copied' ? config.successMessage : config.errorMessage;

    this._resetFeedback(element, state);

    this.setAttr(element, 'state', outcome);
    element.classList.add(outcome === 'copied' ? config.successClass : config.errorClass);

    const label =
      element.querySelector('[data-copytoclipboard-label]') ??
      (element.children.length === 0 ? element : null);
    if (label) {
      const originalText = label.textContent;
      label.textContent = message;
      state.restoreLabel = () => {
        label.textContent = originalText;
      };
    }

    announce(message);

    state.resetTimer = setTimeout(
      () => this._resetFeedback(element, state),
      config.successDuration
    );
  }

  _resetFeedback(element, state) {
    clearTimeout(state.resetTimer);
    state.resetTimer = null;
    state.restoreLabel?.();
    state.restoreLabel = null;
    this.removeAttr(element, 'state');
    element.classList.remove(state.config.successClass, state.config.errorClass);
  }

  static enhanceAll(selector = '[data-copytoclipboard]', options) {
    const instance = new CopyToClipboard(options);
    document.querySelectorAll(selector).forEach(el => instance.mount(el));
    return instance;
  }
}

export default CopyToClipboard;
