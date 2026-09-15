import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseComponent } from '../../../src/core/BaseComponent.js';
import { ComponentHost } from '../../../src/core/ComponentHost.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const createRecorder = () => {
  const log = [];
  const define = name =>
    class {
      constructor(services) {
        this.services = services;
        this.elements = new Map();
      }

      mount(element) {
        this.elements.set(element, {});
        log.push(['mount', name, element.id]);
      }

      unmount(element) {
        this.elements.delete(element);
        log.push(['unmount', name, element.id]);
      }

      trackedElements() {
        return [...this.elements.keys()];
      }
    };
  return { log, define };
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ComponentHost', () => {
  let host;
  let root;
  let bus;
  let recorder;

  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
    root = document.getElementById('app');
    bus = new EventManager();
    recorder = createRecorder();
  });

  afterEach(() => {
    host?.stop();
    host = null;
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  const start = registry => {
    host = new ComponentHost({ registry, eventBus: bus, retryDelay: 100 });
    host.start(root);
    return host;
  };

  const syncEntry = (name, extra = {}) => ({
    name,
    selector: `[data-${name}]`,
    loader: () => ({ default: recorder.define(name) }),
    ...extra,
  });

  it('mounts matching elements inside its root when started', () => {
    root.innerHTML = '<button id="menu" data-toggle></button>';
    document.body.insertAdjacentHTML('beforeend', '<button id="outside" data-toggle></button>');

    start([syncEntry('toggle')]);

    expect(recorder.log).toEqual([['mount', 'toggle', 'menu']]);
  });

  it('ignores requests to mount once stopped, until it starts again', () => {
    start([syncEntry('toggle')]);
    host.stop();
    root.innerHTML = '<button id="menu" data-toggle></button>';

    host.mountWithin(root);
    const whileStopped = [...recorder.log];
    host.start(root);

    expect([whileStopped, recorder.log]).toEqual([[], [['mount', 'toggle', 'menu']]]);
  });

  it('passes the event bus, logger and router to each component', () => {
    root.innerHTML = '<button id="menu" data-toggle></button>';
    const logger = { info() {} };
    const router = {};

    host = new ComponentHost({
      registry: [syncEntry('toggle')],
      eventBus: bus,
      logger,
      router,
    });
    host.start(root);

    expect(host.getInstance('toggle').services).toMatchObject({ eventBus: bus, logger, router });
  });

  it('mounts critical components before the others', () => {
    root.innerHTML = '<button id="menu" data-toggle></button><div id="hero" data-hero></div>';

    start([syncEntry('toggle'), syncEntry('hero', { priority: 'critical' })]);

    expect(recorder.log.map(([, name]) => name)).toEqual(['hero', 'toggle']);
  });

  it('mounts elements that were waiting once an asynchronous loader resolves', async () => {
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const load = deferred();
    start([{ name: 'lightbox', selector: '[data-lightbox]', loader: () => load.promise }]);

    expect(recorder.log).toEqual([]);
    load.resolve({ default: recorder.define('lightbox') });
    await flush();

    expect(recorder.log).toEqual([['mount', 'lightbox', 'gallery']]);
  });

  it('does not mount an element that was removed while its component was loading', async () => {
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const load = deferred();
    start([{ name: 'lightbox', selector: '[data-lightbox]', loader: () => load.promise }]);

    document.getElementById('gallery').remove();
    await flush();
    load.resolve({ default: recorder.define('lightbox') });
    await flush();

    expect(recorder.log).toEqual([]);
  });

  it('retries a failed load and mounts the elements that were waiting', async () => {
    vi.useFakeTimers();
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ default: recorder.define('lightbox') });
    start([{ name: 'lightbox', selector: '[data-lightbox]', loader }]);

    await vi.advanceTimersByTimeAsync(100);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(recorder.log).toEqual([['mount', 'lightbox', 'gallery']]);
    expect(document.getElementById('gallery').classList.contains('component-error')).toBe(false);
  });

  it('reports a load error and marks waiting elements after the last retry fails', async () => {
    vi.useFakeTimers();
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const loadError = vi.fn();
    bus.on('page:component-load-error', loadError);
    const loader = vi.fn().mockRejectedValue(new Error('network error'));
    host = new ComponentHost({
      registry: [{ name: 'lightbox', selector: '[data-lightbox]', loader }],
      eventBus: bus,
      retryDelay: 100,
      maxRetryAttempts: 2,
    });
    host.start(root);

    await vi.advanceTimersByTimeAsync(1000);

    expect(loader).toHaveBeenCalledTimes(3);
    expect(loadError).toHaveBeenCalledOnce();
    expect(document.getElementById('gallery').classList.contains('component-error')).toBe(true);
  });

  it('marks elements added after a component failed to load for good', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('network error'));
    host = new ComponentHost({
      registry: [{ name: 'lightbox', selector: '[data-lightbox]', loader }],
      eventBus: bus,
      maxRetryAttempts: 0,
    });
    host.start(root);
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    await vi.waitFor(() => expect(host.records.get('lightbox')?.status).toBe('failed'));

    root.insertAdjacentHTML('beforeend', '<div id="later" data-lightbox></div>');
    await flush();

    expect(document.getElementById('later').classList.contains('component-error')).toBe(true);
  });

  it('mounts the elements of a failed component once it is retried', async () => {
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ default: recorder.define('lightbox') });
    host = new ComponentHost({
      registry: [{ name: 'lightbox', selector: '[data-lightbox]', loader }],
      eventBus: bus,
      maxRetryAttempts: 0,
    });
    host.start(root);
    await flush();

    const retried = host.retry('lightbox');
    await flush();

    expect([retried, recorder.log, root.firstElementChild.className]).toEqual([
      true,
      [['mount', 'lightbox', 'gallery']],
      '',
    ]);
  });

  it('retries a failed dependency along with the component that needs it', async () => {
    root.innerHTML = '<div id="chart" data-chart></div>';
    const loadCharts = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ default: recorder.define('charts') });
    host = new ComponentHost({
      registry: [
        { name: 'charts', selector: '[data-charts]', loader: loadCharts },
        syncEntry('chart', { dependsOn: ['charts'] }),
      ],
      eventBus: bus,
      maxRetryAttempts: 0,
    });
    host.start(root);
    await flush();

    host.retry('chart');
    await flush();

    expect(recorder.log).toEqual([['mount', 'chart', 'chart']]);
  });

  it('does not retry when the loaded module has no component class', async () => {
    root.innerHTML = '<div id="gallery" data-lightbox></div>';
    const loadError = vi.fn();
    bus.on('page:component-load-error', loadError);
    const loader = vi.fn().mockResolvedValue({ notAComponent: true });
    start([{ name: 'lightbox', selector: '[data-lightbox]', loader }]);

    await flush();

    expect(loader).toHaveBeenCalledOnce();
    expect(loadError).toHaveBeenCalledOnce();
  });

  it.each([
    ['a loader that returns the class', recorder => recorder.define('chart')],
    ['a named export chosen with exportName', recorder => ({ Chart: recorder.define('chart') })],
  ])('accepts %s', (_case, moduleFor) => {
    root.innerHTML = '<canvas id="sales" data-chart></canvas>';

    start([
      {
        name: 'chart',
        selector: '[data-chart]',
        exportName: 'Chart',
        loader: () => moduleFor(recorder),
      },
    ]);

    expect(recorder.log).toEqual([['mount', 'chart', 'sales']]);
  });

  it('waits for its dependencies to load before loading a component', async () => {
    root.innerHTML = '<div id="editor" data-editor></div>';
    const baseLoad = deferred();
    const editorLoader = vi.fn(() => ({ default: recorder.define('editor') }));
    start([
      { name: 'editor', selector: '[data-editor]', dependsOn: ['base'], loader: editorLoader },
      { name: 'base', selector: '[data-base]', loader: () => baseLoad.promise },
    ]);

    await flush();
    expect(editorLoader).not.toHaveBeenCalled();

    baseLoad.resolve({ default: recorder.define('base') });
    await flush();
    expect(recorder.log).toEqual([['mount', 'editor', 'editor']]);
  });

  it('waits for a dependency that is retrying before loading a component', async () => {
    root.innerHTML = '<div id="editor" data-editor></div>';
    const calls = [];
    let baseAttempts = 0;
    start([
      syncEntry('editor', {
        dependsOn: ['base'],
        loader: () => {
          calls.push('editor');
          return { default: recorder.define('editor') };
        },
      }),
      syncEntry('base', {
        loader: () => {
          calls.push('base');
          baseAttempts++;
          return baseAttempts === 1
            ? Promise.reject(new Error('offline'))
            : { default: recorder.define('base') };
        },
      }),
    ]);

    await vi.waitFor(() => expect(calls).toContain('editor'), { timeout: 1000 });

    expect(calls).toEqual(['base', 'base', 'editor']);
  });

  it('fails a component whose dependency fails to load for good', async () => {
    root.innerHTML = '<div id="editor" data-editor></div>';
    const editorLoader = vi.fn(() => ({ default: recorder.define('editor') }));
    const errors = [];
    bus.on('page:component-load-error', ({ componentName, error }) =>
      errors.push([componentName, error.cause?.message ?? error.message])
    );
    host = new ComponentHost({
      registry: [
        syncEntry('editor', { dependsOn: ['base'], loader: editorLoader }),
        syncEntry('base', { loader: () => Promise.reject(new Error('offline')) }),
      ],
      eventBus: bus,
      maxRetryAttempts: 0,
    });
    host.start(root);

    await vi.waitFor(() => expect(errors).toHaveLength(2));

    expect([
      editorLoader.mock.calls.length,
      document.getElementById('editor').className,
      errors,
    ]).toEqual([
      0,
      'component-error',
      [
        ['base', 'offline'],
        ['editor', 'offline'],
      ],
    ]);
  });

  it('refuses components that depend on each other in a cycle', () => {
    expect(() =>
      start([
        syncEntry('menu', { dependsOn: ['panel'] }),
        syncEntry('panel', { dependsOn: ['menu'] }),
      ])
    ).toThrow('panel → menu → panel');
  });

  it('mounts matching elements added to the page later', async () => {
    start([syncEntry('toggle')]);

    root.insertAdjacentHTML('beforeend', '<nav><button id="later" data-toggle></button></nav>');

    await vi.waitFor(() => expect(recorder.log).toEqual([['mount', 'toggle', 'later']]));
  });

  it('searches an added element once however many components are registered', async () => {
    start(Array.from({ length: 20 }, (_, index) => syncEntry(`widget${index}`)));
    const search = vi.spyOn(Element.prototype, 'querySelectorAll');

    root.insertAdjacentHTML('beforeend', '<nav><button id="later" data-widget7></button></nav>');
    await vi.waitFor(() => expect(recorder.log).toEqual([['mount', 'widget7', 'later']]));

    expect(search).toHaveBeenCalledOnce();
  });

  it('reports an invalid selector for its component and still mounts the others', () => {
    root.innerHTML = '<button id="menu" data-toggle></button>';
    const mountError = vi.fn();
    bus.on('page:component-mount-error', mountError);

    start([
      { name: 'broken', selector: '[data-broken', loader: () => recorder.define('broken') },
      syncEntry('toggle'),
    ]);

    expect([mountError.mock.calls.map(([event]) => event.componentName), recorder.log]).toEqual([
      ['broken'],
      [['mount', 'toggle', 'menu']],
    ]);
  });

  it('unmounts only the elements inside the removed nodes', async () => {
    root.innerHTML =
      '<nav id="nav"><button id="menu" data-toggle></button></nav><button id="help" data-toggle></button>';
    const detached = document.createElement('button');
    detached.id = 'detached';
    start([syncEntry('toggle')]);
    host.mount('toggle', detached);

    document.getElementById('nav').remove();
    await flush();

    expect(recorder.log.filter(([action]) => action === 'unmount')).toEqual([
      ['unmount', 'toggle', 'menu'],
    ]);
  });

  it('keeps an element mounted when it is moved within the page', async () => {
    root.innerHTML = '<nav id="nav"><button id="menu" data-toggle></button></nav><aside></aside>';
    start([syncEntry('toggle')]);

    root.querySelector('aside').append(document.getElementById('nav'));
    await flush();

    expect(recorder.log).toEqual([['mount', 'toggle', 'menu']]);
  });

  it('unmounts components when their elements are removed from the page', async () => {
    root.innerHTML = '<nav id="nav"><button id="menu" data-toggle></button></nav>';
    start([syncEntry('toggle')]);

    document.getElementById('nav').remove();

    await vi.waitFor(() => expect(recorder.log.at(-1)).toEqual(['unmount', 'toggle', 'menu']));
  });

  it('reports an element unmounted once when its _init returned no state', async () => {
    root.innerHTML = '<p id="first" data-note></p><p id="second"></p>';
    const unmounted = vi.fn();
    bus.on('page:component-unmounted', unmounted);
    class Note extends BaseComponent {
      _init(element) {
        super._init(element);
      }
    }
    host = new ComponentHost({
      registry: [{ name: 'note', selector: '[data-note]', loader: () => Note }],
      eventBus: bus,
      logger: { warn() {}, error() {} },
    });
    host.start(root);

    document.getElementById('first').remove();
    await flush();
    document.getElementById('second').remove();
    await flush();

    expect(unmounted).toHaveBeenCalledOnce();
  });

  it('does not report an unmount for an element the component was not mounted on', () => {
    root.innerHTML = '<button id="menu" data-toggle></button>';
    const unmounted = vi.fn();
    bus.on('page:component-unmounted', unmounted);
    const Toggle = recorder.define('toggle');
    Toggle.prototype.unmount = () => false;
    start([{ name: 'toggle', selector: '[data-toggle]', loader: () => Toggle }]);

    host.unmountWithin(root);

    expect(unmounted).not.toHaveBeenCalled();
  });

  it('reports an element mounted once when it is found again while its _init is running', async () => {
    root.innerHTML = '<div id="map" data-map></div>';
    const mounted = vi.fn();
    bus.on('page:component-mounted', mounted);
    const ready = deferred();
    class MapView extends BaseComponent {
      _init(element) {
        const state = super._init(element);
        return ready.promise.then(() => state);
      }
    }
    start([{ name: 'map', selector: '[data-map]', loader: () => MapView }]);

    host.mountWithin(root);
    ready.resolve();
    await flush();

    expect(mounted).toHaveBeenCalledOnce();
  });

  it('reports an element mounted only once its asynchronous _init has finished', async () => {
    root.innerHTML = '<div id="map" data-map></div>';
    const mounted = vi.fn();
    bus.on('page:component-mounted', mounted);
    const ready = deferred();
    class MapView extends BaseComponent {
      _init(element) {
        const state = super._init(element);
        return ready.promise.then(() => state);
      }
    }
    start([{ name: 'map', selector: '[data-map]', loader: () => MapView }]);

    const whileInitialising = mounted.mock.calls.length;
    ready.resolve();
    await flush();

    expect([whileInitialising, mounted.mock.calls.length]).toEqual([0, 1]);
  });

  it('reports a mount error instead of a mount when an asynchronous _init rejects', async () => {
    root.innerHTML = '<div id="map" data-map></div>';
    const mounted = vi.fn();
    const mountError = vi.fn();
    bus.on('page:component-mounted', mounted);
    bus.on('page:component-mount-error', mountError);
    class MapView extends BaseComponent {
      async _init() {
        throw new Error('tiles unavailable');
      }
    }
    host = new ComponentHost({
      registry: [{ name: 'map', selector: '[data-map]', loader: () => MapView }],
      eventBus: bus,
      logger: { error() {} },
    });
    host.start(root);
    await flush();

    expect([mounted.mock.calls.length, mountError.mock.calls[0]?.[0].error.message]).toEqual([
      0,
      'tiles unavailable',
    ]);
  });

  it('refuses two components with the same name', () => {
    expect(() => start([syncEntry('toggle'), syncEntry('toggle')])).toThrow(/toggle/);
  });

  it('mounts a component added after it started', () => {
    root.innerHTML = '<table id="orders" data-datatable></table>';
    start([]);

    host.add(syncEntry('datatable'));

    expect(recorder.log).toEqual([['mount', 'datatable', 'orders']]);
  });

  it('unmounts everything and stops observing when stopped', async () => {
    root.innerHTML = '<button id="menu" data-toggle></button>';
    start([syncEntry('toggle')]);

    host.stop();
    root.insertAdjacentHTML('beforeend', '<button id="later" data-toggle></button>');
    await flush();

    expect(recorder.log).toEqual([
      ['mount', 'toggle', 'menu'],
      ['unmount', 'toggle', 'menu'],
    ]);
  });
});
