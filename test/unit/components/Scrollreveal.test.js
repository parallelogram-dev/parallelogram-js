import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Scrollreveal from '../../../src/components/Scrollreveal.js';

class StubIntersectionObserver {
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

  it('reads delay and stagger as numbers', () => {
    expect(mountReveal({ delay: '120', stagger: '40' })).toMatchObject({ delay: 120, stagger: 40 });
  });
});
