import { afterEach, describe, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import Accordion from '../../../src/components/Accordion.js';
import Tabs from '../../../src/components/Tabs.js';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const rootValue = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const surfaceColours = () => {
  const probe = document.createElement('div');
  probe.style.background = 'var(--surface-panel-color-bg)';
  probe.style.color = 'var(--color-surface)';
  document.body.append(probe);
  const { backgroundColor, color } = getComputedStyle(probe);
  probe.remove();
  return { role: color, surface: backgroundColor };
};

describe('dark theme', () => {
  const cleanups = [];

  afterEach(async () => {
    cleanups.splice(0).forEach(cleanup => cleanup());
    delete document.documentElement.dataset.theme;
    await commands.emulateColorScheme('light');
  });

  const addFrameworkStyles = () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    cleanups.push(() => style.remove());
  };

  it('uses the light surface by default', () => {
    addFrameworkStyles();

    expect(surfaceColours()).toEqual({
      role: 'rgb(255, 255, 255)',
      surface: 'rgb(255, 255, 255)',
    });
  });

  it('switches the surface role and the surfaces that read it when data-theme is dark', () => {
    addFrameworkStyles();
    document.documentElement.dataset.theme = 'dark';

    expect([rootValue('--color-surface'), surfaceColours()]).toEqual([
      '#171d26',
      { role: 'rgb(23, 29, 38)', surface: 'rgb(23, 29, 38)' },
    ]);
  });

  it('follows a dark colour scheme preference', async () => {
    addFrameworkStyles();
    await commands.emulateColorScheme('dark');

    expect(surfaceColours()).toEqual({
      role: 'rgb(23, 29, 38)',
      surface: 'rgb(23, 29, 38)',
    });
  });

  it('keeps light values when data-theme is light under a dark preference', async () => {
    addFrameworkStyles();
    await commands.emulateColorScheme('dark');
    document.documentElement.dataset.theme = 'light';

    expect(surfaceColours()).toEqual({
      role: 'rgb(255, 255, 255)',
      surface: 'rgb(255, 255, 255)',
    });
  });

  it('leaves text to the page in light mode and gives panels a text colour in dark mode', () => {
    addFrameworkStyles();
    document.body.style.color = 'rgb(20, 40, 60)';
    cleanups.push(() => {
      document.body.style.color = '';
    });
    const panel = document.createElement('div');
    panel.style.color = 'var(--surface-panel-color-text)';
    document.body.append(panel);
    cleanups.push(() => panel.remove());
    const light = getComputedStyle(panel).color;
    document.documentElement.dataset.theme = 'dark';

    expect([light, getComputedStyle(panel).color]).toEqual([
      'rgb(20, 40, 60)',
      'rgb(228, 232, 238)',
    ]);
  });

  it('tells the browser which colour scheme the page is in, so its own text and controls follow', () => {
    addFrameworkStyles();
    const light = getComputedStyle(document.documentElement).colorScheme;
    document.documentElement.dataset.theme = 'dark';

    expect([light, getComputedStyle(document.documentElement).colorScheme]).toEqual([
      'light',
      'dark',
    ]);
  });

  it('draws an open accordion item and the selected tab with the dark roles when data-theme is dark', async () => {
    addFrameworkStyles();
    document.documentElement.dataset.theme = 'dark';
    const container = document.createElement('div');
    container.innerHTML = `
      <details data-accordion><summary>Shipping</summary><div>Two working days.</div></details>
      <div data-tabs>
        <div data-tabs-list>
          <button data-tab="panel-shipping">Shipping</button>
          <button data-tab="panel-returns">Returns</button>
        </div>
        <div data-tabs-panels>
          <div id="panel-shipping" data-tab-panel>Orders ship in two days.</div>
          <div id="panel-returns" data-tab-panel>Return within 30 days.</div>
        </div>
      </div>`;
    document.body.append(container);
    const item = container.querySelector('[data-accordion]');
    const accordion = new Accordion();
    const tabs = new Tabs();
    cleanups.push(() => {
      accordion.destroy();
      tabs.destroy();
      container.remove();
    });
    accordion.mount(item);
    tabs.mount(container.querySelector('[data-tabs]'));

    /* The item's content only shows once it has opened, and the tab takes its colours once chosen */
    accordion.show(item);
    await vi.waitFor(() => expect(item.dataset.accordionState).toBe('open'), { timeout: 2000 });
    const [shipping, returns] = container.querySelectorAll('[data-tab]');
    returns.click();
    await vi.waitFor(() => expect(returns.getAttribute('aria-selected')).toBe('true'));

    const colours = () => [
      getComputedStyle(item).borderBottomColor,
      getComputedStyle(container.querySelector('[data-tabs-list]')).borderBottomColor,
      getComputedStyle(shipping).color,
      getComputedStyle(returns).color,
      getComputedStyle(returns).borderBottomColor,
    ];

    /* The colours are transitioned, so reading them straight after the click catches a tab part
       way between its two states, or still at the one it is leaving */
    await Promise.all(
      [shipping, returns].flatMap(tab =>
        tab.getAnimations().map(animation => animation.finished.catch(() => {}))
      )
    );

    await vi.waitFor(
      () =>
        expect(colours()).toEqual([
          'rgba(255, 255, 255, 0.14)',
          'rgba(255, 255, 255, 0.14)',
          'rgba(255, 255, 255, 0.6)',
          'rgb(147, 197, 253)',
          'rgb(147, 197, 253)',
        ]),
      { timeout: 5000 }
    );
  });
});
