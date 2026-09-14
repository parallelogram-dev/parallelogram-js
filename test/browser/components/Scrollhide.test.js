import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Scrollhide from '../../../src/components/Scrollhide.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const WAIT = { timeout: 2000 };
const frames = () =>
  new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const scrollTo = async y => {
  window.scrollTo(0, y);
  window.dispatchEvent(new Event('scroll'));
  await frames();
};

describe('Scrollhide', () => {
  let scrollhide;
  let eventBus;
  let header;

  beforeEach(() => {
    document.body.innerHTML = `
      <header data-scrollhide data-scrollhide-scroll-threshold="50" data-scrollhide-overlay-threshold="100">
        <a href="#top" id="home">Home</a>
      </header>
      <div style="height: 6000px"></div>`;
    header = document.querySelector('header');
    eventBus = new EventManager();
    scrollhide = new Scrollhide({ eventBus });
  });

  afterEach(async () => {
    scrollhide.destroy();
    document.body.replaceChildren();
    window.scrollTo(0, 0);
    await frames();
  });

  it('starts from the scroll position the page already has, without reporting a change', async () => {
    await scrollTo(800);
    const added = [];
    header.addEventListener('scrollhide:overlay-added', event => added.push(event));

    scrollhide.mount(header);

    expect([header.classList.contains('scrolloverlay'), added.length]).toEqual([true, 0]);
  });

  it('hides on scrolling down and shows on scrolling up, reporting each to the event bus once', async () => {
    const seen = [];
    for (const name of ['scrollhide:hidden', 'scrollhide:shown']) {
      eventBus.on(name, () => seen.push(name));
    }
    scrollhide.mount(header);

    await scrollTo(300);
    await vi.waitFor(() => expect(header.classList.contains('scrollhide')).toBe(true), WAIT);
    await scrollTo(150);

    await vi.waitFor(
      () =>
        expect([header.classList.contains('scrollhide'), seen]).toEqual([
          false,
          ['scrollhide:hidden', 'scrollhide:shown'],
        ]),
      WAIT
    );
  });

  it('ignores scroll movements of a few pixels', async () => {
    scrollhide.mount(header);
    await scrollTo(300);
    await vi.waitFor(() => expect(header.classList.contains('scrollhide')).toBe(true), WAIT);

    await scrollTo(298);
    await frames();

    expect(header.classList.contains('scrollhide')).toBe(true);
  });

  it('shows a hidden header when keyboard focus moves into it', async () => {
    scrollhide.mount(header);
    await scrollTo(300);
    await vi.waitFor(() => expect(header.classList.contains('scrollhide')).toBe(true), WAIT);

    document.getElementById('home').focus({ preventScroll: true });

    await vi.waitFor(() => expect(header.classList.contains('scrollhide')).toBe(false), WAIT);
  });

  it('restores the header and stops reacting to scrolling once unmounted', async () => {
    scrollhide.mount(header);
    await scrollTo(300);
    await vi.waitFor(() => expect(header.classList.contains('scrollhide')).toBe(true), WAIT);

    scrollhide.unmount(header);
    const afterUnmount = [...header.classList];
    await scrollTo(150);
    await scrollTo(600);

    expect([afterUnmount, [...header.classList]]).toEqual([[], []]);
  });
});
