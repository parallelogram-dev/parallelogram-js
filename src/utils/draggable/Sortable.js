import { Draggable } from './Draggable.js';
import {
  SortableStartEvent,
  SortableSortEvent,
  SortableSortedEvent,
  SortableStopEvent,
} from './events.js';

/**
 * Sortable engine: reorder elements within, and between, containers.
 *
 * Events: sortable:start (cancelable), sortable:sort (cancelable),
 * sortable:sorted, sortable:stop — each carrying `dragEvent`, plus
 * oldIndex / newIndex / oldContainer / newContainer where relevant.
 */
export class Sortable extends Draggable {
  constructor(containers = [], options = {}) {
    super(containers, options);

    this.startIndex = null;
    this.startContainer = null;

    this.onSortableDragStart = this.onSortableDragStart.bind(this);
    this.onSortableDragOverContainer = this.onSortableDragOverContainer.bind(this);
    this.onSortableDragOver = this.onSortableDragOver.bind(this);
    this.onSortableDragStop = this.onSortableDragStop.bind(this);

    this.on('drag:start', this.onSortableDragStart)
      .on('drag:over:container', this.onSortableDragOverContainer)
      .on('drag:over', this.onSortableDragOver)
      .on('drag:stop', this.onSortableDragStop);
  }

  destroy() {
    super.destroy();
    this.off('drag:start', this.onSortableDragStart)
      .off('drag:over:container', this.onSortableDragOverContainer)
      .off('drag:over', this.onSortableDragOver)
      .off('drag:stop', this.onSortableDragStop);
  }

  /** Index of `element` among the sortable elements of its container. */
  index(element) {
    return this.getSortableElementsForContainer(element.parentNode).indexOf(element);
  }

  getSortableElementsForContainer(container) {
    return [...container.querySelectorAll(this.options.draggable)].filter(
      child =>
        child !== this.originalSource && child !== this.mirror && child.parentNode === container
    );
  }

  /**
   * Keyboard: step to the neighbouring item. Crossing into the next container
   * lands at its top; crossing into the previous one lands at its bottom; an
   * empty container counts as one slot.
   */
  getKeyboardTarget(source, direction) {
    const slots = this.getOrderedContainers().flatMap(container => {
      const items = this.getSortableElementsForContainer(container);
      return items.length ? items : [container];
    });
    const target = slots[slots.indexOf(source) + direction];
    if (!target) return null;
    const targetContainer = this.containers.includes(target) ? target : target.parentNode;
    if (direction < 0 && targetContainer !== source.parentNode) return targetContainer;
    return target;
  }

  onSortableDragStart(event) {
    this.startContainer = event.source.parentNode;
    this.startIndex = this.index(event.source);

    const sortableStartEvent = new SortableStartEvent({
      dragEvent: event,
      startIndex: this.startIndex,
      startContainer: this.startContainer,
    });
    this.trigger(sortableStartEvent);
    if (sortableStartEvent.canceled()) event.cancel();
  }

  onSortableDragOverContainer(event) {
    if (event.canceled()) return;
    this.sort(event, this.getSortableElementsForContainer(event.overContainer));
  }

  onSortableDragOver(event) {
    if (event.canceled() || event.over === event.originalSource || event.over === event.source)
      return;
    this.sort(event, this.getDraggableElementsForContainer(event.overContainer));
  }

  sort(event, children) {
    const { source, over, overContainer } = event;
    const oldIndex = this.index(source);

    const sortableSortEvent = new SortableSortEvent({
      dragEvent: event,
      currentIndex: oldIndex,
      source,
      over,
    });
    this.trigger(sortableSortEvent);
    if (sortableSortEvent.canceled()) return;

    const moves = move({ source, over, overContainer, children });
    if (!moves) return;

    this.trigger(
      new SortableSortedEvent({
        dragEvent: event,
        oldIndex,
        newIndex: this.index(source),
        oldContainer: moves.oldContainer,
        newContainer: moves.newContainer,
      })
    );
  }

  onSortableDragStop(event) {
    const reverted = Boolean(event.sensorEvent?.revert) || event.canceled();
    this.trigger(
      new SortableStopEvent({
        dragEvent: event,
        oldIndex: this.startIndex,
        newIndex: reverted ? this.startIndex : this.index(event.source),
        oldContainer: this.startContainer,
        newContainer: reverted ? this.startContainer : event.source.parentNode,
      })
    );
    this.startIndex = null;
    this.startContainer = null;
  }
}

function index(element) {
  return Array.prototype.indexOf.call(element.parentNode.children, element);
}

function move({ source, over, overContainer, children }) {
  const emptyOverContainer = !children.length;
  const differentContainer = source.parentNode !== overContainer;
  const sameContainer = over && source.parentNode === over.parentNode;

  if (emptyOverContainer) return moveInsideEmptyContainer(source, overContainer);
  if (sameContainer) return moveWithinContainer(source, over);
  if (differentContainer) return moveOutsideContainer(source, over, overContainer);
  return null;
}

function moveInsideEmptyContainer(source, overContainer) {
  const oldContainer = source.parentNode;
  overContainer.appendChild(source);
  return { oldContainer, newContainer: overContainer };
}

function moveWithinContainer(source, over) {
  if (index(source) < index(over)) {
    source.parentNode.insertBefore(source, over.nextElementSibling);
  } else {
    source.parentNode.insertBefore(source, over);
  }
  return { oldContainer: source.parentNode, newContainer: source.parentNode };
}

function moveOutsideContainer(source, over, overContainer) {
  const oldContainer = source.parentNode;
  if (over) {
    over.parentNode.insertBefore(source, over);
  } else {
    overContainer.appendChild(source);
  }
  return { oldContainer, newContainer: source.parentNode };
}

export default Sortable;
