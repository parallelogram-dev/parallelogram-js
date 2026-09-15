import { describe, expect, it, vi } from 'vitest';
import { BaseComponent } from '../../../src/core/BaseComponent.js';

class Widget extends BaseComponent {
  static get defaults() {
    return { enabled: true, delay: 200, label: 'Widget' };
  }

  _getSelector() {
    return 'data-widget';
  }

  _init(element) {
    const state = super._init(element);
    state.config = this._getConfigFromAttrs(element, {
      enabled: 'enabled',
      delay: 'delay',
      label: 'label',
    });
    return state;
  }
}

const widgetElement = (attributes = {}) => {
  const element = document.createElement('div');
  element.setAttribute('data-widget', '');
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(`data-widget-${name}`, value);
  }
  return element;
};

describe('BaseComponent', () => {
  it('can be constructed without any options', () => {
    expect(() => new Widget()).not.toThrow();
  });

  describe('lifecycle', () => {
    it('tracks mounted elements until they are unmounted', () => {
      const widget = new Widget();
      const first = widgetElement();
      const second = widgetElement();

      widget.mount(first);
      widget.mount(second);
      widget.unmount(first);

      expect(widget.trackedElements()).toEqual([second]);
    });

    it('aborts the element signal on unmount even when cleanup throws', () => {
      class FaultyCleanup extends Widget {
        _init(element) {
          const state = super._init(element);
          state.cleanup = () => {
            throw new Error('cleanup failed');
          };
          return state;
        }
      }
      const widget = new FaultyCleanup();
      const element = widgetElement();
      widget.mount(element);
      const { signal } = widget.getState(element).controller;

      expect(() => widget.unmount(element)).toThrow('cleanup failed');
      expect(signal.aborted).toBe(true);
      expect(widget.trackedElements()).toEqual([]);
    });

    it('releases an element whose _init returned no state when it is unmounted', () => {
      let signal;
      class NoState extends Widget {
        _init(element) {
          signal = super._init(element).controller.signal;
        }
      }
      const widget = new NoState({ logger: { warn() {} } });
      const element = widgetElement();
      widget.mount(element);

      widget.unmount(element);

      expect([signal.aborted, widget.trackedElements()]).toEqual([true, []]);
    });

    it('warns when _init returns no state object', () => {
      class NoState extends Widget {
        _init(element) {
          super._init(element);
        }
      }
      const logger = { warn: vi.fn() };

      new NoState({ logger }).mount(widgetElement());

      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('reports whether an element was unmounted', () => {
      const widget = new Widget();
      const element = widgetElement();
      widget.mount(element);

      expect([widget.unmount(element), widget.unmount(element)]).toEqual([true, false]);
    });

    it('does not track an element whose _init throws, and aborts its signal', () => {
      let signal;
      class BrokenInit extends Widget {
        _init(element) {
          signal = super._init(element).controller.signal;
          throw new Error('unexpected markup');
        }
      }
      const widget = new BrokenInit();
      const element = widgetElement();

      expect(() => widget.mount(element)).toThrow('unexpected markup');
      expect(widget.trackedElements()).toEqual([]);
      expect(signal.aborted).toBe(true);
    });

    it('stores the state resolved by an asynchronous _init', async () => {
      class AsyncInit extends Widget {
        async _init(element) {
          const state = super._init(element);
          state.ready = true;
          return state;
        }
      }
      const widget = new AsyncInit();
      const element = widgetElement();

      widget.mount(element);

      expect(widget.trackedElements()).toEqual([element]);
      await vi.waitFor(() => expect(widget.getState(element)?.ready).toBe(true));
    });

    it('cleans up an asynchronous _init that finishes after the element was unmounted', async () => {
      let finishInit;
      let signal;
      const cleanup = vi.fn();
      class SlowInit extends Widget {
        _init(element) {
          const state = super._init(element);
          signal = state.controller.signal;
          state.cleanup = cleanup;
          return new Promise(resolve => {
            finishInit = () => resolve(state);
          });
        }
      }
      const widget = new SlowInit();
      const element = widgetElement();
      widget.mount(element);

      widget.unmount(element);
      finishInit();

      await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce());
      expect(signal.aborted).toBe(true);
      expect(widget.getState(element)).toBeUndefined();
    });

    it('unmounts every element when destroyed', () => {
      const widget = new Widget();
      const elements = [widgetElement(), widgetElement()];
      elements.forEach(element => widget.mount(element));
      const signals = elements.map(element => widget.getState(element).controller.signal);

      widget.destroy();

      expect(signals.every(signal => signal.aborted)).toBe(true);
      expect(widget.trackedElements()).toEqual([]);
    });
  });

  describe('attributes', () => {
    it.each([
      ['is missing', undefined, true, true],
      ['is missing and the default is false', undefined, false, false],
      ['is empty', '', false, true],
      ['is "true"', 'true', false, true],
      ['is "false"', 'false', true, false],
      ['is "FALSE"', 'FALSE', true, false],
      ['is "0"', '0', true, false],
      ['repeats its own name', 'enabled', false, true],
    ])('reads a boolean attribute that %s', (_case, value, fallback, expected) => {
      const element = widgetElement(value === undefined ? {} : { enabled: value });

      expect(new Widget().getBoolAttr(element, 'enabled', fallback)).toBe(expected);
    });

    it.each([
      ['is missing', undefined, 200],
      ['is an integer', '350', 350],
      ['is a decimal', '0.25', 0.25],
      ['is empty', '', 200],
      ['is not a number', 'fast', 200],
    ])('reads a numeric attribute that %s', (_case, value, expected) => {
      const element = widgetElement(value === undefined ? {} : { delay: value });

      expect(new Widget().getNumberAttr(element, 'delay', 200)).toBe(expected);
    });

    it('converts configuration attributes to the type of their defaults', () => {
      const widget = new Widget();
      const element = widgetElement({ enabled: 'false', delay: '50', label: 'Custom' });

      widget.mount(element);

      expect(widget.getState(element).config).toEqual({
        enabled: false,
        delay: 50,
        label: 'Custom',
      });
    });
  });

  describe('element state', () => {
    it('writes state to its own attribute and to the deprecated selector attribute', () => {
      const element = widgetElement();

      new Widget().setState(element, 'open');

      expect([
        element.getAttribute('data-widget-state'),
        element.getAttribute('data-widget'),
      ]).toEqual(['open', 'open']);
    });

    it('reads state from the state attribute before the selector attribute', () => {
      const element = widgetElement();
      element.setAttribute('data-widget-state', 'open');

      expect(new Widget().getElementState(element)).toBe('open');
    });
  });

  describe('attribute name', () => {
    it.each([['data-chart'], ['chart'], ['[data-chart]']])(
      'comes from a static selector written as %s',
      selector => {
        class SalesChart extends BaseComponent {
          static selector = selector;
        }
        const canvas = document.createElement('canvas');

        new SalesChart().setAttr(canvas, 'mode', 'bar');

        expect(canvas.getAttribute('data-chart-mode')).toBe('bar');
      }
    );

    it('warns once when a component falls back to its class name', () => {
      const logger = { warn: vi.fn(), info() {}, debug() {}, error() {} };
      class Gauge extends BaseComponent {}
      const gauge = new Gauge({ logger });

      gauge.setAttr(document.createElement('div'), 'value', 3);
      gauge.setAttr(document.createElement('div'), 'value', 4);

      expect(logger.warn).toHaveBeenCalledOnce();
    });
  });
});
