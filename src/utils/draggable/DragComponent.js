import { BaseComponent } from '../../core/BaseComponent.js';
import { announce } from '../announce.js';
import { fill } from '../text.js';
import { closest } from './dom.js';

/** Longest stretch of an element's text used to name it in an announcement */
const LABEL_LENGTH = 80;

/**
 * What an element is called in an announcement: its `aria-label`, or the start of its text
 *
 * @param {Element|null|undefined} element
 * @returns {string}
 */
export function labelOf(element) {
  const label =
    element?.getAttribute('aria-label') ?? element?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  return label.length > LABEL_LENGTH ? `${label.slice(0, LABEL_LENGTH - 1)}…` : label;
}

/**
 * The base of Sortable, Swappable and Droppable: an enhancement whose elements are containers for
 * one drag engine
 *
 * Containers that share a `data-<component>-group` value share one engine, so their items can
 * move between them. The engine's own events are dispatched on the container as DOM events, and on
 * the event bus, under the same names; preventDefault() on a cancelable one cancels what it
 * announces. The `stop` event and the component's change event wait until the dropped element is
 * in place. Moves are announced through the shared live region.
 *
 * A component sets `static Engine`, its engine class; `static relayed`, the engine events to
 * dispatch, `start` first and `stop` last; `static changeEvent`; and the hooks below.
 */
export class DragComponent extends BaseComponent {
  /** @type {any} The engine class: Sortable, Swappable or Droppable from utils/draggable */
  static Engine = null;
  /** @type {string[]} */
  static relayed = [];
  static changeEvent = '';

  /**
   * @param {import('../../core/BaseComponent.js').ComponentContext} [context]
   */
  constructor(context) {
    super(context);
    /** @type {Map<string|HTMLElement, Object>} Engines by group name, or by element for none */
    this._groups = new Map();
  }

  _init(element) {
    const state = super._init(element);
    const config = this._getConfigFromAttrs(element, {
      group: 'group',
      items: 'items',
      handle: 'handle',
      distance: 'distance',
      touchDelay: 'touch-delay',
      axis: 'axis',
      pickedUp: 'picked-up',
      keyboardHint: 'keyboard-hint',
      moved: 'moved',
      dropped: 'dropped',
      cancelled: 'cancelled',
    });

    const key = config.group ? `group:${config.group}` : element;
    let group = this._groups.get(key);
    if (group) {
      group.elements.add(element);
      group.engine.addContainer(element);
    } else {
      group = this._createGroup(key, element, config);
    }
    state.group = group;
    this.setState(element, 'idle');

    /* Items added later (by htmx, say) need to be reachable with Tab, and a dropzone's state
       follows what is put in it */
    const observer = new MutationObserver(() => {
      if (group.engine.isDragging()) return;
      group.engine.refreshFocusable?.();
      group.engine.refreshZones?.();
    });
    observer.observe(element, { childList: true, subtree: true });

    state.cleanup = () => {
      observer.disconnect();
      this._leave(element, group);
      this.removeAttr(element, 'state');
    };
    return state;
  }

  /**
   * Cancel a drag in progress in an element's group, putting the dragged element back
   *
   * @param {HTMLElement} element
   */
  cancel(element) {
    this._requireState(element, 'cancel')?.group.engine.cancel();
  }

  /**
   * The engine's options. Components add their own to these.
   *
   * @protected
   * @param {Object} config
   * @param {Object} group
   * @returns {Object}
   */
  _engineOptions(config, group) {
    const selector = this._getSelector();
    return {
      draggable: config.items || this._defaultItems(selector, group),
      handle: config.handle || null,
      distance: config.distance,
      delay: { mouse: 0, pen: 0, touch: config.touchDelay },
      mirror: { xAxis: config.axis !== 'y', yAxis: config.axis !== 'x' },
      attribute: selector,
      logger: this.logger,
    };
  }

  /**
   * The items selector when `data-<component>-items` isn't set: the container's children
   *
   * @protected
   * @param {string} selector
   * @returns {string}
   */
  _defaultItems(selector) {
    return `[${selector}] > *`;
  }

  /**
   * The words announced after a move, or an empty string for none
   *
   * @protected
   * @param {Object} _event - The engine event
   * @param {Object} _group
   * @returns {string}
   */
  _moveMessage(_event, _group) {
    return '';
  }

  /**
   * Whether a finished drag changed anything
   *
   * @protected
   * @param {Object} _detail
   * @returns {boolean}
   */
  _changed(_detail) {
    return false;
  }

  _createGroup(key, element, config) {
    const group = { key, config, elements: new Set([element]), pending: null };
    const { Engine, relayed } = this.constructor;
    group.engine = new Engine([element], this._engineOptions(config, group));

    for (const type of relayed) {
      group.engine.on(type, event => this._relay(group, type, event));
    }
    group.engine.on('drag:stopped', () => this._finish(group));

    this._groups.set(key, group);
    return group;
  }

  _leave(element, group) {
    group.elements.delete(element);
    if (group.engine.sourceContainer === element) group.engine.cancel();

    if (group.elements.size > 0) {
      group.engine.removeContainer(element);
    } else {
      group.engine.destroy();
      this._groups.delete(group.key);
    }
  }

  _hostFor(group, node) {
    return node ? closest(node, [...group.elements]) : null;
  }

  _relay(group, type, event) {
    const drag = event.dragEvent ?? event;
    const detail = this._detail(event);
    const hosts = [
      event.newContainer,
      event.oldContainer,
      event.dropzone,
      event.initialDropzone,
      drag.overContainer,
      drag.sourceContainer,
      event.startContainer,
    ]
      .map(node => this._hostFor(group, node))
      .filter(Boolean);
    const targets = [...new Set(hosts)];
    if (targets.length === 0) return;

    if (type === this.constructor.relayed[0]) {
      if (this.getBoolAttr(targets[0], 'disabled')) {
        event.cancel();
        return;
      }
      const dom = this._dispatch(targets[0], type, detail);
      if (dom.defaultPrevented) {
        event.cancel();
        return;
      }
      const { pickedUp, keyboardHint } = group.config;
      const message = fill(pickedUp, { item: labelOf(detail.item) });
      announce(detail.pointerType === 'keyboard' ? `${message} ${keyboardHint}` : message);
      return;
    }

    if (type === this.constructor.relayed.at(-1)) {
      group.pending = { type, detail, targets };
      return;
    }

    const dom = this._dispatch(targets[0], type, detail);
    if (dom.defaultPrevented && event.cancelable) {
      event.cancel();
      return;
    }
    const message = this._moveMessage(event, group);
    if (message) announce(message);
  }

  _finish(group) {
    if (!group.pending) return;
    const { type, detail, targets } = group.pending;
    group.pending = null;

    detail.changed = this._changed(detail);
    for (const host of targets) {
      /* The placeholder and the copy are gone by now, and the dropped item is back in the page,
         so every match is an item */
      const items = [...host.querySelectorAll(group.engine.options.draggable)];
      this._dispatch(host, type, { ...detail, items });
      if (detail.changed) this._dispatch(host, this.constructor.changeEvent, { ...detail, items });
    }

    const { dropped, cancelled } = group.config;
    announce(fill(detail.reverted ? cancelled : dropped, { item: labelOf(detail.item) }));
  }

  _detail(event) {
    const drag = event.dragEvent ?? event;
    const detail = {
      item: drag.originalSource ?? null,
      placeholder: drag.source ?? null,
      reverted: Boolean(drag.sensorEvent?.revert) || Boolean(drag.canceled?.()),
      pointerType: drag.sensorEvent?.pointerType ?? null,
    };
    for (const key of [
      'over',
      'oldIndex',
      'newIndex',
      'oldContainer',
      'newContainer',
      'dropzone',
      'initialDropzone',
      'swappedElement',
    ]) {
      if (event[key] !== undefined) detail[key] = event[key];
    }
    return detail;
  }
}
