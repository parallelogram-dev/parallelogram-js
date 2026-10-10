/**
 * The drag engine behind Sortable, Swappable and Droppable: a port of Shopify Draggable 1.2
 * (MIT, Copyright (c) 2018-present Shopify, https://github.com/Shopify/draggable).
 *
 * It listens for the sensor events its sensors dispatch, keeps a placeholder copy of the dragged
 * element (`source`) in the page while the real one (`originalSource`) is hidden, tracks what the
 * pointer is over, and emits `drag:start`, `drag:move`, `drag:over`, `drag:out`, `drag:stop` and
 * the rest on its own EventManager for the plugins and the Sortable, Swappable and Droppable
 * engines to build on.
 *
 * Differences from the original: one Pointer Events sensor in place of the mouse, touch, drag and
 * force-touch sensors, plus a keyboard sensor; state is written to `<attribute>-state` and
 * `<attribute>-item-state` rather than classes; `cancel()` and Escape put the element back where it
 * started; and a drag can't start while another is in progress.
 */
import { EventManager } from '../../managers/EventManager.js';
import { closest, applyUserSelect } from './dom.js';
import { PointerSensor } from './sensors/PointerSensor.js';
import { KeyboardSensor } from './sensors/KeyboardSensor.js';
import { Focusable } from './plugins/Focusable.js';
import { Mirror } from './plugins/Mirror.js';
import { Scrollable } from './plugins/Scrollable.js';
import {
  DraggableInitializedEvent,
  DraggableDestroyEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOutEvent,
  DragOutContainerEvent,
  DragOverContainerEvent,
  DragOverEvent,
  DragStopEvent,
  DragStoppedEvent,
} from './events.js';

/**
 * @typedef {Object} DraggableOptions
 * @property {string} [draggable] - Selector for the elements that can be dragged
 * @property {string|null} [handle] - Selector for the part of an element that starts a drag
 * @property {number|{ mouse?: number, touch?: number, pen?: number }} [delay] - Hold before a drag
 *   starts, in milliseconds, per pointer type
 * @property {number} [distance] - Pixels a mouse or pen moves before a drag starts
 * @property {number} [placedTimeout] - How long a dropped element keeps its `placed` state
 * @property {string} [attribute] - Prefix of the state attributes, such as `data-sortable`
 * @property {(originalSource: HTMLElement) => HTMLElement} [placeholder] - Builds the element that
 *   holds the dragged element's place. A deep copy by default, which a custom element can't
 *   always survive: the copy is constructed and connected as a second, live instance.
 * @property {Object} [mirror] - Mirror plugin options
 * @property {Object} [scrollable] - Scrollable plugin options
 * @property {Function[]} [plugins] - Extra plugin classes
 * @property {Function[]} [sensors] - Extra sensor classes
 * @property {{ plugins?: Function[], sensors?: Function[] }} [exclude] - Default plugins and
 *   sensors to leave out
 * @property {{ error: Function }} [logger] - Receives errors thrown by listeners
 */

export const defaultOptions = {
  draggable: '.draggable-source',
  handle: null,
  delay: undefined,
  distance: 0,
  placedTimeout: 800,
  attribute: 'data-draggable',
  placeholder: null,
  plugins: [],
  sensors: [],
  exclude: { plugins: [], sensors: [] },
};

export class Draggable {
  static Plugins = { Focusable, Mirror, Scrollable };
  static Sensors = { PointerSensor, KeyboardSensor };

  /**
   * @param {HTMLElement|HTMLElement[]|NodeList} [containers]
   * @param {DraggableOptions} [options]
   */
  constructor(containers = [document.body], options = {}) {
    if (containers instanceof NodeList || Array.isArray(containers)) {
      this.containers = [...containers];
    } else if (containers instanceof HTMLElement) {
      this.containers = [containers];
    } else {
      throw new Error(
        'Draggable containers must be an element, an array of elements or a NodeList'
      );
    }

    this.options = {
      ...defaultOptions,
      ...options,
      exclude: {
        plugins: options.exclude?.plugins ?? [],
        sensors: options.exclude?.sensors ?? [],
      },
    };

    this.emitter = new EventManager({ logger: options.logger });
    this.dragging = false;
    this.plugins = [];
    this.sensors = [];
    this.mirror = null;

    this.onDragStart = this.onDragStart.bind(this);
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragStop = this.onDragStop.bind(this);

    document.addEventListener('drag:start', this.onDragStart, true);
    document.addEventListener('drag:move', this.onDragMove, true);
    document.addEventListener('drag:stop', this.onDragStop, true);

    const { exclude } = this.options;
    const plugins = Object.values(Draggable.Plugins).filter(P => !exclude.plugins.includes(P));
    const sensors = Object.values(Draggable.Sensors).filter(S => !exclude.sensors.includes(S));
    this.addPlugin(...plugins, ...this.options.plugins);
    this.addSensor(...sensors, ...this.options.sensors);

    this.on('mirror:created', ({ mirror }) => (this.mirror = mirror));
    this.on('mirror:destroy', () => (this.mirror = null));
    this.trigger(new DraggableInitializedEvent({ draggable: this }));
  }

  destroy() {
    if (this.dragging) this.cancel();
    document.removeEventListener('drag:start', this.onDragStart, true);
    document.removeEventListener('drag:move', this.onDragMove, true);
    document.removeEventListener('drag:stop', this.onDragStop, true);
    this.trigger(new DraggableDestroyEvent({ draggable: this }));
    this.removePlugin(...this.plugins.map(plugin => plugin.constructor));
    this.removeSensor(...this.sensors.map(sensor => sensor.constructor));
    clearTimeout(this.placedTimeoutID);
    if (this.lastPlacedSource) this.setItemState(this.lastPlacedSource, null);
  }

  addPlugin(...plugins) {
    const active = plugins.map(Plugin => new Plugin(this));
    active.forEach(plugin => plugin.attach());
    this.plugins = [...this.plugins, ...active];
    return this;
  }

  removePlugin(...plugins) {
    const removed = this.plugins.filter(plugin => plugins.includes(plugin.constructor));
    removed.forEach(plugin => plugin.detach());
    this.plugins = this.plugins.filter(plugin => !plugins.includes(plugin.constructor));
    return this;
  }

  addSensor(...sensors) {
    const active = sensors.map(SensorClass => new SensorClass(this.containers, this.options, this));
    active.forEach(sensor => sensor.attach());
    this.sensors = [...this.sensors, ...active];
    return this;
  }

  removeSensor(...sensors) {
    const removed = this.sensors.filter(sensor => sensors.includes(sensor.constructor));
    removed.forEach(sensor => sensor.detach());
    this.sensors = this.sensors.filter(sensor => !sensors.includes(sensor.constructor));
    return this;
  }

  addContainer(...containers) {
    this.containers = [...this.containers, ...containers];
    this.sensors.forEach(sensor => sensor.addContainer(...containers));
    this.refreshFocusable?.();
    return this;
  }

  removeContainer(...containers) {
    this.containers = this.containers.filter(container => !containers.includes(container));
    this.sensors.forEach(sensor => sensor.removeContainer(...containers));
    return this;
  }

  on(type, ...callbacks) {
    callbacks.forEach(callback => this.emitter.on(type, callback));
    return this;
  }

  off(type, callback) {
    this.emitter.off(type, callback);
    return this;
  }

  trigger(event) {
    this.emitter.emit(event.type, event);
    return this;
  }

  /**
   * Write a container's state to `<attribute>-state`
   *
   * @param {HTMLElement} container
   * @param {'idle'|'active'|'over'} state
   */
  setContainerState(container, state) {
    container.setAttribute(`${this.options.attribute}-state`, state);
  }

  /**
   * Write an element's state to `<attribute>-item-state`, or remove it with null
   *
   * @param {HTMLElement} element
   * @param {'placeholder'|'mirror'|'placed'|null} state
   */
  setItemState(element, state) {
    const name = `${this.options.attribute}-item-state`;
    if (state) element.setAttribute(name, state);
    else element.removeAttribute(name);
  }

  isDragging() {
    return Boolean(this.dragging);
  }

  getDraggableElements() {
    return this.containers.flatMap(container => this.getDraggableElementsForContainer(container));
  }

  getDraggableElementsForContainer(container) {
    return [...container.querySelectorAll(this.options.draggable)].filter(
      element => element !== this.originalSource && element !== this.mirror
    );
  }

  /** Containers in document order, which registration order needn't be */
  getOrderedContainers() {
    return [...this.containers].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
  }

  /**
   * Where a keyboard move one step in `direction` (+1 or -1) from `source` aims. This steps
   * through every draggable element in document order; Sortable and Droppable override it.
   *
   * @param {HTMLElement} source
   * @param {1|-1} direction
   * @returns {HTMLElement|null}
   */
  getKeyboardTarget(source, direction) {
    const items = this.getOrderedContainers().flatMap(container =>
      this.getDraggableElementsForContainer(container)
    );
    return items[items.indexOf(source) + direction] ?? null;
  }

  /** End the current drag and put the element back where it started */
  cancel() {
    this.stop(null, { revert: true });
  }

  onDragStart(event) {
    const sensorEvent = event.detail;
    const { target, container, originalSource } = sensorEvent;

    if (!this.containers.includes(container)) return;
    if (this.dragging) {
      sensorEvent.cancel();
      return;
    }
    if (
      this.options.handle &&
      target &&
      sensorEvent.pointerType !== 'keyboard' &&
      !closest(target, this.options.handle)
    ) {
      sensorEvent.cancel();
      return;
    }

    this.originalSource = originalSource;
    this.sourceContainer = container;

    if (this.lastPlacedSource) {
      clearTimeout(this.placedTimeoutID);
      this.setItemState(this.lastPlacedSource, null);
      this.lastPlacedSource = null;
    }

    this.source = this.options.placeholder?.(originalSource) ?? originalSource.cloneNode(true);
    originalSource.parentNode.insertBefore(this.source, originalSource);
    originalSource.style.display = 'none';

    const dragStartEvent = new DragStartEvent({
      source: this.source,
      originalSource,
      sourceContainer: container,
      sensorEvent,
    });
    this.trigger(dragStartEvent);
    this.dragging = !dragStartEvent.canceled();

    if (!this.dragging) {
      this.source.remove();
      originalSource.style.display = '';
      this.source = null;
      this.originalSource = null;
      this.sourceContainer = null;
      sensorEvent.cancel();
      return;
    }

    this.setItemState(this.source, 'placeholder');
    this.containers.forEach(element => this.setContainerState(element, 'active'));
    applyUserSelect(document.body, 'none');
    if (sensorEvent.pointerType !== 'keyboard') {
      document.body.style.cursor = 'grabbing';
      /* Prime over/out state with an initial move over the placeholder */
      requestAnimationFrame(() => {
        if (!this.dragging) return;
        this.onDragMove({ detail: sensorEvent.clone({ target: this.source }) });
      });
    }
  }

  onDragMove(event) {
    if (!this.dragging) return;

    const sensorEvent = event.detail;
    const { container } = sensorEvent;
    const base = {
      source: this.source,
      originalSource: this.originalSource,
      sourceContainer: container,
      sensorEvent,
    };

    const dragMoveEvent = new DragMoveEvent(base);
    this.trigger(dragMoveEvent);
    if (dragMoveEvent.canceled()) sensorEvent.cancel();

    const target = closest(sensorEvent.target, this.options.draggable);
    const withinCorrectContainer = closest(sensorEvent.target, this.containers);
    const overContainer = sensorEvent.overContainer || withinCorrectContainer;
    const isLeavingContainer =
      this.currentOverContainer && overContainer !== this.currentOverContainer;
    const isLeavingDraggable = this.currentOver && target !== this.currentOver;
    const isOverContainer = overContainer && this.currentOverContainer !== overContainer;
    const isOverDraggable = withinCorrectContainer && target && this.currentOver !== target;

    if (isLeavingDraggable) {
      const over = this.currentOver;
      this.currentOver = null;
      this.trigger(new DragOutEvent({ ...base, over, overContainer: this.currentOverContainer }));
    }

    if (isLeavingContainer) {
      const left = this.currentOverContainer;
      this.setContainerState(left, 'active');
      this.currentOverContainer = null;
      this.trigger(new DragOutContainerEvent({ ...base, overContainer: left }));
    }

    if (isOverContainer) {
      this.setContainerState(overContainer, 'over');
      this.currentOverContainer = overContainer;
      this.trigger(new DragOverContainerEvent({ ...base, overContainer }));
    }

    if (isOverDraggable) {
      this.currentOver = target;
      this.trigger(new DragOverEvent({ ...base, overContainer, over: target }));
    }
  }

  onDragStop(event) {
    this.stop(event.detail);
  }

  /**
   * End the drag. With `revert` the original element stays where it began; otherwise it takes the
   * placeholder's position.
   *
   * @param {Object|null} sensorEvent
   * @param {{ revert?: boolean }} [options]
   */
  stop(sensorEvent, { revert = false } = {}) {
    if (!this.dragging) return;
    this.dragging = false;

    if (revert) {
      sensorEvent = sensorEvent?.clone
        ? sensorEvent.clone({ revert: true })
        : { revert: true, pointerType: null };
    }

    const { source, originalSource, sourceContainer } = this;
    const dragStopEvent = new DragStopEvent({
      source,
      originalSource,
      sensorEvent,
      sourceContainer,
    });
    this.trigger(dragStopEvent);

    if (!dragStopEvent.canceled() && !sensorEvent?.revert) {
      source.parentNode.insertBefore(originalSource, source);
    }
    source.remove();
    originalSource.style.display = '';

    this.containers.forEach(element => this.setContainerState(element, 'idle'));
    applyUserSelect(document.body, '');
    document.body.style.cursor = '';

    this.setItemState(originalSource, 'placed');
    this.lastPlacedSource = originalSource;
    this.placedTimeoutID = setTimeout(() => {
      if (this.lastPlacedSource) this.setItemState(this.lastPlacedSource, null);
      this.lastPlacedSource = null;
    }, this.options.placedTimeout);

    this.trigger(new DragStoppedEvent({ source, originalSource, sensorEvent, sourceContainer }));

    this.source = null;
    this.originalSource = null;
    this.currentOverContainer = null;
    this.currentOver = null;
    this.sourceContainer = null;
  }
}
