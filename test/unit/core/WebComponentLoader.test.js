import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebComponentLoader } from '../../../src/core/WebComponentLoader.js';

let count = 0;
const uniqueTag = () => `x-loader-${++count}`;
const defining = tag => async () => {
  customElements.define(tag, class extends HTMLElement {});
};
const nextTask = () => new Promise(resolve => setTimeout(resolve));

describe('WebComponentLoader', () => {
  let loader;

  afterEach(() => {
    loader?.destroy();
    loader = null;
    document.body.replaceChildren();
  });

  it('does not watch the page when it has no components to load', () => {
    const observer = vi.spyOn(window, 'MutationObserver');
    loader = new WebComponentLoader({}, { observeDOM: true });

    loader.init();

    expect(observer).not.toHaveBeenCalled();
  });

  it('loads a component added to the page inside other markup', async () => {
    const tag = uniqueTag();
    loader = new WebComponentLoader({ [tag]: defining(tag) }, { observeDOM: true });
    loader.init();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<section><${tag}></${tag}></section>`;
    document.body.append(wrapper);

    await vi.waitFor(() => expect(loader.isLoaded(tag)).toBe(true));
  });

  it('stops watching the page once every component has loaded', async () => {
    const tag = uniqueTag();
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    document.body.innerHTML = `<${tag}></${tag}>`;
    loader = new WebComponentLoader({ [tag]: defining(tag) }, { observeDOM: true });

    loader.init();
    await vi.waitFor(() => expect(loader.isLoaded(tag)).toBe(true));

    expect(disconnect).toHaveBeenCalled();
  });

  it('watches the page again for a component registered after the others loaded', async () => {
    const first = uniqueTag();
    const later = uniqueTag();
    document.body.innerHTML = `<${first}></${first}>`;
    loader = new WebComponentLoader({ [first]: defining(first) }, { observeDOM: true });
    loader.init();
    await vi.waitFor(() => expect(loader.isLoaded(first)).toBe(true));

    loader.register(later, defining(later));
    document.body.insertAdjacentHTML('beforeend', `<${later}></${later}>`);

    await vi.waitFor(() => expect(loader.isLoaded(later)).toBe(true));
  });

  it('reports a loader that does not define its element as a failure', async () => {
    const tag = uniqueTag();
    const onError = vi.fn();
    document.body.innerHTML = `<${tag}></${tag}>`;
    loader = new WebComponentLoader({ [tag]: async () => ({}) }, { onError });

    loader.init();

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(tag, expect.any(Error)));
    expect(loader.isLoaded(tag)).toBe(false);
  });

  it('ignores a component that finishes loading after the loader is destroyed', async () => {
    const tag = uniqueTag();
    const onLoad = vi.fn();
    let finish;
    document.body.innerHTML = `<${tag}></${tag}>`;
    loader = new WebComponentLoader(
      { [tag]: () => new Promise(resolve => (finish = resolve)) },
      { onLoad }
    );
    loader.init();

    loader.destroy();
    customElements.define(tag, class extends HTMLElement {});
    finish();
    await nextTask();

    expect([onLoad.mock.calls.length, loader.isLoaded(tag)]).toEqual([0, false]);
  });

  it('warns through its logger when a tag has no loader', async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    loader = new WebComponentLoader({}, { logger });

    await loader.loadComponent('x-unknown');

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('x-unknown'));
  });
});
