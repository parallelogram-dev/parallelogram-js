import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContracts, loadGuides, siteRoot } from '../../../site/build/pages.js';
import {
  componentPage,
  designSystemPage,
  guidePage,
  homePage,
  layout,
  slugFor,
} from '../../../site/build/render.js';

const contracts = await loadContracts();
const guides = loadGuides();

const page = (current, content) =>
  layout({
    contracts,
    guides,
    version: '0.0.0',
    title: current,
    description: '',
    current,
    content,
  });

/**
 * Every page the site builds, by slug, as writePages renders it and without the examples, whose
 * markup is a demonstration with placeholder links
 */
const pages = new Map([
  ['index', [page('index', homePage(contracts, '0.0.0'))]],
  ['design-system', [page('design-system', designSystemPage())]],
  ...guides.map(guide => [guide.slug, [page(guide.slug, guidePage(guide))]]),
  ...contracts.map(contract => [
    slugFor(contract),
    [
      page(slugFor(contract), componentPage(contract)),
      page(slugFor(contract), componentPage({ ...contract, examples: [] })),
    ],
  ]),
]);

const attributeValues = (html, name) =>
  [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map(match =>
    match[1].replaceAll('&amp;', '&')
  );

const ids = new Map(
  [...pages].map(([slug, [html]]) => [slug, new Set(attributeValues(html, 'id'))])
);
const inPublic = file => existsSync(path.join(siteRoot, 'public', file));

/**
 * Relative links on a page that name a page the site doesn't build, an id that page doesn't have,
 * or a file that isn't in site/public
 */
function brokenLinks(slug) {
  return attributeValues(pages.get(slug).at(-1), 'href')
    .filter(href => href !== '#' && !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(href))
    .filter(href => {
      const [file, anchor] = href.split('#');
      const target = file === '' ? slug : file.replace(/\.html$/, '');
      if (!file.endsWith('.html') && file !== '') return !inPublic(file);
      if (!pages.has(target)) return !inPublic(file);
      return anchor !== undefined && !ids.get(target).has(anchor);
    });
}

describe('site links', () => {
  it.each([...pages.keys()])('links from %s only to pages, ids and files the site has', slug => {
    expect(brokenLinks(slug)).toEqual([]);
  });
});
