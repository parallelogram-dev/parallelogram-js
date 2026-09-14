import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';
import { PageManager } from '../../../src/managers/PageManager.js';
import { RouterManager } from '../../../src/managers/RouterManager.js';

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
  let router;

  afterEach(() => {
    router?.destroy();
    router = null;
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

  it('lets the router wait until the new content is in place', () => {
    document.body.innerHTML = '<main id="app" data-view="main"></main>';
    const bus = new EventManager();
    start([], bus);
    const waitUntil = vi.fn();

    bus.emit('router:navigate-success', {
      html: '<main data-view="main">Pricing</main>',
      url: new URL(location.href),
      waitUntil,
    });

    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });

  it('requests a history entry once when used with the router', async () => {
    document.body.innerHTML = '<main id="app" data-view="main">Start</main>';
    history.replaceState(null, '', '/start');
    const fetch = vi.fn(
      async () =>
        new Response('<main data-view="main">Previous</main>', {
          headers: { 'content-type': 'text/html' },
        })
    );
    vi.stubGlobal('fetch', fetch);
    const bus = new EventManager();
    router = new RouterManager({ eventBus: bus });
    manager = new PageManager({ containerSelector: '#app', registry: [], eventBus: bus, router });

    history.pushState(null, '', '/previous');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await vi.waitFor(() => expect(document.querySelector('main').textContent).toBe('Previous'));
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('finishes replacing a fragment whose transition classes do not animate', async () => {
    document.body.innerHTML = '<main id="app" data-view="main">Start</main>';
    const bus = new EventManager();
    manager = new PageManager({
      containerSelector: '#app',
      registry: [],
      eventBus: bus,
      options: {
        mountDelay: 0,
        targetGroups: { main: ['main'] },
        targetGroupTransitions: { main: { out: 'fade-out', in: 'fade-in', duration: 50 } },
      },
    });
    let swap;

    bus.emit('router:navigate-success', {
      html: '<main data-view="main">Pricing</main>',
      url: new URL(location.href),
      waitUntil: promise => {
        swap = promise;
      },
    });
    await swap;

    expect(document.querySelector('main').textContent).toBe('Pricing');
  });
});
