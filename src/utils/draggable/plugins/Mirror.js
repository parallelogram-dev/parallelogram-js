import { AbstractPlugin } from './AbstractPlugin.js';
import {
  MirrorCreateEvent,
  MirrorCreatedEvent,
  MirrorAttachedEvent,
  MirrorMoveEvent,
  MirrorMovedEvent,
  MirrorDestroyEvent,
} from '../events.js';

export const defaultOptions = {
  /** Fix the mirror's width/height to the source's computed size. */
  constrainDimensions: false,
  /** Let the mirror follow the pointer along each axis. */
  xAxis: true,
  yAxis: true,
  /** Fixed offset of the pointer within the mirror (null = where it was grabbed). */
  cursorOffsetX: null,
  cursorOffsetY: null,
  /** Snap mirror movement to a grid of this many pixels. */
  thresholdX: null,
  thresholdY: null,
  /** Where to append the mirror: selector, element, or (source) => element. Defaults to the source's parent. */
  appendTo: null,
};

/**
 * Mirror — the copy of the dragged element that follows the pointer.
 *
 * Port of Shopify Draggable's Mirror plugin. The original's promise chain is
 * flattened into plain synchronous steps, and its touch scroll-offset
 * correction is dropped: PointerSensor reports real client coordinates.
 * No mirror is made for keyboard drags; the item moves in place instead.
 */
export class Mirror extends AbstractPlugin {
  constructor(draggable) {
    super(draggable);
    this.options = { ...defaultOptions, ...(draggable.options.mirror || {}) };
    this.mirror = null;
    this.pending = null;
    this.frame = null;

    this.onDragStart = this.onDragStart.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragStop = this.onDragStop.bind(this);
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
    this.remove();
  }

  onDragStart(dragEvent) {
    /* Build the mirror on the first move rather than now: a later drag:start
       listener (e.g. Sortable's sortable:start) may still cancel this drag. */
    this.pending = dragEvent.sensorEvent.pointerType === 'keyboard' ? null : dragEvent;
  }

  create(dragEvent) {
    if (dragEvent.canceled()) return;
    const { source, originalSource, sourceContainer, sensorEvent } = dragEvent;

    const mirrorCreateEvent = new MirrorCreateEvent({
      source,
      originalSource,
      sourceContainer,
      sensorEvent,
      dragEvent,
    });
    this.draggable.trigger(mirrorCreateEvent);
    if (mirrorCreateEvent.canceled()) return;

    const mirror = source.cloneNode(true);
    const rect = source.getBoundingClientRect();
    const { options } = this;

    this.offset = {
      top: options.cursorOffsetY ?? sensorEvent.clientY - rect.top,
      left: options.cursorOffsetX ?? sensorEvent.clientX - rect.left,
    };
    this.lastClient = { x: sensorEvent.clientX, y: sensorEvent.clientY };

    if (options.constrainDimensions) {
      const styles = getComputedStyle(source);
      mirror.style.width = styles.width;
      mirror.style.height = styles.height;
    } else {
      /* A mirror appended to <body> would otherwise lose a width it got from its list. */
      mirror.style.width = `${rect.width}px`;
      mirror.style.boxSizing = 'border-box';
    }
    Object.assign(mirror.style, {
      position: 'fixed',
      pointerEvents: 'none',
      top: '0',
      left: '0',
      margin: '0',
    });
    mirror.removeAttribute('id');
    this.draggable.setItemState(mirror, 'mirror');
    mirror.setAttribute('aria-hidden', 'true');

    this.mirror = mirror;
    this.draggable.trigger(
      new MirrorCreatedEvent({
        source,
        originalSource,
        sourceContainer,
        sensorEvent,
        dragEvent,
        mirror,
      })
    );

    const x = Math.round(sensorEvent.clientX - this.offset.left);
    const y = Math.round(sensorEvent.clientY - this.offset.top);
    this.initial = { x, y };
    this.last = { x, y };
    mirror.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    this.appendableContainer(source, sourceContainer).appendChild(mirror);
    this.draggable.trigger(
      new MirrorAttachedEvent({
        source,
        originalSource,
        sourceContainer,
        sensorEvent,
        dragEvent,
        mirror,
      })
    );
  }

  onDragMove(dragEvent) {
    if (this.pending) {
      const start = this.pending;
      this.pending = null;
      this.create(start);
    }
    if (!this.mirror || dragEvent.canceled()) return;
    const { source, originalSource, sourceContainer, sensorEvent } = dragEvent;
    const { options } = this;

    let passedThreshX = true;
    let passedThreshY = true;
    if (options.thresholdX || options.thresholdY) {
      if (Math.abs(this.lastClient.x - sensorEvent.clientX) < options.thresholdX)
        passedThreshX = false;
      else this.lastClient.x = sensorEvent.clientX;
      if (Math.abs(this.lastClient.y - sensorEvent.clientY) < options.thresholdY)
        passedThreshY = false;
      else this.lastClient.y = sensorEvent.clientY;
      if (!passedThreshX && !passedThreshY) return;
    }

    const mirror = this.mirror;
    const mirrorMoveEvent = new MirrorMoveEvent({
      source,
      originalSource,
      sourceContainer,
      sensorEvent,
      dragEvent,
      mirror,
      passedThreshX,
      passedThreshY,
    });
    this.draggable.trigger(mirrorMoveEvent);
    if (mirrorMoveEvent.canceled()) return;

    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (this.mirror !== mirror) return;
      const snapX = options.thresholdX || 1;
      const snapY = options.thresholdY || 1;
      const x = passedThreshX
        ? Math.round((sensorEvent.clientX - this.offset.left) / snapX) * snapX
        : this.last.x;
      const y = passedThreshY
        ? Math.round((sensorEvent.clientY - this.offset.top) / snapY) * snapY
        : this.last.y;
      const tx = options.xAxis ? x : this.initial.x;
      const ty = options.yAxis ? y : this.initial.y;
      mirror.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      this.last = { x, y };
      this.draggable.trigger(
        new MirrorMovedEvent({
          source,
          originalSource,
          sourceContainer,
          sensorEvent,
          dragEvent,
          mirror,
          passedThreshX,
          passedThreshY,
        })
      );
    });
  }

  onDragStop(dragEvent) {
    this.pending = null;
    if (!this.mirror) return;
    const { source, sourceContainer, sensorEvent } = dragEvent;
    const mirrorDestroyEvent = new MirrorDestroyEvent({
      source,
      mirror: this.mirror,
      sourceContainer,
      sensorEvent,
      dragEvent,
    });
    this.draggable.trigger(mirrorDestroyEvent);
    if (mirrorDestroyEvent.canceled()) {
      /* A listener has taken ownership of the mirror (e.g. to animate it out). */
      cancelAnimationFrame(this.frame);
      this.mirror = null;
      return;
    }
    this.remove();
  }

  remove() {
    cancelAnimationFrame(this.frame);
    this.mirror?.remove();
    this.mirror = null;
  }

  appendableContainer(source, sourceContainer) {
    const { appendTo } = this.options;
    if (typeof appendTo === 'string') return document.querySelector(appendTo) || sourceContainer;
    if (appendTo instanceof HTMLElement) return appendTo;
    if (typeof appendTo === 'function') return appendTo(source) || sourceContainer;
    return source.parentNode || sourceContainer;
  }
}
