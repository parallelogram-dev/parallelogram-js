import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransitionManager } from '../../../src/managers/TransitionManager.js';

const STYLES = `
  @keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }
  .tm-fade { animation: tm-fade 60ms linear; }
  .tm-still { color: rebeccapurple; }
`;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('TransitionManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
    document.head.querySelector('[data-tm-styles]')?.remove();
  });

  const renderPanel = (attributes = '') => {
    const style = document.createElement('style');
    style.dataset.tmStyles = '';
    style.textContent = STYLES;
    document.head.append(style);
    document.body.insertAdjacentHTML('beforeend', `<div ${attributes}>Filters</div>`);
    return document.body.lastElementChild;
  };

  it('removes the enter class once its animation has finished', async () => {
    const panel = renderPanel('data-transition-enter-class="tm-fade"');

    await new TransitionManager().enter(panel);

    expect(panel.classList.contains('tm-fade')).toBe(false);
  });

  it('finishes straight away when the exit class does not animate', async () => {
    const panel = renderPanel('data-transition-exit-class="tm-still"');

    const outcome = await Promise.race([
      new TransitionManager().exit(panel).then(() => 'finished'),
      wait(1000).then(() => 'still waiting'),
    ]);

    expect(outcome).toBe('finished');
  });

  it('skips motion when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));
    const panel = renderPanel('data-transition-duration="2000"');

    const started = performance.now();
    await new TransitionManager().enter(panel);

    expect(performance.now() - started).toBeLessThan(500);
  });
});
