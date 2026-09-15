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

  it('reports a failure without swapping again when a step after the swap throws', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';
    const eventBus = new EventManager();
    const replaced = vi.fn();
    eventBus.on('page:fragments-replaced', replaced);
    const unmountWithin = vi.fn();
    const swapper = new FragmentSwapper({
      options: { focusTarget: '[' },
      eventBus,
      mountWithin: vi.fn(),
      unmountWithin,
    });

    await swapper.replaceFragments('<main data-view="main"><h1>Pricing</h1></main>', {
      viewTargets: ['main'],
      fromNavigation: true,
    });

    expect([unmountWithin.mock.calls.length, replaced.mock.calls[0][0].results[0].success]).toEqual(
      [1, false]
    );
  });

  it('finishes a navigation with scrolling and transition classes while the tab is hidden', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.stubGlobal('requestAnimationFrame', () => 0);
    const swapper = new FragmentSwapper({
      options: { targetGroupTransitions: { main: { out: 'fade-out', in: 'fade-in' } } },
      eventBus: new EventManager(),
      mountWithin: vi.fn(),
      unmountWithin: vi.fn(),
    });

    const swap = swapper.replaceFragments('<main data-view="main">Pricing</main>', {
      viewTargets: ['main'],
    });

    await expect(
      Promise.race([swap.then(() => 'finished'), new Promise(r => setTimeout(r, 500, 'waiting'))])
    ).resolves.toBe('finished');
  });

  it('adds no head assets for a swap whose signal has already aborted', async () => {
    document.body.innerHTML = '<main data-view="main">Home</main>';
    const swapper = new FragmentSwapper({
      options: { assetTimeout: 10 },
      eventBus: new EventManager(),
      mountWithin: vi.fn(),
      unmountWithin: vi.fn(),
    });
    const navigation = new AbortController();
    navigation.abort();

    await swapper.replaceFragments(
      '<html><head><link rel="stylesheet" href="/pricing.css"></head><body><main data-view="main">Pricing</main></body></html>',
      { viewTargets: ['main'], signal: navigation.signal }
    );

    expect(document.head.querySelector('link[href$="/pricing.css"]')).toBeNull();
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
