import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';
import { PageManager } from '../../../src/managers/PageManager.js';

const recordingComponent = (name, mounted) =>
  class {
    constructor() {
      this.elements = new WeakMap();
    }

    mount(element) {
      this.elements.set(element, {});
      mounted.push(name);
    }

    unmount(element) {
      this.elements.delete(element);
    }
  };

const component = (name, priority, mounted) => ({
  name,
  selector: `[data-${name}]`,
  priority,
  loader: () => ({ default: recordingComponent(name, mounted) }),
});

describe('PageManager', () => {
  let manager;

  afterEach(() => {
    manager?.destroy();
    manager = null;
    document.body.replaceChildren();
  });

  const start = (registry, eventBus = new EventManager()) => {
    manager = new PageManager({
      containerSelector: '#app',
      registry,
      eventBus,
    });
    return manager;
  };

  it('mounts critical components before normal ones on the initial pass', () => {
    document.body.innerHTML =
      '<main id="app"><button data-toggle></button><div data-hero></div></main>';
    const mounted = [];

    start([component('toggle', 'normal', mounted), component('hero', 'critical', mounted)]);

    expect(mounted).toEqual(['hero', 'toggle']);
  });

  it('mounts critical components added to the page after the initial pass', async () => {
    document.body.innerHTML = '<main id="app"></main>';
    const mounted = [];
    start([component('hero', 'critical', mounted)]);

    const hero = document.createElement('section');
    hero.setAttribute('data-hero', '');
    document.querySelector('#app').append(hero);

    await vi.waitFor(() => expect(mounted).toEqual(['hero']));
  });

  it('stops handling navigation once destroyed without removing other subscribers', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const bus = new EventManager();
    const otherSubscriber = vi.fn();
    bus.on('router:navigate-success', otherSubscriber);
    const destroyed = start([], bus);
    const replaceFragments = vi.spyOn(destroyed, 'replaceFragments').mockResolvedValue();

    destroyed.destroy();
    manager = null;
    bus.emit('router:navigate-success', { html: '<main></main>', url: new URL(location.href) });

    expect(replaceFragments).not.toHaveBeenCalled();
    expect(otherSubscriber).toHaveBeenCalledOnce();
  });
});
