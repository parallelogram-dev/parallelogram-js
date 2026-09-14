import { afterEach, describe, expect, it, vi } from 'vitest';
import SelectLoader from '../../../src/components/SelectLoader.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const mountLoader = ({ eventBus = new EventManager(), router } = {}) => {
  document.body.innerHTML = `
    <select
      data-selectloader
      data-selectloader-target="#product-details"
      data-selectloader-transition="none"
    >
      <option value="">Choose a product</option>
      <option value="/fragments/laptop.html">Laptop</option>
      <option value="/fragments/phone.html">Phone</option>
    </select>
    <div id="product-details"></div>
  `;
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
});
