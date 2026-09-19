import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Dropdown from '../../../src/components/Dropdown.js';
import dropdownStyles from '../../../src/styles/framework/components/dropdown.scss';

const WAIT = { timeout: 2000 };
const stateOf = menu => menu?.getAttribute('data-dropdown-state');
const open = async (dropdown, button) => {
  dropdown.show(button);
  const menu = document.getElementById(button.getAttribute('aria-controls'));
  await vi.waitFor(() => expect(stateOf(menu)).toBe('open'), WAIT);
  return menu;
};

describe('Dropdown', () => {
  let style;
  let dropdown;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = dropdownStyles;
    document.head.append(style);
    dropdown = new Dropdown();
  });

  afterEach(() => {
    dropdown.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  const mount = markup => {
    document.body.innerHTML = markup;
    for (const trigger of document.querySelectorAll('[data-dropdown]')) dropdown.mount(trigger);
    return document.querySelector('[data-dropdown]');
  };

  it('opens a menu from the page under its button, wired as a menu, and closes on a click outside', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m" style="position:fixed;top:100px;left:100px">Account</button>
      <div id="m" hidden><a href="#p">Profile</a><button type="button">Sign out</button></div>
      <p id="outside">Elsewhere</p>`);
    const before = [
      button.getAttribute('aria-haspopup'),
      button.getAttribute('aria-expanded'),
      stateOf(document.getElementById('m')),
    ];

    const menu = await open(dropdown, button);
    const during = {
      expanded: button.getAttribute('aria-expanded'),
      role: menu.getAttribute('role'),
      items: [...menu.querySelectorAll('[role="menuitem"]')].length,
      below: menu.getBoundingClientRect().top >= button.getBoundingClientRect().bottom,
      alignedStart:
        Math.abs(menu.getBoundingClientRect().left - button.getBoundingClientRect().left) < 1,
      fixed: getComputedStyle(menu).position,
    };
    await userEvent.click(document.getElementById('outside'));
    await vi.waitFor(() => expect(stateOf(menu)).toBe('closed'), WAIT);

    expect({ before, during }).toEqual({
      before: ['menu', 'false', 'closed'],
      during: {
        expanded: 'true',
        role: 'menu',
        items: 2,
        below: true,
        alignedStart: true,
        fixed: 'fixed',
      },
    });
  });

  it('builds a menu from a template on first open, fills the params as text, and removes it on close', async () => {
    const button = mount(`
      <template id="t"><div class="menu"><a href="/bookings/{id}/edit">Edit {name}</a><button type="button" data-action="cancel">Cancel</button></div></template>
      <button type="button" data-dropdown data-dropdown-template="#t" data-dropdown-param-id="12" data-dropdown-param-name="&lt;img src=x onerror=&quot;window.__dropdownInjected = true&quot;&gt;">Actions</button>`);
    const beforeOpen = document.querySelector('.menu');

    const menu = await open(dropdown, button);
    const built = {
      next: button.nextElementSibling === menu,
      href: menu.querySelector('a').getAttribute('href'),
      text: menu.querySelector('a').textContent,
      images: menu.querySelectorAll('img').length,
      injected: window.__dropdownInjected,
    };
    dropdown.hide(button);
    await vi.waitFor(() => expect(menu.isConnected).toBe(false), WAIT);

    expect({
      beforeOpen,
      built,
      afterClose: [button.hasAttribute('aria-controls'), button.getAttribute('aria-expanded')],
    }).toEqual({
      beforeOpen: null,
      built: {
        next: true,
        href: '/bookings/12/edit',
        text: 'Edit <img src=x onerror="window.__dropdownInjected = true">',
        images: 0,
        injected: undefined,
      },
      afterClose: [false, 'false'],
    });
  });

  it('opens a templated menu from a click on the button, which is how a visitor opens one', async () => {
    const button = mount(`
      <template id="t"><div class="menu"><button type="button">One</button></div></template>
      <button type="button" data-dropdown data-dropdown-template="#t">Actions</button>`);
    const beforeClick = button.getAttribute('aria-expanded');

    /* The tests above open through show(); a click goes through toggle(), which once gave up on a
       trigger with no target yet */
    await userEvent.click(button);
    const menu = document.getElementById(button.getAttribute('aria-controls'));
    await vi.waitFor(() => expect(stateOf(menu)).toBe('open'), WAIT);

    expect([beforeClick, button.getAttribute('aria-expanded')]).toEqual(['false', 'true']);
  });

  it('keeps a templated menu after it closes when asked to', async () => {
    const button = mount(`
      <template id="t"><div class="menu"><button type="button">One</button></div></template>
      <button type="button" data-dropdown data-dropdown-template="#t" data-dropdown-keep>Actions</button>`);

    const menu = await open(dropdown, button);
    dropdown.hide(button);
    await vi.waitFor(() => expect(stateOf(menu)).toBe('closed'), WAIT);
    const again = await open(dropdown, button);

    expect([menu.isConnected, again === menu]).toEqual([true, true]);
  });

  it('moves between items with the arrow keys, jumps by letter, and closes on Escape back to the button', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Menu</button>
      <div id="m" hidden><button type="button">Archive</button><button type="button">Delete</button><button type="button">Duplicate</button></div>`);
    const menu = await open(dropdown, button);
    const focused = () => document.activeElement?.textContent;

    const first = focused();
    await userEvent.keyboard('{ArrowDown}');
    const second = focused();
    await userEvent.keyboard('{End}');
    const last = focused();
    await userEvent.keyboard('{ArrowDown}');
    const wrapped = focused();
    await userEvent.keyboard('d');
    const byLetter = focused();
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(stateOf(menu)).toBe('closed'), WAIT);

    expect([first, second, last, wrapped, byLetter, document.activeElement === button]).toEqual([
      'Archive',
      'Delete',
      'Duplicate',
      'Archive',
      'Delete',
      true,
    ]);
  });

  it('closes the others when one opens, unless one has a group of its own and no capture', async () => {
    const button = mount(`
      <button id="a" type="button" data-dropdown data-dropdown-target="#ma">A</button><div id="ma" hidden><button type="button">1</button></div>
      <button id="b" type="button" data-dropdown data-dropdown-target="#mb">B</button><div id="mb" hidden><button type="button">2</button></div>
      <button id="c" type="button" data-dropdown data-dropdown-target="#mc" data-dropdown-group="" data-dropdown-capture="false">C</button><div id="mc" hidden><button type="button">3</button></div>`);
    const [a, b, c] = ['a', 'b', 'c'].map(id => document.getElementById(id));

    await open(dropdown, a);
    await open(dropdown, c);
    await open(dropdown, b);
    await vi.waitFor(() => expect(stateOf(document.getElementById('ma'))).toBe('closed'), WAIT);

    expect([
      stateOf(document.getElementById('ma')),
      stateOf(document.getElementById('mb')),
      stateOf(document.getElementById('mc')),
    ]).toEqual(['closed', 'open', 'open']);
    void button;
  });

  it('reports a chosen item with the params and closes, or stays when the item says so', async () => {
    const button = mount(`
      <template id="t"><div class="menu"><button type="button" data-action="cancel">Cancel</button><button type="button" data-action="pin" data-dropdown-stay>Pin</button></div></template>
      <button type="button" data-dropdown data-dropdown-template="#t" data-dropdown-param-id="12">Actions</button>`);
    const chosen = [];
    button.addEventListener('dropdown:select', event =>
      chosen.push([event.detail.item.dataset.action, event.detail.params.id])
    );

    let menu = await open(dropdown, button);
    await userEvent.click(menu.querySelector('[data-action="pin"]'));
    const afterPin = stateOf(menu);
    await userEvent.click(menu.querySelector('[data-action="cancel"]'));
    await vi.waitFor(() => expect(menu.isConnected).toBe(false), WAIT);

    expect({ chosen, afterPin }).toEqual({
      chosen: [
        ['pin', '12'],
        ['cancel', '12'],
      ],
      afterPin: 'open',
    });
  });

  it('opens above when there is no room below, and matches the button’s width when asked', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m" data-dropdown-match-width style="position:fixed;bottom:4px;left:100px;width:240px">Filter bookings by status</button>
      <div id="m" hidden><button type="button">One</button></div>`);

    const menu = await open(dropdown, button);

    expect({
      above: menu.getBoundingClientRect().bottom <= button.getBoundingClientRect().top,
      wide: menu.getBoundingClientRect().width >= 240,
    }).toEqual({ above: true, wide: true });
  });

  it('mounts on every matching element without the framework', () => {
    document.body.innerHTML = `<button data-dropdown data-dropdown-target="#x">1</button><button data-dropdown data-dropdown-target="#x">2</button><div id="x" hidden></div>`;
    const instance = Dropdown.enhanceAll();

    expect([instance instanceof Dropdown, instance.trackedElements().length]).toEqual([true, 2]);
    instance.destroy();
  });
});
