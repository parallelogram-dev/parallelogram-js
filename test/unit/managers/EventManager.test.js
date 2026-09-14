import { describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';

describe('EventManager', () => {
  it('delivers the payload to every listener of an event', () => {
    const bus = new EventManager();
    const first = vi.fn();
    const second = vi.fn();
    bus.on('page:ready', first);
    bus.on('page:ready', second);

    bus.emit('page:ready', { url: '/about' });

    expect(first).toHaveBeenCalledWith({ url: '/about' });
    expect(second).toHaveBeenCalledWith({ url: '/about' });
  });

  it('stops delivering events after the returned unsubscribe function is called', () => {
    const bus = new EventManager();
    const listener = vi.fn();
    const unsubscribe = bus.on('page:ready', listener);

    unsubscribe();
    bus.emit('page:ready');

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers a once listener a single time', () => {
    const bus = new EventManager();
    const listener = vi.fn();
    bus.once('page:ready', listener);

    bus.emit('page:ready', 1);
    bus.emit('page:ready', 2);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('keeps notifying other listeners when one listener throws', () => {
    const bus = new EventManager();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const survivor = vi.fn();
    bus.on('page:ready', () => {
      throw new Error('listener failed');
    });
    bus.on('page:ready', survivor);

    bus.emit('page:ready');

    expect(survivor).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  it('lets a listener unsubscribe another listener mid-emit without skipping it', () => {
    const bus = new EventManager();
    const later = vi.fn();
    let unsubscribeLater;
    bus.on('page:ready', () => unsubscribeLater());
    unsubscribeLater = bus.on('page:ready', later);

    bus.emit('page:ready');
    bus.emit('page:ready');

    expect(later).toHaveBeenCalledOnce();
  });

  it('removes every listener for an event when cleared by name', () => {
    const bus = new EventManager();
    const cleared = vi.fn();
    const kept = vi.fn();
    bus.on('page:ready', cleared);
    bus.on('page:leave', kept);

    bus.clear('page:ready');
    bus.emit('page:ready');
    bus.emit('page:leave');

    expect(cleared).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledOnce();
  });
});
