import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Which components read each design token, read from the stylesheets rather than written by hand
 *
 * A token page that says what reads a token is only worth having if it cannot drift, so this is
 * computed from the source: a component reads a token when its stylesheet names it, whether
 * directly or as the fallback of one of its own properties. Tokens nothing reads are reported as
 * such, because a knob that does nothing is worth knowing about.
 */

/* Resolved here rather than imported from pages.js, which imports this module: a cycle would leave
   the path undefined while this module is still evaluating */
const STYLES = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/styles');

const walk = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? walk(path.join(dir, entry.name))
      : entry.name.endsWith('.scss')
        ? [path.join(dir, entry.name)]
        : []
  );

/** `PModal.scss` and `datatable.scss` both name the thing they style */
const label = file => {
  const name = path.basename(file, '.scss').replace(/^_/, '');
  if (/^P[A-Z]/.test(name)) return `<${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}>`;
  return name;
};

/**
 * What each token is declared as, read from the design system rather than the browser
 *
 * `getComputedStyle` substitutes `var()` before it returns, so a token that follows another is
 * indistinguishable from one holding its own value by the time it reaches the page. The difference
 * matters: editing a reference replaces it with a literal and cuts the token out of the layer it
 * was following, which is the opposite of what this page is for.
 *
 * @param {string[]} names
 * @returns {Map<string, {source: string, follows: string|null}>}
 */
export function tokenSources(names) {
  /* Not only _root.scss: the framework declares its own focus and motion tokens */
  const declarations = walk(STYLES)
    .map(file => readFileSync(file, 'utf8'))
    .join('\n');
  const sources = new Map();

  for (const name of names) {
    const match = declarations.match(new RegExp(`${name}:\\s*([^;]+);`));
    const declared = match ? match[1].trim().replace(/\s+/g, ' ') : '';
    /* A declaration may be wrapped in Sass interpolation, which is not part of the value */
    const source = declared.replace(/^#\{(.*)\}$/, '$1');
    const follows = source.match(/^var\(\s*(--[a-z0-9-]+)/)?.[1] ?? null;
    sources.set(name, { source, follows });
  }
  return sources;
}

/**
 * @param {string[]} names - The token names to look for
 * @returns {Map<string, string[]>} Each token's readers, in file order; empty when nothing reads it
 */
export function tokenReaders(names) {
  const files = walk(STYLES).filter(file => !file.includes('design-system/_root'));
  const sources = files.map(file => [file, readFileSync(file, 'utf8')]);
  const readers = new Map();

  for (const name of names) {
    const found = sources
      .filter(([, css]) => css.includes(`var(${name}`))
      .map(([file]) => label(file));
    readers.set(name, [...new Set(found)]);
  }
  return readers;
}
