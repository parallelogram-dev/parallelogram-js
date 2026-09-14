import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Scrollreveal from '../../../src/components/Scrollreveal.js';
import revealStyles from '../../../src/styles/framework/components/reveal.scss';

const WAIT = { timeout: 2000 };
const stateOf = element => element.getAttribute('data-reveal-state');

const section = (attributes = '', text = 'Seasonal menu') => {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<section data-reveal data-reveal-stagger="0" ${attributes}>${text}</section>`
  );
  return document.body.lastElementChild;
};

describe('Scrollreveal', () => {
  let style;
  let scrollreveal;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = `${revealStyles}\n:root { --reveal-transition-duration: 40ms; }`;
    document.head.append(style);
  });

  afterEach(() => {
    scrollreveal?.destroy();
    scrollreveal = null;
    style.remove();
    document.body.replaceChildren();
    window.scrollTo(0, 0);
  });

  it('reveals through data-reveal-state and leaves no inline styles behind', async () => {
    scrollreveal = new Scrollreveal();
    const element = section();

    scrollreveal.mount(element);

    await vi.waitFor(() => expect(stateOf(element)).toBe('visible'), WAIT);
    expect([element.getAttribute('style'), getComputedStyle(element).opacity]).toEqual([null, '1']);
  });

  it('shares one observer between elements with the same options', () => {
    scrollreveal = new Scrollreveal();
    const created = vi.spyOn(window, 'IntersectionObserver');

    ['Starters', 'Mains', 'Desserts'].forEach(text =>
      scrollreveal.mount(section('data-reveal-threshold="0.2"', text))
    );

    expect(created).toHaveBeenCalledTimes(1);
  });

  it('stops watching with the old observer when the threshold changes', () => {
    scrollreveal = new Scrollreveal();
    const element = section('data-reveal-once="false"');
    scrollreveal.mount(element);
    const unobserve = vi.spyOn(IntersectionObserver.prototype, 'unobserve');

    scrollreveal.updateThreshold(element, 0.6);

    expect(unobserve).toHaveBeenCalledWith(element);
  });

  it('gives its observer the root margin an element asks for', () => {
    scrollreveal = new Scrollreveal();
    const created = vi.spyOn(window, 'IntersectionObserver');

    scrollreveal.mount(section('data-reveal-root-margin="0px 0px 300px 0px"'));

    expect(created.mock.calls[0]?.[1]).toMatchObject({ rootMargin: '0px 0px 300px 0px' });
  });

  it('reveals straight away, ignoring delays, when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));
    scrollreveal = new Scrollreveal();
    const element = section('data-reveal-delay="1500"');

    scrollreveal.mount(element);

    await vi.waitFor(() => expect(stateOf(element)).toBe('visible'), { timeout: 300 });
  });

  it('uses the stagger set with setStagger for elements that do not set their own', () => {
    scrollreveal = new Scrollreveal();
    scrollreveal.setStagger(250);
    document.body.insertAdjacentHTML('beforeend', '<section data-reveal>Wine list</section>');
    const element = document.body.lastElementChild;

    scrollreveal.mount(element);

    expect(scrollreveal.getState(element).stagger).toBe(250);
  });
});
