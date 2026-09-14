import { afterEach, describe, expect, it } from 'vitest';
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
});
