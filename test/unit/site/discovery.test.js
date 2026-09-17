import { describe, expect, it } from 'vitest';
import {
  SITE_URL,
  llmsFullTxt,
  llmsTxt,
  robotsTxt,
  sitemapXml,
} from '../../../site/build/discovery.js';
import { loadContracts, loadGuides } from '../../../site/build/pages.js';
import { PACKAGE, slugFor } from '../../../site/build/render.js';

const contracts = await loadContracts();
const guides = loadGuides();

const guideAndComponentUrls = [...guides.map(guide => guide.slug), ...contracts.map(slugFor)].map(
  slug => `${SITE_URL}/${slug}.html`
);
const builtPages = new Set([
  'index',
  'design-system',
  ...guides.map(guide => guide.slug),
  ...contracts.map(slugFor),
]);

const llmsLinks = [...llmsTxt(contracts, guides).matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
const siteLinks = llmsLinks.filter(url => url.startsWith(`${SITE_URL}/`));
const sitemapUrls = [...sitemapXml(contracts, guides).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  match => match[1]
);

const PROBE = {
  name: 'Probe',
  kind: 'enhancement',
  selector: 'data-probe',
  module: 'components/Probe',
  summary: 'A component used by this test',
  description: 'A component used by this test',
  attributes: [{ name: 'data-probe-mode', type: 'string', description: 'Either a\\b or a|b' }],
  events: [],
  examples: [{ id: 'probe', title: 'Probe', markup: '<div data-probe></div>' }],
};

const RICH_PROBE = {
  ...PROBE,
  name: 'RichProbe',
  kind: 'element',
  tag: 'p-rich-probe',
  properties: [{ name: 'value', type: 'string', description: 'What it holds' }],
  methods: [
    { name: 'refreshProbe', signature: 'refreshProbe(): void', description: 'Loads it again' },
  ],
  slots: [{ name: 'title', description: 'The heading' }],
  parts: [{ name: 'panel', description: 'The panel around it' }],
  examples: [
    { id: 'one', title: 'The first example', markup: '<p-rich-probe></p-rich-probe>' },
    { id: 'two', title: 'The second example', markup: '<p-rich-probe open></p-rich-probe>' },
  ],
};

describe('discovery files', () => {
  it('escapes pipes and backslashes so a table row keeps its columns', () => {
    const row = llmsFullTxt([PROBE], [])
      .split('\n')
      .find(line => line.includes('data-probe-mode'));

    expect(row).toContain('Either a\\\\b or a\\|b.');
  });

  it("carries a component's whole reference, and every example, into llms-full.txt", () => {
    const full = llmsFullTxt([RICH_PROBE], []);

    /* An agent reading this file is told what it may set and never what it may call, so the half of
       the API that does anything is missing, and only the first example is here to show it */
    expect([
      full.includes('Properties'),
      full.includes('Methods'),
      full.includes('Slots'),
      full.includes('Shadow parts'),
      full.includes('refreshProbe'),
      full.includes('The second example'),
    ]).toEqual([true, true, true, true, true, true]);
  });

  it('lists every guide and component page in llms.txt', () => {
    expect(guideAndComponentUrls.filter(url => !llmsLinks.includes(url))).toEqual([]);
  });

  it('names the version it is describing, in both files', () => {
    /* Without it an agent reads the newest documentation and infers the version from whatever the
       examples happen to show, on a library whose own README warns that a minor may break things */
    expect([
      llmsTxt(contracts, guides, '9.9.9').includes('9.9.9'),
      llmsFullTxt(contracts, guides, '9.9.9').includes('9.9.9'),
    ]).toEqual([true, true]);
  });

  it('links llms.txt only to absolute URLs', () => {
    expect(llmsLinks.filter(url => !url.startsWith('https://'))).toEqual([]);
  });

  it('links llms.txt only to pages the site builds', () => {
    const slugOf = url => url.slice(SITE_URL.length + 1).replace(/\.html$/, '') || 'index';

    expect(siteLinks.map(slugOf).filter(slug => !builtPages.has(slug))).toEqual([]);
  });

  it("includes every guide's title in llms-full.txt", () => {
    const full = llmsFullTxt(contracts, guides);

    expect(guides.map(guide => guide.title).filter(title => !full.includes(title))).toEqual([]);
  });

  it("includes every component's import path in llms-full.txt", () => {
    const full = llmsFullTxt(contracts, guides);
    const paths = contracts.map(contract => `\`${PACKAGE}/${contract.module}\``);

    expect(paths.filter(path => !full.includes(path))).toEqual([]);
  });

  it('lists the home page and the pages llms.txt links to in the sitemap', () => {
    expect(new Set(sitemapUrls)).toEqual(new Set([`${SITE_URL}/`, ...siteLinks]));
  });

  it('points robots.txt at the sitemap', () => {
    expect(robotsTxt()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
