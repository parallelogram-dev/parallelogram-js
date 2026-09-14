import { afterEach, describe, expect, it } from 'vitest';
import Tabs from '../../../src/components/Tabs.js';

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
