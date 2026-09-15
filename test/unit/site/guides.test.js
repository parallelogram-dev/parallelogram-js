import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { orderGuides, readGuide } from '../../../site/build/guides.js';

const root = `${process.cwd()}/`;

const contracts = Object.values(
  import.meta.glob('../../../src/components/*.contract.js', { eager: true, import: 'default' })
);
const guides = readdirSync(`${root}site/guides`)
  .filter(file => file.endsWith('.md'))
  .map(file =>
    readGuide(file.replace(/\.md$/, ''), readFileSync(`${root}site/guides/${file}`, 'utf8'))
  );

/** Event bus names the framework builds from template literals, with every name each produces */
const TEMPLATED_EVENTS = {
  'page:fragment-transition-${direction}': [
    'page:fragment-transition-out',
    'page:fragment-transition-in',
  ],
  "alerts:${eventName.split(':')[1]}": ['alerts:show', 'alerts:close'],
};
const FRAMEWORK_EVENT = /^(?:router|page|page-manager|dom|alerts):[a-z-]+$/;

const frameworkSource = ['src/core', 'src/managers']
  .flatMap(folder =>
    readdirSync(`${root}${folder}`)
      .filter(file => file.endsWith('.js'))
      .map(file => readFileSync(`${root}${folder}/${file}`, 'utf8'))
  )
  .join('\n');
const templates = [...frameworkSource.matchAll(/\.emit\(\s*`([a-z-]+:[^`]*\$\{[^`]*)`/g)].map(
  match => match[1]
);
const frameworkEvents = new Set([
  ...[...frameworkSource.matchAll(/\.emit\(\s*['"]([a-z-]+:[a-z-]+)['"]/g)].map(match => match[1]),
  ...templates.flatMap(template => TEMPLATED_EVENTS[template] ?? []),
]);

const sample = source => readGuide('sample', source);
const parse = html => {
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html.replace(/<(\/?)p-/g, '<$1x-inert-p-');
  return doc.body;
};
const guideNamed = slug => guides.find(guide => guide.slug === slug);

describe('guides', () => {
  it('takes the title and summary from the first heading and paragraph', () => {
    expect(
      sample('# Moving `p-modal`\n\nFrom [0.4](index.html) to **0.5**.\n\n## Start\n\nText.')
    ).toMatchObject({
      title: 'Moving p-modal',
      description: 'From 0.4 to 0.5.',
      summary: 'From <a href="index.html">0.4</a> to <strong>0.5</strong>.',
    });
  });

  it('puts each second-level heading in a section labelled by it', () => {
    const { content } = sample(
      '# Title\n\nSummary.\n\n## First step\n\nOne.\n\n## Second step\n\nTwo.'
    );

    expect(
      [...parse(content).querySelectorAll('section.doc__section')].map(section => [
        section.getAttribute('aria-labelledby'),
        section.querySelector('h2').id,
        section.querySelector('p').textContent,
      ])
    ).toEqual([
      ['first-step', 'first-step', 'One.'],
      ['second-step', 'second-step', 'Two.'],
    ]);
  });

  it('wraps tables so they scroll', () => {
    const { content } = sample(
      '# Title\n\nSummary.\n\n## Names\n\n| Old | New |\n| --- | --- |\n| a | b |'
    );

    expect(parse(content).querySelector('.table-wrap > table')).not.toBeNull();
  });

  it.each([
    ['no title', 'Summary.\n\n## Start\n'],
    ['content before its first section', '# Title\n\nSummary.\n\nStray.\n\n## Start\n'],
  ])('rejects a guide with %s', (_, source) => {
    expect(() => sample(source)).toThrow('sample.md');
  });

  it('orders guides for reading, with unlisted guides after them by title', () => {
    const guide = (slug, title) => ({ slug, title });

    expect(
      orderGuides([
        guide('upgrading', 'Upgrading'),
        guide('zebra-crossings', 'Zebra crossings'),
        guide('getting-started', 'Getting started'),
        guide('accordions', 'Accordions'),
      ]).map(entry => entry.slug)
    ).toEqual(['getting-started', 'upgrading', 'accordions', 'zebra-crossings']);
  });

  it('names every deprecation the contracts declare in the upgrade guide', () => {
    const text = parse(guideNamed('upgrading').content).textContent;
    const deprecated = contracts
      .flatMap(contract => [contract, ...(contract.elements ?? [])])
      .flatMap(item =>
        ['attributes', 'events', 'properties'].flatMap(kind =>
          (item[kind] ?? []).filter(entry => entry.deprecated).map(entry => entry.name)
        )
      );

    expect(deprecated.filter(name => !text.includes(name))).toEqual([]);
  });

  it('knows every event name the framework builds from a template', () => {
    expect(templates.filter(template => !(template in TEMPLATED_EVENTS))).toEqual([]);
  });

  it('names every event bus message the framework emits in the events guide', () => {
    const text = parse(guideNamed('events-and-alerts').content).textContent;

    expect([...frameworkEvents].filter(name => !text.includes(name))).toEqual([]);
  });

  it('names only event bus messages the framework emits in the events guide', () => {
    const named = [...parse(guideNamed('events-and-alerts').content).querySelectorAll('code')]
      .map(code => code.textContent)
      .filter(text => FRAMEWORK_EVENT.test(text));

    expect(named.filter(name => !frameworkEvents.has(name))).toEqual([]);
  });
});
