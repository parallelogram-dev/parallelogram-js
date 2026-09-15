import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackerNode = name => {
  const node = document.createElement('script');
  node.type = 'application/json';
  node.setAttribute('data-defer-tracker', name);
  node.textContent = '{"id": "G-TEST"}';
  document.body.append(node);
  return node;
};

const armTracker = async () => {
  const { default: DeferTracker, registerTrackerAdapter } =
    await import('../../../src/components/DeferTracker.js');
  const boot = vi.fn();
  registerTrackerAdapter('stats', boot);
  new DeferTracker().mount(trackerNode('stats'));
  return boot;
};

describe('DeferTracker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete document.readyState;
    document.body.replaceChildren();
  });

  it('boots on the first user interaction', async () => {
    const boot = await armTracker();

    window.dispatchEvent(new Event('pointerdown'));

    expect(boot).toHaveBeenCalledOnce();
  });

  it('does not boot on scrolling or pointer movement alone', async () => {
    const boot = await armTracker();

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('mousemove'));

    expect(boot).not.toHaveBeenCalled();
  });

  it('boots on scrolling when a site adds scroll to the interaction events', async () => {
    const { configureDeferTracker } = await import('../../../src/components/DeferTracker.js');
    configureDeferTracker({ events: ['scroll'] });
    const boot = await armTracker();

    window.dispatchEvent(new Event('scroll'));

    expect(boot).toHaveBeenCalledOnce();
  });

  it('does not boot before the idle delay has passed', async () => {
    const boot = await armTracker();

    await vi.advanceTimersByTimeAsync(4999);
    expect(boot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(boot).toHaveBeenCalledOnce();
  });

  it('waits for an idle period after the delay when the browser supports it', async () => {
    const requestIdle = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdle);
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const boot = await armTracker();

    await vi.advanceTimersByTimeAsync(4999);
    expect(requestIdle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(boot).not.toHaveBeenCalled();
    expect(requestIdle).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });

    requestIdle.mock.calls[0][0]();
    expect(boot).toHaveBeenCalledOnce();
  });

  it('starts the idle delay only once the page has finished loading', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    const boot = await armTracker();

    await vi.advanceTimersByTimeAsync(10000);
    expect(boot).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(boot).toHaveBeenCalledOnce();
  });
});

const loadModule = () => import('../../../src/components/DeferTracker.js');

const block = (name, config) => {
  const node = document.createElement('script');
  node.type = 'application/json';
  node.setAttribute('data-defer-tracker', name);
  node.textContent = JSON.stringify(config);
  document.body.append(node);
  return node;
};

const interact = () => window.dispatchEvent(new Event('pointerdown'));
const statusOf = node => node.getAttribute('data-defer-tracker-status');

describe('DeferTracker trackers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    history.replaceState(null, '', '/');
  });

  describe('with a block in the head', () => {
    afterEach(() => {
      document.head.replaceChildren();
    });

    it('warns that a block outside the observed element never loads', async () => {
      const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
      registerTrackerAdapter('ga4', vi.fn());
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
      const stray = block('ga4', { id: 'G-HEAD' });
      document.head.append(stray);
      new DeferTracker({ logger }).mount(block('ga4', { id: 'G-SHOP' }));

      interact();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('<head>'), {
        elements: [stray],
      });
    });
  });

  it('boots a second tracker of the same kind with a different id', async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const boot = vi.fn();
    registerTrackerAdapter('ga4', boot);
    const tracker = new DeferTracker();
    tracker.mount(block('ga4', { id: 'G-SHOP' }));
    tracker.mount(block('ga4', { id: 'G-AGENCY' }));

    interact();

    expect(boot.mock.calls.map(([config]) => config.id)).toEqual(['G-SHOP', 'G-AGENCY']);
  });

  it('marks a second block for the same tracker on the same page as a duplicate', async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const boot = vi.fn();
    registerTrackerAdapter('ga4', boot);
    const tracker = new DeferTracker();
    tracker.mount(block('ga4', { id: 'G-SHOP' }));
    const repeat = block('ga4', { id: 'G-SHOP' });
    tracker.mount(repeat);

    interact();
    await vi.advanceTimersByTimeAsync(0);

    expect([boot.mock.calls.length, statusOf(repeat)]).toEqual([1, 'duplicate']);
  });

  describe('with a second, different block for a tracker on the page', () => {
    afterEach(() => {
      window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = false;
      delete window.gtag;
      delete window.dataLayer;
      document.head.replaceChildren();
    });

    it('sends a Google Ads conversion beside a remarketing block with the same id', async () => {
      window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
      const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
      const { default: googleAds } = await import('../../../src/adapters/google-ads.js');
      registerTrackerAdapter('google-ads', googleAds);
      const tracker = new DeferTracker();
      tracker.mount(block('google-ads', { id: 'AW-1' }));
      const confirmation = block('google-ads', { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } });
      tracker.mount(confirmation);

      interact();
      await vi.advanceTimersByTimeAsync(0);

      const conversions = window.dataLayer.filter(entry => entry[1] === 'conversion');
      expect([conversions.length, statusOf(confirmation)]).toEqual([1, 'booted']);
    });
  });

  it('marks a repeated block as a duplicate even when the adapter handles second blocks', async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const boot = vi.fn();
    boot.block = vi.fn();
    registerTrackerAdapter('google-ads', boot);
    const tracker = new DeferTracker();
    tracker.mount(block('google-ads', { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } }));
    const repeat = block('google-ads', { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } });
    tracker.mount(repeat);

    interact();

    expect([boot.block.mock.calls.length, statusOf(repeat)]).toEqual([0, 'duplicate']);
  });

  it('marks a different block for the same tracker as a duplicate without recording another page view', async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const boot = vi.fn();
    boot.page = vi.fn();
    registerTrackerAdapter('pinterest-tag', boot);
    const tracker = new DeferTracker();
    tracker.mount(block('pinterest-tag', { id: '26123' }));
    const second = block('pinterest-tag', { id: '26123', em: 'hashed' });
    tracker.mount(second);

    interact();

    expect([boot.mock.calls.length, boot.page.mock.calls.length, statusOf(second)]).toEqual([
      1,
      0,
      'duplicate',
    ]);
  });

  it("runs the adapter's page step when the router shows a new page", async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const { EventManager } = await import('../../../src/managers/EventManager.js');
    const eventBus = new EventManager();
    const boot = vi.fn();
    boot.page = vi.fn();
    registerTrackerAdapter('meta-pixel', boot);
    new DeferTracker({ eventBus }).mount(block('meta-pixel', { id: '123' }));
    interact();
    await vi.advanceTimersByTimeAsync(0);

    history.pushState(null, '', '/menu');
    eventBus.emit('router:navigate-end', { url: '/menu', status: 'success' });

    expect([boot.mock.calls.length, boot.page.mock.calls]).toEqual([
      1,
      [[{ id: '123' }, expect.any(Object), { url: location.href, mounted: false }]],
    ]);
  });

  it('runs the page step for a block that mounts on a later page instead of ignoring it', async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    const boot = vi.fn();
    boot.page = vi.fn();
    registerTrackerAdapter('google-ads', boot);
    const tracker = new DeferTracker();
    tracker.mount(block('google-ads', { id: 'AW-1' }));
    interact();
    await vi.advanceTimersByTimeAsync(0);

    history.pushState(null, '', '/confirmation');
    tracker.mount(block('google-ads', { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } }));
    await vi.advanceTimersByTimeAsync(0);

    expect([boot.mock.calls.length, boot.page.mock.calls]).toEqual([
      1,
      [
        [
          { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } },
          expect.any(Object),
          { url: location.href, mounted: true },
        ],
      ],
    ]);
  });

  describe('through router navigations', () => {
    let pages;

    afterEach(() => {
      pages?.destroy();
      pages = null;
    });

    const adsBlock = config =>
      `<script type="application/json" data-defer-tracker="google-ads">${JSON.stringify(config)}</script>`;

    const startPages = async (html, boot) => {
      const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
      const { EventManager } = await import('../../../src/managers/EventManager.js');
      const { PageManager } = await import('../../../src/managers/PageManager.js');
      /* Load the swapper up front, as a router does, so the swap isn't left waiting on the import */
      await import('../../../src/core/FragmentSwapper.js');
      registerTrackerAdapter('google-ads', boot);
      document.body.innerHTML = html;
      const eventBus = new EventManager();
      pages = new PageManager({
        containerSelector: '#app',
        eventBus,
        registry: [
          {
            name: 'defer-tracker',
            selector: '[data-defer-tracker]',
            loader: () => ({ default: DeferTracker }),
          },
        ],
      });
      interact();
      await vi.advanceTimersByTimeAsync(0);
      return eventBus;
    };

    /* Navigate as RouterManager does: update the address, wait for the swap, then end */
    const navigate = async (eventBus, path, html) => {
      history.pushState(null, '', path);
      const url = new URL(path, location.href);
      const pending = [];
      eventBus.emit('router:navigate-success', {
        html,
        url,
        trigger: 'link-click',
        waitUntil: promise => pending.push(promise),
      });
      const ended = Promise.allSettled(pending).then(() =>
        eventBus.emit('router:navigate-end', { url, trigger: 'link-click', status: 'success' })
      );
      await vi.advanceTimersByTimeAsync(20);
      await ended;
      /* Past PageManager's default mountDelay */
      await vi.advanceTimersByTimeAsync(2000);
    };

    const pageBoot = () => {
      const boot = vi.fn();
      boot.page = vi.fn();
      return boot;
    };

    const conversion = { id: 'AW-1', conversion: { send_to: 'AW-1/abc' } };

    it("sends the new page's conversion when the previous page had a block for the tracker", async () => {
      const boot = pageBoot();
      const eventBus = await startPages(
        `<div id="app"><main data-view="main">${adsBlock({ id: 'AW-1' })}</main></div>`,
        boot
      );

      await navigate(
        eventBus,
        '/confirmation',
        `<main data-view="main">${adsBlock(conversion)}</main>`
      );

      expect(boot.page.mock.calls).toEqual([
        [conversion, expect.any(Object), { url: location.href, mounted: true }],
      ]);
    });

    it("sends the new page's conversion when the previous page's block stays on the page", async () => {
      const boot = pageBoot();
      const eventBus = await startPages(
        `<div id="app"><header data-view="header">${adsBlock({ id: 'AW-1' })}</header>` +
          '<main data-view="main"></main></div>',
        boot
      );

      await navigate(
        eventBus,
        '/confirmation',
        `<main data-view="main">${adsBlock(conversion)}</main>`
      );

      expect(boot.page.mock.calls).toEqual([
        [conversion, expect.any(Object), { url: location.href, mounted: true }],
      ]);
    });

    it('runs the page step once for a block that stays when the new page has none', async () => {
      const boot = pageBoot();
      const eventBus = await startPages(
        `<div id="app"><header data-view="header">${adsBlock({ id: 'AW-1' })}</header>` +
          '<main data-view="main"></main></div>',
        boot
      );

      await navigate(eventBus, '/menu', '<main data-view="main">Menu</main>');

      expect(boot.page.mock.calls).toEqual([
        [{ id: 'AW-1' }, expect.any(Object), { url: location.href, mounted: false }],
      ]);
    });
  });

  it("reports loading until the adapter's script has loaded", async () => {
    const { default: DeferTracker, registerTrackerAdapter } = await loadModule();
    let finish;
    registerTrackerAdapter('gtm', () => new Promise(resolve => (finish = resolve)));
    const node = block('gtm', { id: 'GTM-1' });
    new DeferTracker().mount(node);

    interact();
    await vi.advanceTimersByTimeAsync(0);
    const whileLoading = statusOf(node);
    finish();
    await vi.advanceTimersByTimeAsync(0);

    expect([whileLoading, statusOf(node)]).toEqual(['loading', 'booted']);
  });

  it('keeps trackers without a consent category waiting when categories are required', async () => {
    const { default: DeferTracker, registerTrackerAdapter, setTrackerConsent } = await loadModule();
    const boot = vi.fn();
    registerTrackerAdapter('clarity', boot);
    setTrackerConsent(() => true, { requireCategory: true });
    const node = block('clarity', { id: 'abc' });
    new DeferTracker().mount(node);

    interact();

    expect([boot.mock.calls.length, statusOf(node)]).toEqual([0, 'awaiting-consent']);
  });

  it('boots a tracker waiting for consent when consent is re-evaluated, without an event bus', async () => {
    const {
      default: DeferTracker,
      registerTrackerAdapter,
      setTrackerConsent,
      reevaluateTrackerConsent,
    } = await loadModule();
    const boot = vi.fn();
    registerTrackerAdapter('hotjar', boot);
    let granted = false;
    setTrackerConsent(category => category === 'analytics' && granted);
    new DeferTracker().mount(block('hotjar', { id: 1, consent: 'analytics' }));
    interact();

    granted = true;
    reevaluateTrackerConsent();

    expect(boot).toHaveBeenCalledOnce();
  });

  it('skips the page step on a later page once consent is withdrawn', async () => {
    const { default: DeferTracker, registerTrackerAdapter, setTrackerConsent } = await loadModule();
    const { EventManager } = await import('../../../src/managers/EventManager.js');
    const eventBus = new EventManager();
    const boot = vi.fn();
    boot.page = vi.fn();
    registerTrackerAdapter('meta-pixel', boot);
    let granted = true;
    setTrackerConsent(category => category === 'marketing' && granted);
    new DeferTracker({ eventBus }).mount(block('meta-pixel', { id: '123', consent: 'marketing' }));
    interact();
    await vi.advanceTimersByTimeAsync(0);

    granted = false;
    history.pushState(null, '', '/menu');
    eventBus.emit('router:navigate-end', { url: '/menu', status: 'success' });

    expect(boot.page).not.toHaveBeenCalled();
  });

  it('treats a consent resolver that throws as not granted and logs it', async () => {
    const { default: DeferTracker, registerTrackerAdapter, setTrackerConsent } = await loadModule();
    registerTrackerAdapter('hotjar', vi.fn());
    setTrackerConsent(() => {
      throw new TypeError('Cookiebot is not defined');
    });
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const node = block('hotjar', { id: 1, consent: 'analytics' });
    new DeferTracker({ logger }).mount(node);

    interact();

    expect([statusOf(node), logger.warn.mock.calls.length > 0]).toEqual(['awaiting-consent', true]);
  });

  it('passes the configured CSP nonce to adapters', async () => {
    const {
      default: DeferTracker,
      registerTrackerAdapter,
      configureDeferTracker,
    } = await loadModule();
    const boot = vi.fn();
    registerTrackerAdapter('gtm', boot);
    configureDeferTracker({ nonce: 'r4nd0m' });
    new DeferTracker().mount(block('gtm', { id: 'GTM-1' }));

    interact();

    expect(boot.mock.calls[0]?.[1]?.nonce).toBe('r4nd0m');
  });
});
