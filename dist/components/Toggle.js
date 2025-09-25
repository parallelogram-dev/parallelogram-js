import { BaseComponent } from '@peptolab/parallelogram';

/**
 * Toggle Component
 *
 * Progressive enhancement for toggle functionality with show/hide states.
 * Supports dropdowns, modals, accordion panels, and other toggleable content.
 *
 * @example
 * HTML:
 * <button data-toggle data-toggle-target="#dropdown-menu">Toggle Menu</button>
 * <div id="dropdown-menu" class="dropdown hidden">
 *   <p>Dropdown content here</p>
 * </div>
 *
 * <!-- Dropdown with outside click capture -->
 * <button data-toggle
 *         data-toggle-target="#dropdown"
 *         data-toggle-capture="true">Dropdown</button>
 * <div id="dropdown" class="dropdown">Menu items</div>
 *
 * <!-- Manual toggle (won't auto-close) -->
 * <button data-toggle data-toggle-target="#persistent">Persistent Toggle</button>
 * <div id="persistent" data-toggle-manual="true">This won't auto-close</div>
 *
 * <!-- Accordion panel -->
 * <button data-toggle data-toggle-target="#panel-1" aria-expanded="false">Panel 1</button>
 * <div id="panel-1" class="panel">Panel 1 content</div>
 *
 * JavaScript (standalone):
 * import { Toggle } from './components/Toggle.js';
 * const toggles = new Toggle();
 * document.querySelectorAll('[data-toggle]')
 *   .forEach(trigger => toggles.mount(trigger));
 */
class Toggle extends BaseComponent {
  /**
   * Default configuration for toggle component
   * @returns {Object} Default config
   */
  static get defaults() {
    return {
      openClass: 'open',
      transitioningClass: 'transitioning',
      transitionDuration: 750,
      capture: false, // Whether to capture outside clicks
      manual: false, // Whether to prevent auto-closing
      multiple: false, // Allow multiple toggles open at once
      animateToggle: true,
      closeOnEscape: true,
    };
  }

  /**
   * Initialize the toggle functionality on a trigger element
   * @param {HTMLElement} element - Trigger element with data-toggle attribute
   * @returns {Object} State object for this element
   */
  _init(element) {
    const state = super._init(element);

    // Get target element
    const targetSelector = this._getDataAttr(element, 'toggle-target');
    if (!targetSelector) {
      this.logger?.warn('Toggle: No data-toggle-target attribute found', element);
      return state;
    }

    const target = document.querySelector(targetSelector);
    if (!target) {
      this.logger?.warn('Toggle: Target element not found', { selector: targetSelector, element });
      return state;
    }

    // Get configuration from data attributes
    const capture = this._getDataAttr(element, 'toggle-capture', Toggle.defaults.capture);
    const manual =
      target.hasAttribute('data-toggle-manual') ||
      this._getDataAttr(element, 'toggle-manual', Toggle.defaults.manual);
    const multiple = this._getDataAttr(element, 'toggle-multiple', Toggle.defaults.multiple);
    const animateToggle = this._getDataAttr(
      element,
      'toggle-animate',
      Toggle.defaults.animateToggle
    );

    // Store state
    state.target = target;
    state.targetSelector = targetSelector;
    state.capture = capture;
    state.manual = manual;
    state.multiple = multiple;
    state.animateToggle = animateToggle;
    state.isOpen = target.classList.contains(Toggle.defaults.openClass);
    state.transitionTimer = null;

    // Set up click handler
    const clickHandler = e => this._handleClick(e, element, state);
    element.addEventListener('click', clickHandler);

    // Mark as enhanced for status tracking
    element.setAttribute('data-toggle-enhanced', 'true');

    // Set up ARIA attributes
    element.setAttribute('aria-expanded', String(state.isOpen));
    if (!element.getAttribute('aria-controls')) {
      element.setAttribute('aria-controls', targetSelector.replace('#', ''));
    }

    // Set up escape key handler if enabled
    if (Toggle.defaults.closeOnEscape) {
      const escapeHandler = e => this._handleEscape(e, element, state);
      document.addEventListener('keydown', escapeHandler);
      state.escapeHandler = escapeHandler;
    }

    // Setup cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      element.removeEventListener('click', clickHandler);
      if (state.escapeHandler) {
        document.removeEventListener('keydown', state.escapeHandler);
      }
      this._clearTransitionTimer(state);
      this._removeGlobalListeners(state);
      originalCleanup();
    };

    this.eventBus?.emit('toggle:mount', {
      element,
      target,
      isOpen: state.isOpen,
      timestamp: performance.now(),
    });

    this.logger?.info('Toggle initialized', {
      element,
      target: targetSelector,
      capture,
      manual,
      isOpen: state.isOpen,
    });

    return state;
  }

  /**
   * Handle click events on toggle triggers
   * @private
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleClick(event, element, state) {
    event.preventDefault();
    event.stopPropagation();

    this.toggle(element);
  }

  /**
   * Handle escape key to close toggles
   * @private
   * @param {Event} event - Keydown event
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _handleEscape(event, element, state) {
    if (event.key === 'Escape' && state.isOpen && !state.manual) {
      this.hide(element);
    }
  }

  /**
   * Toggle the open/closed state
   * @param {HTMLElement} element - Trigger element
   */
  toggle(element) {
    const state = this.getState(element);
    if (!state) return;

    if (state.isOpen) {
      this.hide(element);
    } else {
      this.show(element);
    }
  }

  /**
   * Show/open the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  show(element) {
    const state = this.getState(element);
    if (!state || state.isOpen) return;

    // Close other toggles if multiple is not allowed
    if (!state.multiple) {
      this._closeOtherToggles(element);
    }

    // Update state
    state.isOpen = true;

    // Update classes and ARIA
    this._updateElementStates(element, state, true);

    // Set up global listeners for outside click capture
    if (state.capture) {
      this._setupGlobalListeners(element, state);
    }

    // Handle transitions
    if (state.animateToggle) {
      state.target.classList.add(Toggle.defaults.transitioningClass);
      state.transitionTimer = setTimeout(() => {
        this._endTransition(state);
      }, Toggle.defaults.transitionDuration);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:show', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:show', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle shown', { element, target: state.targetSelector });
  }

  /**
   * Hide/close the toggle target
   * @param {HTMLElement} element - Trigger element
   */
  hide(element) {
    const state = this.getState(element);
    if (!state || !state.isOpen) return;

    // Update state
    state.isOpen = false;

    // Update classes and ARIA
    this._updateElementStates(element, state, false);

    // Remove global listeners
    this._removeGlobalListeners(state);

    // Handle transitions
    if (state.animateToggle) {
      state.target.classList.add(Toggle.defaults.transitioningClass);
      state.transitionTimer = setTimeout(() => {
        this._endTransition(state);
      }, Toggle.defaults.transitionDuration);
    }

    // Dispatch events
    this._dispatch(element, 'toggle:hide', {
      target: state.target,
      trigger: element,
    });

    this.eventBus?.emit('toggle:hide', {
      element,
      target: state.target,
      timestamp: performance.now(),
    });

    this.logger?.debug('Toggle hidden', { element, target: state.targetSelector });
  }

  /**
   * Hide all non-manual toggles
   */
  hideAll() {
    // Get all mounted elements
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      const state = this.getState(element);
      if (state && state.isOpen && !state.manual) {
        this.hide(element);
      }
    });
  }

  /**
   * Check if a toggle is currently open
   * @param {HTMLElement} element - Trigger element
   * @returns {boolean} Whether the toggle is open
   */
  isOpen(element) {
    const state = this.getState(element);
    return state ? state.isOpen : false;
  }

  /**
   * Update element classes and ARIA attributes
   * @private
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   * @param {boolean} isOpen - Whether the toggle is open
   */
  _updateElementStates(element, state, isOpen) {
    // Update trigger
    element.setAttribute('aria-expanded', String(isOpen));

    // Update target
    if (isOpen) {
      state.target.classList.add(Toggle.defaults.openClass);
    } else {
      state.target.classList.remove(Toggle.defaults.openClass);
    }

    // Update related triggers (same target)
    const relatedTriggers = document.querySelectorAll(
      `[data-toggle-target="${state.targetSelector}"]`
    );
    relatedTriggers.forEach(trigger => {
      trigger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        trigger.classList.add(Toggle.defaults.openClass);
      } else {
        trigger.classList.remove(Toggle.defaults.openClass);
      }
    });
  }

  /**
   * Set up global event listeners for outside click capture
   * @private
   * @param {HTMLElement} element - Trigger element
   * @param {Object} state - Component state
   */
  _setupGlobalListeners(element, state) {
    // Prevent clicks inside the target from closing
    const targetClickHandler = e => {
      e.stopPropagation();
    };

    // Close on outside click
    const documentClickHandler = e => {
      if (!element.contains(e.target) && !state.target.contains(e.target)) {
        this.hide(element);
      }
    };

    state.target.addEventListener('click', targetClickHandler);
    document.addEventListener('click', documentClickHandler);

    // Store handlers for cleanup
    state.targetClickHandler = targetClickHandler;
    state.documentClickHandler = documentClickHandler;
  }

  /**
   * Remove global event listeners
   * @private
   * @param {Object} state - Component state
   */
  _removeGlobalListeners(state) {
    if (state.targetClickHandler) {
      state.target.removeEventListener('click', state.targetClickHandler);
      state.targetClickHandler = null;
    }

    if (state.documentClickHandler) {
      document.removeEventListener('click', state.documentClickHandler);
      state.documentClickHandler = null;
    }
  }

  /**
   * End transition animation
   * @private
   * @param {Object} state - Component state
   */
  _endTransition(state) {
    state.target.classList.remove(Toggle.defaults.transitioningClass);
    state.transitionTimer = null;
  }

  /**
   * Clear transition timer
   * @private
   * @param {Object} state - Component state
   */
  _clearTransitionTimer(state) {
    if (state.transitionTimer) {
      clearTimeout(state.transitionTimer);
      state.transitionTimer = null;
    }
  }

  /**
   * Close other open toggles when multiple is disabled
   * @private
   * @param {HTMLElement} currentElement - Current trigger element
   */
  _closeOtherToggles(currentElement) {
    const elements = document.querySelectorAll('[data-toggle-enhanced="true"]');

    elements.forEach(element => {
      if (element !== currentElement) {
        const state = this.getState(element);
        if (state && state.isOpen && !state.manual) {
          this.hide(element);
        }
      }
    });
  }

  /**
   * Get component status and statistics
   * @returns {Object} Component status
   */
  getStatus() {
    const triggers = document.querySelectorAll('[data-toggle-enhanced="true"]');
    let openCount = 0;
    let captureCount = 0;
    let manualCount = 0;

    triggers.forEach(trigger => {
      const state = this.getState(trigger);
      if (state) {
        if (state.isOpen) openCount++;
        if (state.capture) captureCount++;
        if (state.manual) manualCount++;
      }
    });

    return {
      totalTriggers: triggers.length,
      openCount,
      captureCount,
      manualCount,
      defaults: Toggle.defaults,
    };
  }

  /**
   * Enhance all toggle triggers on the page
   * @param {string} selector - CSS selector for toggle triggers
   * @param {Object} options - Component options
   * @returns {Toggle} Component instance
   */
  static enhanceAll(selector = '[data-toggle]', options) {
    const instance = new Toggle(options);
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      instance.mount(element);
    });

    return instance;
  }
}

export { Toggle as default };
