import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';
import { RouterManager } from '../../../src/managers/RouterManager.js';

describe('RouterManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('stops reporting history navigation once destroyed', () => {
    const bus = new EventManager();
    const popstate = vi.fn();
    bus.on('router:popstate', popstate);
    const router = new RouterManager({ eventBus: bus });

    router.destroy();
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(popstate).not.toHaveBeenCalled();
  });

  it('leaves other subscribers in place when destroyed', () => {
    const bus = new EventManager();
    const listener = vi.fn();
    bus.on('dom:content-loaded', listener);
    const router = new RouterManager({ eventBus: bus });

    router.destroy();
    bus.emit('dom:content-loaded', {});

    expect(listener).toHaveBeenCalledOnce();
  });
});
