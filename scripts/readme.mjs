/**
 * Keep the README's component tables in step with the component contracts
 *
 * `npm run readme` rewrites the part of README.md between the components markers from the contracts
 * and the tracker adapters, then formats the file with Prettier. A unit test fails when README.md
 * differs from what this script would write.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import prettier from 'prettier';
import { slugFor } from '../site/build/render.js';

export const SITE = 'https://dev.parallelogram.com.au';
export const START = '<!-- components:start -->';
export const END = '<!-- components:end -->';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = path.join(root, 'README.md');

/**
 * Text for a Markdown table cell, with pipes and angle brackets escaped
 *
 * @param {string} text
 * @returns {string}
 */
const cell = text => text.replaceAll('|', '\\|').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const pageFor = contract => `${SITE}/${slugFor(contract)}.html`;

/**
 * The generated part of the README: a table of web components, a table of enhancements and the
 * tracker adapters, between the components markers
 *
 * @param {import('../src/contract.js').ComponentContract[]} contracts
 * @param {string[]} adapters - Tracker adapter module names, such as `ga4`
 * @returns {string}
 */
export function componentTables(contracts, adapters) {
  const sorted = [...contracts].sort((a, b) => a.name.localeCompare(b.name));
  const elements = sorted
    .filter(contract => contract.kind === 'element')
    .map(
      contract =>
        `| [\`<${contract.tag}>\`](${pageFor(contract)}) | \`${contract.module}\` | ${cell(contract.summary)} |`
    );
  const enhancements = sorted
    .filter(contract => contract.kind === 'enhancement')
    .map(contract => {
      const selector = contract.match ?? `[${contract.selector}]`;
      const stylesheet = contract.stylesheet ? `\`${contract.stylesheet}\`` : '';
      return `| [${contract.name}](${pageFor(contract)}) | \`${cell(selector)}\` | \`${contract.module}\` | ${stylesheet} | ${cell(contract.summary)} |`;
    });
  const adapterList = adapters.map(name => `\`${name}\``).join(', ');

  return `${START}

### Web components

| Element | Import | What it does |
| --- | --- | --- |
${elements.join('\n')}

### Enhancements

| Component | Selector | Import | Stylesheet | What it does |
| --- | --- | --- | --- | --- |
${enhancements.join('\n')}

DeferTracker loads third-party trackers through adapters imported from \`@parallelogram-js/core/adapters/<name>\`: ${adapterList}.

${END}`;
}

/**
 * A README with its generated part replaced, formatted as Prettier formats the repository
 *
 * @param {string} readme
 * @param {import('../src/contract.js').ComponentContract[]} contracts
 * @param {string[]} adapters
 * @returns {Promise<string>}
 * @throws {Error} When the README doesn't have both markers in order
 */
export async function readmeWith(readme, contracts, adapters) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end < start) {
    throw new Error(`README.md needs ${START} followed by ${END}`);
  }

  const text = `${readme.slice(0, start)}${componentTables(contracts, adapters)}${readme.slice(end + END.length)}`;
  const options = await prettier.resolveConfig(readmePath);
  return prettier.format(text, { ...options, filepath: readmePath });
}

/**
 * The tracker adapter module names, leaving out the shared helpers named with an underscore
 *
 * @returns {string[]}
 */
export const adapterNames = () =>
  readdirSync(path.join(root, 'src/adapters'))
    .filter(file => file.endsWith('.js') && !file.startsWith('_'))
    .map(file => path.basename(file, '.js'))
    .sort();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const componentsDir = path.join(root, 'src/components');
  const contracts = await Promise.all(
    readdirSync(componentsDir)
      .filter(file => file.endsWith('.contract.js'))
      .map(async file => (await import(pathToFileURL(path.join(componentsDir, file)).href)).default)
  );

  writeFileSync(
    readmePath,
    await readmeWith(readFileSync(readmePath, 'utf8'), contracts, adapterNames())
  );
  console.log('Updated the component tables in README.md');
}
