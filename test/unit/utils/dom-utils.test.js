import { afterEach, describe, expect, it, vi } from 'vitest';
import { deepActiveElement, fadeIn, fadeOut } from '../../../src/utils/dom-utils.js';

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

describe('deepActiveElement', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('returns the focused element inside an open shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const button = document.createElement('button');
    host.attachShadow({ mode: 'open' }).append(button);

    button.focus();

    expect(deepActiveElement()).toBe(button);
  });
});
