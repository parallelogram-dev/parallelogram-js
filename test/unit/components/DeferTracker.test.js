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
    eventBus.emit('router:navigate-success', { url: '/menu' });
    await vi.advanceTimersByTimeAsync(0);

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
