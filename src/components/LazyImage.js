import { BaseComponent } from '../core/BaseComponent.js';

export class LazyImage extends BaseComponent {
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

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this._loadImage(element, src, { fadeIn });
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

    this.logger?.info('LazyImage initialized', { element, src, threshold });

    return state;
  }

  _loadImage(element, src, { fadeIn }) {
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

      this._dispatch(element, 'lazy:loaded', { src });
      this.eventBus?.emit('lazy-image:loaded', { element, src });

      this.logger?.info('LazyImage: Successfully loaded', { element, src });
    };

    img.onerror = () => {
      element.classList.remove(LazyImage.defaults.placeholderClass);
      element.classList.add(LazyImage.defaults.errorClass);

      this._dispatch(element, 'lazy:error', { src });
      this.eventBus?.emit('lazy-image:error', { element, src });

      this.logger?.error('LazyImage: Failed to load', { element, src });
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