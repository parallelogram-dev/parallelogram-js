import { closest } from '../dom.js';
import { Sensor } from './Sensor.js';
import { DragStartSensorEvent, DragMoveSensorEvent, DragStopSensorEvent } from '../events.js';

const PICK_UP_KEYS = new Set([' ', 'Enter']);
const STEP_KEYS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * KeyboardSensor — keyboard dragging, which Shopify Draggable 1.x lacks.
 *
 *   Space / Enter  pick up the focused item (or the item owning a focused handle)
 *   Arrow keys     move it to the previous / next position
 *   Space / Enter  drop it
 *   Escape         cancel and put it back where it started
 *
 * It emits ordinary drag:start / drag:move / drag:stop sensor events, aiming
 * each move at the element `draggable.getKeyboardTarget()` returns, so
 * Sortable, Swappable and Droppable behave exactly as they do for a pointer.
 */
export class KeyboardSensor extends Sensor {
  constructor(containers, options, draggable) {
    super(containers, options, draggable);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onFocusOut = this.onFocusOut.bind(this);
  }

  attach() {
    document.addEventListener('keydown', this.onKeyDown, true);
    return this;
  }

  detach() {
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    this.dragging = false;
    return this;
  }

  onKeyDown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.dragging) {
      this.onKeyDownWhileDragging(event);
    } else if (PICK_UP_KEYS.has(event.key)) {
      this.maybeStart(event);
    }
  }

  maybeStart(event) {
    if (this.draggable?.isDragging()) return;

    const { target } = event;
    const container = closest(target, this.containers);
    if (!container) return;

    const originalSource = closest(target, this.options.draggable);
    if (!originalSource || !container.contains(originalSource)) return;

    /* Focus must be on the item itself, or on its handle when one is configured;
       a keypress in a field or button inside the item is left alone. */
    const handle = this.options.handle ? closest(target, this.options.handle) : null;
    if (target !== originalSource && !(handle && originalSource.contains(handle))) return;
    if (event.key === 'Enter' && target.matches('a[href], button, summary')) return;

    event.preventDefault();

    this.currentContainer = container;
    this.originalSource = originalSource;
    this.focusPath = pathFrom(originalSource, target);

    const { x, y } = centre(originalSource);
    const dragStartEvent = new DragStartSensorEvent({
      clientX: x,
      clientY: y,
      target,
      container,
      originalSource,
      originalEvent: event,
      pointerType: 'keyboard',
    });
    this.trigger(container, dragStartEvent);
    this.dragging = !dragStartEvent.canceled() && this.draggable?.isDragging() !== false;
    if (!this.dragging) return;

    this.refocus();
    document.addEventListener('focusout', this.onFocusOut, true);
  }

  onKeyDownWhileDragging(event) {
    const source = this.draggable?.source;
    if (!source || !this.draggable.isDragging()) {
      this.dragging = false;
      return;
    }

    if (event.key in STEP_KEYS) {
      event.preventDefault();
      this.step(source, STEP_KEYS[event.key], event);
    } else if (PICK_UP_KEYS.has(event.key)) {
      event.preventDefault();
      this.stop(event, false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.stop(event, true);
    } else if (event.key === 'Tab') {
      /* Keep focus on the item while it's lifted. */
      event.preventDefault();
    }
  }

  step(source, direction, event) {
    const target = this.draggable.getKeyboardTarget(source, direction);
    if (!target) return;

    /* Leave whatever we're "over" first. A pointer naturally passes through
       other elements between targets; a keyboard jumps, so without this an
       item moved down past X and straight back up would never re-enter X. */
    this.emitMove(null, centre(source), event);
    this.emitMove(target, centre(target), event);

    this.refocus();
    this.draggable.source?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  emitMove(target, { x, y }, originalEvent) {
    this.trigger(
      this.currentContainer,
      new DragMoveSensorEvent({
        clientX: x,
        clientY: y,
        target,
        container: this.currentContainer,
        originalEvent,
        pointerType: 'keyboard',
      })
    );
  }

  stop(event, revert) {
    document.removeEventListener('focusout', this.onFocusOut, true);
    const source = this.draggable.source;
    const { x, y } = source ? centre(source) : { x: 0, y: 0 };
    const original = this.originalSource;
    this.trigger(
      this.currentContainer,
      new DragStopSensorEvent({
        clientX: x,
        clientY: y,
        target: source,
        container: this.currentContainer,
        originalEvent: event,
        pointerType: 'keyboard',
        revert,
      })
    );
    this.dragging = false;
    resolvePath(original, this.focusPath)?.focus({ preventScroll: true });
    original?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    this.currentContainer = null;
    this.originalSource = null;
    this.focusPath = null;
  }

  /* Moving a focused node blurs it; put focus back on the dragged copy. */
  refocus() {
    const element = resolvePath(this.draggable.source, this.focusPath);
    if (element && document.activeElement !== element) element.focus({ preventScroll: true });
  }

  onFocusOut(event) {
    /* Our own DOM moves blur the item briefly, so judge once things settle:
       focus on another control means the user moved on, so drop in place;
       focus on <body> is just the blur from a move, so take it back. */
    requestAnimationFrame(() => {
      if (!this.dragging) return;
      const active = document.activeElement;
      const source = this.draggable.source;
      if (!source || source.contains(active)) return;
      if (active && active !== document.body) {
        this.stop(event, false);
      } else {
        this.refocus();
      }
    });
  }
}

function centre(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Child-index path from `root` down to `node`, so the same spot can be found in a clone. */
function pathFrom(root, node) {
  const path = [];
  while (node && node !== root) {
    path.unshift([...node.parentNode.children].indexOf(node));
    node = node.parentNode;
  }
  return path;
}

function resolvePath(root, path) {
  if (!root) return null;
  let node = root;
  for (const index of path || []) {
    node = node?.children[index];
  }
  return node || root;
}
