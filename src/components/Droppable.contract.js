import {
  dragAttributes,
  dragCssProperties,
  dragEvents,
  dragMethods,
} from '../utils/draggable/contract.js';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Droppable',
  kind: 'enhancement',
  selector: 'data-droppable',
  module: 'components/Droppable',
  stylesheet: 'styles/draggable.css',
  summary: 'Drag items between dropzones that hold one item each',
  description: `The dropzones are the elements marked \`data-droppable-zone\` inside the container, and the items are their children, or the elements \`data-droppable-items\` selects. An item dragged over an empty dropzone moves into it; dragged back over its own, or let go outside every dropzone, it goes home. A dropzone holding an item is occupied, so the markup needs no marker for it.

From the keyboard, Space or Enter picks up the focused item, the arrow keys move it to the previous or next free dropzone, Space or Enter drops it and Escape puts it back. Give each dropzone an \`aria-label\` so its name is announced; one without is announced by its \`data-droppable-zone\` value. Containers with the same \`data-droppable-group\` share their dropzones. \`droppable:change\` fires once an item has landed in a different dropzone.

Built on a port of Shopify Draggable (MIT).`,
  attributes: [
    ...dragAttributes({
      name: 'droppable',
      items: "the dropzones' children",
      keyboardHint: 'Arrow keys move it between dropzones, Space drops it, Escape cancels.',
      moved: 'In {zone}.',
      movedPlaceholders: '`{item}` and `{zone}`, the dropzone it is in',
    }),
    {
      name: 'data-droppable-zone',
      type: 'string',
      required: true,
      on: 'dropzone',
      description:
        'Marks a dropzone; the value names it in announcements when it has no aria-label',
    },
    {
      name: 'data-droppable-zone-state',
      type: 'enum',
      options: ['empty', 'available', 'occupied'],
      readonly: true,
      on: 'dropzone',
      description: '`occupied` while it holds an item; `available` when empty during a drag',
    },
  ],
  events: dragEvents('droppable', {
    move: 'dropped',
    moved: 'move into a dropzone',
    moveDetail: 'dropzone: HTMLElement',
    after: [
      {
        name: 'droppable:returned',
        cancelable: true,
        detail: 'dropzone: HTMLElement',
        description:
          'The item is about to go back to the dropzone it started in; preventDefault() keeps it where it is',
      },
    ],
    stopDetail: 'dropzone: HTMLElement; initialDropzone: HTMLElement',
    changed: 'the item ended up in a different dropzone',
  }),
  methods: dragMethods,
  cssProperties: dragCssProperties({ zones: true }),
  examples: [
    {
      id: 'basic',
      title: 'Dropzones',
      description: 'Drag the invoice between the columns.',
      markup: `<div class="droppable-zones" data-droppable>
  <div class="droppable-zone" data-droppable-zone="inbox" aria-label="Inbox"><div class="card">Invoice 42</div></div>
  <div class="droppable-zone" data-droppable-zone="review" aria-label="In review"></div>
  <div class="droppable-zone" data-droppable-zone="paid" aria-label="Paid"></div>
</div>`,
    },
  ],
};
