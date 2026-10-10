import {
  dragAttributes,
  dragCssProperties,
  dragEvents,
  dragMethods,
} from '../utils/draggable/contract.js';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Sortable',
  kind: 'enhancement',
  selector: 'data-sortable',
  module: 'components/Sortable',
  stylesheet: 'styles/draggable.css',
  summary: 'Reorder a list by dragging its items, with a mouse, a finger or the keyboard',
  description: `The container's children are the items, or the elements \`data-sortable-items\` selects. A drag starts once a mouse has moved a few pixels, or after a short hold on touch, so a click on a link or button inside an item still works and a quick swipe still scrolls; \`data-sortable-handle\` limits it to a part of each item. A copy follows the pointer while a placeholder shows where the item will land, and the page or the list scrolls when the pointer nears its edge.

From the keyboard, Tab reaches each item, Space or Enter picks it up, the arrow keys move it and Space or Enter drops it; Escape puts it back where it started. Each step is announced to screen readers, and every announcement can be reworded or translated with an attribute or once on \`Sortable.defaults\`.

Containers with the same \`data-sortable-group\` share their items, for a board of columns. \`sortable:change\` fires on each list a drop changed once the item is in place, with the list's items in order — the event to save on. An \`<input type="hidden">\` in each item puts the new order in a form without any script.

Built on a port of Shopify Draggable (MIT).`,
  attributes: dragAttributes({
    name: 'sortable',
    items: "the container's children",
    keyboardHint: 'Arrow keys move it, Space drops it, Escape cancels.',
    moved: 'Position {position} of {total}.',
    movedPlaceholders: '`{item}`, `{position}` and `{total}`',
  }),
  events: dragEvents('sortable', {
    move: 'sort',
    moved: 'move past another',
    moveDetail: 'over: HTMLElement | undefined',
    after: [
      {
        name: 'sortable:sorted',
        detail:
          'oldIndex: number; newIndex: number; oldContainer: HTMLElement; newContainer: HTMLElement',
        description: 'The placeholder has moved; the drop is still to come',
      },
    ],
    stopDetail:
      'oldIndex: number; newIndex: number; oldContainer: HTMLElement; newContainer: HTMLElement',
    changed: 'the item moved',
  }),
  methods: dragMethods,
  cssProperties: dragCssProperties(),
  examples: [
    {
      id: 'basic',
      title: 'A list',
      description: 'Drag an item, or tab to one and press Space, then the arrow keys.',
      markup: `<ul class="sortable-list" data-sortable>
  <li>Write the brief</li>
  <li>Design</li>
  <li>Review</li>
  <li>Publish</li>
</ul>`,
      controls: [{ attribute: 'data-sortable-axis' }, { attribute: 'data-sortable-distance' }],
    },
    {
      id: 'board',
      title: 'Columns sharing their cards',
      description: 'Two lists in one group, with a grip on each card to drag it by.',
      markup: `<div class="sortable-board">
  <ul class="sortable-list" data-sortable data-sortable-group="board" data-sortable-handle=".sortable-grip" aria-label="To do">
    <li><span class="sortable-grip" aria-hidden="true">⠿</span> Brief</li>
    <li><span class="sortable-grip" aria-hidden="true">⠿</span> Budget</li>
  </ul>
  <ul class="sortable-list" data-sortable data-sortable-group="board" data-sortable-handle=".sortable-grip" aria-label="Done">
    <li><span class="sortable-grip" aria-hidden="true">⠿</span> Kick-off</li>
  </ul>
</div>`,
    },
    {
      id: 'form',
      title: 'Saving the order with a form',
      description: 'Each item carries a hidden input, so submitting sends the order as it stands.',
      markup: `<form method="post" action="/tasks/order">
  <ol class="sortable-list" data-sortable>
    <li>Brief <input type="hidden" name="order[]" value="12"></li>
    <li>Design <input type="hidden" name="order[]" value="13"></li>
    <li>Review <input type="hidden" name="order[]" value="14"></li>
  </ol>
  <button type="submit" class="btn">Save order</button>
</form>`,
    },
  ],
};
