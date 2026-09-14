import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  const start = (registry, eventBus = new EventManager(), options = {}) => {
    manager = new PageManager({
      containerSelector: '#app',
      registry,
      eventBus,
      options,
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

  describe('after navigating', () => {
    let bus;

    beforeEach(() => {
      document.body.innerHTML =
        '<a id="pricing-link" href="/pricing">Pricing</a><main id="app" data-view="main">Home</main>';
      window.scrollTo(0, 0);
      bus = new EventManager();
    });

    const navigate = async (html, payload = {}) => {
      let swap;
      bus.emit('router:navigate-success', {
        html,
        url: new URL('/pricing', location.href),
        trigger: 'link-click',
        waitUntil: promise => {
          swap = promise;
        },
        ...payload,
      });
      await swap;
    };

    const options = { mountDelay: 0, targetGroups: { main: ['main'] } };

    it('moves focus to the heading of the new page', async () => {
      start([], bus, options);
      document.querySelector('#pricing-link').focus();

      await navigate('<main data-view="main"><h1>Pricing</h1></main>');

      const heading = document.querySelector('h1');
      expect({
        focused: document.activeElement === heading,
        tabindex: heading.getAttribute('tabindex'),
      }).toEqual({ focused: true, tabindex: '-1' });
    });

    it('scrolls to and focuses the element the address points to', async () => {
      start([], bus, options);
      const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

      await navigate(
        '<main data-view="main"><h1>Pricing</h1><section id="plans"></section></main>',
        {
          url: new URL('/pricing#plans', location.href),
        }
      );

      expect([document.activeElement.id, scrollIntoView.mock.contexts[0]?.id]).toEqual([
        'plans',
        'plans',
      ]);
    });

    it('focuses a field marked autofocus in the new content', async () => {
      start([], bus, options);

      await navigate('<main data-view="main"><h1>Sign in</h1><input id="email" autofocus></main>');

      expect(document.activeElement.id).toBe('email');
    });

    it('leaves focus where it is when focus management is turned off', async () => {
      start([], bus, { ...options, focusTarget: false });
      document.querySelector('#pricing-link').focus();

      await navigate('<main data-view="main"><h1>Pricing</h1></main>');

      expect(document.activeElement.id).toBe('pricing-link');
    });

    it('announces the title of the new page', async () => {
      start([], bus, options);

      await navigate(
        '<html><head><title>Pricing | Shop</title></head><body><main data-view="main"><h1>Pricing</h1></main></body></html>'
      );

      await vi.waitFor(() =>
        expect(document.querySelector('[role="status"]')?.textContent).toBe('Pricing | Shop')
      );
    });

    it('restores the scroll position saved for a history entry', async () => {
      start([], bus, options);

      await navigate('<main data-view="main"><h1>Home</h1></main>', {
        trigger: 'popstate',
        scroll: { x: 0, y: 640 },
      });

      expect(window.scrollY).toBe(640);
    });
  });

  describe('fragment transitions', () => {
    const emitNavigation = (bus, html) => {
      let swap;
      bus.emit('router:navigate-success', {
        html,
        url: new URL('/pricing', location.href),
        trigger: 'link-click',
        waitUntil: promise => {
          swap = promise;
        },
      });
      return swap;
    };

    it('replaces fragments without transitions when the user prefers reduced motion', async () => {
      vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));
      document.body.innerHTML = '<main id="app" data-view="main">Home</main>';
      const bus = new EventManager();
      start([], bus, {
        mountDelay: 0,
        targetGroups: { main: ['main'] },
        targetGroupTransitions: { main: { out: 'fade-out', in: 'fade-in' } },
      });
      const addClass = vi.spyOn(Object.getPrototypeOf(document.body.classList), 'add');

      await emitNavigation(bus, '<main data-view="main">Pricing</main>');

      expect(addClass.mock.calls.flat()).not.toContain('fade-out');
    });

    it('mounts components in new content before its in-transition has finished', async () => {
      document.body.innerHTML =
        '<main id="app" data-view="main">Home</main><aside data-view="sidebar"></aside>';
      const bus = new EventManager();
      const mounted = [];
      start([component('widget', 'normal', mounted)], bus, {
        mountDelay: 0,
        targetGroups: { main: ['main', 'sidebar'] },
        targetGroupTransitions: { sidebar: { in: 'fade(1)', duration: 1000 } },
      });

      emitNavigation(
        bus,
        '<main data-view="main">Pricing</main><aside data-view="sidebar"><div data-widget></div></aside>'
      );

      await vi.waitFor(() => expect(mounted).toEqual(['widget']), { timeout: 500 });
    });

    it('does not hold up other fragments while one is still transitioning', async () => {
      document.body.innerHTML =
        '<main id="app" data-view="main">Home</main><aside data-view="sidebar">Old filters</aside>';
      const bus = new EventManager();
      start([], bus, {
        mountDelay: 0,
        targetGroups: { main: ['main', 'sidebar'] },
        targetGroupTransitions: { main: { in: 'fade(1)', duration: 1000 } },
      });

      emitNavigation(
        bus,
        '<main data-view="main">Pricing</main><aside data-view="sidebar">New filters</aside>'
      );

      await vi.waitFor(
        () => expect(document.querySelector('aside').textContent).toBe('New filters'),
        { timeout: 500 }
      );
    });
  });
});
