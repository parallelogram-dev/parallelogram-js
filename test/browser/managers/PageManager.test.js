import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';
import { PageManager } from '../../../src/managers/PageManager.js';

const emitNavigation = (bus, html) => {
  let swap;
  bus.emit('router:navigate-success', {
    html,
    url: new URL(location.href),
    trigger: 'link-click',
    waitUntil: promise => {
      swap = promise;
    },
  });
  return swap;
};

const page = (head, main = 'Pricing') =>
  `<!doctype html><html><head><title>Pricing</title>${head}</head><body><main data-view="main">${main}</main></body></html>`;

describe('PageManager in the browser', () => {
  let bus;
  let manager;

  beforeEach(() => {
    document.body.innerHTML = '<main id="app" data-view="main">Home</main>';
    bus = new EventManager();
  });

  afterEach(() => {
    manager?.destroy();
    manager = null;
    document.querySelectorAll('[data-test-asset]').forEach(element => element.remove());
    document.body.replaceChildren();
    delete window.__pricingRuns;
    delete window.__skippedRuns;
    delete window.__headRuns;
  });

  const start = (options = {}) => {
    manager = new PageManager({
      containerSelector: '#app',
      registry: [],
      eventBus: bus,
      options: { mountDelay: 0, ...options },
    });
  };

  it('runs the scripts in new content, except ones marked data-router-skip', async () => {
    start();

    await emitNavigation(
      bus,
      page(
        '',
        '<script>window.__pricingRuns = (window.__pricingRuns ?? 0) + 1;</script><script data-router-skip>window.__skippedRuns = 1;</script>'
      )
    );

    expect([window.__pricingRuns, window.__skippedRuns]).toEqual([1, undefined]);
  });

  it('loads stylesheets the new page adds before showing its content', async () => {
    start();

    await emitNavigation(
      bus,
      page(
        '<link rel="stylesheet" data-test-asset href="data:text/css,main%7Bcolor:rgb(1,2,3)%7D">'
      )
    );

    expect(getComputedStyle(document.querySelector('main')).color).toBe('rgb(1, 2, 3)');
  });

  it('runs a head script the new page adds only once across visits', async () => {
    start();
    const withChart = page(
      '<script data-test-asset src="data:text/javascript,window.__headRuns=(window.__headRuns??0)+1"></script>'
    );

    await emitNavigation(bus, withChart);
    await emitNavigation(bus, withChart);

    await vi.waitFor(() => expect(window.__headRuns).toBe(1));
  });

  it('rejects without changing the page when a tracked asset has changed', async () => {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<link rel="stylesheet" data-test-asset data-router-track="reload" href="data:text/css,/*v1*/">'
    );
    start();

    const swap = emitNavigation(
      bus,
      page(
        '<link rel="stylesheet" data-test-asset data-router-track="reload" href="data:text/css,/*v2*/">'
      )
    );

    await expect(swap).rejects.toThrow(/tracked/i);
    expect(document.querySelector('main').textContent).toBe('Home');
  });
});
