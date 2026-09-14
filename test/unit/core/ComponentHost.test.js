import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('mounts matching elements added to the page later', async () => {
    start([syncEntry('toggle')]);

    root.insertAdjacentHTML('beforeend', '<nav><button id="later" data-toggle></button></nav>');

    await vi.waitFor(() => expect(recorder.log).toEqual([['mount', 'toggle', 'later']]));
  });

  it('unmounts components when their elements are removed from the page', async () => {
    root.innerHTML = '<nav id="nav"><button id="menu" data-toggle></button></nav>';
    start([syncEntry('toggle')]);

    document.getElementById('nav').remove();

    await vi.waitFor(() => expect(recorder.log.at(-1)).toEqual(['unmount', 'toggle', 'menu']));
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
