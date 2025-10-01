'use strict';

class EventManager {
  constructor() {
    this.listeners = new Map();
  }
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);
    listeners.add(callback);
    return () => this.off(event, callback);
  }
  once(event, callback) {
    const unsubscribe = this.on(event, payload => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  emit(event, payload) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    const listenersCopy = [...listeners];
    for (const callback of listenersCopy) {
      try {
        callback(payload);
      } catch (error) {
        console.error(`[EventManager] Error in listener for "${event}":`, error);
      }
    }
  }
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

class DevLogger {
  constructor(namespace, enabled = false) {
    this.namespace = namespace;
    this.enabled = enabled;
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }
  _getPrefix(level) {
    return `${new Date().toISOString()} [${this.namespace}] ${level}:`;
  }
  log(...args) {
    if (this.enabled) {
      console.log(this._getPrefix('LOG'), ...args);
    }
  }
  info(...args) {
    if (this.enabled) {
      console.info(this._getPrefix('INFO'), ...args);
    }
  }
  warn(...args) {
    if (this.enabled) {
      console.warn(this._getPrefix('WARN'), ...args);
    }
  }
  error(...args) {
    console.error(this._getPrefix('ERROR'), ...args);
  }
  child(subNamespace) {
    return new DevLogger(`${this.namespace}:${subNamespace}`, this.enabled);
  }
}

class BaseComponent {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.elements = new WeakMap();
    this._elementKeys = new Set();
  }
  mount(element) {
    if (this.elements.has(element)) {
      return this.update(element);
    }
    try {
      const state = this._init(element);
      this.elements.set(element, state);
      this._elementKeys.add(element);
      this.logger?.info('Component mounted', element);
    } catch (error) {
      this.logger?.error('Failed to mount component', error);
    }
  }
  update(element) {
    const state = this.elements.get(element);
    if (!state) return;
    this.logger?.info('Component updated', element);
  }
  unmount(element) {
    const state = this.elements.get(element);
    if (!state) return;
    try {
      state.cleanup();
      this.elements.delete(element);
      this._elementKeys.delete(element);
    } catch (error) {
      this.logger?.error('Failed to unmount component', error);
    }
  }
  getState(element) {
    return this.elements.get(element);
  }
  _init(element) {
    const controller = new AbortController();
    return {
      cleanup: () => controller.abort(),
      controller
    };
  }
  _getDataAttr(element, name, defaultValue) {
    const value = element.getAttribute(`data-${name}`);
    if (value === null) return defaultValue;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === '') return true;
    const numValue = Number(value);
    if (!isNaN(numValue) && isFinite(numValue)) return numValue;
    return value;
  }
  _dispatch(element, eventName, detail, bubbles = true) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles,
      cancelable: true
    });
    return element.dispatchEvent(event);
  }
}

class XToasts extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({
      mode: 'open'
    });
    root.innerHTML = `
      <style>  
        :host {
          position: fixed;
          inset: auto auto auto 0;
          padding: 12px;
          z-index: 2147483647;
          display: grid;
          gap: 8px;
          pointer-events: none;
        }
        
        :host([placement="top-left"]) { top: 0; left: 0; }
        :host([placement="top-right"]) { top: 0; right: 0; left: auto; }
        :host([placement="bottom-right"]) { bottom: 0; right: 0; left: auto; }
        :host([placement="bottom-left"]) { bottom: 0; left: 0; }
        
        .toast {
          padding: 10px 12px;
          border-radius: 8px;
          color: #fff;
          box-shadow: 0 6px 20px rgba(0,0,0,.25);
          opacity: 0;
          transform: translateY(-6px);
          animation: toast-in 0.18s ease-out forwards;
          cursor: pointer;
          font: 14px/1.4 system-ui, -apple-system, sans-serif;
          outline: none;
          pointer-events: auto;
          min-width: 300px;
        }
        
        .toast.info { background: #111827; }
        .toast.success { background: #065f46; }
        .toast.warn { background: #7c2d12; }
        .toast.error { background: #7f1d1d; }
        
        @keyframes toast-in { 
          to { opacity: 1; transform: none; } 
        }
        
        .row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .msg {
          white-space: pre-wrap;
          flex: 1;
        }
        
        button.close {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          font-weight: 700;
          background: rgba(255,255,255,0.1);
        }
        
        button.close:hover {
          background: rgba(255,255,255,0.2);
        }
      </style>  
      <div id="container" role="region" aria-live="polite"></div>
    `;
    this._container = root.getElementById('container');
    this._idCounter = 0;
    this._toasts = new Map();
  }
  toast({
    message,
    type = 'info',
    timeout = 4000,
    allowHTML = false
  }) {
    const id = ++this._idCounter;
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.setAttribute('role', type === 'warn' || type === 'error' ? 'alert' : 'status');
    const row = document.createElement('div');
    row.className = 'row';
    const messageElement = document.createElement('span');
    messageElement.className = 'msg';
    if (allowHTML) {
      messageElement.innerHTML = message;
    } else {
      messageElement.textContent = message;
    }
    const closeButton = document.createElement('button');
    closeButton.className = 'close';
    closeButton.setAttribute('aria-label', 'Dismiss notification');
    closeButton.textContent = '×';
    row.appendChild(messageElement);
    row.appendChild(closeButton);
    element.appendChild(row);
    this._container.appendChild(element);
    let isRemoved = false;
    const dismiss = () => {
      if (isRemoved) return;
      isRemoved = true;
      element.style.animation = 'toast-out 0.15s ease-in forwards';
      setTimeout(() => element.remove(), 150);
      this._toasts.delete(id);
      this.dispatchEvent(new CustomEvent('toast:close', {
        detail: {
          id,
          type,
          message
        },
        bubbles: true
      }));
    };
    closeButton.addEventListener('click', dismiss);
    if (timeout > 0) {
      setTimeout(dismiss, timeout);
    }
    this._toasts.set(id, {
      element,
      type,
      dismiss
    });
    this.dispatchEvent(new CustomEvent('toast:show', {
      detail: {
        id,
        type,
        message
      },
      bubbles: true
    }));
    return dismiss;
  }
}
if (!customElements.get('x-toasts')) {
  customElements.define('x-toasts', XToasts);
}

class AlertManager {
  constructor({
    logger,
    eventBus,
    placement = 'top-right',
    container
  } = {}) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.toastElement = this._getOrCreateToastElement(placement, container);
    this._setupEventForwarding();
    this.logger?.info('AlertManager initialized', {
      placement
    });
  }
  info(message, options = {}) {
    return this.toast({
      message,
      type: 'info',
      ...options
    });
  }
  success(message, options = {}) {
    return this.toast({
      message,
      type: 'success',
      ...options
    });
  }
  warn(message, options = {}) {
    return this.toast({
      message,
      type: 'warn',
      ...options
    });
  }
  error(message, options = {}) {
    return this.toast({
      message,
      type: 'error',
      timeout: 6000,
      ...options
    });
  }
  toast(options) {
    const dismiss = this.toastElement.toast(options);
    this.logger?.info('Toast shown', options);
    return dismiss;
  }
  _getOrCreateToastElement(placement, container = document.body) {
    let toastElement = document.querySelector('x-toasts');
    if (!toastElement) {
      toastElement = document.createElement('x-toasts');
      container.appendChild(toastElement);
      this.logger?.info('Created new x-toasts element');
    }
    toastElement.setAttribute('placement', placement);
    return toastElement;
  }
  _setupEventForwarding() {
    if (!this.eventBus) return;
    const events = ['toast:show', 'toast:close', 'toast:action'];
    events.forEach(eventName => {
      this.toastElement.addEventListener(eventName, event => {
        this.eventBus.emit(`alerts:${eventName.split(':')[1]}`, event.detail);
      });
    });
  }
  static notify(message, type = 'info', options = {}) {
    if (!AlertManager._globalInstance) {
      AlertManager._globalInstance = new AlertManager();
    }
    return AlertManager._globalInstance.toast({
      message,
      type,
      ...options
    });
  }
}

/**
 * XModal - Modal dialog web component
 * Can be used standalone without the framework
 * Follows new naming conventions: data-modal-* attributes and BEM CSS classes
 *
 * @example
 * import './components/XModal.js';
 *
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <x-modal id="example-modal"
 *          data-modal-closable="true"
 *          data-modal-backdrop-close="true"
 *          data-modal-keyboard="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="modal__button modal__button--secondary" data-modal-close>Cancel</button>
 *     <button class="modal__button modal__button--primary">Save</button>
 *   </div>
 * </x-modal>
 */

class XModal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'data-modal-size', 'data-modal-closable'];
  }
  constructor() {
    super();
    const root = this.attachShadow({
      mode: 'open'
    });

    // Use BEM-style CSS with CSS custom properties for theming
    root.innerHTML = `
      <style>
        :host {
          --modal-backdrop-bg: rgba(0, 0, 0, 0.45);
          --modal-panel-bg: #0f172a;
          --modal-panel-color: #e5e7eb;
          --modal-panel-border: rgba(255, 255, 255, 0.08);
          --modal-panel-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          --modal-panel-radius: 16px;
          --modal-header-bg: #0f172a;
          --modal-footer-bg: #0f172a;
          --modal-close-hover-bg: rgba(255, 255, 255, 0.1);
          --modal-animation-duration: 0.2s;
          --modal-animation-easing: ease-out;
        }

        /* Host states */
        :host {
          display: none;
        }

        :host([open]) {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 9999;
          animation: modal-fade-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Block: Modal backdrop */
        .modal__backdrop {
          position: absolute;
          inset: 0;
          background: var(--modal-backdrop-bg);
          animation: modal-backdrop-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Block: Modal panel */
        .modal__panel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          min-width: min(92vw, 640px);
          max-width: 92vw;
          max-height: 86vh;
          overflow: auto;
          background: var(--modal-panel-bg);
          color: var(--modal-panel-color);
          border: 1px solid var(--modal-panel-border);
          border-radius: var(--modal-panel-radius);
          box-shadow: var(--modal-panel-shadow);
          animation: modal-panel-in var(--modal-animation-duration) var(--modal-animation-easing);
        }

        /* Panel size modifiers */
        :host([data-modal-size="small"]) .modal__panel {
          min-width: min(92vw, 400px);
        }

        :host([data-modal-size="large"]) .modal__panel {
          min-width: min(92vw, 800px);
        }

        :host([data-modal-size="fullscreen"]) .modal__panel {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          border-radius: 0;
          transform: none;
          top: 0;
          left: 0;
        }

        /* Element: Modal header */
        .modal__header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--modal-panel-border);
          position: sticky;
          top: 0;
          background: var(--modal-header-bg);
          z-index: 1;
        }

        .modal__header h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 600;
        }

        /* Element: Header spacer */
        .modal__spacer {
          flex: 1;
        }

        /* Element: Close button */
        .modal__close {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: background-color var(--modal-animation-duration) ease;
        }

        .modal__close:hover {
          background: var(--modal-close-hover-bg);
        }

        .modal__close:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* Element: Modal content */
        .modal__content {
          padding: 14px;
        }

        /* Element: Modal footer */
        .modal__footer {
          padding: 12px 14px;
          border-top: 1px solid var(--modal-panel-border);
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: var(--modal-footer-bg);
          z-index: 1;
        }

        /* Slotted button styles (BEM classes) */
        ::slotted(.modal__button) {
          appearance: none;
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          background: #1f2937;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all var(--modal-animation-duration) ease;
        }

        ::slotted(.modal__button:hover) {
          background: #374151;
        }

        ::slotted(.modal__button--primary) {
          background: #60a5fa;
          color: #0b1020;
          font-weight: 700;
        }

        ::slotted(.modal__button--primary:hover) {
          background: #3b82f6;
        }

        ::slotted(.modal__button--danger) {
          background: #dc2626;
          color: white;
        }

        ::slotted(.modal__button--danger:hover) {
          background: #b91c1c;
        }

        ::slotted(.modal__button:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Animations */
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-panel-in {
          from { 
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          :host([open]),
          .modal__backdrop,
          .modal__panel,
          .modal__close,
          ::slotted(.modal__button) {
            animation: none;
            transition: none;
          }
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: light) {
          :host {
            --modal-panel-bg: white;
            --modal-panel-color: #1f2937;
            --modal-panel-border: rgba(0, 0, 0, 0.1);
            --modal-header-bg: white;
            --modal-footer-bg: white;
            --modal-close-hover-bg: rgba(0, 0, 0, 0.1);
          }

          ::slotted(.modal__button) {
            background: #f3f4f6;
            color: #1f2937;
          }

          ::slotted(.modal__button:hover) {
            background: #e5e7eb;
          }
        }
      </style>
      
      <div class="modal__backdrop" part="backdrop"></div>
      <div class="modal__panel" part="panel" role="dialog" aria-modal="true">
        <header class="modal__header" part="header">
          <slot name="title"><h2>Dialog</h2></slot>
          <div class="modal__spacer"></div>
          <button class="modal__close" aria-label="Close" part="close">×</button>
        </header>
        <section class="modal__content" part="content">
          <slot></slot>
        </section>
        <footer class="modal__footer" part="footer">
          <slot name="actions"></slot>
        </footer>
      </div>
    `;

    // Store element references using BEM naming
    this._elements = {
      backdrop: root.querySelector('.modal__backdrop'),
      panel: root.querySelector('.modal__panel'),
      close: root.querySelector('.modal__close')
    };

    // Bind event handlers
    this._onKeydown = this._onKeydown.bind(this);
    this._onFocus = this._onFocus.bind(this);
  }
  connectedCallback() {
    this._upgradeProperty('open');

    // Set up event listeners
    this._elements.backdrop.addEventListener('click', () => {
      if (this._isBackdropClosable()) {
        this.close();
      }
    });
    this._elements.close.addEventListener('click', () => {
      if (this._isClosable()) {
        this.close();
      }
    });

    // Global event listeners
    document.addEventListener('keydown', this._onKeydown);
    this.addEventListener('focusin', this._onFocus);

    // Set ARIA attributes
    this._elements.panel.setAttribute('aria-labelledby', this._getTitleId());
  }
  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('focusin', this._onFocus);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (this.hasAttribute('open')) {
        this._onOpen();
      } else {
        this._onClose();
      }
    }
  }

  /**
   * Open the modal
   */
  open() {
    this.setAttribute('open', '');
  }

  /**
   * Close the modal
   */
  close() {
    this.removeAttribute('open');
  }

  /**
   * Toggle modal open/closed state
   * @param {boolean} [force] - Force open (true) or close (false)
   */
  toggle(force) {
    if (force === true) {
      this.open();
    } else if (force === false) {
      this.close();
    } else {
      this.hasAttribute('open') ? this.close() : this.open();
    }
  }

  /**
   * Check if modal can be closed
   * @private
   * @returns {boolean}
   */
  _isClosable() {
    return this.getAttribute('data-modal-closable') !== 'false';
  }

  /**
   * Check if modal can be closed by clicking backdrop
   * @private
   * @returns {boolean}
   */
  _isBackdropClosable() {
    return this._isClosable() && this.getAttribute('data-modal-backdrop-close') !== 'false';
  }

  /**
   * Check if keyboard navigation is enabled
   * @private
   * @returns {boolean}
   */
  _isKeyboardEnabled() {
    return this.getAttribute('data-modal-keyboard') !== 'false';
  }

  /**
   * Handle modal opening
   * @private
   */
  _onOpen() {
    // Dispatch open event
    this.dispatchEvent(new CustomEvent('modal:open', {
      bubbles: true,
      detail: {
        modal: this
      }
    }));

    // Focus management
    requestAnimationFrame(() => {
      const firstFocusable = this._getFirstFocusable();
      const focusTarget = firstFocusable || this._elements.close;
      focusTarget.focus({
        preventScroll: true
      });
    });

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
   * Handle modal closing
   * @private
   */
  _onClose() {
    // Dispatch close event
    this.dispatchEvent(new CustomEvent('modal:close', {
      bubbles: true,
      detail: {
        modal: this
      }
    }));

    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} event
   */
  _onKeydown(event) {
    if (!this.hasAttribute('open') || !this._isKeyboardEnabled()) return;
    if (event.key === 'Escape' && this._isClosable()) {
      event.preventDefault();
      this.close();
    }
    if (event.key === 'Tab') {
      this._trapTab(event);
    }
  }

  /**
   * Handle focus events for focus trapping
   * @private
   */
  _onFocus() {
    if (!this.contains(document.activeElement)) {
      const focusTarget = this._getFirstFocusable() || this._elements.close;
      focusTarget.focus({
        preventScroll: true
      });
    }
  }

  /**
   * Get all focusable elements within the modal
   * @private
   * @returns {HTMLElement[]}
   */
  _getFocusableElements() {
    const selectors = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"]):not([disabled])'];
    return [...this.querySelectorAll(selectors.join(','))];
  }

  /**
   * Get the first focusable element
   * @private
   * @returns {HTMLElement|null}
   */
  _getFirstFocusable() {
    return this._getFocusableElements()[0] || null;
  }

  /**
   * Trap tab navigation within the modal
   * @private
   * @param {KeyboardEvent} event
   */
  _trapTab(event) {
    const focusableElements = this._getFocusableElements();
    if (!focusableElements.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.contains(document.activeElement) ? document.activeElement : null;
    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement || !activeElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Get title element ID for ARIA labeling
   * @private
   * @returns {string}
   */
  _getTitleId() {
    const titleSlot = this.querySelector('[slot="title"]');
    if (titleSlot && titleSlot.id) {
      return titleSlot.id;
    }
    return 'modal-title';
  }

  /**
   * Upgrade property for proper web component behavior
   * @private
   * @param {string} prop
   */
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }
}

// Auto-register the web component if not already registered
if (!customElements.get('x-modal')) {
  customElements.define('x-modal', XModal);
}

class LazyImage extends BaseComponent {
  static get defaults() {
    return {
      threshold: '200px',
      fadeIn: true,
      retryAttempts: 3,
      retryDelay: 1000,
      placeholderClass: 'lazy-image--loading',
      loadedClass: 'lazy-image--loaded',
      errorClass: 'lazy-image--error'
    };
  }
  _init(element) {
    const state = super._init(element);
    const src = this._getDataAttr(element, 'lazyimage-src');
    const threshold = this._getDataAttr(element, 'lazyimage-threshold', LazyImage.defaults.threshold);
    const fadeIn = this._getDataAttr(element, 'lazyimage-fadein', LazyImage.defaults.fadeIn);
    if (!src) {
      this.logger?.warn('LazyImage: No data-lazyimage-src attribute found', element);
      return state;
    }
    element.classList.add(LazyImage.defaults.placeholderClass);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this._loadImage(element, src, {
            fadeIn
          });
          observer.disconnect();
        }
      }
    }, {
      rootMargin: threshold,
      threshold: 0.1
    });
    observer.observe(element);
    state.observer = observer;
    state.src = src;
    state.loaded = false;
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      observer.disconnect();
      originalCleanup();
    };
    this.logger?.info('LazyImage initialized', {
      element,
      src,
      threshold
    });
    return state;
  }
  _loadImage(element, src, {
    fadeIn
  }) {
    const img = new Image();
    img.onload = () => {
      const state = this.getState(element);
      if (!state || state.loaded) return;
      state.loaded = true;
      element.src = src;
      element.classList.remove(LazyImage.defaults.placeholderClass, LazyImage.defaults.errorClass);
      element.classList.add(LazyImage.defaults.loadedClass);
      if (fadeIn) {
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.3s ease-in-out';
        requestAnimationFrame(() => {
          element.style.opacity = '1';
        });
      }
      this._dispatch(element, 'lazy:loaded', {
        src
      });
      this.eventBus?.emit('lazy-image:loaded', {
        element,
        src
      });
      this.logger?.info('LazyImage: Successfully loaded', {
        element,
        src
      });
    };
    img.onerror = () => {
      element.classList.remove(LazyImage.defaults.placeholderClass);
      element.classList.add(LazyImage.defaults.errorClass);
      this._dispatch(element, 'lazy:error', {
        src
      });
      this.eventBus?.emit('lazy-image:error', {
        element,
        src
      });
      this.logger?.error('LazyImage: Failed to load', {
        element,
        src
      });
    };
    img.src = src;
  }
  static enhanceAll(selector = '[data-lazyimage][data-lazyimage-src]', options) {
    const instance = new LazyImage(options);
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      instance.mount(element);
    });
    return instance;
  }
}

/**
 * Modal - Modal dialog enhancement component
 * Works with XModal web component and data attributes for modal triggers
 * Follows new naming conventions: data-modal-* attributes
 *
 * @example
 * HTML:
 * <button data-modal data-modal-target="#example-modal">Open Modal</button>
 *
 * <x-modal id="example-modal"
 *          data-modal-size="large"
 *          data-modal-closable="true">
 *   <h2 slot="title">Modal Title</h2>
 *   <p>Modal content goes here.</p>
 *   <div slot="actions">
 *     <button class="modal__button modal__button--secondary" data-modal-close>Cancel</button>
 *     <button class="modal__button modal__button--primary">Save</button>
 *   </div>
 * </x-modal>
 *
 * JavaScript (standalone):
 * import { Modal } from './components/Modal.js';
 * const modals = new Modal();
 * document.querySelectorAll('[data-modal]')
 *   .forEach(trigger => modals.mount(trigger));
 */

class Modal extends BaseComponent {
  /**
   * Default options for modal enhancement
   */
  static get defaults() {
    return {
      size: 'medium',
      // Modal size: small, medium, large, fullscreen
      closable: true,
      // Whether modal can be closed
      backdropClose: true,
      // Close on backdrop click
      keyboard: true,
      // Enable keyboard navigation
      focus: true,
      // Auto-focus when opened
      multiple: false,
      // Allow multiple modals
      appendTo: 'body' // Where to append modal elements
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
    const target = this._getDataAttr(element, 'modal-target');
    const size = this._getDataAttr(element, 'modal-size', Modal.defaults.size);
    const closable = this._getDataAttr(element, 'modal-closable', Modal.defaults.closable);
    const backdropClose = this._getDataAttr(element, 'modal-backdrop-close', Modal.defaults.backdropClose);
    const keyboard = this._getDataAttr(element, 'modal-keyboard', Modal.defaults.keyboard);
    const focus = this._getDataAttr(element, 'modal-focus', Modal.defaults.focus);
    const multiple = this._getDataAttr(element, 'modal-multiple', Modal.defaults.multiple);
    if (!target) {
      this.logger?.warn('Modal: No data-modal-target attribute found', element);
      return state;
    }

    // Find or create target modal
    let modalElement = document.querySelector(target);
    if (!modalElement) {
      this.logger?.warn('Modal: Target modal not found', {
        target,
        element
      });
      return state;
    }

    // Ensure it's an x-modal element
    if (modalElement.tagName.toLowerCase() !== 'x-modal') {
      this.logger?.warn('Modal: Target is not an x-modal element', {
        target,
        element
      });
      return state;
    }

    // Configure modal attributes
    this._configureModal(modalElement, {
      size,
      closable,
      backdropClose,
      keyboard
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
      signal: state.controller.signal
    });

    // Listen for modal events
    modalElement.addEventListener('modal:open', this._handleModalOpen.bind(this, element), {
      signal: state.controller.signal
    });
    modalElement.addEventListener('modal:close', this._handleModalClose.bind(this, element), {
      signal: state.controller.signal
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
      closable
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

    // Open the modal
    state.modalElement.open();
  }

  /**
   * Close a modal
   * @param {HTMLElement} triggerElement - Trigger element
   */
  close(triggerElement) {
    const state = this.getState(triggerElement);
    if (!state?.modalElement) return;
    state.modalElement.close();
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
   * @param {XModal} modalElement - Modal element
   * @param {Object} config - Configuration object
   */
  _configureModal(modalElement, config) {
    if (config.size) {
      modalElement.setAttribute('data-modal-size', config.size);
    }
    if (config.closable !== undefined) {
      modalElement.setAttribute('data-modal-closable', String(config.closable));
    }
    if (config.backdropClose !== undefined) {
      modalElement.setAttribute('data-modal-backdrop-close', String(config.backdropClose));
    }
    if (config.keyboard !== undefined) {
      modalElement.setAttribute('data-modal-keyboard', String(config.keyboard));
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
      modal: event.detail.modal
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:opened', {
      trigger: triggerElement,
      modal: event.detail.modal
    });
    this.logger?.info('Modal opened', {
      triggerElement,
      modal: event.detail.modal
    });
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
      modal: event.detail.modal
    });

    // Emit to event bus if available
    this.eventBus?.emit('modal:closed', {
      trigger: triggerElement,
      modal: event.detail.modal
    });
    this.logger?.info('Modal closed', {
      triggerElement,
      modal: event.detail.modal
    });
  }

  /**
   * Close other open modals
   * @private
   * @param {XModal} currentModal - Current modal to keep open
   */
  _closeOtherModals(currentModal) {
    const openModals = document.querySelectorAll('x-modal[open]');
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
    this.logger?.info('Modal configuration updated', {
      triggerElement,
      newConfig
    });
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
   * @returns {Promise<XModal>} Modal element
   */
  static async create({
    title,
    content,
    actions = [],
    size = 'medium',
    options = {}
  }) {
    // Create modal element
    const modal = document.createElement('x-modal');
    modal.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Configure attributes
    modal.setAttribute('data-modal-size', size);
    Object.entries(options).forEach(([key, value]) => {
      modal.setAttribute(`data-modal-${key}`, String(value));
    });

    // Create title
    if (title) {
      const titleElement = document.createElement('h2');
      titleElement.slot = 'title';
      titleElement.textContent = title;
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
        const button = document.createElement('button');
        button.className = `modal__button modal__button--${action.type || 'secondary'}`;
        button.textContent = action.label;
        if (action.close !== false) {
          button.setAttribute('data-modal-close', '');
        }
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

exports.AlertManager = AlertManager;
exports.BaseComponent = BaseComponent;
exports.DevLogger = DevLogger;
exports.EventManager = EventManager;
exports.LazyImage = LazyImage;
exports.Modal = Modal;
exports.XModal = XModal;
exports.XToasts = XToasts;
//# sourceMappingURL=index.js.map
