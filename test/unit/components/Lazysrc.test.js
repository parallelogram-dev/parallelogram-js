import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Lazysrc from '../../../src/components/Lazysrc.js';

class RecordingObserver {
  static latest = null;

  constructor(callback) {
    this.callback = callback;
    this.observed = new Set();
    RecordingObserver.latest = this;
  }

  observe(element) {
    this.observed.add(element);
  }

  unobserve(element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.observed.clear();
  }

  reveal(elements) {
    this.callback(elements.map(target => ({ target, isIntersecting: true, intersectionRatio: 1 })));
  }
}

class PendingImage {
  static created = [];

  constructor() {
    PendingImage.created.push(this);
  }
}

const lazyBackground = name => {
  const panel = document.createElement('div');
  panel.setAttribute('data-lazysrc', '');
  panel.setAttribute('data-lazysrc-bg', `/images/${name}.jpg`);
  document.body.append(panel);
  return panel;
};

describe('Lazysrc', () => {
  beforeEach(() => {
    RecordingObserver.latest = null;
    PendingImage.created = [];
    vi.stubGlobal('IntersectionObserver', RecordingObserver);
    vi.stubGlobal('Image', PendingImage);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('starts loading every background image that enters the viewport at the same time', async () => {
    const lazysrc = new Lazysrc();
    const panels = ['harbour', 'market', 'station'].map(lazyBackground);
    panels.forEach(panel => lazysrc.mount(panel));

    RecordingObserver.latest.reveal(panels);

    await vi.waitFor(() => expect(PendingImage.created).toHaveLength(3));
  });

  it('stops observing a background image once it is unmounted', () => {
    const lazysrc = new Lazysrc();
    const panel = lazyBackground('harbour');
    lazysrc.mount(panel);

    lazysrc.unmount(panel);

    expect(RecordingObserver.latest.observed.has(panel)).toBe(false);
  });

  it('ignores force-load requests for an unmounted background image', async () => {
    const lazysrc = new Lazysrc();
    const panel = lazyBackground('harbour');
    lazysrc.mount(panel);
    lazysrc.unmount(panel);

    panel.dispatchEvent(new CustomEvent('lazysrc:forceLoad'));
    await Promise.resolve();

    expect(PendingImage.created).toHaveLength(0);
  });

  it('reports the load state of a background image synchronously', () => {
    const lazysrc = new Lazysrc();
    const panel = lazyBackground('harbour');
    lazysrc.mount(panel);

    expect([lazysrc.isLoaded(panel), lazysrc.isLoading(panel), lazysrc.hasError(panel)]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('settles loading an image with no source in the error state', async () => {
    const lazysrc = new Lazysrc();
    const img = document.createElement('img');
    img.setAttribute('data-lazysrc', '');
    document.body.append(img);
    lazysrc.mount(img);

    const outcome = await Promise.race([
      lazysrc.loadElement(img).then(() => 'settled'),
      new Promise(resolve => setTimeout(() => resolve('pending'), 200)),
    ]);

    expect([outcome, img.getAttribute('data-lazysrc-state')]).toEqual(['settled', 'error']);
  });

  it('finishes loading everything when an image has no source', async () => {
    const lazysrc = new Lazysrc();
    const img = document.createElement('img');
    img.setAttribute('data-lazysrc', '');
    document.body.append(img);
    lazysrc.mount(img);

    const outcome = await Promise.race([
      lazysrc.loadAll().then(() => 'settled'),
      new Promise(resolve => setTimeout(() => resolve('pending'), 200)),
    ]);

    expect(outcome).toBe('settled');
  });

  it('counts the images it manages in its status', () => {
    const lazysrc = new Lazysrc();
    ['harbour', 'market'].map(lazyBackground).forEach(panel => lazysrc.mount(panel));

    expect(lazysrc.getStatus()).toMatchObject({
      totalElements: 2,
      loadedCount: 0,
      loadingCount: 0,
    });
  });
});
