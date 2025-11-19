function t(t){return t.replace(/-([a-z])/g,t=>t[1].toUpperCase())}function e(t=document){return Array.from(t.querySelectorAll(["a[href]","button:not([disabled])","input:not([disabled])","select:not([disabled])","textarea:not([disabled])",'[tabindex]:not([tabindex="-1"]):not([disabled])'].join(",")))}class BaseComponent{constructor({eventBus:t,logger:e,router:n}){this.eventBus=t,this.logger=e,this.router=n,this.elements=new WeakMap,this.states=this.elements,this._keys=null;}mount(t){if(this.elements.has(t))return this.update(t);const e=this._init(t);this.elements.set(t,e);}update(t){}unmount(t){const e=this.elements.get(t);if(e)try{e.cleanup?.();}finally{this.elements.delete(t);}}destroy(){for(const t of this._elementsKeys())this.unmount(t);}_elementsKeys(){return this._keys||(this._keys=new Set),this._keys}_track(t){this._keys||(this._keys=new Set),this._keys.add(t);}_untrack(t){this._keys?.delete(t);}_init(t){const e=new AbortController;return this._track(t),{cleanup:()=>{e.abort(),this._untrack(t);},controller:e}}getState(t){return this.elements.get(t)}_getDataAttr(e,n,o){return function(e,n,o){const r=n.includes("-")?t(n):n,s=e.dataset[r];return void 0===s?o:"true"===s||"false"!==s&&(isNaN(s)||""===s?s:Number(s))}(e,n,o)}_camelCase(e){return t(e)}_debounce(t,e=300){return function(t,e=300){let n;return function(...o){clearTimeout(n),n=setTimeout(()=>{clearTimeout(n),t.apply(this,o);},e);}}(t,e)}_throttle(t,e=100){return function(t,e=100){let n;return function(...o){n||(t.apply(this,o),n=true,setTimeout(()=>{n=false;},e));}}(t,e)}_delay(t){return function(t){return new Promise(e=>setTimeout(e,t))}(t)}_getTargetElement(t,e,n={}){const o=`${e}-view`,r=this.getAttr(t,o);if(r){const t=document.querySelector(`[data-view="${r}"]`);return !t&&n.required,t}const s=this.getAttr(t,e);if(!s)return n.required,null;const i=document.querySelector(s);return !i&&n.required,i}_getConfigFromAttrs(t,e){const n={};for(const[o,r]of Object.entries(e)){const e=this.constructor.defaults?.[o];n[o]=this.getAttr(t,r,e);}return n}_requireState(t,e="method"){return this.getState(t)}_generateId(t="elem"){return function(t="elem"){return `${t}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}(t)}async _waitForTransition(t,e=2e3){return async function(t,e=2e3){return new Promise(n=>{const o=()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();};t.addEventListener("animationend",o,{once:true}),t.addEventListener("transitionend",o,{once:true}),setTimeout(()=>{t.removeEventListener("animationend",o),t.removeEventListener("transitionend",o),n();},e);})}(t,e)}async _fadeIn(t,e=300){return async function(t,e=300){return t.style.opacity="0",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="1",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}async _fadeOut(t,e=300){return async function(t,e=300){return t.style.opacity="1",t.style.transition=`opacity ${e}ms ease-in-out`,t.offsetHeight,t.style.opacity="0",new Promise(n=>{setTimeout(()=>{t.style.transition="",n();},e);})}(t,e)}_getFocusableElements(t=document){return e(t)}_trapFocus(t,n){return function(t,n){const o=e(t);if(!o.length)return;const r=o[0],s=o[o.length-1],i=t.contains(document.activeElement)?document.activeElement:null;!n.shiftKey||i!==r&&i?n.shiftKey||i!==s||(r.focus(),n.preventDefault()):(s.focus(),n.preventDefault());}(t,n)}_restoreFocus(t){return function(t){t&&"function"==typeof t.focus&&requestAnimationFrame(()=>t.focus());}(t)}_createElement(t,e={},n=""){return function(t,e={},n=""){const o=document.createElement(t);for(const[t,n]of Object.entries(e))"className"===t||"class"===t?o.className=n:"style"===t&&"object"==typeof n?Object.assign(o.style,n):"dataset"===t&&"object"==typeof n?Object.assign(o.dataset,n):o.setAttribute(t,n);return "string"==typeof n?o.textContent=n:n instanceof HTMLElement&&o.appendChild(n),o}(t,e,n)}_dispatch(t,e,n){const o=new CustomEvent(e,{detail:n,bubbles:true,cancelable:true});return t.dispatchEvent(o),o}_getSelector(){if(this._selector)return this._selector;const t=this.constructor.name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();return this._selector=`data-${t}`,this._selector}setState(t,e){t.setAttribute(this._getSelector(),e);}getElementState(t){return t.getAttribute(this._getSelector())}setAttr(t,e,n){t.setAttribute(`${this._getSelector()}-${e}`,String(n));}getAttr(t,e,n=null){const o=t.getAttribute(`${this._getSelector()}-${e}`);return null!==o?o:n}removeAttr(t,e){t.removeAttribute(`${this._getSelector()}-${e}`);}hasAttr(t,e){return t.hasAttribute(`${this._getSelector()}-${e}`)}}

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
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Text content or child element
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }

  return element;
}

/**
 * Modal - Modal dialog enhancement component
 * Works with PModal web component and data attributes for modal triggers
 * Follows new naming conventions: data-modal-* attributes
 *
 * @example
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <p-modal id="example-modal"
 *          data-modal-size="large"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="btn btn--secondary" data-modal-close>Cancel</button>
 *     <button class="btn btn--primary">Save</button>
 *   </div>
 * </p-modal>
 *
 * JavaScript (standalone):
 * import { Modal } from './components/Modal.js';
 * const modals = new Modal();
 * document.querySelectorAll('[data-modal]')
 *   .forEach(trigger => modals.mount(trigger));
 */


class Modal extends BaseComponent {
  /**
   * Override _getSelector to prevent minification issues
   * @returns {string} Data attribute selector
   * @private
   */
  _getSelector() {
    return 'data-modal';
  }

  /**
   * Default options for modal enhancement
   */
  static get defaults() {
    return {
      size: 'md', // Modal size: xs, sm, md, lg, xl, fullscreen
      closable: true, // Whether modal can be closed
      backdropClose: true, // Close on backdrop click
      keyboard: true, // Enable keyboard navigation
      focus: true, // Auto-focus when opened
      multiple: false, // Allow multiple modals
      appendTo: 'body', // Where to append modal elements
    };
  }

  /**
   * Initialize modal enhancement for a trigger element
   * @protected
   * @param {HTMLElement} element - Trigger element to enhance
   * @returns {import('../core/BaseComponent.js').ComponentState} Component state
   */
  _init(element) {
    const state = super._init(element);

    // Get configuration from data attributes
    // Note: getAttr automatically adds component prefix (data-modal-)
    const target = this.getAttr(element, 'target');
    const size = this.getAttr(element, 'size', Modal.defaults.size);
    const closable = this.getAttr(element, 'closable', Modal.defaults.closable);
    const backdropClose = this.getAttr(
      element,
      'backdrop-close',
      Modal.defaults.backdropClose
    );
    const keyboard = this.getAttr(element, 'keyboard', Modal.defaults.keyboard);
    const focus = this.getAttr(element, 'focus', Modal.defaults.focus);
    const multiple = this.getAttr(element, 'multiple', Modal.defaults.multiple);

    if (!target) {
      this.logger?.warn('Modal: No data-modal-target attribute found', element);
      return state;
    }

    // Find or create target modal
    let modalElement = document.querySelector(target);
    if (!modalElement) {
      this.logger?.warn('Modal: Target modal not found', { target, element });
      return state;
    }

    // Ensure it's an p-modal element
    if (modalElement.tagName.toLowerCase() !== 'p-modal') {
      this.logger?.warn('Modal: Target is not an p-modal element', { target, element });
      return state;
    }

    // Configure modal attributes
    this._configureModal(modalElement, {
      size,
      closable,
      backdropClose,
      keyboard,
    });

    // Store state
    state.target = target;
    state.modalElement = modalElement;
    state.size = size;
    state.closable = closable;
    state.backdropClose = backdropClose;
    state.keyboard = keyboard;
    state.focus = focus;
    state.multiple = multiple;

    // Set up event listeners
    element.addEventListener('click', this._handleTriggerClick.bind(this, element), {
      signal: state.controller.signal,
    });

    // Listen for modal events
    modalElement.addEventListener('modal:open', this._handleModalOpen.bind(this, element), {
      signal: state.controller.signal,
    });

    modalElement.addEventListener('modal:close', this._handleModalClose.bind(this, element), {
      signal: state.controller.signal,
    });

    // Set up ARIA attributes
    element.setAttribute('aria-haspopup', 'dialog');
    element.setAttribute('aria-expanded', 'false');
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', target.replace('#', ''));
    }

    this.logger?.info('Modal trigger initialized', {
      element,
      target,
      size,
      closable,
    });

    return state;
  }

  /**
   * Open a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  open(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Close other modals if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherModals(state.modalElement);
    }

    // Store the trigger element for focus restoration
    state.modalElement._triggerElement = triggerElement;

    // Open the modal - wait for custom element to be defined if needed
    if (typeof state.modalElement.open === 'function') {
      state.modalElement.open();
    } else {
      // Fallback: wait for custom element to be fully defined
      customElements.whenDefined('p-modal').then(() => {
        if (typeof state.modalElement.open === 'function') {
          state.modalElement.open();
        } else {
          this.logger?.error('PModal open method not available', state.modalElement);
        }
      });
    }
  }

  /**
   * Close a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  close(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (typeof state.modalElement.close === 'function') {
      state.modalElement.close();
    } else {
      this.logger?.error('PModal close method not available', state.modalElement);
    }
  }

  /**
   * Toggle a modal
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(triggerElement, force) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    if (force === true) {
      this.open(triggerElement);
    } else if (force === false) {
      this.close(triggerElement);
    } else {
      if (state.modalElement.hasAttribute('open')) {
        this.close(triggerElement);
      } else {
        this.open(triggerElement);
      }
    }
  }

  /**
   * Check if a modal is open
   * @param {HTMLElement} triggerElement - Trigger element
   * @returns {boolean} Whether modal is open
   */
  isOpen(triggerElement) {
    const state = this.getState(triggerElement);
    return state?.modalElement?.hasAttribute('open') || false;
  }

  /**
   * Configure modal element with data attributes
   * @private
   * @param {PModal} modalElement - Modal element
   * @param {Object} config - Configuration object
   */
  _configureModal(modalElement, config) {
    if (config.size) {
      this.setAttr(modalElement, 'size', config.size);
    }

    if (config.closable !== undefined) {
      this.setAttr(modalElement, 'closable', String(config.closable));
    }

    if (config.backdropClose !== undefined) {
      this.setAttr(modalElement, 'backdrop-close', String(config.backdropClose));
    }

    if (config.keyboard !== undefined) {
      this.setAttr(modalElement, 'keyboard', String(config.keyboard));
    }
  }

  /**
   * Handle trigger click
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Event} event - Click event
   */
  _handleTriggerClick(triggerElement, event) {
    event.preventDefault();
    this.open(triggerElement);
  }

  /**
   * Handle modal open event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal open event
   */
  _handleModalOpen(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'true');

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal opened', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Handle modal close event
   * @private
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {CustomEvent} event - Modal close event
   */
  _handleModalClose(triggerElement, event) {
    // Update ARIA attributes
    triggerElement.setAttribute('aria-expanded', 'false');

    // Restore focus to trigger
    const state = this.getState(triggerElement);
    if (state?.focus && event.detail.modal._triggerElement) {
      requestAnimationFrame(() => {
        event.detail.modal._triggerElement.focus();
      });
    }

    // Dispatch enhancement event
    this._dispatch(triggerElement, 'modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal,
    });

    this.logger?.info('Modal closed', { triggerElement, modal: event.detail.modal });
  }

  /**
   * Close other open modals
   * @private
   * @param {PModal} currentModal - Current modal to keep open
   */
  _closeOtherModals(currentModal) {
    const openModals = document.querySelectorAll('p-modal[open]');
    openModals.forEach(modal => {
      if (modal !== currentModal) {
        modal.close();
      }
    });
  }

  /**
   * Update modal configuration
   * @param {HTMLElement} triggerElement - Trigger element
   * @param {Object} newConfig - New configuration
   */
  updateConfig(triggerElement, newConfig) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;

    // Update state
    Object.assign(state, newConfig);

    // Update modal element
    this._configureModal(state.modalElement, newConfig);

    this.logger?.info('Modal configuration updated', { triggerElement, newConfig });
  }

  /**
   * Static method to enhance all modal triggers on the page
   * @param {string} [selector='[data-modal][data-modal-target]'] - CSS selector
   * @param {Object} [options] - Component options
   * @returns {Modal} Modal instance
   */
  static enhanceAll(selector = '[data-modal][data-modal-target]', options) {
    const instance = new Modal(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }

  /**
   * Static method to create a modal programmatically
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string} config.content - Modal content (HTML)
   * @param {Array} [config.actions] - Action buttons
   * @param {string} [config.size] - Modal size
   * @param {Object} [config.options] - Additional options
   * @returns {Promise<PModal>} Modal element
   */
  static async create({ title, content, actions = [], size = 'medium', options = {} }) {
    // Create modal element
    const modal = document.createElement('p-modal');
    modal.id = generateId('modal');

    // Configure attributes
    modal.setAttribute('data-modal-size', size);
    Object.entries(options).forEach(([key, value]) => {
      modal.setAttribute(`data-modal-${key}`, String(value));
    });

    // Create title
    if (title) {
      const titleElement = createElement('h2', { slot: 'title' }, title);
      modal.appendChild(titleElement);
    }

    // Create content
    if (content) {
      const contentElement = document.createElement('div');
      contentElement.innerHTML = content;
      modal.appendChild(contentElement);
    }

    // Create actions
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.slot = 'actions';

      actions.forEach(action => {
        const button = createElement(
          'button',
          {
            className: `btn btn--${action.type || 'secondary'}`,
            'data-modal-close': action.close !== false ? '' : undefined,
          },
          action.label
        );

        if (action.onClick) {
          button.addEventListener('click', action.onClick);
        }

        actionsContainer.appendChild(button);
      });

      modal.appendChild(actionsContainer);
    }

    // Append to document
    document.body.appendChild(modal);
  }
}

export { Modal as default };
