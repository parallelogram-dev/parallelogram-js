import { afterEach, describe, expect, it, vi } from 'vitest';
import Toggle from '../../../src/components/Toggle.js';

const mountToggle = (attributes = {}) => {
  const target = document.createElement('div');
  target.id = 'menu';
  const trigger = document.createElement('button');
  trigger.setAttribute('data-toggle', '');
  trigger.setAttribute('data-toggle-target', '#menu');
  for (const [name, value] of Object.entries(attributes)) {
    trigger.setAttribute(`data-toggle-${name}`, value);
  }
  document.body.append(target, trigger);

  const toggle = new Toggle();
  toggle.mount(trigger);
  return toggle.getState(trigger);
};

describe('Toggle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('can be constructed without options', () => {
    expect(() => new Toggle()).not.toThrow();
  });

  it('turns off options set to "false" in markup', () => {
    const state = mountToggle({ 'close-navigation': 'false', animate: 'false', manual: 'false' });

    expect(state).toMatchObject({ closeOnNavigation: false, animateToggle: false, manual: false });
  });

  it('turns on options written as empty attributes', () => {
    const state = mountToggle({ capture: '', 'close-escape': '' });

    expect(state).toMatchObject({ capture: true, closeOnEscape: true });
  });

  it('keeps the selector of a target that is also a trigger', () => {
    document.body.innerHTML = `
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-animate="false">Account</button>
      <div id="account-menu" data-toggle data-toggle-target="#settings" data-toggle-animate="false">Settings</div>
      <div id="settings"></div>
    `;
    const toggle = new Toggle();
    const trigger = document.querySelector('#account');
    const menu = document.querySelector('#account-menu');
    toggle.mount(trigger);
    toggle.mount(menu);

    toggle.show(trigger);

    expect([
      menu.getAttribute('data-toggle-target'),
      menu.getAttribute('data-toggle-state'),
    ]).toEqual(['#settings', 'open']);
  });

  it('hides a closed target with the hidden attribute and shows it as soon as it starts opening', () => {
    document.body.innerHTML = `
      <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu">Links</nav>
    `;
    const toggle = new Toggle();
    const trigger = document.querySelector('#menu-button');
    const menu = document.querySelector('#site-menu');
    toggle.mount(trigger);
    const hiddenWhileClosed = menu.hidden;

    toggle.show(trigger);

    expect([hiddenWhileClosed, menu.hidden, menu.getAttribute('data-toggle-state')]).toEqual([
      true,
      false,
      'opening',
    ]);
  });

  it('writes target state to data-toggle-state and the deprecated data-toggle-target', () => {
    document.body.innerHTML = `
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-animate="false">Account</button>
      <div id="account-menu">Settings</div>
    `;
    const toggle = new Toggle();
    const trigger = document.querySelector('#account');
    const menu = document.querySelector('#account-menu');
    toggle.mount(trigger);

    toggle.show(trigger);

    expect([
      menu.getAttribute('data-toggle-state'),
      menu.getAttribute('data-toggle-target'),
    ]).toEqual(['open', 'open']);
  });

  it('puts back the markup it changed once its only trigger unmounts', () => {
    document.body.innerHTML = `
      <button id="menu-button" data-toggle data-toggle-target=".site-menu">Menu</button>
      <nav class="site-menu">Links</nav>
    `;
    const before = document.body.innerHTML;
    const toggle = new Toggle();
    const trigger = document.querySelector('#menu-button');
    toggle.mount(trigger);

    toggle.unmount(trigger);

    expect(document.body.innerHTML).toBe(before);
  });

  it('keeps the attributes the markup gave the trigger and target when it unmounts', () => {
    document.body.innerHTML = `
      <button id="menu-button" data-toggle data-toggle-target="#site-menu" aria-controls="site-menu" aria-expanded="false">Menu</button>
      <nav id="site-menu" data-toggle-state="closed" hidden>Links</nav>
    `;
    const before = document.body.innerHTML;
    const toggle = new Toggle();
    const trigger = document.querySelector('#menu-button');
    toggle.mount(trigger);

    toggle.unmount(trigger);

    expect(document.body.innerHTML).toBe(before);
  });

  it('leaves a target set up while another of its triggers is still mounted', () => {
    document.body.innerHTML = `
      <button id="open-menu" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu">Links</nav>
      <button id="close-menu" data-toggle data-toggle-target="#site-menu">Close</button>
    `;
    const toggle = new Toggle();
    const menu = document.querySelector('#site-menu');
    toggle.mount(document.querySelector('#open-menu'));
    toggle.mount(document.querySelector('#close-menu'));

    toggle.unmount(document.querySelector('#open-menu'));

    expect([menu.getAttribute('data-toggle-state'), menu.hidden]).toEqual(['closed', true]);
  });

  it('stops listening to the document once its last trigger unmounts', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    document.body.innerHTML = `
      <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu">Links</nav>
    `;
    const toggle = new Toggle();
    const trigger = document.querySelector('#menu-button');
    toggle.mount(trigger);

    toggle.unmount(trigger);

    expect(
      addEventListener.mock.calls.map(([type, , options]) => [type, options.signal.aborted])
    ).toEqual([
      ['click', true],
      ['keydown', true],
      ['focusout', true],
    ]);
  });

  it('closes on an outside click again when a trigger mounts after the last one unmounted', () => {
    document.body.innerHTML = `
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-capture data-toggle-animate="false">Account</button>
      <div id="account-menu">Profile</div>
      <p id="results">Results</p>
    `;
    const toggle = new Toggle();
    const trigger = document.querySelector('#account');
    toggle.mount(trigger);
    toggle.unmount(trigger);
    toggle.mount(trigger);
    toggle.show(trigger);

    document.querySelector('#results').click();

    expect(document.querySelector('#account-menu').getAttribute('data-toggle-state')).toBe(
      'closed'
    );
  });
});
