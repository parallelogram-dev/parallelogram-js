import { afterEach, describe, expect, it, vi } from 'vitest';
import { FragmentSwapper } from '../../../src/core/FragmentSwapper.js';
import { EventManager } from '../../../src/managers/EventManager.js';

describe('FragmentSwapper', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('replaces a fragment and remounts its components without a PageManager', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';
    const mountWithin = vi.fn();
    const unmountWithin = vi.fn();
    const swapper = new FragmentSwapper({
      eventBus: new EventManager(),
      mountWithin,
      unmountWithin,
    });

    await swapper.replaceFragments('<main data-view="main">Pricing</main>', {
      viewTargets: ['main'],
    });

    const main = document.querySelector('main');
    expect({
      text: main.textContent,
      unmounted: unmountWithin.mock.calls[0]?.[0] === main,
      mounted: mountWithin.mock.calls.some(([root]) => root === main),
    }).toEqual({ text: 'Pricing', unmounted: true, mounted: true });
  });
});
