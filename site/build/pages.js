import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { orderGuides, readGuide } from './guides.js';
import { componentPage, guidePage, homePage, layout, slugFor, titleFor } from './render.js';

export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = path.resolve(siteRoot, '..');
export const componentsDir = path.join(repoRoot, 'src/components');
export const guidesDir = path.join(siteRoot, 'guides');

/**
 * Every component contract, read afresh so the development server picks up edits
 *
 * @returns {Promise<import('../../src/contract.js').ComponentContract[]>}
 */
export async function loadContracts() {
  const stamp = Date.now();
  const files = readdirSync(componentsDir)
    .filter(file => file.endsWith('.contract.js'))
    .sort();

  return Promise.all(
    files.map(async file => {
      const url = `${pathToFileURL(path.join(componentsDir, file)).href}?t=${stamp}`;
      return (await import(url)).default;
    })
  );
}

/**
 * Every guide in site/guides, in reading order
 *
 * @returns {import('./guides.js').Guide[]}
 */
export function loadGuides() {
  return orderGuides(
    readdirSync(guidesDir)
      .filter(file => file.endsWith('.md'))
      .map(file =>
        readGuide(path.basename(file, '.md'), readFileSync(path.join(guidesDir, file), 'utf8'))
      )
  );
}

/**
 * Write the site's pages into its root, replacing the pages from an earlier run
 *
 * @returns {Promise<Record<string, string>>} Rollup input names and the page files
 */
export async function writePages() {
  const contracts = await loadContracts();
  const guides = loadGuides();
  const { version } = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const shared = { contracts, guides, version };

  const pages = {
    index: layout({
      ...shared,
      title: 'Parallelogram',
      description: 'Components and documentation for @parallelogram-js/core',
      current: 'index',
      content: homePage(contracts, version),
    }),
  };
  for (const guide of guides) {
    pages[guide.slug] = layout({
      ...shared,
      title: `${guide.title} · Parallelogram`,
      description: guide.description,
      current: guide.slug,
      content: guidePage(guide),
    });
  }
  for (const contract of contracts) {
    pages[slugFor(contract)] = layout({
      ...shared,
      title: `${titleFor(contract)} · Parallelogram`,
      description: contract.summary,
      current: slugFor(contract),
      content: componentPage(contract),
    });
  }

  for (const file of readdirSync(siteRoot)) {
    if (file.endsWith('.html')) rmSync(path.join(siteRoot, file));
  }

  const input = {};
  for (const [name, html] of Object.entries(pages)) {
    const file = path.join(siteRoot, `${name}.html`);
    writeFileSync(file, html);
    input[name] = file;
  }
  return input;
}
