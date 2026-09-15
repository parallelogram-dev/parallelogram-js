import { BaseComponent } from '../core/BaseComponent.js';
import { announce } from '../utils/announce.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { trustedHTML } from '../utils/trusted.js';

/**
 * SelectLoader - load an HTML fragment into a target when a select's choice changes
 *
 * Each option's value is the URL of a fragment, fetched through RouterManager. Choices made before
 * the on-demand router has loaded wait for it to start. A newer choice cancels a load that is still
 * running, the target is marked `aria-busy` while loading, and the loaded content is announced.
 * Fragments are inserted as HTML, so they must come from a trusted,
 * same-origin source; sanitise anything else first, for example with DOMPurify.
 *
 * @example
 * <select data-selectloader data-selectloader-target="#content-area">
 *   <option value="">Select an option...</option>
 *   <option value="/fragments/option1">Option 1</option>
 *   <option value="/fragments/option2">Option 2</option>
 * </select>
 *
 * <div id="content-area"></div>
 *
 * @attributes
 * - data-selectloader-target: selector for the element that receives the content
 * - data-selectloader-target-view: the target's data-view name, instead of a selector
 * - data-selectloader-transition: fade (default), slide or none; skipped under reduced motion
 * - data-selectloader-transition-duration: milliseconds (default 300)
 * - data-selectloader-retain-scroll: keep the target's scroll position (default false)
 * - data-selectloader-empty-message: text shown when nothing is chosen
 * - data-selectloader-loading-class, data-selectloader-error-class: classes for those states
 *
 * @events
 * - selectloader:before-change: cancelable; cancelling puts the previous choice back
 * - selectloader:loading, selectloader:loaded, selectloader:error, selectloader:complete
 * - selectloader:cleared: when the empty choice is selected
 */
export default class SelectLoader extends BaseComponent {
  static selector = 'data-selectloader';

  static get defaults() {
    return {
      loadingClass: 'loading',
      errorClass: 'error',
      transition: 'fade',
      transitionDuration: 300,
      retainScroll: false,
      emptyMessage: 'Please select an option',
    };
  }

  _init(element) {
    const state = super._init(element);

    if (element.tagName !== 'SELECT') {
      this.logger?.error('SelectLoader: Element must be a <select>', { element });
      return state;
    }

    const config = this._getConfigFromAttrs(element, {
      target: 'target',
      loadingClass: 'loading-class',
      errorClass: 'error-class',
      transition: 'transition',
      transitionDuration: 'transition-duration',
      retainScroll: 'retain-scroll',
      emptyMessage: 'empty-message',
    });

    const targetElement = this._getTargetElement(element, 'target', { required: true });
    if (!targetElement) {
      return state;
    }

    state.config = { ...SelectLoader.defaults, ...config };
    state.targetElement = targetElement;
    state.isLoading = false;
    state.request = null;
    state.currentUrl = null;
    state.scrollPosition = 0;

    this._setupEventListeners(element, state);

    if (element.value) {
      this._loadFragment(element, state, element.value);
    } else {
      this._showEmptyMessage(state);
    }

    return state;
  }

  _setupEventListeners(element, state) {
    const { signal } = state.controller;

    /* Cancel a pending load when the component is unmounted */
    signal.addEventListener('abort', () => state.request?.abort(), { once: true });

    element.addEventListener('change', () => this._handleChange(element, state), { signal });

    /* The reset event fires before the controls are reset, so read the restored choice afterwards */
    element.form?.addEventListener(
      'reset',
      () => setTimeout(() => this._afterReset(element, state)),
      {
        signal,
      }
    );

    this.eventBus?.on(
      'router:navigate-success',
      () => {
        if (state.targetElement && !document.contains(state.targetElement)) {
          this.logger?.warn('SelectLoader: Target removed during navigation');
        }
      },
      { signal }
    );
  }

  _afterReset(element, state) {
    if (state.controller.signal.aborted) return;

    if (element.value) {
      this._loadFragment(element, state, element.value);
    } else {
      this._clear(element, state);
    }
  }

  async _handleChange(element, state) {
    const value = element.value;

    const beforeEvent = this._dispatch(element, 'selectloader:before-change', {
      value,
      previousUrl: state.currentUrl,
      targetElement: state.targetElement,
    });

    if (beforeEvent.defaultPrevented) {
      element.value = state.currentUrl ?? '';
      return;
    }

    if (!value) {
      this._clear(element, state);
      return;
    }

    await this._loadFragment(element, state, value);
  }

  _clear(element, state) {
    state.request?.abort();
    state.currentUrl = null;
    this._showEmptyMessage(state);
    this._dispatch(element, 'selectloader:cleared', { targetElement: state.targetElement });
  }

  /**
   * Load an HTML fragment through RouterManager, cancelling any load still in progress
   */
  async _loadFragment(element, state, url) {
    /* The router loads on demand, so wait for it, then load whatever is chosen by then. It is
       handed to components after router:initialized is emitted, hence the microtask. */
    if (!this.router && this.eventBus && state.routerWait !== false) {
      state.routerWait ??= this.eventBus.once(
        'router:initialized',
        () =>
          queueMicrotask(() => {
            state.routerWait = false;
            if (element.value && !state.controller.signal.aborted) {
              this._loadFragment(element, state, element.value);
            }
          }),
        { signal: state.controller.signal }
      );
      return;
    }

    state.request?.abort();
    const request = new AbortController();
    state.request = request;
    state.isLoading = true;
    state.currentUrl = url;
    const { config, targetElement } = state;
    const animate = config.transition !== 'none' && !prefersReducedMotion();
    let loaded = false;

    if (config.retainScroll) {
      state.scrollPosition = targetElement.scrollTop;
    }

    /* Mark loading without disabling the select, so a newer choice can replace this one */
    element.classList.add(config.loadingClass);
    targetElement.classList.add(config.loadingClass);
    targetElement.setAttribute('aria-busy', 'true');

    this._dispatch(element, 'selectloader:loading', { url, targetElement });

    try {
      if (!this.router) {
        throw new Error('RouterManager not available');
      }

      const { data: html } = await this.router.get(url, { signal: request.signal });
      request.signal.throwIfAborted();
      if (typeof html !== 'string') {
        throw new Error(`Expected an HTML fragment from ${url}`);
      }

      if (animate) {
        await this._transitionOut(state);
        request.signal.throwIfAborted();
      }

      targetElement.innerHTML = trustedHTML(html);
      targetElement.classList.remove(config.errorClass);

      if (config.retainScroll) {
        targetElement.scrollTop = state.scrollPosition;
      }

      if (animate) {
        await this._transitionIn(state);
      }
      /* A newer choice started during the transition, so leave the target and reporting to it */
      if (request.signal.aborted || state.request !== request) return;
      this._clearTransitionStyles(targetElement);

      this._dispatch(element, 'selectloader:loaded', { url, targetElement, html });
      this.eventBus?.emit('selectloader:content-loaded', { element, url, targetElement });

      const label = [...element.options].find(option => option.value === url)?.textContent.trim();
      announce(label ? `${label} loaded` : 'Content loaded');
      loaded = true;
    } catch (error) {
      /* A newer choice or unmounting cancelled this load */
      if (request.signal.aborted) {
        return;
      }

      this.logger?.error('SelectLoader: Load failed', { url, error });
      this._clearTransitionStyles(targetElement);
      this._showErrorMessage(element, state, error);
      announce(error.message || 'Failed to load content', { politeness: 'assertive' });

      this._dispatch(element, 'selectloader:error', { url, error, targetElement });
      this.eventBus?.emit('app:notification', {
        type: 'error',
        message: `Failed to load content: ${error.message}`,
        duration: 5000,
      });
    } finally {
      if (state.request === request) {
        state.request = null;
        state.isLoading = false;
        element.classList.remove(config.loadingClass);
        targetElement.classList.remove(config.loadingClass);
        targetElement.removeAttribute('aria-busy');

        if (!request.signal.aborted) {
          this._dispatch(element, 'selectloader:complete', { url, success: loaded });
        }
      }
    }
  }

  async _transitionOut(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeOut(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideOut(state.targetElement, transitionDuration);
    }
  }

  async _transitionIn(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeIn(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideIn(state.targetElement, transitionDuration);
    }
  }

  async _slideOut(element, duration) {
    element.style.overflow = 'hidden';
    element.style.height = `${element.offsetHeight}px`;
    element.getBoundingClientRect();

    element.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.height = '0';
    element.style.opacity = '0';

    await this._delay(duration);
  }

  async _slideIn(element, duration) {
    const scrollHeight = element.scrollHeight;
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.getBoundingClientRect();

    element.style.transition = `height ${duration}ms ease-in, opacity ${duration}ms ease-in`;
    element.style.height = `${scrollHeight}px`;
    element.style.opacity = '1';

    await this._delay(duration);
  }

  /**
   * Remove the inline styles the transitions used, so they don't override page styles
   */
  _clearTransitionStyles(element) {
    for (const property of ['height', 'overflow', 'opacity', 'transition']) {
      element.style.removeProperty(property);
    }
    if (element.getAttribute('style') === '') {
      element.removeAttribute('style');
    }
  }

  _showEmptyMessage(state) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-loader__empty';
    const paragraph = document.createElement('p');
    paragraph.textContent = state.config.emptyMessage;
    wrapper.append(paragraph);

    state.targetElement.replaceChildren(wrapper);
    state.targetElement.classList.remove(state.config.errorClass);
  }

  /**
   * Show the error as text with a button that retries the same select's last choice
   */
  _showErrorMessage(element, state, error) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-loader__error';
    const paragraph = document.createElement('p');
    paragraph.textContent = error.message || 'Failed to load content';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--sm';
    retry.textContent = 'Retry';
    retry.addEventListener(
      'click',
      () => {
        if (state.currentUrl) {
          this._loadFragment(element, state, state.currentUrl);
        }
      },
      { once: true, signal: state.controller.signal }
    );
    wrapper.append(paragraph, retry);

    state.targetElement.replaceChildren(wrapper);
    state.targetElement.classList.add(state.config.errorClass);
  }

  reload(element) {
    const state = this._requireState(element, 'reload');
    if (!state || !state.currentUrl) return;

    this._loadFragment(element, state, state.currentUrl);
  }

  load(element, url) {
    const state = this._requireState(element, 'load');
    if (!state) return;

    element.value = url;
    this._loadFragment(element, state, url);
  }

  clear(element) {
    const state = this._requireState(element, 'clear');
    if (!state) return;

    element.value = '';
    state.request?.abort();
    state.currentUrl = null;
    this._showEmptyMessage(state);
  }

  getLoadState(element) {
    const state = this.getState(element);
    return state?.targetElement
      ? {
          isLoading: state.isLoading,
          currentUrl: state.currentUrl,
          hasContent: state.targetElement.children.length > 0,
          hasError: state.targetElement.classList.contains(state.config.errorClass),
        }
      : null;
  }
}
