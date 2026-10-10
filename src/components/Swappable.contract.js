import {
  dragAttributes,
  dragCssProperties,
  dragEvents,
  dragMethods,
} from '../utils/draggable/contract.js';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Swappable',
  kind: 'enhancement',
  selector: 'data-swappable',
  module: 'components/Swappable',
  stylesheet: 'styles/draggable.css',
  summary: 'Drag one item onto another to exchange their places',
  description: `Works as Sortable does, with a mouse, a finger or the keyboard, except that an item dropped on another swaps the two rather than shifting the ones between: the right shape for a grid of tiles or a set of slots, where every other item should stay put.

The container's children are the items, or the elements \`data-swappable-items\` selects, and \`data-swappable-handle\` limits where a drag can start. From the keyboard, Space or Enter picks up the focused item, the arrow keys swap it with the previous or next one, Space or Enter drops it and Escape undoes the swap. Containers with the same \`data-swappable-group\` swap with each other. \`swappable:change\` fires once a drop has swapped two items.

Built on a port of Shopify Draggable (MIT).`,
  attributes: dragAttributes({
    name: 'swappable',
    items: "the container's children",
    keyboardHint: 'Arrow keys move it, Space drops it, Escape cancels.',
    moved: 'Swapped with {other}.',
    movedPlaceholders: '`{item}` and `{other}`, the item it swapped with',
  }),
  events: dragEvents('swappable', {
    move: 'swap',
    moved: 'swap with another',
    moveDetail: 'over: HTMLElement',
    after: [
      {
        name: 'swappable:swapped',
        detail: 'swappedElement: HTMLElement',
        description: 'Two items have swapped places; the drop is still to come',
      },
    ],
    stopDetail: 'swappedElement: HTMLElement | null',
    changed: 'two items swapped',
  }),
  methods: dragMethods,
  cssProperties: dragCssProperties(),
  examples: [
    {
      id: 'basic',
      title: 'Tiles',
      description: 'Drag a tile onto another to swap them.',
      markup: `<div class="swappable-grid" data-swappable>
  <div class="card">One</div>
  <div class="card">Two</div>
  <div class="card">Three</div>
  <div class="card">Four</div>
</div>`,
      controls: [{ attribute: 'data-swappable-axis' }],
    },
  ],
};
