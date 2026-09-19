const PLACEMENTS = [
  'bottom-start',
  'bottom-end',
  'bottom',
  'top-start',
  'top-end',
  'top',
  'left',
  'right',
];
const STATES = ['closed', 'opening', 'open', 'closing'];
const DROPDOWN_DETAIL = '{ target: HTMLElement; trigger: HTMLElement; timestamp: number }';

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Dropdown',
  kind: 'enhancement',
  selector: 'data-dropdown',
  module: 'components/Dropdown',
  stylesheet: 'styles/dropdown.css',
  summary:
    'A menu that opens beside its button, from markup on the page or from a template filled in per button',
  description: `Dropdown is Toggle with a place to sit and a menu to keep: it opens the target beside the trigger on the side \`data-dropdown-placement\` asks for, flips to the opposite side when there is no room, stays inside the viewport, and follows the trigger while the page scrolls. Everything Toggle does it does too -- \`aria-expanded\` and \`aria-controls\` on the trigger, closing on a click or focus outside, on Escape and when a link inside is followed, one group closing each other -- with the defaults a menu wants: outside clicks close it, and every dropdown on the page is in one group unless given its own, so opening one closes the rest.

The menu is either on the page already, named by \`data-dropdown-target\`, or built the first time the trigger opens from a \`<template>\` named by \`data-dropdown-template\`, with every \`{name}\` in its text and attribute values filled from the trigger's \`data-dropdown-param-<name>\` attributes and put back to nothing when it closes. A page with a menu per row keeps one template and a few attributes per row rather than a menu per row in the DOM. Values are substituted as text, never parsed as markup.

Inside the menu, the arrow keys move between items, Home and End go to the ends, a letter jumps to the next item starting with it, Escape closes and returns focus to the trigger, and choosing an item dispatches \`dropdown:select\` with the item and the trigger's params, then closes -- unless the item or the menu carries \`data-dropdown-stay\`. The menu gets \`role="menu"\` and its items \`role="menuitem"\` when the markup has not said otherwise.`,
  attributes: [
    {
      name: 'data-dropdown-target',
      type: 'string',
      description: 'A selector for a menu already on the page',
    },
    {
      name: 'data-dropdown-template',
      type: 'string',
      description:
        'A selector for a <template> whose content becomes the menu the first time the trigger opens; its one root element is the menu',
    },
    {
      name: 'data-dropdown-param-<name>',
      type: 'string',
      description:
        "Fills every {name} in the template's text and attribute values, as text, so a value cannot inject markup; passed along with dropdown:select. In a boolean attribute such as disabled or hidden, an empty, false or unfilled value takes the attribute away and anything else keeps it",
    },
    {
      name: 'data-dropdown-params',
      type: 'string',
      description:
        'All the params in one attribute: JSON, or key:value pairs separated by commas as in {id: 12, name: Ada}, braces and quotes optional; a data-dropdown-param-<name> attribute wins for its name',
    },
    {
      name: 'data-dropdown-disabled',
      type: 'string',
      description:
        'The data-dropdown-item names of the items to disable for this trigger, separated by commas or spaces',
    },
    {
      name: 'data-dropdown-hidden',
      type: 'string',
      description:
        'The data-dropdown-item names of the items to leave out for this trigger: left out of a menu built from a template, hidden in a menu on the page',
    },
    {
      name: 'data-dropdown-item',
      type: 'string',
      on: 'an item',
      description: 'The name data-dropdown-disabled and data-dropdown-hidden refer to an item by',
    },
    {
      name: 'data-dropdown-keep',
      type: 'boolean',
      default: false,
      option: 'keep',
      description:
        'Keep a menu built from a template in the DOM after it closes, rather than removing it',
    },
    {
      name: 'data-dropdown-placement',
      type: 'enum',
      options: PLACEMENTS,
      default: 'bottom-start',
      option: 'placement',
      description:
        'Which side of the trigger the menu opens on and which edge it lines up with; it flips when there is no room',
    },
    {
      name: 'data-dropdown-offset',
      type: 'number',
      default: 4,
      option: 'offset',
      description: 'Pixels between the trigger and the menu',
    },
    {
      name: 'data-dropdown-match-width',
      type: 'boolean',
      default: false,
      option: 'matchWidth',
      description: 'Make the menu at least as wide as the trigger',
    },
    {
      name: 'data-dropdown-portal',
      type: 'boolean',
      default: false,
      option: 'portal',
      description:
        'Move the menu to the end of the body while it is open, for a trigger inside an ancestor that clips or transforms',
    },
    {
      name: 'data-dropdown-group',
      type: 'string',
      default: 'dropdown',
      option: 'group',
      description:
        'Dropdowns that share a group name close each other; every dropdown is in one group unless given its own, and an empty name makes one independent',
    },
    {
      name: 'data-dropdown-capture',
      type: 'boolean',
      default: true,
      option: 'capture',
      description: 'Close on a click or focus outside the trigger and menu',
    },
    {
      name: 'data-dropdown-close-navigation',
      type: 'boolean',
      default: true,
      option: 'closeOnNavigation',
      description: 'Close when a page link inside the menu is followed',
    },
    {
      name: 'data-dropdown-close-escape',
      type: 'boolean',
      default: true,
      option: 'closeOnEscape',
      description: 'Close with Escape, returning focus to the trigger',
    },
    {
      name: 'data-dropdown-manual',
      type: 'boolean',
      default: false,
      option: 'manual',
      description: 'Close only from the trigger or the group',
    },
    {
      name: 'data-dropdown-animate',
      type: 'boolean',
      default: true,
      option: 'animateToggle',
      description: "Wait for the stylesheet's animations before changing state",
    },
    {
      name: 'data-dropdown-stay',
      type: 'flag',
      on: 'an item, or the menu',
      description: 'Choosing this item, or any item in this menu, leaves the menu open',
    },
    {
      name: 'data-dropdown-state',
      type: 'enum',
      options: STATES,
      readonly: true,
      on: 'target',
      description:
        "The menu's state; the stylesheet hides a closed menu and animates opening and closing",
    },
    {
      name: 'data-dropdown-side',
      type: 'enum',
      options: ['top', 'bottom', 'left', 'right'],
      readonly: true,
      on: 'target',
      description: 'The side the menu took, which the stylesheet animates it in from',
    },
    {
      name: 'data-dropdown-enhanced',
      type: 'flag',
      readonly: true,
      description: 'Present on a trigger while Dropdown is mounted on it',
    },
  ],
  events: [
    {
      name: 'dropdown:show',
      channel: 'both',
      detail: DROPDOWN_DETAIL,
      description: 'Dispatched on the trigger when its menu opens',
    },
    {
      name: 'dropdown:hide',
      channel: 'both',
      detail: DROPDOWN_DETAIL,
      description: 'Dispatched on the trigger when its menu closes',
    },
    {
      name: 'dropdown:select',
      channel: 'both',
      detail:
        '{ item: HTMLElement; params: Record<string, string>; target: HTMLElement; trigger: HTMLElement; timestamp: number }',
      description:
        "Dispatched on the trigger when an item is chosen, with the item and the trigger's params; the menu then closes unless the item or the menu carries data-dropdown-stay",
    },
    {
      name: 'dropdown:mount',
      channel: 'bus',
      detail:
        '{ element: HTMLElement; target: HTMLElement | null; isOpen: boolean; timestamp: number }',
      description: 'A trigger was set up; the target is null until a templated menu is first built',
    },
  ],
  cssProperties: [
    { name: '--dropdown-z-index', default: '1000', description: 'Stacking of an open menu' },
    { name: '--dropdown-min-width', default: '10rem', description: 'Narrowest a menu is drawn' },
    {
      name: '--dropdown-max-height',
      default: '60vh',
      description: 'Tallest a menu grows before it scrolls',
    },
    {
      name: '--dropdown-padding',
      default: '0.25rem',
      description: 'Space between the menu edge and its items',
    },
    {
      name: '--dropdown-item-padding',
      default: '0.45rem 0.6rem',
      description: 'Padding of an item',
    },
    {
      name: '--dropdown-item-radius',
      default: '0.2em',
      description: 'Corner radius of an item’s hover',
    },
    {
      name: '--dropdown-transition-duration',
      default: 'var(--framework-transition-duration)',
      description: 'How long opening and closing take; none under prefers-reduced-motion',
    },
    {
      name: '--dropdown-shift',
      default: '4px',
      description: 'How far a menu moves while it opens and closes',
    },
  ],
  examples: [
    {
      id: 'account',
      title: 'A menu on the page',
      description:
        'The menu is in the markup; Dropdown opens it under the button and closes it on a click outside, on Escape, or when a link is followed.',
      markup: `<button type="button" class="btn" data-dropdown data-dropdown-target="#account-menu">Account</button>
<div id="account-menu" class="menu" hidden>
  <a href="#profile">Profile</a>
  <a href="#bookings">Bookings</a>
  <button type="button">Sign out</button>
</div>`,
      controls: [
        { attribute: 'data-dropdown-placement' },
        { attribute: 'data-dropdown-capture' },
        { attribute: 'data-dropdown-animate' },
      ],
    },
    {
      id: 'rows',
      title: 'One template for every row',
      description:
        'Each row carries only its params, as separate attributes or as one; the menu is built when the button opens and removed when it closes. Grace’s row disables Cancel and Mary’s leaves Edit out, by the items’ names. Choose an action to see dropdown:select carry the row’s params.',
      markup: `<template id="booking-actions">
  <div class="menu">
    <a href="/bookings/{id}/edit" data-dropdown-item="edit">Edit {name}</a>
    <button type="button" data-action="cancel" data-dropdown-item="cancel">Cancel booking</button>
  </div>
</template>
<table class="table">
  <tr><td>Ada Lovelace</td><td>Tue 24 Sep</td><td><button type="button" class="btn btn--sm" data-dropdown data-dropdown-template="#booking-actions" data-dropdown-param-id="12" data-dropdown-param-name="Ada">Actions</button></td></tr>
  <tr><td>Grace Hopper</td><td>Wed 25 Sep</td><td><button type="button" class="btn btn--sm" data-dropdown data-dropdown-template="#booking-actions" data-dropdown-params="{id: 13, name: Grace}" data-dropdown-disabled="cancel">Actions</button></td></tr>
  <tr><td>Mary Somerville</td><td>Thu 26 Sep</td><td><button type="button" class="btn btn--sm" data-dropdown data-dropdown-template="#booking-actions" data-dropdown-param-id="14" data-dropdown-param-name="Mary" data-dropdown-hidden="edit">Actions</button></td></tr>
</table>`,
    },
    {
      id: 'placements',
      title: 'Each side and alignment',
      description: 'The same menu opened on each side of its button, lined up with each edge.',
      markup: `<div class="button-row">
  <button type="button" class="btn" data-dropdown data-dropdown-target="#place-menu" data-dropdown-placement="bottom-start">Bottom start</button>
  <button type="button" class="btn" data-dropdown data-dropdown-target="#place-menu" data-dropdown-placement="bottom-end">Bottom end</button>
  <button type="button" class="btn" data-dropdown data-dropdown-target="#place-menu" data-dropdown-placement="top-start">Top start</button>
  <button type="button" class="btn" data-dropdown data-dropdown-target="#place-menu" data-dropdown-placement="right">Right</button>
</div>
<div id="place-menu" class="menu" hidden>
  <a href="#one">First choice</a>
  <a href="#two">Second choice</a>
</div>`,
    },
    {
      id: 'toolbar',
      title: 'Several menus, one open at a time',
      description:
        'Dropdowns share a group unless told otherwise, so opening one closes the others. The last has its own group and no capture, so it stays open while the others come and go; with capture it would still close when focus left it.',
      markup: `<div class="button-row">
  <button type="button" class="btn" data-dropdown data-dropdown-target="#file-menu">File</button>
  <button type="button" class="btn" data-dropdown data-dropdown-target="#edit-menu">Edit</button>
  <button type="button" class="btn" data-dropdown data-dropdown-target="#help-menu" data-dropdown-group="" data-dropdown-capture="false">Help</button>
</div>
<div id="file-menu" class="menu" hidden><button type="button">New</button><button type="button">Open</button></div>
<div id="edit-menu" class="menu" hidden><button type="button">Undo</button><button type="button">Redo</button></div>
<div id="help-menu" class="menu" hidden><a href="#docs">Documentation</a><a href="#about">About</a></div>`,
    },
    {
      id: 'select',
      title: 'A menu as wide as its button, kept open',
      description:
        'data-dropdown-match-width makes the menu at least the button’s width, like a select; data-dropdown-stay on the menu keeps it open while choosing.',
      markup: `<button type="button" class="btn" data-dropdown data-dropdown-target="#filter-menu" data-dropdown-match-width>Filter bookings by status</button>
<div id="filter-menu" class="menu" data-dropdown-stay hidden>
  <button type="button" role="menuitemcheckbox" aria-checked="true">Confirmed</button>
  <button type="button" role="menuitemcheckbox" aria-checked="false">Waitlisted</button>
  <button type="button" role="menuitemcheckbox" aria-checked="false">Cancelled</button>
</div>`,
    },
  ],
};
