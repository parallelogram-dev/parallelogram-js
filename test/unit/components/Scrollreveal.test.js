import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Scrollreveal from '../../../src/components/Scrollreveal.js';

class StubIntersectionObserver {
  static latest = null;

  constructor(callback) {
    this.callback = callback;
    StubIntersectionObserver.latest = this;
  }

  trigger(target, isIntersecting) {
    this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }]);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

const mountReveal = (attributes = {}) => {
  const element = document.createElement('div');
  element.setAttribute('data-reveal', '');
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(`data-reveal-${name}`, value);
  }
  document.body.append(element);

  const reveal = new Scrollreveal();
  reveal.mount(element);
  return reveal.getState(element);
};

describe('Scrollreveal', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('reveals every time the element enters the viewport when once is "false"', () => {
    expect(mountReveal({ once: 'false' }).once).toBe(false);
  });

  it('reveals an element again when it re-enters the viewport while hiding', async () => {
    mountReveal({ once: 'false', stagger: '0' });
    const element = document.querySelector('[data-reveal]');
    StubIntersectionObserver.latest.trigger(element, true);
    await vi.waitFor(() => expect(element.getAttribute('data-reveal-state')).toBe('visible'));

    StubIntersectionObserver.latest.trigger(element, false);
    StubIntersectionObserver.latest.trigger(element, true);

    await vi.waitFor(() => expect(element.getAttribute('data-reveal-state')).toBe('visible'));
  });

  it('reads delay and stagger as numbers', () => {
    expect(mountReveal({ delay: '120', stagger: '40' })).toMatchObject({ delay: 120, stagger: 40 });
  });

  it('leaves content visible when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));

    mountReveal();

    expect(document.querySelector('[data-reveal]').style.opacity).toBe('');
  });
});
