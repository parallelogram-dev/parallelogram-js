import { rowsOf } from './token-rows.js';

/**
 * HTML for the documentation site, rendered from component contracts
 *
 * Every page is a complete document that reads without JavaScript. The framework's router swaps the
 * `main` and `sidebar` views between pages, and the example playground makes each example live.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const PACKAGE = '@parallelogram-js/core';
export const REPOSITORY = 'https://github.com/parallelogram-dev/parallelogram-js';

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
export const byName = (a, b) => a.name.localeCompare(b.name);

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

  /* A second trigger for the same panel, shown only while the panel is a drawer */
  const close = `<button class="sidebar__close" type="button" data-toggle data-toggle-target="#sidebar-nav" aria-label="Close the documentation menu"><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>`;

  return [
    close,
    group('Start', [link('index', 'Overview'), link('design-system', 'Design system')]),
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
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.png" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="fonts/Haffer-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/src/styles/site.scss">
<script type="module" src="/src/main.js"></script>
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <button class="sidebar__trigger" type="button" data-toggle data-toggle-target="#sidebar-nav" data-toggle-capture aria-label="Documentation menu">
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
  </button>
  <a class="brand" href="index.html"><svg class="brand__mark" aria-hidden="true" focusable="false" viewBox="0 0 401 365.81"><g fill="#0000ff" stroke="#fff"><path d="M40.16 40.16L40.16 40.16L133.04 133.04L40.16 40.16"/><path d="M40.16 40.16L7.31 7.31C3.1 11.51 0.5 17.32 0.5 23.73L0.5 265.59L133.04 133.04L40.16 40.16"/><path d="M0.5 265.59L92.98 358.07L93.82 358.9C97.98 362.86 103.61 365.31 109.81 365.31C122.64 365.31 133.04 354.91 133.04 342.07L133.04 265.59L0.5 265.59"/><path d="M393.9 116.84L393.47 116.41L284.73 7.66L284.04 6.98C279.87 2.97 274.21 0.5 267.97 0.5L23.73 0.5C17.32 0.5 11.51 3.1 7.31 7.31L40.16 40.16L133.04 133.04L133.04 133.04L354.03 133.04L400.5 133.04C400.5 126.74 397.98 121.03 393.9 116.84"/><path d="M354.03 133.04L133.04 133.04L0.5 265.59L133.04 265.59L267.69 265.59C267.78 265.59 267.88 265.6 267.97 265.6C268.07 265.6 268.17 265.59 268.26 265.59C274.29 265.51 279.75 263.14 283.84 259.31L284.92 258.22L393.47 149.68L393.9 149.25C397.98 145.06 400.5 139.35 400.5 133.04L354.03 133.04"/></g></svg>Parallelogram</a>
  <span class="site-header__version">${escapeHtml(version)}</span>
  <a class="site-header__link" href="${REPOSITORY}" aria-label="Parallelogram on GitHub"><svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="22" height="22" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
</header>
<div class="site">
<nav class="sidebar" id="sidebar-nav" data-view="sidebar" aria-label="Documentation">
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

/**
 * Every attribute an example can set, with the element a control for it writes to
 *
 * An attribute the component writes itself, or a deprecated one, isn't something to change: the
 * first belongs in the State panel and the second shouldn't be encouraged. Nor is the attribute
 * that marks the element for the component, since taking it away only unmounts the example.
 */
const configurableOf = contract =>
  [
    ...(contract.attributes ?? []).map(attribute => ({ attribute })),
    ...(contract.elements ?? []).flatMap(element =>
      (element.attributes ?? []).map(attribute => ({ attribute, target: element.tag }))
    ),
  ].filter(
    ({ attribute }) =>
      !attribute.readonly && !attribute.deprecated && attribute.name !== contract.selector
  );

export function exampleBlock(contract, example, { titled = true } = {}) {
  const id = `${slugFor(contract)}-${example.id}`;
  const writesState = attributesOf(contract).some(
    attribute => attribute.readonly && !attribute.deprecated
  );
  /* Every configurable attribute gets a control; the ones the example names lead, as its point */
  const named = new Map((example.controls ?? []).map(control => [control.attribute, control]));
  const configurable = configurableOf(contract);
  const controls = [
    ...[...named.keys()]
      .map(name => configurable.find(item => item.attribute.name === name))
      .filter(Boolean),
    ...configurable.filter(item => !named.has(item.attribute.name)),
  ]
    .map(item =>
      controlField(
        id,
        {
          attribute: item.attribute.name,
          target: named.get(item.attribute.name)?.target ?? item.target,
        },
        item.attribute
      )
    )
    .join('\n');
  const description = example.description ? `<p>${inline(example.description)}</p>` : '';
  const header = titled
    ? `<header class="example__header">
  <h2 id="${id}-title">${escapeHtml(example.title)}</h2>
  ${description}
</header>`
    : description
      ? `<header class="example__header">${description}</header>`
      : '';

  return `<section class="example" data-example="${escapeHtml(contract.name)}:${escapeHtml(example.id)}" ${titled ? `aria-labelledby="${id}-title"` : `aria-label="${escapeHtml(example.title)}"`}>
${header}
<div class="example__views" data-tabs>
  <div class="example__tabs" data-tabs-list>
    <a href="#${id}-output" data-tab="${id}-output">Output</a>
    <a href="#${id}-markup" data-tab="${id}-markup">Markup</a>
    ${writesState ? `<a href="#${id}-state" data-tab="${id}-state">State</a>` : ''}
    <a href="#${id}-events" data-tab="${id}-events">Events</a>
  </div>
  <div data-tabs-panels>
    <section id="${id}-output" data-tab-panel="active" aria-label="Output">
<div class="example__stage" data-example-stage>
${example.markup}
</div>
    </section>
    <section id="${id}-markup" data-tab-panel aria-label="Markup">
<div class="example__code">
<pre><code id="${id}-code" data-example-code>${escapeHtml(example.markup)}</code></pre>
<button type="button" class="tool-button example__copy" data-copytoclipboard data-copytoclipboard-target="#${id}-code"><span data-copytoclipboard-label>Copy markup</span></button>
</div>
    </section>
    ${
      writesState
        ? `<section id="${id}-state" data-tab-panel aria-label="State">
<section class="example__state" data-example-state hidden aria-label="The state the component writes">
  <dl data-example-state-list></dl>
</section>
    </section>`
        : ''
    }
    <section id="${id}-events" data-tab-panel aria-label="Events">
<section class="example__log" data-example-log hidden aria-label="The events the component sends">
  <button type="button" class="tool-button" data-example-log-clear>Clear</button>
  <ol data-example-log-list></ol>
  <p data-example-log-empty>Use the example to see the events it sends.</p>
</section>
    </section>
  </div>
</div>
${
  controls
    ? `<form class="example__controls" data-example-controls hidden aria-label="Change the ${escapeHtml(example.title.toLowerCase())} example">
${controls}
<button type="reset" class="tool-button">Reset</button>
</form>`
    : ''
}
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

function attributeRows(attributes, className) {
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
    const site = attribute.option
      ? ` <span class="note">For every instance, ${code(`${className}.defaults.${attribute.option}`)}.</span>`
      : '';

    return `<tr${attribute.deprecated ? ' class="is-deprecated"' : ''}><th scope="row">${code(attribute.name)}${badges}</th><td>${type}</td><td>${value}</td><td>${inline(attribute.description)}${where}${property}${site}${deprecation(attribute)}</td></tr>`;
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
      attributeRows(contract.attributes ?? [], contract.name),
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

  /* Every enhancement but the two whose contracts say otherwise has a static enhanceAll() */
  const alone =
    contract.kind === 'enhancement' && contract.enhanceAll !== false
      ? `<p>The framework is optional. ${code(`${contract.name}.enhanceAll()`)} mounts the component on every matching element by itself, for a page that wants one enhancement rather than a framework:</p>
<pre><code>${escapeHtml(`import ${contract.name} from '${PACKAGE}/${contract.module}';\n\n${contract.name}.enhanceAll();`)}</code></pre>
<p>It takes a selector and the component's options, and returns the instance it mounted them with. What it leaves out is what the framework adds: loading a component only on the pages that use it, mounting again after a page swap, and ordering with ${code('dependsOn')}.</p>`
      : '';

  return `<section class="doc__section" aria-labelledby="usage">
<h2 id="usage">Usage</h2>
<p>Register the component and the framework loads it the first time a page contains ${code(matchFor(contract))}.</p>
<pre><code>${escapeHtml(script)}</code></pre>
${alone}
${stylesheet}
</section>`;
}

/**
 * The examples, in tabs when there is more than one so the column keeps one example's height
 */
function playground(contract) {
  const examples = contract.examples ?? [];
  if (examples.length === 0) return '';
  if (examples.length === 1) return exampleBlock(contract, examples[0]);

  const panelId = example => `${slugFor(contract)}-${example.id}-panel`;
  const tabs = examples
    .map(
      example =>
        `<a href="#${panelId(example)}" data-tab="${panelId(example)}">${escapeHtml(example.title)}</a>`
    )
    .join('\n    ');
  /* The first panel carries active so the shipped stylesheet shows it before Tabs mounts */
  const panels = examples
    .map(
      (example, index) =>
        `<section id="${panelId(example)}" data-tab-panel${index === 0 ? '="active"' : ''}>
${exampleBlock(contract, example, { titled: false })}
</section>`
    )
    .join('\n');

  return `<div class="playground" data-tabs>
  <div class="playground__tabs" data-tabs-list>
    ${tabs}
  </div>
  <div data-tabs-panels>
${panels}
  </div>
</div>`;
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

  const examples = playground(contract);

  return `<article class="doc doc--split" aria-labelledby="doc-title">
<div class="doc__columns">
<header class="doc__header">
  <div class="doc__intro">
    <p class="doc__eyebrow">${contract.kind === 'element' ? 'Web component' : 'Enhancement'}</p>
    <h1 id="doc-title">${escapeHtml(titleFor(contract))}</h1>
    <p class="doc__summary">${inline(contract.summary)}</p>
  </div>
  <dl class="doc__facts">${facts}</dl>
</header>
${
  examples
    ? `<div class="doc__aside">
<h2 class="doc__aside-title" id="playground">Playground</h2>
${examples}
</div>`
    : ''
}
<div class="doc__main">
<section class="doc__section" aria-labelledby="about">
<h2 id="about">About</h2>
${paragraphs(contract.description)}
${accessibility}
</section>
${
  contract.withoutJs
    ? `<section class="doc__section" aria-labelledby="without-javascript">
<h2 id="without-javascript">Without JavaScript</h2>
${paragraphs(contract.withoutJs)}
</section>`
    : ''
}
${usage(contract)}
</div>
<div class="doc__reference">
${reference(contract, '')}
${elements}
</div>
</div>
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
  <p class="doc__summary">Parallelogram adds behaviour to server-rendered HTML through data attributes and a small set of web components. Each component loads the first time a page uses it, and, if you want it, links can swap the page in place instead of reloading it.</p>
</header>
<section class="doc__section" aria-labelledby="install">
<h2 id="install">Install</h2>
<pre><code>npm install ${PACKAGE}</code></pre>
</section>
<section class="doc__section" aria-labelledby="start">
<h2 id="start">Start the framework</h2>
<p>Register the components your pages use, and the framework loads each one the first time a page contains it.</p>
<pre><code>${escapeHtml(start)}</code></pre>
<p>The router is optional, and off unless you ask for it. Add ${code('router: {}')} and links swap the element marked ${code('data-view="main"')} in place instead of reloading the page, with the components inside it mounting and unmounting as it changes. Leave it out and every link is an ordinary link.</p>
<p>Enhancement components that need styles use the package stylesheet, ${code(`@import '${PACKAGE}/styles';`)}, or one file per component.</p>
</section>
<section class="doc__section" aria-labelledby="components">
<h2 id="components">Components</h2>
<p>An <strong>enhancement</strong> is behaviour added to markup you already have, through a data attribute: the element works without it and does more with it. A <strong>web component</strong> is an element of its own, which the browser upgrades when its module arrives. Each page below says which it is, and what its markup does before the module loads.</p>
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

/**
 * The design system workbench: token controls beside every component in a light and a dark frame
 *
 * @returns {string}
 */
export function designSystemPage(readers = new Map(), sources = new Map(), groups = []) {
  const tokenId = name => `token${name.replace(/^-+/, '-')}`;

  /* A demo is given its family's tokens by role, worked out from each name's ending, so the demo
     knows which of Accent's three values is the text colour without anything saying so twice. */
  const ROLES = [
    ['--demo-hover', /-hover(-bg)?$/],
    ['--demo-text', /(-contrast|-color|-text)$/],
    ['--demo-muted', /-muted$/],
    ['--demo-border', /(-border|-border-color)$/],
    ['--demo-width', /-(border-)?width$/],
    ['--demo-radius', /-radius$/],
    ['--demo-shadow', /-shadow$/],
    ['--demo-offset', /-offset$/],
    ['--demo-duration', /-duration$/],
    ['--demo-easing', /-easing$/],
    ['--demo-strong', /-strong$/],
    ['--demo-bg', /(-bg|-tint|-surface)$/],
  ];

  const demoStyle = row => {
    const taken = new Set();
    const parts = [];
    for (const [property, pattern] of ROLES) {
      const token = row.tokens.find(t => pattern.test(t.name) && !taken.has(t.name));
      if (token) {
        taken.add(token.name);
        parts.push(`${property}: var(${token.name})`);
      }
    }
    /* Whatever is left over is the family's plain value: the accent itself, not its hover */
    const base = row.tokens.find(t => !taken.has(t.name));
    if (base) parts.push(`--demo-base: var(${base.name})`);
    return parts.join('; ');
  };

  /* Some families need more than one specimen to be honest: a status colour is a solid chip and a
     tinted message, and its contrast and strong values belong to one each. */
  const SAMPLES = {
    status: [
      ['solid', 'Solid'],
      ['tint', 'Message'],
    ],
  };

  const LABEL = {
    button: 'Button',
    status: 'Message',
    surface: 'Surface',
    text: 'Muted text',
    field: 'Placeholder',
    focus: 'Focused',
    motion: 'Motion',
    inverse: 'Inverse',
    overlay: 'Overlay',
    shadow: 'Shadow',
    swatch: '',
  };

  /* A token another token follows is read, by that token: the dropdown border reads the panel
     border, though no component stylesheet names the panel border */
  const followers = new Map();
  for (const [name, { follows }] of sources) {
    if (follows) followers.set(follows, [...(followers.get(follows) ?? []), name]);
  }

  const field = token => {
    const id = tokenId(token.name);
    const scope = token.kind === 'colour' ? 'theme' : 'both';
    const followedBy = followers.get(token.name) ?? [];
    const unread = (readers.get(token.name) ?? []).length === 0 && followedBy.length === 0;
    const { source = '', follows = null } = sources.get(token.name) ?? {};
    /* Carried from the stylesheet because the browser substitutes var() before anything can see it:
       a token that follows another is otherwise indistinguishable from one holding its own value */
    const link = follows
      ? ` data-token-follows="${escapeHtml(follows)}"`
      : '';
    return `<div class="tokens__token${unread ? ' tokens__token--unread' : ''}" data-token-source="${escapeHtml(source)}"${link}>
    <label class="tokens__label" for="${id}"><code>${escapeHtml(token.name)}</code></label>
    <span class="tokens__control">
      <span class="tokens__swatch" style="--demo: var(${escapeHtml(token.name)})" aria-hidden="true"></span>
      <input id="${id}" name="${escapeHtml(token.name)}" data-token-input="${scope}" autocomplete="off" spellcheck="false" disabled>
      <button type="button" class="tokens__copy" data-copytoclipboard data-copytoclipboard-target="#${id}" aria-label="Copy ${escapeHtml(token.name)}"><span aria-hidden="true">&#10697;</span><span class="visually-hidden" data-copytoclipboard-label>Copy</span></button>
    </span>
    ${follows ? `<p class="tokens__follows">Follows <code>${escapeHtml(follows)}</code></p>` : ''}
    ${followedBy.length ? `<p class="tokens__follows">Followed by ${followedBy.map(name => `<code>${escapeHtml(name)}</code>`).join(', ')}</p>` : ''}
  </div>`;
  };

  const row = tokenRow => {
    const read = [...new Set(tokenRow.tokens.flatMap(t => readers.get(t.name) ?? []))];
    const followed = tokenRow.tokens.some(t => followers.has(t.name));
    const used = read.length
      ? `<p class="tokens__read">Read by ${escapeHtml(read.join(', '))}</p>`
      : followed
        ? '<p class="tokens__read">Read through the tokens that follow these</p>'
        : '<p class="tokens__read tokens__read--none">Declared, and nothing reads these yet</p>';

    return `<div class="tokens__row">
  <div class="tokens__field">
    <h3 class="tokens__family">${escapeHtml(tokenRow.title)}</h3>
    <div class="tokens__list">
${tokenRow.tokens.map(field).join('\n')}
    </div>
    ${used}
  </div>
  <div class="tokens__demo" data-token-demo="${tokenRow.demo}" style="${demoStyle(tokenRow)}">
    ${(SAMPLES[tokenRow.demo] ?? [[null, LABEL[tokenRow.demo] ?? '']])
      .map(
        ([part, label]) =>
          `<span class="tokens__sample"${part ? ` data-part="${part}"` : ''}>${escapeHtml(label)}</span>`
      )
      .join('')}
  </div>
</div>`;
  };

  const layer = (group, index) => `<section class="tokens__layer" aria-labelledby="tokens-${group.id}">
<h2 id="tokens-${group.id}"><span class="tokens__step">${index + 1}</span> ${escapeHtml(group.title)}</h2>
${group.note ? `<p class="tokens__note">${inline(group.note)}</p>` : ''}
<div class="tokens__rows">
${rowsOf(group).map(row).join('\n')}
</div>
</section>`;

  return `<article class="tokens" data-design-workbench aria-labelledby="doc-title">
<header class="doc__header">
  <p class="doc__eyebrow">Design system</p>
  <h1 id="doc-title">The tokens, and what reads them</h1>
  <p class="doc__summary">Everything the library draws comes from these values, in four layers. The first reaches every component at once; each one after it narrows what you are changing. Related values sit together with something showing them at work. Colours carry a value for each theme; the switch decides which one you are looking at and editing.</p>
</header>
<form data-workbench-controls>
  <div class="tokens__bar">
    <button type="button" class="tool-button" data-token-theme aria-pressed="false">Dark theme</button>
    <button type="reset" class="tool-button">Reset all</button>
    <span class="tokens__count">Changed <span class="badge" data-workbench-count>0</span></span>
  </div>
${groups.map(layer).join('\n')}
</form>
<section class="tokens__export" aria-labelledby="tokens-export">
  <h2 id="tokens-export">Changed values</h2>
  <pre><code id="workbench-css" data-workbench-output>/* No changes yet */</code></pre>
  <button type="button" class="tool-button" data-copytoclipboard data-copytoclipboard-target="#workbench-css"><span data-copytoclipboard-label>Copy CSS</span></button>
</section>
</article>`;
}

/** Components in the preview, grouped by the kind of surface they are made of */
const PREVIEW_GROUPS = [
  ['Form controls', ['PSelect', 'PDatetime', 'FormEnhancer', 'SelectLoader', 'CopyToClipboard']],
  ['Dialogs and messages', ['PModal', 'Modal', 'Lightbox', 'PToasts', 'Toast']],
  ['Disclosure', ['Accordion', 'Toggle', 'Tabs']],
  ['Panels and data', ['PUploader', 'DataTable']],
  ['Media and motion', ['Lazysrc', 'Videoplay', 'Scrollreveal', 'Scrollhide']],
  ['Background', ['DeferTracker']],
];

/**
 * The document each workbench frame shows: every example of every component, grouped by surface,
 * in the theme named by the `theme` query parameter
 *
 * @param {import('../../src/contract.js').ComponentContract[]} contracts
 * @returns {string}
 */
export function previewDocument(contracts) {
  const withExamples = new Map(
    contracts.filter(contract => contract.examples?.length).map(contract => [contract.name, contract])
  );
  const grouped = new Set(PREVIEW_GROUPS.flatMap(([, names]) => names));
  const groups = [
    ...PREVIEW_GROUPS,
    ['Other', [...withExamples.keys()].filter(name => !grouped.has(name)).sort()],
  ];

  const specimen = (contract, example) => `<section class="specimen" data-specimen="${escapeHtml(contract.name)}:${escapeHtml(example.id)}" aria-label="${escapeHtml(titleFor(contract))}: ${escapeHtml(example.title)}">
<p class="specimen__label">${escapeHtml(example.title)} <small>${escapeHtml(titleFor(contract))}</small></p>
<div class="specimen__stage">
${example.markup}
</div>
</section>`;

  const sections = groups
    .map(([title, names]) => {
      const specimens = names
        .map(name => withExamples.get(name))
        .filter(Boolean)
        .flatMap(contract => contract.examples.map(example => specimen(contract, example)));
      return specimens.length
        ? `<section class="preview-group" aria-label="${escapeHtml(title)}">
<h2>${escapeHtml(title)}</h2>
${specimens.join('\n')}
</section>`
        : '';
    })
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Design system preview · Parallelogram</title>
<script>document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';</script>
<link rel="stylesheet" href="/src/styles/preview.scss">
<script type="module" src="/src/preview.js"></script>
</head>
<body>
<main class="preview">
${sections}
</main>
</body>
</html>
`;
}
