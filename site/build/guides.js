import { Marked } from 'marked';

/**
 * Written guides for the documentation site, from the Markdown files in site/guides
 *
 * A guide starts with a level-one heading, its title, and a paragraph that becomes its summary.
 * Each level-two heading starts a section, as on the component pages, and tables scroll in the same
 * wrapper as the reference tables.
 */

const markdown = new Marked({ gfm: true });

/**
 * @typedef {Object} Guide
 * @property {string} slug - The page name, from the file name
 * @property {string} title
 * @property {string} description - The summary as plain text
 * @property {string} summary - The summary as HTML
 * @property {string} content - The sections as HTML
 * @property {string} markdown - The guide's Markdown, as written
 */

/** The order guides appear in, by slug; guides not listed follow in title order */
export const GUIDE_ORDER = [
  'getting-started',
  'pages-and-router',
  'writing-components',
  'events-and-alerts',
  'upgrading',
];

/**
 * Guides in reading order
 *
 * @param {Guide[]} guides
 * @returns {Guide[]}
 */
export function orderGuides(guides) {
  const rank = guide => {
    const index = GUIDE_ORDER.indexOf(guide.slug);
    return index === -1 ? GUIDE_ORDER.length : index;
  };
  return [...guides].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/**
 * @param {string} text - A heading's Markdown
 * @returns {string}
 */
export const headingId = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const plainText = text => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_]/g, '');

const withTableWrappers = html =>
  html
    .replaceAll('<table>', '<div class="table-wrap">\n<table>')
    .replaceAll('</table>', '</table>\n</div>');

/**
 * @param {string} slug
 * @param {string} source - The guide's Markdown
 * @returns {Guide}
 * @throws {Error} When the guide doesn't start with a title and a summary, or has content before
 *   its first section
 */
export function readGuide(slug, source) {
  const [title, summary, ...body] = markdown.lexer(source).filter(token => token.type !== 'space');
  if (title?.type !== 'heading' || title.depth !== 1 || summary?.type !== 'paragraph') {
    throw new Error(`${slug}.md must start with a # title followed by a summary paragraph`);
  }

  const sections = [];
  for (const token of body) {
    if (token.type === 'heading' && token.depth === 2) {
      sections.push({ heading: token, tokens: [] });
    } else if (sections.length > 0) {
      sections.at(-1).tokens.push(token);
    } else {
      throw new Error(`${slug}.md has content before its first ## heading`);
    }
  }

  const content = sections
    .map(({ heading, tokens }) => {
      const id = headingId(heading.text);
      return `<section class="doc__section" aria-labelledby="${id}">
<h2 id="${id}">${markdown.parseInline(heading.text)}</h2>
${withTableWrappers(markdown.parser(tokens))}</section>`;
    })
    .join('\n');

  return {
    slug,
    title: plainText(title.text),
    description: plainText(summary.text),
    summary: markdown.parseInline(summary.text),
    content,
    markdown: source.trim(),
  };
}
