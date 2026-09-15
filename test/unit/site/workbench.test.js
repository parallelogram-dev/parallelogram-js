import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContracts } from '../../../site/build/pages.js';
import { designSystemPage, previewDocument } from '../../../site/build/render.js';
import { TOKEN_GROUPS, exportCss } from '../../../site/src/workbench/tokens.js';

const contracts = await loadContracts();
const tokenNames = TOKEN_GROUPS.flatMap(group => group.tokens.map(token => token.name));
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

  it('offers each token once', () => {
    expect(tokenNames.length).toBe(new Set(tokenNames).size);
  });

  it('gives colour tokens a light and a dark field, and other tokens one field for both', () => {
    const page = new DOMParser().parseFromString(designSystemPage(), 'text/html');
    const scopes = name =>
      [...page.querySelectorAll('[data-token-input]')]
        .filter(input => input.name === name)
        .map(input => input.dataset.tokenInput);

    expect([scopes('--surface-panel-color-bg'), scopes('--surface-panel-radius')]).toEqual([
      ['light', 'dark'],
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
