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
