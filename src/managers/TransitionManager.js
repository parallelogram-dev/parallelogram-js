/** TransitionManager (as in previous starter) */
export class TransitionManager {
  constructor({ root = document, defaultY = '1rem', defaultDur = 320, defaultEase = 'cubic-bezier(0.22,1,0.36,1)'} = {}) {
    this.root = root;
    this.defaults = { y: defaultY, dur: defaultDur, ease: defaultEase };
  }
  async enter(el) {
    const enterClass = el.dataset.transitionEnterClass;
    if (enterClass) return this._animateWithClass(el, enterClass);
    return this._animateWithJS(el, true);
  }
  async exit(el) {
    const exitClass = el.dataset.transitionExitClass;
    if (exitClass) return this._animateWithClass(el, exitClass);
    return this._animateWithJS(el, false);
  }
  _animateWithClass(el, cls) {
    return new Promise((resolve) => {
      const done = () => { el.removeEventListener('animationend', done); resolve(); };
      el.addEventListener('animationend', done, { once: true });
      el.classList.add(cls);
    });
  }
  _animateWithJS(el, isEnter) {
    const y = el.dataset.transitionY || this.defaults.y;
    const dur = Number(el.dataset.transitionDuration || this.defaults.dur);
    const ease = el.dataset.transitionEase || this.defaults.ease;
    el.style.transition = `opacity ${dur}ms ${ease}, transform ${dur}ms ${ease}`;
    if (isEnter) {
      el.style.opacity = 0; el.style.transform = `translateY(${y})`;
      el.getBoundingClientRect();
      el.style.opacity = 1; el.style.transform = 'translateY(0)';
    } else {
      el.style.opacity = 1; el.style.transform = 'translateY(0)';
      el.getBoundingClientRect();
      el.style.opacity = 0; el.style.transform = `translateY(${y})`;
    }
    return new Promise((resolve) => setTimeout(() => {
      el.style.transition = '';
      resolve();
    }, dur));
  }
  async swap(container, nextNode) {
    const current = container.firstElementChild;
    if (current) await this.exit(current);
    container.innerHTML = '';
    if (nextNode) container.appendChild(nextNode);
    if (nextNode) await this.enter(nextNode);
  }
}
