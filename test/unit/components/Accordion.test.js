import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Accordion from '../../../src/components/Accordion.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const stateOf = element => element.getAttribute('data-accordion-state');

describe('Accordion', () => {
  let accordion;
  let eventBus;
  let shipping;
  let returns;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.body.innerHTML = `
      <details id="shipping" data-accordion name="faq"><summary>Shipping</summary><p>Two days.</p></details>
      <details id="returns" data-accordion name="faq" open><summary>Returns</summary><p>30 days.</p></details>
    `;
    shipping = document.getElementById('shipping');
    returns = document.getElementById('returns');
    eventBus = new EventManager();
    accordion = new Accordion({ eventBus });
    accordion.mount(shipping);
    accordion.mount(returns);
  });

  afterEach(() => {
    accordion.destroy();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('records whether each item starts open or closed', () => {
    expect([stateOf(shipping), stateOf(returns)]).toEqual(['closed', 'open']);
  });

  it('opens an item from its summary and closes the other item with the same name', () => {
    shipping.querySelector('summary').click();

    expect([shipping.open, returns.open, stateOf(shipping), stateOf(returns)]).toEqual([
      true,
      false,
      'open',
      'closed',
    ]);
  });

  it('leaves an item alone when a page listener cancels the summary click', () => {
    document.addEventListener('click', event => event.preventDefault(), {
      capture: true,
      once: true,
    });

    shipping.querySelector('summary').click();

    expect([shipping.open, stateOf(shipping)]).toEqual([false, 'closed']);
  });

  it('records and reports an item opened another way, such as by a script', async () => {
    const shown = [];
    eventBus.on('accordion:show', ({ element }) => shown.push(element.id));

    shipping.open = true;
    await vi.waitFor(() => expect(stateOf(shipping)).toBe('open'));

    expect(shown).toEqual(['shipping']);
  });

  it('reports an item opened from its summary once', async () => {
    const shown = [];
    eventBus.on('accordion:show', ({ element }) => shown.push(element.id));

    shipping.querySelector('summary').click();
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(shown).toEqual(['shipping']);
  });

  it('removes its state attribute when unmounted', () => {
    accordion.unmount(shipping);

    expect(shipping.hasAttribute('data-accordion-state')).toBe(false);
  });

  it('leaves an element that is not a details element untouched', () => {
    const panel = document.createElement('div');
    panel.setAttribute('data-accordion', '');
    document.body.append(panel);

    accordion.mount(panel);

    expect(panel.hasAttribute('data-accordion-state')).toBe(false);
  });
});
