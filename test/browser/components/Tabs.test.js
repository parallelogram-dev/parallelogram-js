import { afterEach, describe, expect, it } from 'vitest';
import Tabs from '../../../src/components/Tabs.js';
import { EventManager } from '../../../src/managers/EventManager.js';
import tabsStyles from '../../../src/styles/framework/components/tabs.scss';

const MARKUP = `
  <div data-tabs>
    <div data-tabs-list>
      <button data-tab="panel-shipping">Shipping</button>
      <button data-tab="panel-returns">Returns</button>
      <a href="#panel-contact" data-tab="panel-contact">Contact</a>
    </div>
    <div data-tabs-panels>
      <div id="panel-shipping" data-tab-panel>Orders ship in two days.</div>
      <div id="panel-returns" data-tab-panel>Return within 30 days.</div>
      <div id="panel-contact" data-tab-panel><a href="#email">Email us</a></div>
    </div>
  </div>
`;

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const shownPanels = container =>
  [...container.querySelectorAll('[data-tab-panel]')]
    .filter(panel => getComputedStyle(panel).display !== 'none')
    .map(panel => panel.id);

const renderTabs = (attributes = {}) => {
  const container = document.createElement('div');
  container.setAttribute('data-tabs', '');
  for (const [name, value] of Object.entries(attributes)) container.setAttribute(name, value);
  container.innerHTML = `
    <div data-tabs-list>
      <button data-tab="panel-shipping">Shipping</button>
      <button data-tab="panel-returns">Returns</button>
      <button data-tab="panel-contact">Contact</button>
    </div>
    <div data-tabs-panels>
      <div id="panel-shipping" data-tab-panel>Orders ship in two days.</div>
      <div id="panel-returns" data-tab-panel>Return within 30 days.</div>
      <div id="panel-contact" data-tab-panel><a href="#email">Email us</a></div>
    </div>
  `;
  document.body.append(container);
  new Tabs().mount(container);
  return [...container.querySelectorAll('[data-tab]')];
};

const press = key =>
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

const selected = tabs => tabs.find(tab => tab.getAttribute('aria-selected') === 'true');

describe('Tabs', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('leaves focus where it was when it mounts', () => {
    const search = document.createElement('input');
    document.body.append(search);
    search.focus();

    renderTabs({ 'data-tabs-autofocus': 'true' });

    expect(document.activeElement).toBe(search);
  });

  it('moves focus and selection together with the arrow, Home and End keys', () => {
    const [shipping, returns, contact] = renderTabs();
    shipping.focus();

    press('ArrowRight');
    expect([document.activeElement, selected([shipping, returns, contact])]).toEqual([
      returns,
      returns,
    ]);

    press('ArrowRight');
    expect([document.activeElement, selected([shipping, returns, contact])]).toEqual([
      contact,
      contact,
    ]);

    press('Home');
    expect(document.activeElement).toBe(shipping);

    press('End');
    expect(document.activeElement).toBe(contact);
  });

  it('only moves focus with arrow keys when activation is manual, and selects on Enter', () => {
    const tabs = renderTabs({ 'data-tabs-activation': 'manual' });
    const [shipping, returns] = tabs;
    shipping.focus();

    press('ArrowRight');
    expect([document.activeElement, selected(tabs)]).toEqual([returns, shipping]);

    press('Enter');
    expect(selected(tabs)).toBe(returns);
  });

  it('points each tab at the panel it controls', () => {
    const tabs = renderTabs();

    expect(tabs.map(tab => tab.getAttribute('aria-controls'))).toEqual([
      'panel-shipping',
      'panel-returns',
      'panel-contact',
    ]);
  });

  it('only makes panels focusable when they have no focusable content', () => {
    renderTabs();

    expect(document.getElementById('panel-shipping').getAttribute('tabindex')).toBe('0');
    expect(document.getElementById('panel-contact').hasAttribute('tabindex')).toBe(false);
  });
});

describe('Tabs panels and styles', () => {
  let style;
  let eventBus;
  let tabs;

  const render = () => {
    style = document.createElement('style');
    style.textContent = `${tabsStyles}\n:root { --tabs-transition-duration: 60ms; }`;
    document.head.append(style);
    document.body.insertAdjacentHTML('beforeend', MARKUP);
    return document.querySelector('[data-tabs]');
  };

  const mount = container => {
    eventBus = new EventManager();
    tabs = new Tabs({ eventBus });
    tabs.mount(container);
    return container;
  };

  afterEach(() => {
    tabs?.destroy();
    tabs = null;
    style?.remove();
    document.body.replaceChildren();
  });

  it('shows only the first panel before Tabs has loaded', () => {
    const container = render();

    expect(shownPanels(container)).toEqual(['panel-shipping']);
  });

  it('hides inactive panels with the hidden attribute rather than inline styles', () => {
    const container = mount(render());

    const panels = [...container.querySelectorAll('[data-tab-panel]')];
    expect(panels.map(panel => [panel.hidden, panel.style.display])).toEqual([
      [false, ''],
      [true, ''],
      [true, ''],
    ]);
  });

  it('shows only the last tab chosen when tabs are chosen in quick succession', async () => {
    const container = mount(render());
    const [, returns, contact] = container.querySelectorAll('[data-tab]');

    returns.click();
    contact.click();
    await pause(400);

    expect([
      shownPanels(container),
      document.getElementById('panel-contact').getAttribute('data-tab-panel'),
      contact.getAttribute('aria-selected'),
    ]).toEqual([['panel-contact'], 'active', 'true']);
  });

  it('uses in-page links as tabs without changing the address', () => {
    const container = mount(render());
    const hash = location.hash;

    container.querySelector('a[data-tab]').click();

    expect([location.hash, shownPanels(container)]).toEqual([hash, ['panel-contact']]);
  });

  it("leaves a nested tab set's panels alone when the outer tabs change", () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div data-tabs id="outer">
        <div data-tabs-list>
          <button data-tab="outer-specs">Specs</button>
          <button data-tab="outer-reviews">Reviews</button>
        </div>
        <div data-tabs-panels>
          <div id="outer-specs" data-tab-panel>
            <div data-tabs id="inner">
              <div data-tabs-list>
                <button data-tab="inner-size">Size</button>
                <button data-tab="inner-weight">Weight</button>
              </div>
              <div data-tabs-panels>
                <div id="inner-size" data-tab-panel>42 cm</div>
                <div id="inner-weight" data-tab-panel>3 kg</div>
              </div>
            </div>
          </div>
          <div id="outer-reviews" data-tab-panel>No reviews yet.</div>
        </div>
      </div>`
    );
    const outer = document.getElementById('outer');
    const inner = document.getElementById('inner');
    tabs = new Tabs();
    tabs.mount(outer);
    tabs.mount(inner);

    outer.querySelector('[data-tab="outer-reviews"]').click();
    outer.querySelector('[data-tab="outer-specs"]').click();

    expect([...inner.querySelectorAll('[data-tab-panel]')].map(panel => panel.hidden)).toEqual([
      false,
      true,
    ]);
  });

  it('reports each change to the event bus once', () => {
    const container = mount(render());
    const changes = [];
    eventBus.on('tabs:change', payload => changes.push(payload));

    container.querySelectorAll('[data-tab]')[1].click();

    expect(changes).toHaveLength(1);
  });

  it('puts the markup back as it was when unmounted', () => {
    const container = render();
    const before = container.outerHTML;
    mount(container);
    container.querySelectorAll('[data-tab]')[1].click();

    tabs.unmount(container);

    expect(container.outerHTML).toBe(before);
  });
});
