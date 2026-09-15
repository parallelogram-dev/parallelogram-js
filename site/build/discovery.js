import { PACKAGE, REPOSITORY, byName, matchFor, slugFor, titleFor } from './render.js';

/**
 * Files that help search engines and coding agents find the documentation: llms.txt,
 * llms-full.txt, sitemap.xml and robots.txt, generated from the same guides and contracts as the
 * pages
 */

export const SITE_URL = 'https://dev.parallelogram.com.au';

const MANIFEST_URL = `https://cdn.jsdelivr.net/npm/${PACKAGE}/dist/custom-elements.json`;

const SUMMARY = `Parallelogram (\`${PACKAGE}\` on npm) is a small, dependency-free JavaScript library that adds behaviour to server-rendered HTML through data attributes and a small set of web components. Each component loads the first time a page uses it, and links swap the page in place instead of reloading it. The package is ESM only and targets Baseline 2023 browsers.`;

const START = `Install it with \`npm install ${PACKAGE}\`. Import the framework from \`${PACKAGE}\` and each component from \`${PACKAGE}/components/<Name>\`, with or without \`.js\`; never import files from \`dist\` or \`src\`. Create the app with \`Parallelogram.create()\`, register the components your pages use with \`app.components.add(selector, () => import('${PACKAGE}/components/<Name>'))\`, then call \`app.run()\`.`;

/**
 * The absolute URL of a page on the documentation site
 *
 * @param {string} slug - The page name, where index is the home page
 * @returns {string}
 */
export const pageUrl = slug => (slug === 'index' ? `${SITE_URL}/` : `${SITE_URL}/${slug}.html`);

const componentsOfKind = (contracts, kind) =>
  contracts.filter(contract => contract.kind === kind).sort(byName);

const linkText = contract =>
  contract.kind === 'element' ? `\`${titleFor(contract)}\`` : titleFor(contract);

/**
 * The site's pages in sitemap order: the home page, the design system workbench, the guides, then
 * the enhancement components and the web components by name
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {import('./guides.js').Guide[]} guides
 * @returns {string[]} Page slugs
 */
export function pageSlugs(contracts, guides) {
  return [
    'index',
    'design-system',
    ...guides.map(guide => guide.slug),
    ...componentsOfKind(contracts, 'enhancement').map(slugFor),
    ...componentsOfKind(contracts, 'element').map(slugFor),
  ];
}

/**
 * llms.txt, an index of the documentation in the llmstxt.org format
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {import('./guides.js').Guide[]} guides
 * @returns {string}
 */
export function llmsTxt(contracts, guides) {
  const item = (title, url, summary) => `- [${title}](${url}): ${summary}`;
  const components = kind =>
    componentsOfKind(contracts, kind).map(contract =>
      item(linkText(contract), pageUrl(slugFor(contract)), contract.summary)
    );

  return [
    '# Parallelogram',
    `> ${SUMMARY}`,
    START,
    '## Guides',
    guides.map(guide => item(guide.title, pageUrl(guide.slug), guide.description))
      .join('\n'),
    '## Enhancement components',
    components('enhancement').join('\n'),
    '## Web components',
    components('element').join('\n'),
    '## Optional',
    [
      item(
        'Custom Elements Manifest',
        MANIFEST_URL,
        'The web components as custom-elements.json'
      ),
      item(
        'Design system workbench',
        pageUrl('design-system'),
        'Every component in a light and a dark frame, with live controls for the design tokens'
      ),
      item('GitHub repository', REPOSITORY, 'Source, issues and the changelog'),
    ].join('\n'),
  ].join('\n\n')
    .concat('\n');
}

const cell = value => String(value).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
const tick = value => `\`${value}\``;
const none = value => (value === undefined || value === null ? 'none' : tick(value === '' ? '""' : value));

function markdownTable(title, headings, rows) {
  if (rows.length === 0) return [];
  return [
    `${title}\n\n| ${headings.join(' | ')} |\n| ${headings.map(() => '---').join(' | ')} |\n${rows
      .map(row => `| ${row.map(cell).join(' | ')} |`)
      .join('\n')}`,
  ];
}

const sentence = text => (/[.!?]$/.test(text) ? text : `${text}.`);

const notes = item =>
  [
    sentence(item.description),
    item.required ? 'Required.' : '',
    item.readonly ? 'Set by the component.' : '',
    item.on ? `On ${item.on}.` : '',
    item.deprecated ? `Deprecated: ${item.deprecated}` : '',
  ]
    .filter(Boolean)
    .join(' ');

function referenceTables(item, level) {
  const heading = title => `${'#'.repeat(level)} ${title}`;
  return [
    ...markdownTable(
      heading('Attributes'),
      ['Name', 'Type', 'Default', 'Description'],
      (item.attributes ?? []).map(attribute => [
        tick(attribute.name),
        attribute.type === 'enum' ? attribute.options.map(tick).join(' | ') : attribute.type,
        none(attribute.default),
        notes(attribute),
      ])
    ),
    ...markdownTable(
      heading('Events'),
      ['Name', 'Detail', 'Description'],
      (item.events ?? []).map(event => [
        tick(event.name),
        event.detail ? tick(event.detail) : 'none',
        notes(event),
      ])
    ),
    ...markdownTable(
      heading('CSS custom properties'),
      ['Name', 'Default', 'Description'],
      (item.cssProperties ?? []).map(property => [
        tick(property.name),
        none(property.default),
        property.description,
      ])
    ),
  ];
}

/**
 * A component's reference as Markdown, from its contract
 *
 * @param {import('../../src/contract.js').ComponentContract} contract
 * @returns {string}
 */
export function componentMarkdown(contract) {
  const [example] = contract.examples;
  const facts = [
    `- Kind: ${contract.kind === 'element' ? 'web component' : 'enhancement component'}`,
    `- Import: \`${PACKAGE}/${contract.module}\``,
    `- ${contract.kind === 'element' ? 'Tag' : 'Selector'}: \`${matchFor(contract)}\``,
    ...(contract.stylesheet ? [`- Stylesheet: \`${PACKAGE}/${contract.stylesheet}\``] : []),
    `- Documentation: ${pageUrl(slugFor(contract))}`,
  ].join('\n');

  return [
    `# ${linkText(contract)}`,
    contract.summary,
    facts,
    ...(contract.description ? [contract.description] : []),
    ...referenceTables(contract, 2),
    ...(contract.elements ?? []).flatMap(element => [
      `## \`<${element.tag}>\``,
      element.description,
      ...referenceTables(element, 3),
    ]),
    `## Example: ${example.title}`,
    `\`\`\`html\n${example.markup}\n\`\`\``,
  ].join('\n\n');
}

const absoluteLinks = markdown =>
  markdown.replace(/\]\((?![a-z]+:|#)([^)\s]+)\)/g, (_, href) => `](${SITE_URL}/${href})`);

/**
 * llms-full.txt: every guide's Markdown in reading order, with links made absolute, then every
 * component's reference
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {import('./guides.js').Guide[]} guides
 * @returns {string}
 */
export function llmsFullTxt(contracts, guides) {
  return [
    `# Parallelogram\n\n> ${SUMMARY}\n\n${START}`,
    ...guides.map(guide => absoluteLinks(guide.markdown)),
    ...componentsOfKind(contracts, 'enhancement').map(componentMarkdown),
    ...componentsOfKind(contracts, 'element').map(componentMarkdown),
  ]
    .join('\n\n---\n\n')
    .concat('\n');
}

/**
 * sitemap.xml, listing every page on the site
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {import('./guides.js').Guide[]} guides
 * @returns {string}
 */
export function sitemapXml(contracts, guides) {
  const urls = pageSlugs(contracts, guides)
    .map(slug => `  <url><loc>${pageUrl(slug)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * robots.txt, allowing every crawler and naming the sitemap
 *
 * @returns {string}
 */
export function robotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/**
 * Every discovery file by its path from the site root
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {import('./guides.js').Guide[]} guides
 * @returns {Record<string, string>}
 */
export function discoveryFiles(contracts, guides) {
  return {
    'llms.txt': llmsTxt(contracts, guides),
    'llms-full.txt': llmsFullTxt(contracts, guides),
    'sitemap.xml': sitemapXml(contracts, guides),
    'robots.txt': robotsTxt(),
  };
}
