import { matchFor, slugFor } from './render.js';

/** The modules every page loads after main, one dynamic import at a time, and can fetch at once */
export const ALWAYS = ['src/managers/RouterManager.js', 'src/core/FragmentSwapper.js'];

/** The site's own components, keyed by the selector the page carries when it uses one */
export const SITE_MODULES = {
  '[data-example]': 'site/src/playground/ExamplePlayground.js',
  '[data-design-workbench]': 'site/src/workbench/DesignWorkbench.js',
};

/**
 * Whether a page's markup uses a selector: a tag as an opening tag, an attribute as an attribute
 */
const uses = (html, selector) => {
  /* A selector is a tag, an attribute, or a tag with an attribute; the attribute is the tell */
  const attribute = selector.match(/\[([a-z0-9-]+)[=\]]/)?.[1];
  if (attribute) return new RegExp(`\\s${attribute}(?=[\\s=>/])`).test(html);
  return new RegExp(`<${selector.match(/^[a-z][a-z0-9-]*/)[0]}(?=[\\s>/])`).test(html);
};

/**
 * The modules a page will import once it runs, from the components its markup uses
 *
 * @param {string} html
 * @param {Array<{ module: string, tag?: string, selector?: string, match?: string }>} contracts
 * @returns {string[]} Module paths from the repository root
 */
export function modulesFor(html, contracts) {
  const used = contracts.filter(contract => uses(html, matchFor(contract)));
  const site = Object.entries(SITE_MODULES).filter(([selector]) => uses(html, selector));
  return [...ALWAYS, ...used.map(c => `src/${c.module}.js`), ...site.map(([, module]) => module)];
}

/**
 * The chunk files to preload for those modules: each module's chunk and everything it imports
 * statically, less what the entry chunk already brings in
 *
 * @param {string[]} modules Module paths from the repository root
 * @param {Record<string, { type: string, facadeModuleId?: string | null, moduleIds?: string[], imports?: string[] }>} bundle
 * @param {{ fileName: string, imports?: string[] }} entry
 * @returns {string[]}
 */
export function chunksFor(modules, bundle, entry) {
  const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
  const chunkOf = module =>
    chunks.find(chunk => chunk.facadeModuleId?.endsWith(`/${module}`)) ??
    chunks.find(chunk => chunk.moduleIds?.some(id => id.endsWith(`/${module}`)));
  const closure = (fileName, into) => {
    if (into.has(fileName)) return into;
    into.add(fileName);
    for (const imported of bundle[fileName]?.imports ?? []) closure(imported, into);
    return into;
  };
  const loaded = closure(entry.fileName, new Set());
  const wanted = new Set();
  for (const module of modules) {
    const chunk = chunkOf(module);
    if (chunk) closure(chunk.fileName, wanted);
  }
  return [...wanted].filter(fileName => !loaded.has(fileName));
}

/**
 * The pages a changed source file makes stale during development: a contract's own page and the
 * index that lists it, a guide's page and the index that links it
 *
 * @param {string} file Absolute path
 * @param {{ contracts: Array<{ name: string }>, guides: Array<{ slug: string }>, componentsDir: string, guidesDir: string }} site
 * @returns {string[]} Page slugs
 */
export function pagesAffectedBy(file, { contracts, guides, componentsDir, guidesDir }) {
  const name = file.split('/').pop();
  if (file.startsWith(componentsDir) && name.endsWith('.contract.js')) {
    const contract = contracts.find(c => c.name === name.replace('.contract.js', ''));
    return contract ? [slugFor(contract), 'index'] : [];
  }
  if (file.startsWith(guidesDir) && name.endsWith('.md')) {
    const guide = guides.find(g => g.slug === name.replace(/\.md$/, ''));
    return guide ? [guide.slug, 'index'] : [];
  }
  return [];
}
