import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Toggle from '../../../src/components/Toggle.js';
import { EventManager } from '../../../src/managers/EventManager.js';
import toggleStyles from '../../../src/styles/framework/components/toggle.scss';

const WAIT = { timeout: 2000 };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const $ = selector => document.querySelector(selector);
const stateOf = selector => $(selector).getAttribute('data-toggle-state');
const escapeFrom = element => {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
};

describe('Toggle', () => {
  let style;
  let eventBus;
  let toggle;

  const build = html => {
    document.body.insertAdjacentHTML('beforeend', html);
    document.querySelectorAll('[data-toggle]').forEach(trigger => toggle.mount(trigger));
  };

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${toggleStyles}\n:root { --toggle-transition-duration: 60ms; }`;
    document.head.append(style);
    eventBus = new EventManager();
    toggle = new Toggle({ eventBus });
  });

  afterEach(() => {
    toggle.destroy();
    style.remove();
    document.body.replaceChildren();
  });

  it('closes on an outside click only when capture is on', async () => {
    build(`
      <button id="file" data-toggle data-toggle-target="#file-menu" data-toggle-capture>File</button>
      <div id="file-menu"><a href="#new">New</a></div>
      <button id="filters" data-toggle data-toggle-target="#filter-panel">Filters</button>
      <div id="filter-panel"><p>Price</p></div>
      <p id="results">Results</p>`);
    $('#filters').click();
    $('#file').click();

    $('#results').click();

    await vi.waitFor(
      () => expect([stateOf('#file-menu'), stateOf('#filter-panel')]).toEqual(['closed', 'open']),
      WAIT
    );
  });

  it('closes only the other toggles in the same group', async () => {
    build(`
      <button id="q1" data-toggle data-toggle-target="#a1" data-toggle-group="faq">Refunds</button>
      <div id="a1">Within 30 days</div>
      <button id="q2" data-toggle data-toggle-target="#a2" data-toggle-group="faq">Delivery</button>
      <div id="a2">Two working days</div>
      <button id="nav" data-toggle data-toggle-target="#nav-panel">Menu</button>
      <div id="nav-panel">Links</div>`);
    $('#nav').click();
    $('#q1').click();

    $('#q2').click();

    await vi.waitFor(
      () => expect(['#a1', '#a2', '#nav-panel'].map(stateOf)).toEqual(['closed', 'open', 'open']),
      WAIT
    );
  });

  it('lets clicks on the trigger and inside the target reach page listeners', () => {
    build(`
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-capture>Account</button>
      <div id="account-menu"><button id="theme" type="button">Dark mode</button></div>`);
    const reached = [];
    const record = event => reached.push(event.target.id);
    document.addEventListener('click', record);

    $('#account').click();
    $('#theme').click();
    document.removeEventListener('click', record);

    expect(reached).toEqual(['account', 'theme']);
  });

  it('returns focus to the trigger when Escape closes the toggle holding focus', async () => {
    build(`
      <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu"><a id="about" href="#about">About</a></nav>`);
    $('#menu-button').click();
    $('#about').focus();

    escapeFrom($('#about'));

    await vi.waitFor(
      () =>
        expect([stateOf('#site-menu'), document.activeElement.id]).toEqual([
          'closed',
          'menu-button',
        ]),
      WAIT
    );
  });

  it('leaves a toggle open when Escape was meant for something else', async () => {
    build(`
      <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu"><a id="about" href="#about">About</a></nav>
      <input id="search" type="search">`);
    $('#menu-button').click();
    $('#search').focus();
    escapeFrom($('#search'));
    $('#about').focus();
    $('#about').addEventListener('keydown', event => event.preventDefault());
    escapeFrom($('#about'));

    await pause(200);

    expect(stateOf('#site-menu')).toBe('open');
  });

  it('closes the last opened toggle with Escape when a click left focus outside it, as in Safari', async () => {
    build(`
      <main id="page" tabindex="-1">
        <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
        <nav id="site-menu"><a href="#about">About</a></nav>
      </main>`);
    $('#menu-button').click();
    $('#page').focus();
    await vi.waitFor(() => expect(stateOf('#site-menu')).toBe('open'), WAIT);

    escapeFrom($('#page'));

    await vi.waitFor(() => expect(stateOf('#site-menu')).toBe('closed'), WAIT);
  });

  it('closes a capture toggle when focus moves outside it', async () => {
    build(`
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-capture>Account</button>
      <div id="account-menu"><a id="profile" href="#profile">Profile</a></div>
      <button id="help" type="button">Help</button>`);
    $('#account').click();
    $('#profile').focus();

    $('#help').focus();

    await vi.waitFor(() => expect(stateOf('#account-menu')).toBe('closed'), WAIT);
  });

  it('points aria-controls at the target id, giving the target one if needed', () => {
    build(`
      <button id="filters" data-toggle data-toggle-target=".filter-panel">Filters</button>
      <div class="filter-panel">Price</div>`);

    const panel = $('.filter-panel');
    expect([panel.id !== '', $('#filters').getAttribute('aria-controls')]).toEqual([
      true,
      panel.id,
    ]);
  });

  it('finishes opening when its animation ends', async () => {
    build(`
      <button id="filters" data-toggle data-toggle-target="#filter-panel">Filters</button>
      <div id="filter-panel">Price</div>`);

    $('#filters').click();

    await vi.waitFor(() => expect(stateOf('#filter-panel')).toBe('open'), { timeout: 500 });
  });

  it('drops an unfinished transition when toggled again', async () => {
    build(`
      <button id="filters" data-toggle data-toggle-target="#filter-panel">Filters</button>
      <div id="filter-panel">Price</div>`);
    const panel = $('#filter-panel');
    const records = [];
    const observer = new MutationObserver(list => records.push(...list));
    observer.observe(panel, {
      attributes: true,
      attributeFilter: ['data-toggle-state'],
      attributeOldValue: true,
    });

    $('#filters').click();
    $('#filters').click();
    await pause(1000);
    records.push(...observer.takeRecords());
    observer.disconnect();

    const values = [...records.slice(1).map(record => record.oldValue), stateOf('#filter-panel')];
    expect(values).toEqual(['opening', 'closing', 'closed']);
  });

  it('reports each change to the event bus once', () => {
    build(`
      <button id="filters" data-toggle data-toggle-target="#filter-panel">Filters</button>
      <div id="filter-panel">Price</div>`);
    const shows = [];
    eventBus.on('toggle:show', payload => shows.push(payload));

    $('#filters').click();

    expect(shows).toHaveLength(1);
  });

  it('closes a navigation panel when one of its page links is followed', async () => {
    build(`
      <button id="menu-button" data-toggle data-toggle-target="#site-menu">Menu</button>
      <nav id="site-menu"><a id="faq" href="#faq">FAQ</a><a id="pricing" href="/pricing">Pricing</a></nav>`);
    $('#site-menu').addEventListener('click', event => event.preventDefault());
    $('#menu-button').click();
    $('#faq').click();
    await pause(150);
    const afterAnchor = stateOf('#site-menu');

    $('#pricing').click();

    await vi.waitFor(
      () => expect([afterAnchor, stateOf('#site-menu')]).toEqual(['open', 'closed']),
      WAIT
    );
  });

  it('stops closing on outside clicks once unmounted', async () => {
    build(`
      <button id="account" data-toggle data-toggle-target="#account-menu" data-toggle-capture>Account</button>
      <div id="account-menu">Profile</div>
      <p id="results">Results</p>`);
    $('#account').click();
    await vi.waitFor(() => expect(stateOf('#account-menu')).toBe('open'), WAIT);

    toggle.unmount($('#account'));
    $('#results').click();
    await pause(150);

    expect(stateOf('#account-menu')).toBe('open');
  });
});
