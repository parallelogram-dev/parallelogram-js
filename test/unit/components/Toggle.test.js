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
    const state = mountToggle({ capture: '', multiple: '' });

    expect(state).toMatchObject({ capture: true, multiple: true });
  });
});
