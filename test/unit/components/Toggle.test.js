import { afterEach, describe, expect, it } from 'vitest';
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
});
