/**
 * The drag engine behind Sortable, Swappable and Droppable, for code that drives a drag itself
 *
 * The components configure the engine from data attributes and suit most lists. A script that
 * needs what an attribute can't say, such as its own placeholder or a copy built for the pointer
 * rather than cloned, a different place to put that copy, or a sensor left out, constructs an
 * engine here with those options and listens to its events, as `<p-uploader>` does. It is a port
 * of Shopify Draggable (MIT), and its options and events follow the original's.
 *
 * @example
 * import { Sortable } from '@parallelogram-js/core/draggable';
 *
 * const sorter = new Sortable([list], {
 *   draggable: 'li',
 *   handle: '.grip',
 *   placeholder: item => item.cloneNode(false),
 *   mirror: { appendTo: document.body },
 * });
 * sorter.on('sortable:stop', ({ oldIndex, newIndex }) => save(oldIndex, newIndex));
 */

export { Draggable } from './utils/draggable/Draggable.js';
export { Sortable } from './utils/draggable/Sortable.js';
export { Swappable } from './utils/draggable/Swappable.js';
export { Droppable } from './utils/draggable/Droppable.js';
export { AbstractPlugin } from './utils/draggable/plugins/AbstractPlugin.js';
export { Focusable } from './utils/draggable/plugins/Focusable.js';
export { Mirror } from './utils/draggable/plugins/Mirror.js';
export { Scrollable } from './utils/draggable/plugins/Scrollable.js';
export { Sensor } from './utils/draggable/sensors/Sensor.js';
export { PointerSensor } from './utils/draggable/sensors/PointerSensor.js';
export { KeyboardSensor } from './utils/draggable/sensors/KeyboardSensor.js';
export { closest } from './utils/draggable/dom.js';
