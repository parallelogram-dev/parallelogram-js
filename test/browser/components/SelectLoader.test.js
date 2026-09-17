import { afterEach, describe, expect, it, vi } from 'vitest';
import SelectLoader from '../../../src/components/SelectLoader.js';
import { EventManager } from '../../../src/managers/EventManager.js';

describe('SelectLoader in a form', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('loads the choice the form restores when it is reset', async () => {
    const router = { get: vi.fn(async url => ({ data: `<p>${url}</p>` })) };
    document.body.innerHTML = `
      <form>
        <select data-selectloader data-selectloader-target="#product-details" data-selectloader-transition="none">
          <option value="">Choose a product</option>
          <option value="/fragments/laptop.html" selected>Laptop</option>
          <option value="/fragments/phone.html">Phone</option>
        </select>
      </form>
      <div id="product-details"></div>`;
    const select = document.querySelector('select');
    const target = document.querySelector('#product-details');
    new SelectLoader({ eventBus: new EventManager(), router }).mount(select);
    select.value = '/fragments/phone.html';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(target.textContent).toBe('/fragments/phone.html'));

    select.form.reset();

    await vi.waitFor(() => expect(target.textContent).toBe('/fragments/laptop.html'));
  });
});

describe('SelectLoader before the router loads', () => {
  const mountWithoutRouter = eventBus => {
    document.body.innerHTML = `
      <select data-selectloader data-selectloader-target="#product-details" data-selectloader-transition="none">
        <option value="">Choose a product</option>
        <option value="/fragments/laptop.html" selected>Laptop</option>
      </select>
      <div id="product-details"></div>`;
    const select = document.querySelector('select');
    /* The app asked for a router, which is still loading */
    const loader = new SelectLoader({ eventBus, routerPending: true });
    loader.mount(select);
    return { loader, select, target: document.querySelector('#product-details') };
  };

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('loads the selected fragment once the router starts', async () => {
    const eventBus = new EventManager();
    const router = { get: vi.fn(async url => ({ data: `<p>${url}</p>` })) };
    const { loader, target } = mountWithoutRouter(eventBus);

    loader.router = router;
    eventBus.emit('router:initialized', { currentUrl: new URL(location.href) });

    await vi.waitFor(() => expect(target.textContent).toBe('/fragments/laptop.html'));
    expect([router.get.mock.calls.length, target.querySelector('.select-loader__error')]).toEqual([
      1,
      null,
    ]);
  });

  it('does not load when unmounted before the router starts', async () => {
    const eventBus = new EventManager();
    const router = { get: vi.fn(async url => ({ data: `<p>${url}</p>` })) };
    const { loader, select, target } = mountWithoutRouter(eventBus);

    loader.unmount(select);
    loader.router = router;
    eventBus.emit('router:initialized', { currentUrl: new URL(location.href) });
    await new Promise(resolve => setTimeout(resolve));

    expect([router.get.mock.calls.length, target.textContent.trim()]).toEqual([0, '']);
  });

  it('shows the error and a retry in the words the page or the site chose', async () => {
    SelectLoader.defaults.retryLabel = 'Réessayer';
    try {
      const router = {
        get: vi.fn(async () => {
          throw new Error('');
        }),
      };
      document.body.innerHTML = `
        <select data-selectloader data-selectloader-target="#product-details" data-selectloader-transition="none" data-selectloader-error-message="Le chargement a échoué">
          <option value="">Choose a product</option>
          <option value="/fragments/phone.html">Phone</option>
        </select>
        <div id="product-details"></div>`;
      const select = document.querySelector('select');
      new SelectLoader({ eventBus: new EventManager(), router }).mount(select);
      select.value = '/fragments/phone.html';
      select.dispatchEvent(new Event('change'));
      await vi.waitFor(() =>
        expect(document.querySelector('.select-loader__error')).not.toBeNull()
      );
      const error = document.querySelector('.select-loader__error');

      expect([
        error.querySelector('p').textContent,
        error.querySelector('button').textContent,
      ]).toEqual(['Le chargement a échoué', 'Réessayer']);
    } finally {
      SelectLoader.defaults.retryLabel = 'Retry';
    }
  });
});
