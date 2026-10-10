import { AbstractPlugin } from './AbstractPlugin.js';

/**
 * Focusable — makes every draggable element reachable with Tab (tabindex=0)
 * so KeyboardSensor can pick it up. Elements that already had a tabindex, or
 * are natively focusable, are left alone, and our additions are undone on detach.
 *
 * Port of Shopify's plugin, minus making containers focusable (an extra tab
 * stop that does nothing). Call `draggable.refreshFocusable()` after adding
 * items to the DOM.
 */
export class Focusable extends AbstractPlugin {
  constructor(draggable) {
    super(draggable);
    this.decorated = new Set();
    this.onRefresh = this.refresh.bind(this);
  }

  attach() {
    this.draggable.on('draggable:initialize', this.onRefresh).on('drag:stopped', this.onRefresh);
    this.draggable.refreshFocusable = this.onRefresh;
  }

  detach() {
    this.draggable.off('draggable:initialize', this.onRefresh).off('drag:stopped', this.onRefresh);
    delete this.draggable.refreshFocusable;
    for (const element of this.decorated) element.removeAttribute('tabindex');
    this.decorated.clear();
  }

  refresh() {
    /* The handle is what takes focus when there is one; otherwise the item. */
    const { handle } = this.draggable.options;
    for (const item of this.draggable.getDraggableElements()) {
      const target = handle ? item.querySelector(handle) || item : item;
      if (!target.hasAttribute('tabindex') && target.tabIndex === -1) {
        target.tabIndex = 0;
        this.decorated.add(target);
      }
    }
    for (const element of this.decorated) {
      if (!element.isConnected) this.decorated.delete(element);
    }
  }
}
