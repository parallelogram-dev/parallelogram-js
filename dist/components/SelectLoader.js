import { BaseComponent } from '../core/BaseComponent.js';

/**
 * SelectLoader Component
 *
 * Enhances a native <select> element to load HTML fragments using RouterManager
 * and replace content in a target container when the selection changes.
 *
 * @example
 * <!-- HTML -->
 * <select data-selectloader
 *         data-selectloader-target="#content-area">
 *   <option value="">Select an option...</option>
 *   <option value="/fragments/option1">Option 1</option>
 *   <option value="/fragments/option2">Option 2</option>
 * </select>
 *
 * <div id="content-area">
 *   <!-- Content will be loaded here -->
 * </div>
 */
class SelectLoader extends BaseComponent {
  static get defaults() {
    return {
      loadingClass: 'loading',
      errorClass: 'error',
      transition: 'fade', // 'fade', 'slide', 'none'
      transitionDuration: 300,
      retainScroll: false,
      emptyMessage: 'Please select an option',
    };
  }

  /**
   * Initialize the select loader
   * @param {HTMLSelectElement} element - Select element to enhance
   * @returns {Object} Component state
   */
  _init(element) {
    const state = super._init(element);

    /* Validate it's a select element */
    if (element.tagName !== 'SELECT') {
      this.logger?.error('SelectLoader: Element must be a <select>', { element });
      return state;
    }

    /* Get configuration using BaseComponent helper */
    const config = this._getConfigFromAttrs(element, {
      target: 'selectloader-target',
      loadingClass: 'selectloader-loading-class',
      errorClass: 'selectloader-error-class',
      transition: 'selectloader-transition',
      transitionDuration: 'selectloader-transition-duration',
      retainScroll: 'selectloader-retain-scroll',
      emptyMessage: 'selectloader-empty-message',
    });

    /* Get target container using BaseComponent helper */
    const targetElement = this._getTargetElement(element, 'selectloader-target', {
      required: true,
    });

    if (!targetElement) {
      return state;
    }

    /* Store state */
    state.config = { ...SelectLoader.defaults, ...config };
    state.targetElement = targetElement;
    state.isLoading = false;
    state.currentUrl = null;
    state.scrollPosition = 0;

    /* Setup event listeners */
    this._setupEventListeners(element, state);

    /* Initial load if select has a value */
    if (element.value) {
      this._loadFragment(element, state, element.value);
    } else {
      this._showEmptyMessage(state);
    }

    this.logger?.info('SelectLoader initialized', {
      element,
      target: config.target,
      options: element.options.length,
    });

    return state;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners(element, state) {
    /* Listen for select changes */
    element.addEventListener(
      'change',
      event => {
        this._handleChange(event, element, state);
      },
      { signal: state.controller.signal }
    );

    /* Listen for form resets */
    const form = element.closest('form');
    if (form) {
      form.addEventListener(
        'reset',
        async () => {
          await this._delay(10);
          this._showEmptyMessage(state);
        },
        { signal: state.controller.signal }
      );
    }

    /* Listen for router navigation events via EventManager */
    this.eventBus?.on('router:navigate-success', data => {
      /* Check if target still exists after navigation */
      if (state.targetElement && !document.contains(state.targetElement)) {
        this.logger?.warn('SelectLoader: Target removed during navigation');
      }
    });
  }

  /**
   * Handle select change event
   * @private
   */
  async _handleChange(event, element, state) {
    const value = element.value;

    /* Emit cancelable event via BaseComponent helper */
    const beforeEvent = this._dispatch(element, 'selectloader:before-change', {
      value,
      previousUrl: state.currentUrl,
      targetElement: state.targetElement,
    });

    if (beforeEvent.defaultPrevented) {
      this.logger?.debug('SelectLoader: Change prevented by listener');
      return;
    }

    /* Handle empty selection */
    if (!value || value === '') {
      this._showEmptyMessage(state);
      state.currentUrl = null;

      this._dispatch(element, 'selectloader:cleared', {
        targetElement: state.targetElement,
      });
      return;
    }

    /* Load the fragment */
    await this._loadFragment(element, state, value);
  }

  /**
   * Load HTML fragment using RouterManager
   * @private
   */
  async _loadFragment(element, state, url) {
    /* Prevent concurrent loads */
    if (state.isLoading) {
      this.logger?.warn('SelectLoader: Load already in progress');
      return;
    }

    state.isLoading = true;
    state.currentUrl = url;

    /* Store scroll position if needed */
    if (state.config.retainScroll) {
      state.scrollPosition = state.targetElement.scrollTop;
    }

    /* Apply loading state */
    element.classList.add(state.config.loadingClass);
    element.disabled = true;
    state.targetElement.classList.add(state.config.loadingClass);

    /* Emit loading event */
    this._dispatch(element, 'selectloader:loading', {
      url,
      targetElement: state.targetElement,
    });

    try {
      /* Use RouterManager to fetch the fragment */
      if (!this.router) {
        throw new Error('RouterManager not available');
      }

      const result = await this.router.get(url);
      const html = result.data;

      /* Transition out old content */
      if (state.config.transition !== 'none') {
        await this._transitionOut(state);
      }

      /* Replace content */
      state.targetElement.innerHTML = html;

      /* Restore scroll position */
      if (state.config.retainScroll) {
        state.targetElement.scrollTop = state.scrollPosition;
      }

      /* Transition in new content */
      if (state.config.transition !== 'none') {
        await this._transitionIn(state);
      }

      /* Emit success via BaseComponent _dispatch and EventManager */
      this._dispatch(element, 'selectloader:loaded', {
        url,
        targetElement: state.targetElement,
        html,
      });

      /* EventManager will propagate this event */
      this.eventBus?.emit('selectloader:content-loaded', {
        element,
        url,
        targetElement: state.targetElement,
      });

      this.logger?.info('SelectLoader: Fragment loaded', { url });
    } catch (error) {
      this.logger?.error('SelectLoader: Load failed', { url, error });

      /* Show error message */
      this._showErrorMessage(state, error);

      /* Emit error event */
      this._dispatch(element, 'selectloader:error', {
        url,
        error,
        targetElement: state.targetElement,
      });

      /* Could notify via toast/alert if available */
      this.eventBus?.emit('app:notification', {
        type: 'error',
        message: `Failed to load content: ${error.message}`,
        duration: 5000,
      });
    } finally {
      /* Remove loading state */
      state.isLoading = false;
      element.classList.remove(state.config.loadingClass);
      element.disabled = false;
      state.targetElement.classList.remove(state.config.loadingClass);

      this._dispatch(element, 'selectloader:complete', {
        url,
        success: !state.targetElement.classList.contains(state.config.errorClass),
      });
    }
  }

  /**
   * Transition out old content using BaseComponent helpers
   * @private
   */
  async _transitionOut(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeOut(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideOut(state.targetElement, transitionDuration);
    }
  }

  /**
   * Transition in new content using BaseComponent helpers
   * @private
   */
  async _transitionIn(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeIn(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideIn(state.targetElement, transitionDuration);
    }
  }

  /**
   * Slide out animation
   * @private
   */
  async _slideOut(element, duration) {
    const height = element.offsetHeight;
    element.style.overflow = 'hidden';
    element.style.height = `${height}px`;
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.height = '0';
    element.style.opacity = '0';

    await this._delay(duration);
  }

  /**
   * Slide in animation
   * @private
   */
  async _slideIn(element, duration) {
    const scrollHeight = element.scrollHeight;
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-in, opacity ${duration}ms ease-in`;
    element.style.height = `${scrollHeight}px`;
    element.style.opacity = '1';

    await this._delay(duration);

    /* Cleanup */
    element.style.height = '';
    element.style.overflow = '';
    element.style.transition = '';
  }

  /**
   * Show empty message
   * @private
   */
  _showEmptyMessage(state) {
    const message = state.config.emptyMessage;
    state.targetElement.innerHTML = `
      <div class="select-loader__empty">
        <p>${message}</p>
      </div>
    `;
    state.targetElement.classList.remove(state.config.errorClass);
  }

  /**
   * Show error message with retry button
   * @private
   */
  _showErrorMessage(state, error) {
    const message = error.message || 'Failed to load content';
    const retryId = this._generateId('retry');

    state.targetElement.innerHTML = `
      <div class="select-loader__error">
        <p>${message}</p>
        <button type="button" id="${retryId}" class="btn btn--sm">Retry</button>
      </div>
    `;
    state.targetElement.classList.add(state.config.errorClass);

    /* Setup retry button using BaseComponent event handling */
    const retryButton = document.getElementById(retryId);
    if (retryButton) {
      retryButton.addEventListener(
        'click',
        () => {
          /* Find the select element from state */
          const element = Array.from(document.querySelectorAll('select')).find(
            el => this.getState(el) === state
          );
          if (element && state.currentUrl) {
            this._loadFragment(element, state, state.currentUrl);
          }
        },
        { once: true }
      );
    }
  }

  /**
   * Public API: Reload current fragment
   */
  reload(element) {
    const state = this._requireState(element, 'reload');
    if (!state || !state.currentUrl) return;

    this._loadFragment(element, state, state.currentUrl);
  }

  /**
   * Public API: Load specific URL
   */
  load(element, url) {
    const state = this._requireState(element, 'load');
    if (!state) return;

    element.value = url;
    this._loadFragment(element, state, url);
  }

  /**
   * Public API: Clear selection and content
   */
  clear(element) {
    const state = this._requireState(element, 'clear');
    if (!state) return;

    element.value = '';
    this._showEmptyMessage(state);
    state.currentUrl = null;
  }

  /**
   * Public API: Get current load state
   */
  getLoadState(element) {
    const state = this.getState(element);
    return state
      ? {
          isLoading: state.isLoading,
          currentUrl: state.currentUrl,
          hasContent: state.targetElement.children.length > 0,
          hasError: state.targetElement.classList.contains(state.config.errorClass),
        }
      : null;
  }
}

export { SelectLoader as default };
