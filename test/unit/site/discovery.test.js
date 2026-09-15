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

describe('discovery files', () => {
  it('lists every guide and component page in llms.txt', () => {
    expect(guideAndComponentUrls.filter(url => !llmsLinks.includes(url))).toEqual([]);
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
