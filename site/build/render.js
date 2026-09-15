/**
 * HTML for the documentation site, rendered from component contracts
 *
 * Every page is a complete document that reads without JavaScript. The framework's router swaps the
 * `main` and `sidebar` views between pages, and the example playground makes each example live.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const PACKAGE = '@parallelogram-js/core';
const REPOSITORY = 'https://github.com/parallelogram-dev/parallelogram-js';

export const escapeHtml = value =>
  String(value ?? '').replace(/[&<>"']/g, character => ESCAPES[character]);

/**
 * Escaped text with `backticks` turned into code elements
 */
export const inline = text => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

export const paragraphs = text =>
  String(text ?? '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p>${inline(paragraph)}</p>`)
    .join('\n');

export const slugFor = contract =>
  contract.tag ?? contract.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const titleFor = contract =>
  contract.kind === 'element' ? `<${contract.tag}>` : contract.name;

export const matchFor = contract => contract.match ?? contract.tag ?? `[${contract.selector}]`;

const code = value => `<code>${escapeHtml(value)}</code>`;
const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @param {string} current - The slug of the page being rendered
 * @param {import('./guides.js').Guide[]} [guides]
 * @returns {string}
 */
export function sidebar(contracts, current, guides = []) {
  const link = (slug, label) =>
    `<li><a href="${slug}.html"${slug === current ? ' aria-current="page"' : ''}>${label}</a></li>`;
  const group = (heading, items) =>
    `<h2 class="sidebar__heading">${heading}</h2>\n<ul class="sidebar__list">\n${items.join('\n')}\n</ul>`;
  const kind = name =>
    contracts
      .filter(contract => contract.kind === name)
      .sort(byName)
      .map(contract => link(slugFor(contract), escapeHtml(titleFor(contract))));

  return [
    group('Start', [link('index', 'Overview')]),
    ...(guides.length
      ? [group('Guides', guides.map(guide => link(guide.slug, escapeHtml(guide.title))))]
      : []),
    group('Web components', kind('element')),
    group('Enhancements', kind('enhancement')),
  ].join('\n');
}

/**
 * A guide's page: its title and summary, then its sections
 *
 * @param {import('./guides.js').Guide} guide
 * @returns {string}
 */
export function guidePage(guide) {
  return `<article class="doc" aria-labelledby="doc-title">
<header class="doc__header">
  <p class="doc__eyebrow">Guide</p>
  <h1 id="doc-title">${escapeHtml(guide.title)}</h1>
  <p class="doc__summary">${guide.summary}</p>
</header>
${guide.content}
</article>`;
}

export function layout({ title, description, current, contracts, guides, content, version }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Schibsted+Grotesk:wght@600;700&display=swap">
<link rel="stylesheet" href="/src/styles/site.scss">
<script type="module" src="/src/main.js"></script>
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <a class="brand" href="index.html"><span class="brand__mark" aria-hidden="true"></span>Parallelogram</a>
  <span class="site-header__version">${escapeHtml(version)}</span>
  <a class="site-header__link" href="${REPOSITORY}">GitHub</a>
</header>
<div class="site">
<nav class="sidebar" data-view="sidebar" aria-label="Documentation">
${sidebar(contracts, current, guides)}
</nav>
<main id="content" class="content" data-view="main" tabindex="-1">
${content}
</main>
</div>
</body>
</html>
`;
}

export function controlField(exampleId, control, attribute) {
  const id = `${exampleId}-${attribute.name.replace(/[^a-z0-9-]/g, '')}`;
  const target = control.target ? ` data-target="${escapeHtml(control.target)}"` : '';
  const data = `id="${id}" data-attribute="${escapeHtml(attribute.name)}"${target}`;
  const unset =
    attribute.default === undefined || attribute.default === null
      ? 'not set'
      : `not set (${escapeHtml(String(attribute.default))})`;

  let input;
  if (attribute.type === 'flag') {
    input = `<input type="checkbox" ${data}>`;
  } else if (attribute.type === 'boolean') {
    input = `<select ${data}><option value="">${unset}</option><option value="true">true</option><option value="false">false</option></select>`;
  } else if (attribute.type === 'enum') {
    const options = attribute.options
      .map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join('');
    input = `<select ${data}><option value="">${unset}</option>${options}</select>`;
  } else if (attribute.type === 'number') {
    input = `<input type="number" step="any" ${data}>`;
  } else {
    input = `<input type="text" ${data}>`;
  }

  return `<div class="control">
  <label for="${id}">${code(attribute.name)}</label>
  ${input}
  <p class="control__hint">${inline(attribute.description)}</p>
</div>`;
}

const attributesOf = contract =>
  [contract, ...(contract.elements ?? [])].flatMap(item => item.attributes ?? []);

export function exampleBlock(contract, example) {
  const id = `${slugFor(contract)}-${example.id}`;
  const attributes = new Map(attributesOf(contract).map(attribute => [attribute.name, attribute]));
  const writesState = attributesOf(contract).some(
    attribute => attribute.readonly && !attribute.deprecated
  );
  const controls = (example.controls ?? [])
    .map(control => controlField(id, control, attributes.get(control.attribute)))
    .join('\n');

  return `<section class="example" data-example="${escapeHtml(contract.name)}:${escapeHtml(example.id)}" aria-labelledby="${id}-title">
<header class="example__header">
  <h2 id="${id}-title">${escapeHtml(example.title)}</h2>
  ${example.description ? `<p>${inline(example.description)}</p>` : ''}
</header>
<div class="example__stage" data-example-stage>
${example.markup}
</div>
${
  controls
    ? `<form class="example__controls" data-example-controls hidden aria-label="Change the ${escapeHtml(example.title.toLowerCase())} example">
${controls}
<button type="reset" class="tool-button">Reset</button>
</form>`
    : ''
}
${
  writesState
    ? `<section class="example__state" data-example-state hidden aria-labelledby="${id}-state-title">
  <h3 id="${id}-state-title">State</h3>
  <dl data-example-state-list></dl>
</section>`
    : ''
}
<div class="example__code">
<pre><code id="${id}-code" data-example-code>${escapeHtml(example.markup)}</code></pre>
<button type="button" class="tool-button example__copy" data-copytoclipboard data-copytoclipboard-target="#${id}-code"><span data-copytoclipboard-label>Copy markup</span></button>
</div>
<section class="example__log" data-example-log hidden aria-labelledby="${id}-log-title">
  <h3 id="${id}-log-title">Events</h3>
  <button type="button" class="tool-button" data-example-log-clear>Clear</button>
  <ol data-example-log-list></ol>
  <p data-example-log-empty>Use the example to see the events it sends.</p>
</section>
<template data-example-source>${example.markup}</template>
</section>`;
}

function table(id, title, headings, rows, level = 2) {
  if (rows.length === 0) return '';
  const heading = `<h${level} id="${id}">${title}</h${level}>`;

  return `<section class="doc__section" aria-labelledby="${id}">
${heading}
<div class="table-wrap">
<table>
<thead><tr>${headings.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>
</div>
</section>`;
}

const badge = (label, modifier = '') =>
  `<span class="badge${modifier ? ` badge--${modifier}` : ''}">${label}</span>`;

const deprecation = item =>
  item.deprecated ? `<p class="deprecated">Deprecated. ${inline(item.deprecated)}</p>` : '';

function attributeRows(attributes) {
  return attributes.map(attribute => {
    const type =
      attribute.type === 'enum'
        ? attribute.options.map(code).join(' | ')
        : `<span class="type">${attribute.type}</span>`;
    const value =
      attribute.default === undefined || attribute.default === null
        ? '<span class="none">none</span>'
        : code(attribute.default === '' ? '""' : String(attribute.default));
    const badges = [
      attribute.required ? badge('required', 'required') : '',
      attribute.readonly ? badge('set by the component') : '',
    ].join('');
    const where = attribute.on ? ` <span class="note">On ${escapeHtml(attribute.on)}.</span>` : '';
    const property = attribute.property
      ? ` <span class="note">Property ${code(attribute.property)}.</span>`
      : '';

    return `<tr${attribute.deprecated ? ' class="is-deprecated"' : ''}><th scope="row">${code(attribute.name)}${badges}</th><td>${type}</td><td>${value}</td><td>${inline(attribute.description)}${where}${property}${deprecation(attribute)}</td></tr>`;
  });
}

const CHANNELS = { dom: 'DOM event', bus: 'Event bus', both: 'DOM event and event bus' };

function eventRows(events) {
  return events.map(event => {
    const notes = [
      event.inbound ? 'You dispatch this.' : CHANNELS[event.channel ?? 'dom'],
      event.on ? `On ${escapeHtml(event.on)}.` : '',
      event.cancelable ? 'Cancelable.' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<tr${event.deprecated ? ' class="is-deprecated"' : ''}><th scope="row">${code(event.name)}</th><td>${event.detail ? code(event.detail) : '<span class="none">none</span>'}</td><td>${inline(event.description)} <span class="note">${notes}</span>${deprecation(event)}</td></tr>`;
  });
}

const namedRows = items =>
  items.map(
    item =>
      `<tr><th scope="row">${item.name === '' ? '<span class="none">default</span>' : code(item.name)}</th><td>${inline(item.description)}</td></tr>`
  );

function reference(contract, prefix, level = 2) {
  const id = name => `${prefix}${name}`;
  return [
    table(
      id('attributes'),
      'Attributes',
      ['Name', 'Type', 'Default', 'Description'],
      attributeRows(contract.attributes ?? []),
      level
    ),
    table(
      id('properties'),
      'Properties',
      ['Name', 'Type', 'Description'],
      (contract.properties ?? []).map(
        property =>
          `<tr${property.deprecated ? ' class="is-deprecated"' : ''}><th scope="row">${code(property.name)}${property.readonly ? badge('read only') : ''}</th><td>${code(property.type)}</td><td>${inline(property.description)}${deprecation(property)}</td></tr>`
      ),
      level
    ),
    table(
      id('methods'),
      'Methods',
      ['Name', 'Signature', 'Description'],
      (contract.methods ?? []).map(
        method =>
          `<tr><th scope="row">${code(method.name)}</th><td>${code(method.signature)}</td><td>${inline(method.description)}</td></tr>`
      ),
      level
    ),
    table(
      id('events'),
      'Events',
      ['Name', 'Detail', 'Description'],
      eventRows(contract.events ?? []),
      level
    ),
    table(id('slots'), 'Slots', ['Name', 'Description'], namedRows(contract.slots ?? []), level),
    table(
      id('parts'),
      'Shadow parts',
      ['Name', 'Description'],
      namedRows(contract.parts ?? []),
      level
    ),
    table(
      id('css-properties'),
      'CSS custom properties',
      ['Name', 'Default', 'Description'],
      (contract.cssProperties ?? []).map(
        property =>
          `<tr><th scope="row">${code(property.name)}</th><td>${property.default ? code(property.default) : '<span class="none">none</span>'}</td><td>${inline(property.description)}</td></tr>`
      ),
      level
    ),
  ].join('\n');
}

function usage(contract) {
  const script = `import { Parallelogram } from '${PACKAGE}';

const app = Parallelogram.create();
app.components.add('${matchFor(contract)}', () => import('${PACKAGE}/${contract.module}'));
app.run();`;
  const stylesheet = contract.stylesheet
    ? `<p>Its styles come from the package stylesheet:</p>
<pre><code>@import '${PACKAGE}/${escapeHtml(contract.stylesheet)}';</code></pre>`
    : '';

  return `<section class="doc__section" aria-labelledby="usage">
<h2 id="usage">Usage</h2>
<p>Register the component and the framework loads it the first time a page contains ${code(matchFor(contract))}.</p>
<pre><code>${escapeHtml(script)}</code></pre>
${stylesheet}
</section>`;
}

export function componentPage(contract) {
  const facts = [
    ['Import', `${PACKAGE}/${contract.module}`],
    [contract.kind === 'element' ? 'Tag' : 'Selector', matchFor(contract)],
    ...(contract.stylesheet ? [['Stylesheet', `${PACKAGE}/${contract.stylesheet}`]] : []),
  ]
    .map(([term, value]) => `<div><dt>${term}</dt><dd>${code(value)}</dd></div>`)
    .join('');
  const accessibility = contract.accessibility
    ? `<h3>Accessibility</h3>\n${paragraphs(contract.accessibility)}`
    : '';
  const elements = (contract.elements ?? [])
    .map(
      element => `<section class="doc__section" aria-labelledby="element-${element.tag}">
<h2 id="element-${element.tag}">${code(`<${element.tag}>`)}</h2>
${paragraphs(element.description)}
${reference(element, `${element.tag}-`, 3)}
</section>`
    )
    .join('\n');

  return `<article class="doc" aria-labelledby="doc-title">
<header class="doc__header">
  <p class="doc__eyebrow">${contract.kind === 'element' ? 'Web component' : 'Enhancement'}</p>
  <h1 id="doc-title">${escapeHtml(titleFor(contract))}</h1>
  <p class="doc__summary">${inline(contract.summary)}</p>
  <dl class="doc__facts">${facts}</dl>
</header>
${contract.examples.map(example => exampleBlock(contract, example)).join('\n')}
<section class="doc__section" aria-labelledby="about">
<h2 id="about">About</h2>
${paragraphs(contract.description)}
${accessibility}
</section>
${usage(contract)}
${reference(contract, '')}
${elements}
</article>`;
}

export function homePage(contracts, version) {
  const card = contract => `<li><a class="component-card" href="${slugFor(contract)}.html">
  <small>${contract.kind === 'element' ? 'Web component' : 'Enhancement'}</small>
  <strong>${escapeHtml(titleFor(contract))}</strong>
  <span>${inline(contract.summary)}</span>
</a></li>`;
  const start = `import { Parallelogram } from '${PACKAGE}';

const app = Parallelogram.create({
  router: {},
  pageManager: { containerSelector: '[data-view="main"]' },
});

app.components
  .add('p-modal', () => import('${PACKAGE}/components/PModal'))
  .add('[data-toggle]', () => import('${PACKAGE}/components/Toggle'));

app.run();`;

  return `<article class="doc home" aria-labelledby="doc-title">
<header class="doc__header">
  <p class="doc__eyebrow">${PACKAGE} ${escapeHtml(version)}</p>
  <h1 id="doc-title">Progressive enhancement, one component at a time</h1>
  <p class="doc__summary">Parallelogram adds behaviour to server-rendered HTML through data attributes and a small set of web components. Each component loads the first time a page uses it, and links swap the page in place instead of reloading it.</p>
</header>
<section class="doc__section" aria-labelledby="install">
<h2 id="install">Install</h2>
<pre><code>npm install ${PACKAGE}</code></pre>
</section>
<section class="doc__section" aria-labelledby="start">
<h2 id="start">Start the framework</h2>
<p>Register the components your pages use. The router swaps the element marked ${code('data-view="main"')} when a link is followed, and components inside it mount and unmount with it.</p>
<pre><code>${escapeHtml(start)}</code></pre>
<p>Enhancement components that need styles use the package stylesheet, ${code(`@import '${PACKAGE}/styles';`)}, or one file per component.</p>
</section>
<section class="doc__section" aria-labelledby="components">
<h2 id="components">Components</h2>
<ul class="component-grid">
${[...contracts].sort(byName).map(card).join('\n')}
</ul>
</section>
<section class="doc__section" aria-labelledby="about-site">
<h2 id="about-site">About these pages</h2>
<p>Each component page is generated from the contract that sits beside the component's source, and a test checks every contract against the code. The examples are live: change their attributes, watch the events they send and copy the markup. This site runs on Parallelogram too, so following a link here uses the framework's own router.</p>
</section>
</article>`;
}
