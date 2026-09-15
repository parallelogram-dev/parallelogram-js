import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { Parallelogram } from '../../../src/core/Parallelogram.js';

const createRecorder = () => {
  const mounts = [];
  const define = label =>
    class {
      constructor() {
        this.elements = new Map();
      }

      mount(element) {
        this.elements.set(element, {});
        mounts.push([label, element.id]);
      }

      unmount(element) {
        this.elements.delete(element);
      }

      trackedElements() {
        return [...this.elements.keys()];
      }
    };
  return { mounts, define };
};

describe('Parallelogram', () => {
  let app;

  afterEach(() => {
    app?.destroy();
    app = null;
    document.body.replaceChildren();
  });

  it('keeps a repeated start quiet when silent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    app = Parallelogram.create({ silent: true });

    app.init();
    app.init();

    expect(warn).not.toHaveBeenCalled();
  });

  it('logs under the parallelogram namespace', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    app = Parallelogram.create();
    app.init();

    app.logger.warn('Check the config');

    expect(warn).toHaveBeenCalledWith('[parallelogram]', 'Check the config');
  });

  it('mounts each matching element once when it starts', () => {
    document.body.innerHTML = '<button id="menu" data-toggle></button>';
    const { mounts, define } = createRecorder();
    app = Parallelogram.create();
    app.components.add('[data-toggle]', () => ({ default: define('toggle') }));

    app.init();

    expect(mounts).toEqual([['toggle', 'menu']]);
  });

  it('keeps components registered on the same data attribute apart', () => {
    document.body.innerHTML =
      '<div id="sales" data-widget="chart"></div><div id="stores" data-widget="map"></div>';
    const { mounts, define } = createRecorder();
    app = Parallelogram.create();
    app.components
      .add('[data-widget="chart"]', () => ({ default: define('chart') }))
      .add('[data-widget="map"]', () => ({ default: define('map') }));

    app.init();

    expect(mounts).toEqual([
      ['chart', 'sales'],
      ['map', 'stores'],
    ]);
  });

  it('treats a plain element selector as an enhancement component', () => {
    document.body.innerHTML = '<form id="signup"></form>';
    const { mounts, define } = createRecorder();
    app = Parallelogram.create();
    app.components.add('form', () => ({ default: define('form') }));

    app.init();

    expect(mounts).toEqual([['form', 'signup']]);
  });

  it('lets dependencies refer to a component by its explicit name', () => {
    document.body.innerHTML = '<div id="notes" data-editor></div>';
    const { mounts, define } = createRecorder();
    app = Parallelogram.create();
    app.components
      .add('[data-editor]', { loader: () => ({ default: define('editor') }), dependsOn: ['base'] })
      .add('[data-editor-base]', { name: 'base', loader: () => ({ default: define('base') }) });

    app.init();

    expect(mounts).toEqual([['editor', 'notes']]);
    expect(app.pageManager.host.getInstance('base')).not.toBeNull();
  });

  it('refuses a second component with a name that is already taken', () => {
    const { define } = createRecorder();
    app = Parallelogram.create();
    app.components.add('[data-a]', { name: 'shared', loader: () => ({ default: define('a') }) });

    expect(() =>
      app.components.add('[data-b]', { name: 'shared', loader: () => ({ default: define('b') }) })
    ).toThrow(/shared/);
  });

  it('mounts components added after it has started', () => {
    document.body.innerHTML = '<table id="orders" data-datatable></table>';
    const { mounts, define } = createRecorder();
    app = Parallelogram.create();
    app.init();

    app.components.add('[data-datatable]', () => ({ default: define('datatable') }));

    expect(mounts).toEqual([['datatable', 'orders']]);
  });

  describe('router', () => {
    it('starts without loading the router when no router options are given', async () => {
      const routerPath = '../../../src/managers/RouterManager.js';
      let loads = 0;
      vi.resetModules();
      vi.doMock(routerPath, async importOriginal => {
        loads += 1;
        return importOriginal();
      });
      onTestFinished(() => vi.doUnmock(routerPath));
      const { Parallelogram: Isolated } = await import('../../../src/core/Parallelogram.js');
      app = Isolated.create({ silent: true });

      await app.run();

      expect([loads, app.router]).toEqual([0, null]);
    });

    it('resolves run() once the router has loaded when router options are given', async () => {
      app = Parallelogram.create({ silent: true, router: {} });

      const started = await app.run();

      expect([started === app, app.router?.constructor.name]).toEqual([true, 'RouterManager']);
    });

    it('gives components that mounted before the router loaded the router', async () => {
      document.body.innerHTML = '<div id="region" data-region></div>';
      app = Parallelogram.create({ silent: true, router: {} });
      app.components.add('[data-region]', () => ({
        default: class {
          constructor({ router } = {}) {
            this.router = router;
            this.elements = new Map();
          }

          mount(element) {
            this.elements.set(element, {});
          }

          unmount(element) {
            this.elements.delete(element);
          }

          trackedElements() {
            return [...this.elements.keys()];
          }
        },
      }));

      await app.run();

      expect(app.pageManager.host.getInstance('[data-region]').router).toBe(app.router);
    });

    it('creates no router when it is destroyed before the router has loaded', async () => {
      app = Parallelogram.create({ silent: true, router: {} });

      const started = app.run();
      app.destroy();
      await started;

      expect(app.router).toBeNull();
    });
  });
});
