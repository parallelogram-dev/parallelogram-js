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
