/**
 * Check that the package imports shown in the documentation resolve
 *
 * Collects every `@parallelogram-js/core` import from the code on the documentation site's pages,
 * which covers the guides' code blocks, the contracts' examples and the generated usage snippets,
 * and from JSDoc `@example` blocks in src. Each specifier must resolve through the package's
 * exports to a built file, and each imported name must be exported by that module: values by the
 * JavaScript module, and `import type` names by its declarations. Run after `npm run build`.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'rollup/parseAst';
import { loadContracts, loadGuides } from '../site/build/pages.js';
import { componentPage, guidePage, homePage } from '../site/build/render.js';
import { exportedNames } from './types/declarations.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');

const SPECIFIER = String.raw`['"](@parallelogram-js\/core(?:\/[^'"\s]*)?)['"]`;
const CLAUSE = String.raw`[\w$]+\s*,\s*\{[^}]*\}|[\w$]+\s*,\s*\*\s*as\s+[\w$]+|\{[^}]*\}|\*\s*as\s+[\w$]+|[\w$]+`;
const STATIC_IMPORT = new RegExp(
  String.raw`\bimport\s+(type\s+)?(?:(${CLAUSE})\s+from\s+)?${SPECIFIER}`,
  'g'
);
const DYNAMIC_IMPORT = new RegExp(String.raw`\bimport\(\s*${SPECIFIER}\s*\)`, 'g');
const JSDOC_TAG =
  /^@(?:param|returns?|throws|typedef|property|type|template|see|deprecated|internal|protected|private|module|fires)\b/m;
const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };

/**
 * @param {string} [clause] - What an import statement names, such as `Toggle, { BaseComponent }`
 * @param {boolean} typeOnly
 * @returns {{ name: string, typeOnly: boolean }[]}
 */
function importedNames(clause = '', typeOnly = false) {
  const names = [];
  const braces = clause.match(/\{([^}]*)\}/);
  const defaultName = clause
    .replace(/\{[^}]*\}/, '')
    .replace(/\*\s*as\s+[\w$]+/, '')
    .replace(',', '')
    .trim();
  if (defaultName) names.push({ name: 'default', typeOnly });
  for (const specifier of braces?.[1].split(',') ?? []) {
    const match = specifier.trim().match(/^(type\s+)?([\w$]+)/);
    if (match) names.push({ name: match[2], typeOnly: typeOnly || Boolean(match[1]) });
  }
  return names;
}

/**
 * @param {string} where
 * @param {string} code
 */
function importsIn(where, code) {
  return [
    ...[...code.matchAll(STATIC_IMPORT)].map(match => ({
      where,
      specifier: match[3],
      names: importedNames(match[2], Boolean(match[1])),
    })),
    ...[...code.matchAll(DYNAMIC_IMPORT)].map(match => ({
      where,
      specifier: match[1],
      names: [],
    })),
  ];
}

const codeBlocks = html =>
  [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)]
    .map(match => match[1].replace(/&(?:lt|gt|quot|#39|amp);/g, entity => ENTITIES[entity]))
    .join('\n');

const jsdocExamples = source =>
  [...source.matchAll(/\/\*\*([\s\S]*?)\*\//g)]
    .map(([, comment]) => comment.replace(/^[ \t]*\* ?/gm, ''))
    .flatMap(comment => comment.split(/^@example\b/m).slice(1))
    .map(example => example.split(JSDOC_TAG)[0])
    .join('\n');

const contracts = await loadContracts();
const imports = [
  ...importsIn('the home page', codeBlocks(homePage(contracts, ''))),
  ...loadGuides().flatMap(guide =>
    importsIn(`site/guides/${guide.slug}.md`, codeBlocks(guidePage(guide)))
  ),
  ...contracts.flatMap(contract =>
    importsIn(`src/components/${contract.name}.contract.js`, codeBlocks(componentPage(contract)))
  ),
  ...globSync('src/**/*.js', { cwd: root }).flatMap(file =>
    importsIn(file, jsdocExamples(readFileSync(path.join(root, file), 'utf8')))
  ),
];

/**
 * The names a built module exports, following `export * from`
 *
 * @param {string} file
 * @returns {Set<string>}
 */
function moduleExports(file, seen = new Set()) {
  const names = new Set();
  if (seen.has(file)) return names;
  seen.add(file);

  for (const node of parseAst(readFileSync(file, 'utf8')).body) {
    if (node.type === 'ExportDefaultDeclaration') {
      names.add('default');
    } else if (node.type === 'ExportNamedDeclaration') {
      for (const specifier of node.specifiers) {
        names.add(specifier.exported.name ?? specifier.exported.value);
      }
      if (node.declaration?.id) names.add(node.declaration.id.name);
      for (const declarator of node.declaration?.declarations ?? []) {
        if (declarator.id.type === 'Identifier') names.add(declarator.id.name);
      }
    } else if (node.type === 'ExportAllDeclaration') {
      if (node.exported) {
        names.add(node.exported.name ?? node.exported.value);
      } else {
        const source = path.resolve(path.dirname(file), node.source.value);
        for (const name of moduleExports(source, seen)) {
          if (name !== 'default') names.add(name);
        }
      }
    }
  }
  return names;
}

const declarationsFor = file => {
  const relative = path.relative(dist, file).replace(/^dev[\\/]/, '');
  return path.join(dist, 'types', relative.replace(/\.js$/, '.d.ts'));
};

const failures = [];
const cache = new Map();
for (const { where, specifier, names } of imports) {
  let file;
  try {
    file = fileURLToPath(import.meta.resolve(specifier));
  } catch (error) {
    failures.push(`${where}: ${specifier} does not resolve (${error.code ?? error.message})`);
    continue;
  }
  if (!existsSync(file)) {
    failures.push(`${where}: ${specifier} resolves to missing ${path.relative(root, file)}`);
    continue;
  }
  if (names.length === 0) continue;

  if (!cache.has(file)) {
    const types = declarationsFor(file);
    cache.set(file, {
      values: file.endsWith('.js') ? moduleExports(file) : new Set(),
      types: existsSync(types) ? exportedNames(readFileSync(types, 'utf8')) : new Set(),
    });
  }
  const { values, types } = cache.get(file);
  for (const { name, typeOnly } of names) {
    if (!(typeOnly ? types : values).has(name)) {
      failures.push(
        `${where}: ${specifier} has no ${typeOnly ? 'type ' : ''}export named ${name === 'default' ? 'default' : `"${name}"`}`
      );
    }
  }
}

if (imports.length === 0) {
  failures.push('No documentation imports found');
}
if (failures.length) {
  console.error(`${failures.length} documentation import(s) failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`All ${imports.length} documentation imports resolve with the names they import`);
