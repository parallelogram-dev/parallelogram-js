import { afterEach, describe, expect, it, vi } from 'vitest';
import SelectLoader from '../../../src/components/SelectLoader.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const mountLoader = ({
  eventBus = new EventManager(),
  router,
  attributes = '',
  wrap = false,
} = {}) => {
  const markup = `
    <select
      data-selectloader
      data-selectloader-target="#product-details"
      data-selectloader-transition="none"
      ${attributes}
    >
      <option value="">Choose a product</option>
      <option value="/fragments/laptop.html">Laptop</option>
      <option value="/fragments/phone.html">Phone</option>
    </select>
    <div id="product-details"></div>
  `;
  document.body.innerHTML = wrap ? `<form>${markup}</form>` : markup;
  const select = document.querySelector('select');
  const loader = new SelectLoader({ eventBus, router });
  loader.mount(select);
  return { loader, select, target: document.querySelector('#product-details') };
};

const stubRouter = () => {
  const requests = [];
  const get = vi.fn(
    (url, { signal } = {}) =>
      new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        requests.push({ url, signal, respond: html => resolve({ data: html }) });
      })
  );
  return { get, requests };
};

const choose = (select, value) => {
  select.value = value;
  select.dispatchEvent(new Event('change'));
};

describe('SelectLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('removes its event bus listener when unmounted', () => {
    const bus = new EventManager();
    const { loader, select } = mountLoader({ eventBus: bus });

    loader.unmount(select);

    expect(bus.listenerCount('router:navigate-success')).toBe(0);
  });

  it('shows the most recent choice when an earlier one is still loading', async () => {
    const router = stubRouter();
    const { loader, select, target } = mountLoader({ router });

    choose(select, '/fragments/laptop.html');
    choose(select, '/fragments/phone.html');
    router.requests
      .find(request => request.url === '/fragments/phone.html')
      ?.respond('<p>Phone</p>');
    router.requests
      .find(request => request.url === '/fragments/laptop.html')
      ?.respond('<p>Laptop</p>');

    await vi.waitFor(() => expect(target.textContent).toBe('Phone'));
    expect(loader.getLoadState(select)).toMatchObject({ isLoading: false, hasError: false });
  });

  it('keeps the select usable and marks the target busy while content loads', () => {
    const router = stubRouter();
    const { select, target } = mountLoader({ router });

    choose(select, '/fragments/laptop.html');

    expect([select.disabled, target.getAttribute('aria-busy')]).toEqual([false, 'true']);
  });

  it('cancels its request when unmounted', () => {
    const router = stubRouter();
    const { loader, select } = mountLoader({ router });

    choose(select, '/fragments/laptop.html');
    loader.unmount(select);

    expect(router.requests[0].signal?.aborted).toBe(true);
  });

  it('shows the empty message as text rather than markup', () => {
    const { target } = mountLoader({ attributes: 'data-selectloader-empty-message="<img src=x>"' });

    expect([target.textContent.trim(), target.querySelector('img')]).toEqual(['<img src=x>', null]);
  });

  it('shows the error message as text and retries from its button', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('<b>Down</b>'))
      .mockResolvedValueOnce({ data: '<p>Laptop details</p>' });
    const { select, target } = mountLoader({ router: { get } });

    choose(select, '/fragments/laptop.html');
    await vi.waitFor(() => expect(target.querySelector('.select-loader__error')).not.toBeNull());
    const errorView = [target.querySelector('p').textContent, target.querySelector('b')];
    target.querySelector('button').click();

    await vi.waitFor(() => expect(target.textContent).toBe('Laptop details'));
    expect(errorView).toEqual(['<b>Down</b>', null]);
  });

  it('puts the previous choice back when a listener cancels the change', () => {
    const router = stubRouter();
    const { select } = mountLoader({ router });
    select.addEventListener('selectloader:before-change', event => event.preventDefault());

    choose(select, '/fragments/phone.html');

    expect([select.value, router.get.mock.calls.length]).toEqual(['', 0]);
  });

  it('treats a response that is not HTML as an error', async () => {
    const router = { get: vi.fn(async () => ({ data: { product: 'Laptop' } })) };
    const { select, target } = mountLoader({ router });
    const errors = [];
    select.addEventListener('selectloader:error', event => errors.push(event.detail.error.message));

    choose(select, '/fragments/laptop.html');

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(target.textContent).not.toContain('[object Object]');
  });

  it('announces the content it has loaded', async () => {
    const router = { get: vi.fn(async () => ({ data: '<p>Laptop details</p>' })) };
    const { select } = mountLoader({ router });

    choose(select, '/fragments/laptop.html');

    await vi.waitFor(() =>
      expect(document.querySelector('[data-parallelogram-announcer]')?.textContent).toBe(
        'Laptop loaded'
      )
    );
  });

  it('swaps content straight away when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));
    const router = { get: vi.fn(async () => ({ data: '<p>Laptop details</p>' })) };
    document.body.innerHTML = `
      <select data-selectloader data-selectloader-target="#product-details"
              data-selectloader-transition="slide" data-selectloader-transition-duration="400">
        <option value="">Choose a product</option>
        <option value="/fragments/laptop.html">Laptop</option>
      </select>
      <div id="product-details"></div>`;
    const select = document.querySelector('select');
    const target = document.querySelector('#product-details');
    new SelectLoader({ eventBus: new EventManager(), router }).mount(select);

    choose(select, '/fragments/laptop.html');

    await vi.waitFor(() => expect(target.textContent).toBe('Laptop details'), { timeout: 150 });
  });

  it('reports only the newer load when the choice changes while content fades in', async () => {
    const router = stubRouter();
    document.body.innerHTML = `
      <select data-selectloader data-selectloader-target="#product-details"
              data-selectloader-transition="fade" data-selectloader-transition-duration="150">
        <option value="">Choose a product</option>
        <option value="/fragments/laptop.html">Laptop</option>
        <option value="/fragments/phone.html">Phone</option>
      </select>
      <div id="product-details"></div>`;
    const select = document.querySelector('select');
    const target = document.querySelector('#product-details');
    const loaded = [];
    select.addEventListener('selectloader:loaded', event => loaded.push(event.detail.url));
    const complete = new Promise(resolve =>
      select.addEventListener('selectloader:complete', event => resolve(event.detail.url))
    );
    new SelectLoader({ eventBus: new EventManager(), router }).mount(select);

    choose(select, '/fragments/laptop.html');
    router.requests[0].respond('<p>Laptop</p>');
    await vi.waitFor(() => expect(target.textContent).toBe('Laptop'), { interval: 5 });
    choose(select, '/fragments/phone.html');
    router.requests[1].respond('<p>Phone</p>');
    await complete;

    expect(loaded).toEqual(['/fragments/phone.html']);
  });

  it('leaves no inline styles behind after a slide', async () => {
    const router = { get: vi.fn(async () => ({ data: '<p>Laptop details</p>' })) };
    document.body.innerHTML = `
      <select data-selectloader data-selectloader-target="#product-details"
              data-selectloader-transition="slide" data-selectloader-transition-duration="10">
        <option value="">Choose a product</option>
        <option value="/fragments/laptop.html">Laptop</option>
      </select>
      <div id="product-details"></div>`;
    const select = document.querySelector('select');
    const complete = new Promise(resolve =>
      select.addEventListener('selectloader:complete', resolve)
    );
    new SelectLoader({ eventBus: new EventManager(), router }).mount(select);

    choose(select, '/fragments/laptop.html');
    await complete;

    expect(document.querySelector('#product-details').getAttribute('style') ?? '').toBe('');
  });
});
