import { afterEach, describe, expect, it, vi } from 'vitest';
import { fadeIn, fadeOut } from '../../../src/utils/dom-utils.js';

const preferReducedMotion = () =>
  vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));

describe('fade helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['fadeIn', fadeIn],
    ['fadeOut', fadeOut],
  ])('%s finishes at once when the user prefers reduced motion', async (_name, fade) => {
    vi.useFakeTimers();
    preferReducedMotion();
    let finished = false;

    fade(document.createElement('div'), 2000).then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(finished).toBe(true);
  });
});
