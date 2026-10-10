import { AbstractPlugin } from './AbstractPlugin.js';
import { closest, getDocumentScrollingElement } from '../dom.js';

export const defaultOptions = {
  /** Pixels scrolled per animation frame. */
  speed: 6,
  /** Distance (px) from an edge at which scrolling starts. */
  sensitivity: 50,
  /** Restrict auto-scrolling to these elements (selectors or elements). */
  scrollableElements: [],
};

/**
 * Scrollable — auto-scrolls the nearest scrollable ancestor (or the page)
 * when the pointer nears its edge during a drag. Port of Shopify's plugin.
 * Keyboard drags scroll via scrollIntoView() in KeyboardSensor instead.
 */
export class Scrollable extends AbstractPlugin {
  constructor(draggable) {
    super(draggable);
    this.options = { ...defaultOptions, ...(draggable.options.scrollable || {}) };
    this.position = null;
    this.scrollableElement = null;
    this.scrollFrame = null;
    this.findFrame = null;

    this.onDragStart = this.onDragStart.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragStop = this.onDragStop.bind(this);
    this.scroll = this.scroll.bind(this);
  }

  attach() {
    this.draggable
      .on('drag:start', this.onDragStart)
      .on('drag:move', this.onDragMove)
      .on('drag:stop', this.onDragStop);
  }

  detach() {
    this.draggable
      .off('drag:start', this.onDragStart)
      .off('drag:move', this.onDragMove)
      .off('drag:stop', this.onDragStop);
    this.onDragStop();
  }

  getScrollableElement(target) {
    if (this.options.scrollableElements.length) {
      return (
        closest(target, el =>
          this.options.scrollableElements.some(s =>
            typeof s === 'string' ? el.matches(s) : el === s
          )
        ) || getDocumentScrollingElement()
      );
    }
    return closestScrollableElement(target);
  }

  onDragStart(dragEvent) {
    if (dragEvent.canceled() || dragEvent.sensorEvent.pointerType === 'keyboard') return;
    this.findFrame = requestAnimationFrame(() => {
      this.scrollableElement = this.getScrollableElement(dragEvent.source);
    });
  }

  onDragMove(dragEvent) {
    const { sensorEvent } = dragEvent;
    if (sensorEvent.pointerType === 'keyboard') return;

    cancelAnimationFrame(this.findFrame);
    this.findFrame = requestAnimationFrame(() => {
      this.scrollableElement = this.getScrollableElement(sensorEvent.target);
    });
    if (!this.scrollableElement) return;

    this.position = { clientX: sensorEvent.clientX, clientY: sensorEvent.clientY };
    cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(this.scroll);
  }

  onDragStop() {
    cancelAnimationFrame(this.scrollFrame);
    cancelAnimationFrame(this.findFrame);
    this.scrollableElement = null;
    this.scrollFrame = null;
    this.findFrame = null;
    this.position = null;
  }

  scroll() {
    if (!this.scrollableElement || !this.position) return;
    cancelAnimationFrame(this.scrollFrame);

    const { speed, sensitivity } = this.options;
    const element = this.scrollableElement;
    const { clientX, clientY } = this.position;
    const rect = element.getBoundingClientRect();
    const cutOff = rect.top < 0 || rect.bottom > window.innerHeight;
    const page = getDocumentScrollingElement();

    if (element !== document.body && element !== document.documentElement && !cutOff) {
      const { offsetHeight, offsetWidth } = element;
      if (rect.top + offsetHeight - clientY < sensitivity) element.scrollTop += speed;
      else if (clientY - rect.top < sensitivity) element.scrollTop -= speed;
      if (rect.left + offsetWidth - clientX < sensitivity) element.scrollLeft += speed;
      else if (clientX - rect.left < sensitivity) element.scrollLeft -= speed;
    } else {
      const { innerHeight, innerWidth } = window;
      if (clientY < sensitivity) page.scrollTop -= speed;
      else if (innerHeight - clientY < sensitivity) page.scrollTop += speed;
      if (clientX < sensitivity) page.scrollLeft -= speed;
      else if (innerWidth - clientX < sensitivity) page.scrollLeft += speed;
    }

    this.scrollFrame = requestAnimationFrame(this.scroll);
  }
}

function hasOverflow(element) {
  const styles = getComputedStyle(element);
  return /(auto|scroll)/.test(styles.overflow + styles.overflowY + styles.overflowX);
}

function closestScrollableElement(element) {
  if (!element) return getDocumentScrollingElement();
  const position = getComputedStyle(element).position;
  const excludeStaticParents = position === 'absolute';
  const scrollable = closest(element, parent => {
    if (excludeStaticParents && getComputedStyle(parent).position === 'static') return false;
    return hasOverflow(parent);
  });
  if (position === 'fixed' || !scrollable) return getDocumentScrollingElement();
  return scrollable;
}
