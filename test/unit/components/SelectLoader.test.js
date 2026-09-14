import { afterEach, describe, expect, it } from 'vitest';
import SelectLoader from '../../../src/components/SelectLoader.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const mountLoader = bus => {
  document.body.innerHTML = `
    <select data-selectloader data-selectloader-target="#product-details">
      <option value="">Choose a product</option>
      <option value="/fragments/laptop.html">Laptop</option>
    </select>
    <div id="product-details"></div>
  `;
  const select = document.querySelector('select');
  const loader = new SelectLoader({ eventBus: bus });
  loader.mount(select);
  return { loader, select };
};

describe('SelectLoader', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('removes its event bus listener when unmounted', () => {
    const bus = new EventManager();
    const { loader, select } = mountLoader(bus);

    loader.unmount(select);

    expect(bus.listenerCount('router:navigate-success')).toBe(0);
  });
});
