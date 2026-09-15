import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A Trusted Types factory whose policies wrap each value with the method that made it */
const fakeTrustedTypes = ({ rejects = [] } = {}) => {
  const created = [];
  return {
    created,
    createPolicy(name, rules) {
      if (rejects.includes(name)) {
        throw new TypeError(`Policy "${name}" disallowed.`);
      }
      created.push(name);
      return Object.fromEntries(
        Object.entries(rules).map(([method, rule]) => [
          method,
          value => ({ [method]: rule(value) }),
        ])
      );
    },
  };
};

const load = () => import('../../../src/utils/trusted.js');

describe('trusted values', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('marks HTML, scripts and script addresses through the named policies', async () => {
    vi.stubGlobal('trustedTypes', fakeTrustedTypes());
    const { trustedHTML, trustedScript, trustedScriptURL } = await load();

    expect([
      trustedHTML('<p>Saved</p>'),
      trustedScript('track()'),
      trustedScriptURL('/tracker.js'),
    ]).toEqual([
      { createHTML: '<p>Saved</p>' },
      { createScript: 'track()' },
      { createScriptURL: '/tracker.js' },
    ]);
  });

  it('returns strings where Trusted Types are unsupported', async () => {
    vi.stubGlobal('trustedTypes', undefined);
    const { trustedHTML, trustedScript, trustedScriptURL } = await load();

    expect([
      trustedHTML('<p>Saved</p>'),
      trustedScript('track()'),
      trustedScriptURL('/tracker.js'),
    ]).toEqual(['<p>Saved</p>', 'track()', '/tracker.js']);
  });

  it('creates each policy once', async () => {
    const factory = fakeTrustedTypes();
    vi.stubGlobal('trustedTypes', factory);
    const { trustedHTML, trustedScript, trustedScriptURL } = await load();

    trustedHTML('<p>One</p>');
    trustedHTML('<p>Two</p>');
    trustedScript('track()');
    trustedScriptURL('/tracker.js');

    expect(factory.created).toEqual(['parallelogram', 'parallelogram-scripts']);
  });

  it('warns once, naming a policy the page does not allow, and falls back to strings', async () => {
    vi.stubGlobal('trustedTypes', fakeTrustedTypes({ rejects: ['parallelogram-scripts'] }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { trustedScript, trustedScriptURL } = await load();

    const values = [trustedScript('track()'), trustedScriptURL('/tracker.js'), trustedScript('')];

    expect({
      values,
      warnings: warn.mock.calls.map(([message]) => message.includes('"parallelogram-scripts"')),
    }).toEqual({ values: ['track()', '/tracker.js', ''], warnings: [true] });
  });
});
