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

const lazyImage = name => {
  const image = document.createElement('img');
  image.setAttribute('data-lazysrc', '');
  image.setAttribute('data-lazysrc-src', `/images/${name}.jpg`);
  document.body.append(image);
  return image;
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

  it('starts loading every image that enters the viewport at the same time', async () => {
    const lazysrc = new Lazysrc();
    const images = ['harbour', 'market', 'station'].map(lazyImage);
    images.forEach(image => lazysrc.mount(image));

    RecordingObserver.latest.reveal(images);

    await vi.waitFor(() => expect(PendingImage.created).toHaveLength(3));
  });

  it('stops observing an image once it is unmounted', () => {
    const lazysrc = new Lazysrc();
    const image = lazyImage('harbour');
    lazysrc.mount(image);

    lazysrc.unmount(image);

    expect(RecordingObserver.latest.observed.has(image)).toBe(false);
  });

  it('ignores force-load requests for an unmounted image', async () => {
    const lazysrc = new Lazysrc();
    const image = lazyImage('harbour');
    lazysrc.mount(image);
    lazysrc.unmount(image);

    image.dispatchEvent(new CustomEvent('lazysrc:forceLoad'));
    await Promise.resolve();

    expect(PendingImage.created).toHaveLength(0);
  });

  it('reports the load state of an image synchronously', () => {
    const lazysrc = new Lazysrc();
    const image = lazyImage('harbour');
    lazysrc.mount(image);

    expect([lazysrc.isLoaded(image), lazysrc.isLoading(image), lazysrc.hasError(image)]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('counts the images it manages in its status', () => {
    const lazysrc = new Lazysrc();
    ['harbour', 'market'].map(lazyImage).forEach(image => lazysrc.mount(image));

    expect(lazysrc.getStatus()).toMatchObject({
      totalElements: 2,
      loadedCount: 0,
      loadingCount: 0,
    });
  });
});
