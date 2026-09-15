import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Accordion from '../../../src/components/Accordion.js';
import accordionStyles from '../../../src/styles/framework/components/accordion.scss';

const WAIT = { timeout: 2000 };
const stateOf = element => element.getAttribute('data-accordion-state');

describe('Accordion', () => {
  let style;
  let accordion;
  let shipping;
  let returns;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${accordionStyles}
      :root { --accordion-duration: 120ms; }
      details { padding: 8px; border: 1px solid; }
      details p { height: 120px; margin: 0; }`;
    document.head.append(style);
    document.body.innerHTML = `
      <details id="shipping" data-accordion name="faq"><summary>Shipping</summary><p>Two working days.</p></details>
      <details id="returns" data-accordion name="faq"><summary>Returns</summary><p>Within 30 days.</p></details>
    `;
    shipping = document.getElementById('shipping');
    returns = document.getElementById('returns');
    accordion = new Accordion();
    accordion.mount(shipping);
    accordion.mount(returns);
  });

  afterEach(() => {
    accordion.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  const click = element => element.querySelector('summary').click();

  it('animates an item open, then records it as open at its full height', async () => {
    const closedHeight = shipping.getBoundingClientRect().height;

    click(shipping);
    const during = [shipping.open, stateOf(shipping), shipping.getAnimations().length];
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('open'), WAIT);

    expect([during, shipping.getBoundingClientRect().height - closedHeight >= 120]).toEqual([
      [true, 'opening', 1],
      true,
    ]);
  });

  it('keeps an item open until its closing animation ends', async () => {
    click(shipping);
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('open'), WAIT);

    click(shipping);
    const during = [shipping.open, stateOf(shipping)];
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('closed'), WAIT);

    expect([during, shipping.open]).toEqual([[true, 'closing'], false]);
  });

  it('animates the open item with the same name closed when another opens', async () => {
    click(shipping);
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('open'), WAIT);

    click(returns);
    const during = [shipping.open, stateOf(shipping)];
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('closed'), WAIT);

    expect([during, shipping.open, returns.open, shipping.getAttribute('name')]).toEqual([
      [true, 'closing'],
      false,
      true,
      'faq',
    ]);
  });

  it('turns back when its summary is clicked again while it opens', async () => {
    click(shipping);
    click(shipping);

    await vi.waitFor(() => expect(stateOf(shipping)).toBe('closed'), WAIT);

    expect([shipping.open, shipping.getAnimations().length]).toEqual([false, 0]);
  });

  it('opens at once when the animation length is zero', () => {
    shipping.style.setProperty('--accordion-duration', '0s');

    click(shipping);

    expect([shipping.open, stateOf(shipping), shipping.getAnimations().length]).toEqual([
      true,
      'open',
      0,
    ]);
  });
});
