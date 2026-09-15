import { prefersReducedMotion, whenAnimationsFinish } from '../utils/motion.js';

/**
 * Enter and exit animations for single elements
 *
 * `data-transition-enter-class` and `data-transition-exit-class` animate with a CSS class, which is
 * removed once its animation ends. Otherwise the element fades and slides by `data-transition-y`
 * over `data-transition-duration` milliseconds with `data-transition-ease`, using the Web Animations
 * API, and keeps its final opacity and transform as inline styles. Starting a transition cancels the
 * one running on the same element, motion is skipped when the user prefers reduced motion, and the
 * returned promises always resolve.
 */
export class TransitionManager {
  constructor({
    defaultY = '1rem',
    defaultDur = 320,
    defaultEase = 'cubic-bezier(0.22,1,0.36,1)',
  } = {}) {
    this.defaults = { y: defaultY, dur: defaultDur, ease: defaultEase };
    this._running = new WeakMap();
  }

  enter(el) {
    return this._transition(el, true);
  }

  exit(el) {
    return this._transition(el, false);
  }

  async _transition(el, isEnter) {
    const from = this._running.get(el)?.animation ? this._currentFrame(el) : null;
    this._cancel(el);

    const className = isEnter ? el.dataset.transitionEnterClass : el.dataset.transitionExitClass;
    const running = className
      ? this._startClass(el, className)
      : this._startAnimation(el, isEnter, from);

    if (!running) {
      return;
    }

    this._running.set(el, running);
    await running.finished;

    if (this._running.get(el) === running) {
      this._running.delete(el);
      if (className) {
        el.classList.remove(className);
      }
    }
  }

  _startClass(el, className) {
    if (prefersReducedMotion()) {
      return null;
    }

    el.classList.add(className);
    return { className, finished: whenAnimationsFinish(el) };
  }

  _startAnimation(el, isEnter, from) {
    const y = el.dataset.transitionY || this.defaults.y;
    const duration = Number(el.dataset.transitionDuration || this.defaults.dur);
    const easing = el.dataset.transitionEase || this.defaults.ease;
    const shown = { opacity: '1', transform: 'translateY(0)' };
    const hidden = { opacity: '0', transform: `translateY(${y})` };
    const end = isEnter ? shown : hidden;

    Object.assign(el.style, end);

    if (prefersReducedMotion()) {
      return null;
    }

    const animation = el.animate([from ?? (isEnter ? hidden : shown), end], { duration, easing });

    /* An animation whose timeline stalls is cancelled soon after it should have ended, leaving the
       end styles in place, so the transition never waits forever */
    let timer;
    const finished = Promise.race([
      animation.finished.catch(() => {}),
      new Promise(resolve => {
        timer = setTimeout(() => {
          animation.cancel();
          resolve();
        }, duration + 250);
      }),
    ]).then(() => clearTimeout(timer));

    return { animation, finished };
  }

  _currentFrame(el) {
    const { opacity, transform } = getComputedStyle(el);
    return { opacity, transform };
  }

  _cancel(el) {
    const running = this._running.get(el);
    if (!running) {
      return;
    }

    this._running.delete(el);
    running.animation?.cancel();
    if (running.className) {
      el.classList.remove(running.className);
    }
  }

  async swap(container, nextNode) {
    const current = container.firstElementChild;
    if (current) await this.exit(current);
    container.replaceChildren(...(nextNode ? [nextNode] : []));
    if (nextNode) await this.enter(nextNode);
  }
}
