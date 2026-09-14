import { BaseComponent } from '../core/BaseComponent.js';
import { prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';

/**
 * Scrollreveal - reveal elements as they scroll into view, one after another
 *
 * The component moves each element through `data-reveal-state` (hidden, revealing, visible, and
 * hiding when it hides again) and the stylesheet draws the fade and slide, so nothing is written to
 * the element's inline styles. Elements that come into view together are revealed in order, the
 * stagger apart. `data-reveal-class` animates with a class instead, and a TransitionManager passed
 * as an option animates with JavaScript. Under reduced motion elements are shown at once, without
 * delays. Elements with the same threshold and root margin share one IntersectionObserver.
 *
 * @example
 * <section data-reveal data-reveal-delay="100">…</section>
 *
 * @attributes
 * - data-reveal-threshold: visible fraction that starts the reveal (default 0.1)
 * - data-reveal-root-margin: grows or shrinks the viewport used to detect the element (default 0px)
 * - data-reveal-once: "false" hides the element again when it leaves the viewport (default true)
 * - data-reveal-delay: milliseconds to wait before revealing (default 0)
 * - data-reveal-stagger: milliseconds between elements revealed together (default 100)
 * - data-reveal-initial: "visible" leaves the element showing until it is revealed (default hidden)
 * - data-reveal-class, data-reveal-exit-class: classes to animate with instead of the stylesheet
 * - data-reveal-state: set by the component
 */
export default class Scrollreveal extends BaseComponent {
  static selector = 'data-reveal';

  static get defaults() {
    return {
      threshold: 0.1,
      rootMargin: '0px',
      once: true,
      delay: 0,
      stagger: 100,
      initialState: 'hidden',
    };
  }

  constructor(options = {}) {
    super(options);
    this.transitionManager = options.transitionManager;
    this.defaultStagger = Scrollreveal.defaults.stagger;

    /** Elements waiting to be revealed, in the order they came into view */
    this.revealQueue = [];
    this.isProcessingQueue = false;

    /** Observers keyed by root margin and threshold, with the elements each watches */
    this._observers = new Map();
  }

  _init(element) {
    const state = super._init(element);
    const defaults = Scrollreveal.defaults;

    state.threshold = this.getNumberAttr(element, 'threshold', defaults.threshold);
    state.rootMargin = this.getAttr(element, 'root-margin', defaults.rootMargin);
    state.once = this.getBoolAttr(element, 'once', defaults.once);
    state.delay = this.getNumberAttr(element, 'delay', defaults.delay);
    state.stagger = this.getNumberAttr(element, 'stagger', this.defaultStagger);
    state.initialState = this.getAttr(element, 'initial', defaults.initialState);
    state.hasBeenRevealed = false;
    state.isRevealing = false;
    state.observerKey = null;
    state.items = [element];

    this.setAttr(element, 'enhanced', 'true');

    if (prefersReducedMotion()) {
      this.setAttr(element, 'state', 'visible');
      state.hasBeenRevealed = true;
    } else {
      if (state.initialState === 'hidden') {
        this.setAttr(element, 'state', 'hidden');
      }
      this._observe(element, state);
    }

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      this._unobserve(element, state);
      this.revealQueue = this.revealQueue.filter(item => item.element !== element);
      baseCleanup();
    };

    this.eventBus?.emit('scrollreveal:mount', {
      element,
      threshold: state.threshold,
      stagger: state.stagger,
      timestamp: performance.now(),
    });

    return state;
  }

  _observe(element, state) {
    const key = `${state.rootMargin}|${state.threshold}`;
    let entry = this._observers.get(key);

    if (!entry) {
      try {
        entry = {
          targets: new Set(),
          observer: new IntersectionObserver(entries => this._handleIntersection(entries), {
            rootMargin: state.rootMargin,
            threshold: state.threshold,
          }),
        };
      } catch (error) {
        this.logger?.warn('Scrollreveal: invalid root margin or threshold, revealing now', {
          element,
          error,
        });
        this._revealElement(element, state, false);
        return;
      }
      this._observers.set(key, entry);
    }

    entry.targets.add(element);
    entry.observer.observe(element);
    state.observerKey = key;
  }

  _unobserve(element, state) {
    const key = state.observerKey;
    const entry = this._observers.get(key);
    state.observerKey = null;
    if (!entry) return;

    entry.observer.unobserve(element);
    entry.targets.delete(element);
    if (entry.targets.size === 0) {
      entry.observer.disconnect();
      this._observers.delete(key);
    }
  }

  _handleIntersection(entries) {
    for (const entry of entries) {
      const element = entry.target;
      const state = this.getState(element);
      if (!state) continue;

      if (entry.isIntersecting && !state.hasBeenRevealed && !state.isRevealing) {
        if (state.stagger > 0) {
          this._addToRevealQueue(element, state);
        } else {
          this._revealElement(element, state);
        }
      } else if (!entry.isIntersecting && !state.once && state.hasBeenRevealed) {
        this._hideElement(element, state);
      }
    }
  }

  _addToRevealQueue(element, state) {
    this.revealQueue.push({ element, state, timestamp: performance.now() });
    this._processRevealQueue();
  }

  _processRevealQueue() {
    if (this.isProcessingQueue || this.revealQueue.length === 0) return;

    this.isProcessingQueue = true;
    requestAnimationFrame(() => this._processNextInQueue());
  }

  _processNextInQueue() {
    if (this.revealQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    const { element, state } = this.revealQueue.shift();

    if (state.isRevealing || state.hasBeenRevealed) {
      this._scheduleNextQueueItem(0);
      return;
    }

    this._revealElement(element, state, true).catch(error => {
      this.logger?.error('Queue reveal failed', { element, error });
    });
    this._scheduleNextQueueItem(state.stagger);
  }

  _scheduleNextQueueItem(delay = 0) {
    if (delay > 0) {
      setTimeout(() => this._processNextInQueue(), delay);
    } else {
      requestAnimationFrame(() => this._processNextInQueue());
    }
  }

  async _revealElement(element, state, applyDelay = true) {
    state.isRevealing = true;
    this.eventBus?.emit('scrollreveal:reveal-start', { element, timestamp: performance.now() });

    try {
      if (applyDelay && state.delay > 0) {
        await this._delay(state.delay);
      }

      await this._revealItems([element]);
      state.hasBeenRevealed = true;

      if (state.once) {
        this._unobserve(element, state);
      }

      this.eventBus?.emit('scrollreveal:reveal-complete', {
        element,
        timestamp: performance.now(),
      });
    } catch (error) {
      this.logger?.error('Scrollreveal animation failed', { element, error });
      this.eventBus?.emit('scrollreveal:reveal-error', {
        element,
        error,
        timestamp: performance.now(),
      });
    } finally {
      state.isRevealing = false;
    }
  }

  async _hideElement(element, state) {
    if (state.once) return;

    try {
      await this._hideItems([element]);
      state.hasBeenRevealed = false;
      this.eventBus?.emit('scrollreveal:hide-complete', { element, timestamp: performance.now() });
    } catch (error) {
      this.logger?.error('Scrollreveal hide animation failed', { element, error });
    }
  }

  /**
   * Reveal items with their class, the TransitionManager, or the stylesheet's state transition
   */
  async _revealItems(items) {
    await Promise.all(
      items.map(async item => {
        this.setAttr(item, 'state', 'revealing');

        try {
          const revealClass = item.dataset.revealClass;
          if (revealClass) {
            await this._animateWithClass(item, revealClass);
          } else if (this.transitionManager) {
            await this.transitionManager.enter(item);
          } else {
            await whenAnimationsFinish(item);
          }
          this.setAttr(item, 'state', 'visible');
        } catch (error) {
          this.setAttr(item, 'state', 'error');
          throw error;
        }
      })
    );
  }

  async _hideItems(items) {
    await Promise.all(
      items.map(async item => {
        this.setAttr(item, 'state', 'hiding');

        try {
          const revealClass = item.dataset.revealClass;
          const exitClass = item.dataset.revealExitClass;

          if (exitClass) {
            await this._animateWithClass(item, exitClass);
          } else if (revealClass) {
            item.classList.remove(...revealClass.split(' ').filter(Boolean));
          } else if (this.transitionManager) {
            await this.transitionManager.exit(item);
          } else {
            await whenAnimationsFinish(item);
          }
          this.setAttr(item, 'state', 'hidden');
        } catch (error) {
          this.setAttr(item, 'state', 'error');
          throw error;
        }
      })
    );
  }

  async _animateWithClass(element, className) {
    element.classList.add(...className.split(' ').filter(Boolean));
    await whenAnimationsFinish(element, { fallback: 2000 });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set the stagger for elements that don't set data-reveal-stagger
   *
   * @param {number} delay - Milliseconds between elements revealed together
   */
  setStagger(delay) {
    this.defaultStagger = Math.max(0, Number(delay) || 0);
    for (const element of this.trackedElements()) {
      const state = this.getState(element);
      if (state && !this.hasAttr(element, 'stagger')) {
        state.stagger = this.defaultStagger;
      }
    }
  }

  clearQueue() {
    this.revealQueue = [];
    this.isProcessingQueue = false;
  }

  async reveal(element) {
    const state = this.getState(element);
    if (!state || state.hasBeenRevealed || state.isRevealing) return;

    await this._revealElement(element, state);
  }

  async hide(element) {
    const state = this.getState(element);
    if (!state || !state.hasBeenRevealed) return;

    await this._hideElement(element, state);
  }

  /**
   * Hide an element again and watch for it to come back into view
   */
  reset(element) {
    const state = this.getState(element);
    if (!state || prefersReducedMotion()) return;

    state.hasBeenRevealed = false;
    state.isRevealing = false;
    if (state.initialState === 'hidden') {
      this.setAttr(element, 'state', 'hidden');
    }
    if (!state.observerKey) {
      this._observe(element, state);
    }
  }

  isRevealed(element) {
    return this.getState(element)?.hasBeenRevealed ?? false;
  }

  /**
   * Change the visible fraction that starts an element's reveal
   *
   * @param {HTMLElement} element
   * @param {number} threshold - 0 to 1
   */
  updateThreshold(element, threshold) {
    const state = this.getState(element);
    if (!state) return;

    const watching = Boolean(state.observerKey);
    this._unobserve(element, state);
    state.threshold = threshold;
    if (watching) {
      this._observe(element, state);
    }
  }

  getStatus() {
    const states = this.trackedElements()
      .map(element => this.getState(element))
      .filter(Boolean);

    return {
      totalElements: states.length,
      revealedCount: states.filter(state => state.hasBeenRevealed).length,
      revealingCount: states.filter(state => state.isRevealing).length,
      queuedCount: this.revealQueue.length,
      observerActive: this._observers.size > 0,
      defaults: Scrollreveal.defaults,
    };
  }

  destroy() {
    super.destroy();
    for (const { observer } of this._observers.values()) {
      observer.disconnect();
    }
    this._observers.clear();
    this.clearQueue();
  }

  static enhanceAll(selector = '[data-reveal]', options) {
    const instance = new Scrollreveal(options);
    document.querySelectorAll(selector).forEach(element => instance.mount(element));
    return instance;
  }
}
