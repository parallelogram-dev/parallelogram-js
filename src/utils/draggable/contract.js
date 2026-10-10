/**
 * The parts of Sortable's, Swappable's and Droppable's contracts they share
 *
 * Each contract passes its component's name and the defaults that differ, and adds its own events
 * and examples. Defaults are written out here rather than read from the components, since
 * contracts never import the code they describe.
 */

const AXES = ['both', 'x', 'y'];
const DETAIL =
  '{ element: HTMLElement; item: HTMLElement; placeholder: HTMLElement; reverted: boolean; pointerType: string | null';

/**
 * @param {Object} options
 * @param {string} options.name - The component's data attribute without `data-`, such as `sortable`
 * @param {string} options.items - What the items are when `-items` isn't set
 * @param {string} options.keyboardHint - The default keyboard hint
 * @param {string} options.moved - The default move announcement
 * @param {string} options.movedPlaceholders - The placeholders the move announcement fills
 * @returns {import('../../contract.js').AttributeContract[]}
 */
export function dragAttributes({ name, items, keyboardHint, moved, movedPlaceholders }) {
  const prefix = `data-${name}`;
  return [
    {
      name: prefix,
      type: 'flag',
      required: true,
      description: 'Marks the container',
    },
    {
      name: `${prefix}-group`,
      type: 'string',
      default: null,
      option: 'group',
      description:
        'Containers with the same group share one drag, so items move between them; the first one mounted sets the options',
    },
    {
      name: `${prefix}-items`,
      type: 'selector',
      default: null,
      option: 'items',
      description: `The elements that can be dragged; ${items} when not set`,
    },
    {
      name: `${prefix}-handle`,
      type: 'selector',
      default: null,
      option: 'handle',
      description:
        'The part of an item that starts a drag, such as a grip; give it `touch-action: none` so a touch on it drags rather than scrolls',
    },
    {
      name: `${prefix}-distance`,
      type: 'number',
      default: 4,
      option: 'distance',
      description:
        'Pixels a mouse or pen moves before a drag starts, so a click on a link or button inside an item still clicks it',
    },
    {
      name: `${prefix}-touch-delay`,
      type: 'number',
      default: 100,
      option: 'touchDelay',
      description:
        'Milliseconds a finger rests on an item before a drag starts; moving sooner scrolls the page instead',
    },
    {
      name: `${prefix}-axis`,
      type: 'enum',
      options: AXES,
      default: 'both',
      option: 'axis',
      description: 'Which way the copy under the pointer may move',
    },
    {
      name: `${prefix}-disabled`,
      type: 'boolean',
      default: false,
      description: 'Stops new drags from starting in this container while set',
    },
    {
      name: `${prefix}-picked-up`,
      type: 'string',
      default: 'Picked up {item}.',
      option: 'pickedUp',
      description: 'Announced when an item is picked up; `{item}` is its label',
    },
    {
      name: `${prefix}-keyboard-hint`,
      type: 'string',
      default: keyboardHint,
      option: 'keyboardHint',
      description: 'Announced after the pick-up message when the keyboard picked the item up',
    },
    {
      name: `${prefix}-moved`,
      type: 'string',
      default: moved,
      option: 'moved',
      description: `Announced after each move; ${movedPlaceholders}`,
    },
    {
      name: `${prefix}-dropped`,
      type: 'string',
      default: 'Dropped {item}.',
      option: 'dropped',
      description: 'Announced when an item is dropped',
    },
    {
      name: `${prefix}-cancelled`,
      type: 'string',
      default: 'Cancelled. {item} is back where it started.',
      option: 'cancelled',
      description: 'Announced when a drag is cancelled with Escape',
    },
    {
      name: `${prefix}-state`,
      type: 'enum',
      options: ['idle', 'active', 'over'],
      readonly: true,
      description:
        '`active` while a drag in its group is in progress, `over` while the item is over this container',
    },
    {
      name: `${prefix}-item-state`,
      type: 'enum',
      options: ['placeholder', 'mirror', 'placed'],
      readonly: true,
      on: 'item',
      description:
        'On the placeholder showing where the item will land, the copy following the pointer, and an item just dropped',
    },
  ];
}

/**
 * @param {string} name - The component's data attribute without `data-`
 * @param {{ move: string, moveDetail: string, moved: string, movedDetail: string, stopDetail: string, changed: string }} parts
 * @returns {import('../../contract.js').EventContract[]}
 */
export function dragEvents(name, parts) {
  return [
    {
      name: `${name}:start`,
      channel: 'both',
      cancelable: true,
      detail: `${DETAIL} }`,
      description: 'An item is being picked up; preventDefault() leaves it where it is',
    },
    {
      name: `${name}:${parts.move}`,
      channel: 'both',
      cancelable: true,
      detail: `${DETAIL}; ${parts.moveDetail} }`,
      description: `The item is about to ${parts.moved}; preventDefault() stops it`,
    },
    ...(parts.after ?? []).map(after => ({
      channel: 'both',
      detail: `${DETAIL}; ${after.detail} }`,
      ...after,
    })),
    {
      name: `${name}:stop`,
      channel: 'both',
      detail: `${DETAIL}; ${parts.stopDetail}; changed: boolean; items: HTMLElement[] }`,
      description:
        'The drag has ended and the item is in place, dispatched on each container it changed; `items` are that container’s items in order',
    },
    {
      name: `${name}:change`,
      channel: 'both',
      detail: `${DETAIL}; ${parts.stopDetail}; changed: boolean; items: HTMLElement[] }`,
      description: `As \`${name}:stop\`, only when ${parts.changed}: the one to save on`,
    },
  ];
}

export const dragMethods = [
  {
    name: 'cancel',
    signature: '(element: HTMLElement) => void',
    description: 'Cancel a drag in progress in the element’s group, putting the item back',
  },
];

/** @returns {import('../../contract.js').NamedContract[]} */
export function dragCssProperties({ zones = false } = {}) {
  return [
    {
      name: '--drag-over-bg',
      default: 'var(--color-hover)',
      description: 'Background of a container the item is over',
    },
    {
      name: '--drag-placeholder-opacity',
      default: '0.4',
      description: 'Opacity of the placeholder where the item will land',
    },
    {
      name: '--drag-placeholder-outline',
      default: '2px dashed var(--color-accent)',
      description: 'Outline of the placeholder',
    },
    {
      name: '--drag-mirror-shadow',
      default: 'var(--surface-dropdown-shadow)',
      description: 'Shadow of the copy following the pointer',
    },
    {
      name: '--drag-mirror-opacity',
      default: '0.95',
      description: 'Opacity of the copy following the pointer',
    },
    {
      name: '--drag-mirror-z-index',
      default: '2147483000',
      description: 'Stacking of the copy following the pointer',
    },
    {
      name: '--drag-placed-color',
      default: 'rgba(37, 99, 235, 0.15)',
      description: 'Colour a dropped item fades from; none under prefers-reduced-motion',
    },
    {
      name: '--drag-placed-duration',
      default: '0.6s',
      description: 'How long a dropped item takes to fade back',
    },
    ...(zones
      ? [
          {
            name: '--drag-zone-outline',
            default: '2px dashed var(--color-border-strong)',
            description: 'Outline of a dropzone the item can go into, while dragging',
          },
        ]
      : []),
  ];
}
