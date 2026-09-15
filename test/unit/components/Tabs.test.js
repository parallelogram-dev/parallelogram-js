import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Tabs from '../../../src/components/Tabs.js';

const MARKUP = `
  <div data-tabs id="outer">
    <div data-tabs-list>
      <a href="#specs" data-tab="specs">Specs</a>
      <a href="#returns" data-tab="returns">Returns</a>
      <a href="#warranty" data-tab="warranty">Warranty</a>
    </div>
    <div data-tabs-panels>
      <section id="specs" data-tab-panel>
        <div data-tabs id="inner">
          <div data-tabs-list>
            <button data-tab="size">Size</button>
            <button data-tab="weight">Weight</button>
          </div>
          <div data-tabs-panels>
            <div id="size" data-tab-panel>42 cm</div>
            <div id="weight" data-tab-panel><h4 id="weight-limits">Limits</h4></div>
          </div>
        </div>
      </section>
      <section id="returns" data-tab-panel><h3 id="refunds">Refunds</h3></section>
      <section id="warranty" data-tab-panel>Two years.</section>
    </div>
  </div>
`;

const goTo = hash => {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

describe('Tabs deep links', () => {
  let tabs;

  const mount = (hash = '') => {
    history.replaceState(null, '', `${location.pathname}${hash}`);
    document.body.innerHTML = MARKUP;
    tabs = new Tabs();
    const outer = document.getElementById('outer');
    const inner = document.getElementById('inner');
    tabs.mount(outer);
    tabs.mount(inner);
    return { outer, inner };
  };

  beforeEach(() => {
    history.replaceState(null, '', location.pathname);
  });

  afterEach(() => {
    tabs?.destroy();
    tabs = null;
    vi.restoreAllMocks();
    window.scrollTo(0, 0);
    document.body.replaceChildren();
    history.replaceState(null, '', location.pathname);
  });

  it('selects the tab whose panel the address names when it mounts', () => {
    const { outer } = mount('#returns');

    expect(tabs.getActiveTab(outer)).toBe('returns');
  });

  it('selects the linked tab ahead of aria-selected and the default tab', () => {
    history.replaceState(null, '', `${location.pathname}#warranty`);
    document.body.innerHTML = MARKUP;
    const outer = document.getElementById('outer');
    outer.setAttribute('data-tabs-default-tab', 'returns');
    outer.querySelector('[data-tab="specs"]').setAttribute('aria-selected', 'true');
    tabs = new Tabs();
    tabs.mount(outer);

    expect(tabs.getActiveTab(outer)).toBe('warranty');
  });

  it('selects the tab of the panel holding the element the address names', () => {
    const { outer } = mount('#refunds');

    expect(tabs.getActiveTab(outer)).toBe('returns');
  });

  it('selects the outer and inner tabs holding an element inside a nested tab set', () => {
    const { outer, inner } = mount('#weight-limits');

    expect([tabs.getActiveTab(outer), tabs.getActiveTab(inner)]).toEqual(['specs', 'weight']);
  });

  it('selects the tab the address names when the hash changes', () => {
    const { outer } = mount();

    goTo('#warranty');

    expect(tabs.getActiveTab(outer)).toBe('warranty');
  });

  it.each([
    ['has no hash', ''],
    ['names no element', '#nowhere'],
    ['names an element outside the panels', '#outer'],
    ['cannot be decoded', '#%E0%A4%A'],
  ])('keeps the first tab when the address %s', (_case, hash) => {
    const { outer } = mount(hash);

    expect(tabs.getActiveTab(outer)).toBe('specs');
  });

  it('keeps focus where it was when the hash changes', () => {
    mount();
    const search = document.createElement('input');
    document.body.append(search);
    search.focus();

    goTo('#returns');

    expect(document.activeElement).toBe(search);
  });

  it('moves focus to the newly selected tab when the old tab had focus', () => {
    const { outer } = mount();
    outer.querySelector('[data-tab="specs"]').focus();

    goTo('#returns');

    expect(document.activeElement).toBe(outer.querySelector('[data-tab="returns"]'));
  });

  it('scrolls to the element the new hash names after selecting its tab', () => {
    mount();
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    goTo('#refunds');

    expect(scrollIntoView.mock.contexts.map(element => element.id)).toEqual(['refunds']);
  });

  it('scrolls to the linked element when it mounts at the top of the page', () => {
    window.scrollTo(0, 0);
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    mount('#refunds');

    expect(scrollIntoView.mock.contexts.map(element => element.id)).toContain('refunds');
  });

  it('leaves a scroll position the page already has when it mounts', () => {
    window.scrollTo(0, 300);
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

    mount('#refunds');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('stops following the hash once unmounted', () => {
    const { outer } = mount();
    tabs.unmount(outer);

    goTo('#returns');

    expect(outer.querySelector('[data-tab="returns"]').hasAttribute('aria-selected')).toBe(false);
  });
});

describe('Tabs orientation', () => {
  let tabs;

  const mount = (listAttributes = '') => {
    document.body.innerHTML = `
      <div data-tabs id="settings">
        <div data-tabs-list ${listAttributes}>
          <button data-tab="profile">Profile</button>
          <button data-tab="billing">Billing</button>
        </div>
        <div data-tabs-panels>
          <div id="profile" data-tab-panel>Name</div>
          <div id="billing" data-tab-panel>Card</div>
        </div>
      </div>
    `;
    const container = document.getElementById('settings');
    tabs = new Tabs();
    tabs.mount(container);
    return container;
  };

  const pressOnFirstTab = (container, key) => {
    const tab = container.querySelector('[data-tab]');
    tab.focus();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    tab.dispatchEvent(event);
    return event;
  };

  afterEach(() => {
    tabs?.destroy();
    tabs = null;
    document.body.replaceChildren();
  });

  it('marks the tab list horizontal', () => {
    const container = mount();

    expect(container.querySelector('[data-tabs-list]').getAttribute('aria-orientation')).toBe(
      'horizontal'
    );
  });

  it('keeps the orientation the tab list is given', () => {
    const container = mount('aria-orientation="vertical"');

    expect(container.querySelector('[data-tabs-list]').getAttribute('aria-orientation')).toBe(
      'vertical'
    );
  });

  it('leaves the Down arrow to the page when the tabs are horizontal', () => {
    const container = mount();

    const event = pressOnFirstTab(container, 'ArrowDown');

    expect([event.defaultPrevented, tabs.getActiveTab(container)]).toEqual([false, 'profile']);
  });

  it('moves to the next tab with the Down arrow when the tabs are vertical', () => {
    const container = mount('aria-orientation="vertical"');

    pressOnFirstTab(container, 'ArrowDown');

    expect(tabs.getActiveTab(container)).toBe('billing');
  });

  it('removes the orientation it added when unmounted', () => {
    const container = mount();

    tabs.unmount(container);

    expect(container.querySelector('[data-tabs-list]').hasAttribute('aria-orientation')).toBe(
      false
    );
  });
});
