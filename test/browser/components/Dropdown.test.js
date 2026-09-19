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
    /* Dropdown reads the last input method, and a click in one test would otherwise still be
       the last input method in the next */
    document.documentElement.removeAttribute('data-focus-source');
    dropdown = new Dropdown();
  });

  afterEach(() => {
    dropdown.destroy();
    style.remove();
    document.documentElement.removeAttribute('data-focus-source');
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

  it('leaves focus on the button when a click opened the menu, and takes an arrow key in', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Menu</button>
      <div id="m" hidden><button type="button">Archive</button><button type="button">Delete</button></div>`);

    await userEvent.click(button);
    const menu = document.getElementById('m');
    await vi.waitFor(() => expect(stateOf(menu)).toBe('open'), WAIT);
    const insideAfterClick = menu.contains(document.activeElement);

    /* Safari does not focus a button when it is clicked, so the trigger is given focus here
       rather than assumed to have it; a visitor there reaches it with the keyboard */
    button.focus();
    await userEvent.keyboard('{ArrowDown}');

    expect({ insideAfterClick, focused: document.activeElement?.textContent }).toEqual({
      insideAfterClick: false,
      focused: 'Archive',
    });
  });

  it('focuses the first item when the keyboard opened the menu', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Menu</button>
      <div id="m" hidden><button type="button">Archive</button><button type="button">Delete</button></div>`);
    const menu = document.getElementById('m');

    button.focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(stateOf(menu)).toBe('open'), WAIT);
    const afterEnter = document.activeElement?.textContent;

    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(stateOf(menu)).toBe('closed'), WAIT);
    await userEvent.keyboard('{ArrowUp}');
    await vi.waitFor(() => expect(stateOf(menu)).toBe('open'), WAIT);

    expect({ afterEnter, afterArrowUp: document.activeElement?.textContent }).toEqual({
      afterEnter: 'Archive',
      afterArrowUp: 'Delete',
    });
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

  it('lets a row disable or drop items: a boolean attribute from a param, or names on the button', async () => {
    const button = mount(`
      <template id="t"><div class="menu">
        <a href="/x" data-dropdown-item="edit">Edit</a>
        <button type="button" data-dropdown-item="cancel" disabled="{locked}">Cancel</button>
        <button type="button" data-dropdown-item="export">Export</button>
        <button type="button" data-dropdown-item="archive" hidden="{done}">Archive</button>
      </div></template>
      <button id="a" type="button" data-dropdown data-dropdown-template="#t" data-dropdown-param-locked="true">A</button>
      <button id="b" type="button" data-dropdown data-dropdown-template="#t" data-dropdown-param-done="false" data-dropdown-disabled="export" data-dropdown-hidden="edit, archive">B</button>`);
    const describe = menu =>
      [...menu.querySelectorAll('[data-dropdown-item]')].map(
        item => `${item.dataset.dropdownItem}${item.disabled ? ':disabled' : ''}`
      );

    const a = await open(dropdown, button);
    const rowA = describe(a);
    dropdown.hide(button);
    const b = await open(dropdown, document.getElementById('b'));

    /* A: locked=true keeps disabled, done unset drops hidden. B: done=false drops hidden;
       the button names export to disable and edit and archive to drop */
    expect({ rowA, rowB: describe(b) }).toEqual({
      rowA: ['edit', 'cancel:disabled', 'export', 'archive'],
      rowB: ['cancel', 'export:disabled'],
    });
  });

  it('takes params from one attribute too, as JSON or as key:value pairs, with a named param winning', async () => {
    const button = mount(`
      <template id="t"><div class="menu"><a href="/b/{id}">{name} ({kind})</a></div></template>
      <button id="j" type="button" data-dropdown data-dropdown-template="#t" data-dropdown-params='{"id": 7, "name": "Ada", "kind": "json"}'>J</button>
      <button id="l" type="button" data-dropdown data-dropdown-template="#t" data-dropdown-params="{id: 8, name: Grace, kind: loose}" data-dropdown-param-name="Grace H.">L</button>`);
    const line = menu =>
      `${menu.querySelector('a').getAttribute('href')} ${menu.querySelector('a').textContent}`;

    const j = await open(dropdown, button);
    const fromJson = line(j);
    dropdown.hide(button);
    const l = await open(dropdown, document.getElementById('l'));

    expect([fromJson, line(l)]).toEqual(['/b/7 Ada (json)', '/b/8 Grace H. (loose)']);
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

  it('lays a disabled item out as a row like the others, and the arrows pass over it', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Actions</button>
      <div id="m" hidden><a href="#e">Edit</a><button type="button" disabled>Cancel</button><a href="#s" aria-disabled="true">Share</a></div>`);
    const look = item => [
      item.getAttribute('role'),
      getComputedStyle(item).display,
      getComputedStyle(item).textAlign,
    ];

    const menu = await open(dropdown, button);
    const [edit, cancel, share] = menu.children;
    await userEvent.keyboard('{ArrowDown}');

    /* A disabled button and a link marked disabled both get the menu's role and its row, and
       the arrow keys go from Edit back round to Edit, the only item that can be chosen */
    expect({ cancel: look(cancel), share: look(share), focused: document.activeElement }).toEqual({
      cancel: look(edit),
      share: look(edit),
      focused: edit,
    });
  });

  it('stays open when a disabled item is pressed, and chooses nothing', async () => {
    const button = mount(`<div tabindex="-1">
      <button type="button" data-dropdown data-dropdown-target="#m">Actions</button>
      <div id="m" hidden><a href="#e">Edit</a><button type="button" disabled>Cancel</button><a href="#s" aria-disabled="true">Share</a></div></div>`);
    const chosen = [];
    button.addEventListener('dropdown:select', event => chosen.push(event.detail.item.textContent));
    const menu = await open(dropdown, button);
    const { hash } = location;

    await userEvent.click(menu.querySelector('button'), { force: true });
    await userEvent.click(menu.querySelector('[aria-disabled]'), { force: true });
    await new Promise(resolve => setTimeout(resolve, 100));

    /* The menu sits inside something focusable, as it does under a page's <main>: a press on a
       disabled item must not hand focus to that, and the disabled link must not be followed */
    expect({ state: stateOf(menu), chosen, followed: location.hash !== hash }).toEqual({
      state: 'open',
      chosen: [],
      followed: false,
    });
  });

  it('draws the menu on the dropdown surface with its items as rows, and marks a checked one', async () => {
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Filter</button>
      <div id="m" hidden><button type="button" role="menuitemcheckbox" aria-checked="true">Confirmed</button><a href="#w"><svg width="20" height="20" viewBox="0 0 24 24"></svg>Waitlisted</a></div>`);

    const menu = await open(dropdown, button);
    const [checked, link] = menu.querySelectorAll('[role^="menuitem"]');
    const style = getComputedStyle(link);

    /* The page's markup is a plain button and a plain link; the stylesheet makes them rows of
       one menu rather than a button beside a link */
    expect({
      surface: [getComputedStyle(menu).borderTopWidth, getComputedStyle(menu).boxShadow !== 'none'],
      row: [
        style.display,
        style.textAlign,
        style.textDecorationLine,
        Math.round(link.getBoundingClientRect().width) ===
          Math.round(checked.getBoundingClientRect().width),
      ],
      checked: getComputedStyle(checked, '::before').width !== 'auto',
      icon: getComputedStyle(menu.querySelector('svg')).flexShrink,
    }).toEqual({
      surface: ['1px', true],
      row: ['flex', 'left', 'none', true],
      checked: true,
      icon: '0',
    });
  });

  it('shows no focus ring on an item when the pointer opened the menu', async () => {
    /* Only this component's own stylesheet, as a page loading stylesheets per component has.
       The rule lived in the combined stylesheet alone, so such a page never got it */
    document.documentElement.dataset.focusSource = 'pointer';
    const button = mount(`
      <button type="button" data-dropdown data-dropdown-target="#m">Account</button>
      <div id="m" hidden><a href="#p">Profile</a><button type="button">Sign out</button></div>`);

    const menu = await open(dropdown, button);
    const ringOnFocused = () => getComputedStyle(menu.querySelector(':focus')).outlineStyle;
    const byPointer = [...menu.children].map(item => {
      item.focus();
      return getComputedStyle(item).outlineStyle;
    });

    /* A real key press, rather than a programmatic focus, because whether that counts as
       :focus-visible is the browser's own judgement and differs between them */
    document.documentElement.dataset.focusSource = 'keyboard';
    await userEvent.keyboard('{ArrowDown}');
    const byKeyboard = ringOnFocused();
    document.documentElement.removeAttribute('data-focus-source');

    /* trackFocusSource() marks the page when the last input was a pointer; the menu is not
       inside its trigger, so the rule that hides rings has to name the menu too. A keyboard
       user still has to see where they are */
    expect({ byPointer, byKeyboard }).toEqual({
      byPointer: ['none', 'none'],
      byKeyboard: 'solid',
    });
  });

  it('mounts on every matching element without the framework', () => {
    document.body.innerHTML = `<button data-dropdown data-dropdown-target="#x">1</button><button data-dropdown data-dropdown-target="#x">2</button><div id="x" hidden></div>`;
    const instance = Dropdown.enhanceAll();

    expect([instance instanceof Dropdown, instance.trackedElements().length]).toEqual([true, 2]);
    instance.destroy();
  });
});
