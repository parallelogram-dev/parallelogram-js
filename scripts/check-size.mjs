/**
 * Check the gzipped size of every public entry against the budgets in package.json.
 *
 * Each JavaScript entry in dist is bundled with everything it imports, lazily imported modules
 * included, so the figure is what a page using that entry downloads. The stylesheet bundle is
 * measured as built. Run after `npm run build`. `--update` sets every budget to 5% above its
 * current size, for when an increase is intended.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as prettier from 'prettier';
import { rollup } from 'rollup';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const packagePath = path.join(root, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const update = process.argv.includes('--update');
const HEADROOM = 1.05;

const jsEntries = [
  'index.js',
  /* The single-file bundle sits at the root of dist, so it is named rather than found in a folder */
  'parallelogram.js',
  ...['components', 'adapters', 'core', 'managers'].flatMap(folder =>
    readdirSync(path.join(dist, folder))
      .filter(file => file.endsWith('.js'))
      .map(file => `${folder}/${file}`)
  ),
];

const gzipped = source => gzipSync(source, { level: 9 }).length;

const bundledSize = async entry => {
  const bundle = await rollup({ input: path.join(dist, entry), onwarn() {} });
  try {
    const { output } = await bundle.generate({ format: 'es', inlineDynamicImports: true });
    return gzipped(output.map(chunk => (chunk.type === 'chunk' ? chunk.code : '')).join(''));
  } finally {
    await bundle.close();
  }
};

const sizes = {};
for (const entry of jsEntries) {
  sizes[entry] = await bundledSize(entry);
}
sizes['styles/index.min.css'] = gzipped(readFileSync(path.join(dist, 'styles/index.min.css')));

if (update) {
  pkg.sizeBudget = Object.fromEntries(
    Object.entries(sizes).map(([entry, size]) => [entry, Math.ceil(size * HEADROOM)])
  );
  const config = await prettier.resolveConfig(packagePath);
  writeFileSync(
    packagePath,
    await prettier.format(JSON.stringify(pkg), { ...config, filepath: packagePath })
  );
  console.log(`Set ${Object.keys(sizes).length} size budgets in package.json`);
  process.exit(0);
}

const budgets = pkg.sizeBudget ?? {};
const failures = [];
const rows = Object.entries(sizes).map(([entry, size]) => {
  const budget = budgets[entry];
  if (budget === undefined) {
    failures.push(`${entry} has no budget`);
  } else if (size > budget) {
    failures.push(`${entry} is ${size} B gzipped, over its ${budget} B budget`);
  }
  return { entry, 'gzip (B)': size, 'budget (B)': budget ?? '—' };
});
console.table(rows);

if (failures.length > 0) {
  console.error(
    `\n${failures.join('\n')}\n\nIf the increase is intended, run npm run check:size -- --update and commit package.json.`
  );
  process.exit(1);
}
console.log(`All ${rows.length} entries are within their size budgets`);
