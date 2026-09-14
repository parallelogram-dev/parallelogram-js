import { afterEach, describe, expect, it } from 'vitest';
import { injectScript } from '../../../src/adapters/_script.js';

const fixture = new URL('../fixtures/tracker-script.js', import.meta.url).href;

describe('injectScript', () => {
  afterEach(() => {
    document
      .querySelectorAll('script[src*="tracker-script.js"]')
      .forEach(script => script.remove());
    delete globalThis.trackerFixtureRuns;
  });

  it('adds a script once, with the nonce, and resolves after it has run', async () => {
    const src = `${fixture}?once`;

    const first = injectScript(src, { nonce: 'r4nd0m' });
    const again = injectScript(src);
    const script = await first;

    expect([
      first === again,
      document.querySelectorAll(`script[src="${src}"]`).length,
      script.nonce,
      globalThis.trackerFixtureRuns,
    ]).toEqual([true, 1, 'r4nd0m', 1]);
  });

  it('rejects and removes a script that fails to load', async () => {
    const src = 'http://127.0.0.1:9/tracker.js';

    await expect(injectScript(src)).rejects.toThrow(src);
    expect(document.querySelector(`script[src="${src}"]`)).toBeNull();
  });

  it('treats a script a vendor snippet already added as loaded', async () => {
    const existing = document.createElement('script');
    existing.src = `${fixture}?snippet`;
    document.head.append(existing);

    await expect(injectScript(`${fixture}?snippet`)).resolves.toBe(existing);
  });
});
