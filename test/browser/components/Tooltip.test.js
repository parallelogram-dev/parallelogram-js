import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tooltip from '../../../src/components/Tooltip.js';
import tooltipStyles from '../../../src/styles/framework/components/tooltip.scss';

const WAIT = { timeout: 2000 };
const tipFor = button => document.getElementById(button.getAttribute('aria-describedby'));
const shown = button =>
  button.getAttribute('data-tooltip-state') === 'open' &&
  tipFor(button) !== null &&
  getComputedStyle(tipFor(button)).opacity === '1';

describe('Tooltip', () => {
  let style;
  let tooltip;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = tooltipStyles;
    document.head.append(style);
    tooltip = new Tooltip();
  });

  afterEach(() => {
    tooltip.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  const mount = (attributes = {}, text = 'Copies the booking reference') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    button.setAttribute('data-tooltip', text);
    for (const [name, value] of Object.entries(attributes)) button.setAttribute(name, value);
    button.style.cssText = 'position: fixed; top: 200px; left: 300px;';
    document.body.append(button);
    tooltip.mount(button);
    return button;
  };

  it('shows the text under the pointer after the delay, described by it, and goes when the pointer leaves', async () => {
    const button = mount({ 'data-tooltip-delay': '10' });
    const before = button.getAttribute('data-tooltip-state');

    await userEvent.hover(button);
    await vi.waitFor(() => expect(shown(button)).toBe(true), WAIT);
    const tip = tipFor(button);
    const during = [tip.getAttribute('role'), tip.textContent.trim(), tip.dataset.tooltipPlacement];

    await userEvent.unhover(button);
    await vi.waitFor(() => expect(button.getAttribute('data-tooltip-state')).toBe('closed'), WAIT);
    await vi.waitFor(() => expect(tip.hidden).toBe(true), WAIT);

    expect({ before, during }).toEqual({
      before: 'closed',
      during: ['tooltip', 'Copies the booking reference', 'top'],
    });
  });

  it('shows at once on keyboard focus and goes on Escape', async () => {
    const button = mount({ 'data-tooltip-delay': '5000' });

    /* A runner's window often has no focus of its own, and Firefox then moves focus without
       dispatching the event, so the tooltip would never hear it. The event is sent on its own
       rather than through focus(), which would also raise focusin and let a listener on the
       wrong event pass this */
    button.dispatchEvent(new FocusEvent('focus'));
    await vi.waitFor(() => expect(shown(button)).toBe(true), { timeout: 500 });
    await userEvent.keyboard('{Escape}');

    await vi.waitFor(() => expect(button.getAttribute('data-tooltip-state')).toBe('closed'), WAIT);
  });

  it('takes the side it is asked for, and the opposite side when there is no room', async () => {
    const asked = mount({ 'data-tooltip-placement': 'bottom', 'data-tooltip-delay': '0' });
    const cornered = mount(
      { 'data-tooltip-placement': 'top', 'data-tooltip-delay': '0' },
      'No room above'
    );
    cornered.style.top = '4px';

    tooltip.show(asked);
    await vi.waitFor(() => expect(shown(asked)).toBe(true), WAIT);
    const askedRect = tipFor(asked).getBoundingClientRect();
    const askedSide = tipFor(asked).dataset.tooltipPlacement;
    tooltip.show(cornered);
    await vi.waitFor(() => expect(shown(cornered)).toBe(true), WAIT);
    const corneredRect = tipFor(cornered).getBoundingClientRect();

    expect({
      askedSide,
      askedBelow: askedRect.top >= asked.getBoundingClientRect().bottom,
      flipped: tipFor(cornered).dataset.tooltipPlacement,
      flippedBelow: corneredRect.top >= cornered.getBoundingClientRect().bottom,
    }).toEqual({ askedSide: 'bottom', askedBelow: true, flipped: 'bottom', flippedBelow: true });
  });

  it('draws the triangle unless asked not to, and fades and moves in unless motion is reduced', async () => {
    const withArrow = mount({ 'data-tooltip-delay': '0' });
    const without = mount({ 'data-tooltip-delay': '0', 'data-tooltip-arrow': 'false' }, 'Plain');

    tooltip.show(withArrow);
    await vi.waitFor(() => expect(shown(withArrow)).toBe(true), WAIT);
    const arrowed = getComputedStyle(tipFor(withArrow), '::before').content !== 'none';
    const eased = getComputedStyle(tipFor(withArrow)).transitionProperty;
    tooltip.show(without);
    await vi.waitFor(() => expect(shown(without)).toBe(true), WAIT);
    const plain = getComputedStyle(tipFor(without), '::before').content === 'none';

    expect({ arrowed, plain, eased }).toEqual({
      arrowed: true,
      plain: true,
      eased: expect.stringMatching(/opacity.*transform|transform.*opacity/),
    });
  });

  it('shows the content of a target element when the text is empty', async () => {
    const source = document.createElement('div');
    source.id = 'shortcut-tip';
    source.hidden = true;
    source.innerHTML = 'Saves the draft. <kbd>⌘</kbd><kbd>S</kbd>';
    document.body.append(source);
    const button = mount({ 'data-tooltip-target': '#shortcut-tip', 'data-tooltip-delay': '0' }, '');

    tooltip.show(button);
    await vi.waitFor(() => expect(shown(button)).toBe(true), WAIT);

    expect([
      tipFor(button).textContent.trim(),
      tipFor(button).querySelectorAll('kbd').length,
    ]).toEqual(['Saves the draft. ⌘S', 2]);
  });

  it('removes its tooltip and the description when unmounted', async () => {
    const button = mount({ 'data-tooltip-delay': '0' });
    tooltip.show(button);
    await vi.waitFor(() => expect(shown(button)).toBe(true), WAIT);
    const tip = tipFor(button);

    tooltip.unmount(button);

    expect([
      tip.isConnected,
      button.hasAttribute('aria-describedby'),
      button.hasAttribute('data-tooltip-state'),
    ]).toEqual([false, false, false]);
  });

  it('mounts on every matching element without the framework', () => {
    document.body.innerHTML = `<button data-tooltip="One">1</button><button data-tooltip="Two">2</button>`;
    const instance = Tooltip.enhanceAll();

    expect([instance instanceof Tooltip, instance.trackedElements().length]).toEqual([true, 2]);
    instance.destroy();
  });
});
