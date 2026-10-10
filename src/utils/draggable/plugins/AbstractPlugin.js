/**
 * Base class for Draggable plugins. A plugin subscribes to the Draggable's
 * emitter in attach() and unsubscribes in detach().
 */
export class AbstractPlugin {
  constructor(draggable) {
    this.draggable = draggable;
  }

  attach() {
    throw new Error('Not implemented');
  }

  detach() {
    throw new Error('Not implemented');
  }
}
