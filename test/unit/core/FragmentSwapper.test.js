import { afterEach, describe, expect, it, vi } from 'vitest';
import { FragmentSwapper } from '../../../src/core/FragmentSwapper.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const createSwapper = (Swapper = FragmentSwapper) =>
  new Swapper({ eventBus: new EventManager(), mountWithin: vi.fn(), unmountWithin: vi.fn() });

const ownerOf = (prototype, property) =>
  Object.getOwnPropertyDescriptor(prototype, property)
    ? prototype
    : ownerOf(Object.getPrototypeOf(prototype), property);

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

  it('moves the parsed content into the fragment without setting its HTML', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';
    const setInnerHTML = vi.spyOn(ownerOf(HTMLElement.prototype, 'innerHTML'), 'innerHTML', 'set');

    await createSwapper().replaceFragments('<main data-view="main"><h1>Pricing</h1></main>', {
      viewTargets: ['main'],
    });

    expect({
      heading: document.querySelector('main h1')?.textContent,
      assignedInPage: setInnerHTML.mock.contexts.filter(
        element => element.ownerDocument === document
      ).length,
    }).toEqual({ heading: 'Pricing', assignedInPage: 0 });
  });

  it('keeps noscript content as text, as the page parser leaves it', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';

    await createSwapper().replaceFragments(
      '<main data-view="main"><noscript><img src="/pixel.gif" alt=""></noscript></main>',
      { viewTargets: ['main'] }
    );

    const noscript = document.querySelector('main noscript');
    expect([noscript.children.length, noscript.textContent]).toEqual([
      0,
      '<img src="/pixel.gif" alt="">',
    ]);
  });

  it('runs swapped-in scripts with addresses and code from the scripts policy', async () => {
    vi.resetModules();
    const calls = [];
    vi.stubGlobal('trustedTypes', {
      createPolicy: (_name, rules) =>
        Object.fromEntries(
          Object.entries(rules).map(([method, rule]) => [
            method,
            value => {
              calls.push([method, value]);
              return rule(value);
            },
          ])
        ),
    });
    const { FragmentSwapper: IsolatedSwapper } =
      await import('../../../src/core/FragmentSwapper.js');
    document.body.innerHTML = '<main data-view="main">Home</main>';

    await createSwapper(IsolatedSwapper).replaceFragments(
      '<main data-view="main"><script type="application/javascript" src="/pricing.js"></script><script>void "pricing";</script></main>',
      { viewTargets: ['main'] }
    );

    expect(calls.filter(([method]) => method !== 'createHTML')).toEqual([
      ['createScriptURL', '/pricing.js'],
      ['createScript', ''],
      ['createScript', 'void "pricing";'],
    ]);
  });
});
