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

/**
 * @typedef {'colour'|'length'|'shadow'|'duration'|'easing'|'number'|'text'} TokenKind
 * @typedef {{ name: string, kind: TokenKind }} Token
 * @typedef {{ id: string, title: string, note?: string, tokens: Token[] }} TokenGroup
 * @typedef {{ id: string, title: string, demo: string, tokens: Token[] }} TokenRow
 */

/** What a token holds, worked out from how it is declared */
const kindOf = declared => {
  const value = declared.replace(/^#\{(.*)\}$/, '$1').trim();
  if (/^var\(/.test(value)) return 'follows';
  if (/^\$?(space|radius|border-width|font)[a-z-]*$/.test(value)) return 'length';
  if (/^\$?opacity/.test(value)) return 'number';
  if (/^(#[0-9a-f]{3,8}|rgba?\(|color-mix\(|transparent|currentColor)/i.test(value)) return 'colour';
  if (/^\$?(color|neutral|primary|error|success|warning)/.test(value)) return 'colour';
  if (/^-?[\d.]+(em|rem|px|%|vh|vw)$/.test(value)) return 'length';
  if (/^-?[\d.]+m?s$/.test(value)) return 'duration';
  if (/cubic-bezier|ease-|^ease$|^linear$/.test(value)) return 'easing';
  if (/^none$/.test(value)) return 'shadow';
  return 'text';
};

const LAYERS = [
  {
    id: 'palette',
    title: 'Colour palette',
    note: 'Start here. These are the roles the whole library reads, so a change here reaches every component at once \u2014 an accent set here is the accent of buttons, focus rings, selected days and links. A page with a brand colour can set `--brand-primary` instead, which the accent follows in both themes, along with `--brand-primary-hover` and `--brand-primary-contrast`. A second and a third brand colour have the same hooks, `--brand-secondary` and `--brand-complimentary`; until a page sets one they are the accent, so leaving them alone changes nothing, and no component reads them on its own. Reach for a surface or a component property below only when you want one thing to differ from the rest.',
    holds: name => name.startsWith('--color-'),
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    note: 'The second layer: the shapes components are built from, rather than the colours they are painted in. A dialog radius set here is the radius of every dialog, and a component keeps its own value only where it sets one. Use these when the palette is right and the shape is not.',
    holds: name => name.startsWith('--surface-'),
  },
  {
    id: 'controls',
    title: 'Buttons, fields, panels and modals',
    note: 'The third layer, where a kind of thing is described rather than a colour or a shape. Most of these follow a surface or a colour above and exist so one kind of thing can differ from the rest: setting a primary button here changes every button the library draws, whoever drew it, without touching the palette.',
    holds: name => /^--(button|form-control|panel|modal)-/.test(name),
  },
  {
    id: 'focus',
    title: 'Focus and motion',
    note: 'The two things people notice when they are not looking for them. The focus ring is shown to keyboard users and hidden from pointer users automatically, so it can afford to be loud. Motion is skipped entirely for anyone who asks their system for less of it, which is why a duration here is a maximum rather than a promise.',
    holds: name => name.startsWith('--framework-'),
  },
];

/**
 * Every token the design system declares, in layers, in the order it declares them
 *
 * Read from the stylesheets rather than listed here, because a list written by hand is a list that
 * silently falls behind: this page once offered 90 of the 158 tokens the design system declared,
 * and nothing failed.
 *
 * @returns {TokenGroup[]}
 */
export function tokenGroups() {
  const declarations = walk(STYLES)
    .filter(file => file.includes('design-system/_root') || file.endsWith('framework/index.scss'))
    .map(file => readFileSync(file, 'utf8'))
    .join('\n');

  const seen = new Map();
  for (const match of declarations.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)) {
    if (!seen.has(match[1])) seen.set(match[1], match[2].trim());
  }

  /**
   * A token that follows another is whatever that one is: --surface-panel-color-bg holds
   * `var(--color-surface)` and is every bit a colour. Where the reference is not declared here --
   * `--brand-primary` is a hook for the page to set -- the fallback says what it is instead.
   */
  const resolve = (name, chain = new Set()) => {
    const declared = seen.get(name);
    if (declared === undefined) return 'text';

    const kind = kindOf(declared);
    if (kind !== 'follows') return kind;

    const reference = declared
      .replace(/^#\{(.*)\}$/, '$1')
      .trim()
      .match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([\s\S]+))?\)$/);
    if (!reference) return 'text';

    const [, followed, fallback] = reference;
    if (seen.has(followed) && !chain.has(followed)) {
      return resolve(followed, new Set([...chain, name]));
    }
    return fallback ? kindOf(fallback.trim()) : 'text';
  };

  return LAYERS.map(layer => ({
    id: layer.id,
    title: layer.title,
    note: layer.note,
    tokens: [...seen]
      .filter(([name]) => layer.holds(name))
      .map(([name]) => ({ name, kind: resolve(name) })),
  })).filter(layer => layer.tokens.length > 0);
}
