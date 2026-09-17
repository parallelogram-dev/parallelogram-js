import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContracts } from '../../../site/build/pages.js';
import { designSystemPage, previewDocument } from '../../../site/build/render.js';
import { tokenGroups } from '../../../site/build/tokens.js';
import { exportCss } from '../../../site/src/workbench/tokens.js';

const contracts = await loadContracts();
const tokenNames = tokenGroups().flatMap(group => group.tokens.map(token => token.name));
const declared = [
  '../../../src/styles/design-system/_root.scss',
  '../../../src/styles/framework/index.scss',
]
  .map(file => readFileSync(new URL(file, import.meta.url), 'utf8'))
  .join('\n');

describe('design system workbench', () => {
  it('only offers tokens the design system declares', () => {
    expect(tokenNames.filter(name => !declared.includes(`${name}:`))).toEqual([]);
  });

  it('puts every declared token on the page exactly once, with a way to copy it', () => {
    const page = new DOMParser().parseFromString(
      designSystemPage(new Map(), new Map(), tokenGroups()),
      'text/html'
    );
    const fields = [...page.querySelectorAll('[data-token-input]')].map(input => input.name);
    const copies = [...page.querySelectorAll('[data-copytoclipboard-target]')].map(button =>
      button.getAttribute('data-copytoclipboard-target')
    );

    /* Rows are grouped by family and derived from the names, so a token could otherwise fall out of
       the page without anything failing */
    expect([
      tokenNames.filter(name => fields.filter(field => field === name).length !== 1),
      tokenNames.filter(name => !copies.includes(`#token${name.replace(/^-+/, '-')}`)),
    ]).toEqual([[], []]);
  });

  it('offers every token the design system declares', () => {
    const declaredNames = [...declared.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(match => match[1]);

    /* The page once showed 90 of the 158 tokens declared, and nothing failed. The other assertion
       guards the opposite direction, which is why that went unnoticed. */
    expect([...new Set(declaredNames)].filter(name => !tokenNames.includes(name))).toEqual([]);
  });

  it('offers each token once', () => {
    expect(tokenNames.length).toBe(new Set(tokenNames).size);
  });

  it('gives a colour token a field for the theme on show, and other tokens one for both', () => {
    const page = new DOMParser().parseFromString(
      designSystemPage(new Map(), new Map(), tokenGroups()),
      'text/html'
    );
    const scopes = name =>
      [...page.querySelectorAll('[data-token-input]')]
        .filter(input => input.name === name)
        .map(input => input.dataset.tokenInput);

    /* A colour holds a value per theme and the switch decides which one is being edited, so it has
       one field rather than two; everything else holds one value both themes share. */
    expect([scopes('--surface-panel-color-bg'), scopes('--surface-panel-radius')]).toEqual([
      ['theme'],
      ['both'],
    ]);
  });

  it('exports changed values in name order, with dark values on the dark theme', () => {
    const css = exportCss({
      light: new Map([
        ['--surface-panel-radius', '1em'],
        ['--framework-focus-width', '3px'],
      ]),
      dark: new Map([['--surface-panel-color-bg', '#171d26']]),
    });

    expect(css).toBe(
      ':root {\n  --framework-focus-width: 3px;\n  --surface-panel-radius: 1em;\n}\n\n:root[data-theme="dark"] {\n  --surface-panel-color-bg: #171d26;\n}'
    );
  });

  it('says there is nothing to copy until a value changes', () => {
    expect(exportCss({ light: new Map(), dark: new Map() })).toBe('/* No changes yet */');
  });

  it('shows every example of every component in the preview', () => {
    const html = previewDocument(contracts);
    const missing = contracts
      .flatMap(contract =>
        (contract.examples ?? []).map(example => `${contract.name}:${example.id}`)
      )
      .filter(key => !html.includes(`data-specimen="${key}"`));

    expect(missing).toEqual([]);
  });
});
