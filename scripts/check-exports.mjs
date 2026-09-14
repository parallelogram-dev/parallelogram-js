/**
 * Check that every public import path resolves to a built file.
 *
 * Links the package into a throwaway consumer, resolves each subpath with and
 * without the `.js` suffix under both the default and `development` conditions,
 * and fails if a path does not resolve, points at a missing file, or ignores the
 * condition. Run after `npm run build`.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const name = '@parallelogram-js/core';

const modules = (folder, keep = () => true) =>
  readdirSync(path.join(root, 'src', folder))
    .filter(file => file.endsWith('.js') && keep(file))
    .map(file => `${folder}/${path.basename(file, '.js')}`);

const jsSubpaths = [
  ...modules('components'),
  ...modules('adapters', file => !file.startsWith('_')),
  ...modules('core'),
  ...modules('managers', file => file !== 'index.js'),
];

const cases = [
  { specifier: name, devFolder: true },
  ...jsSubpaths.flatMap(subpath => [
    { specifier: `${name}/${subpath}`, devFolder: true },
    { specifier: `${name}/${subpath}.js`, devFolder: true },
  ]),
  ...jsSubpaths
    .filter(subpath => !subpath.startsWith('managers/'))
    .map(subpath => ({ specifier: `${name}/dev/${subpath}.js`, devFolder: true, alwaysDev: true })),
  { specifier: `${name}/styles` },
  ...readdirSync(path.join(root, 'dist/styles/components')).map(file => ({
    specifier: `${name}/styles/${file}`,
  })),
  { specifier: `${name}/package.json` },
];

const consumer = mkdtempSync(path.join(tmpdir(), 'parallelogram-exports-'));
try {
  mkdirSync(path.join(consumer, 'node_modules/@parallelogram-js'), { recursive: true });
  symlinkSync(root, path.join(consumer, 'node_modules', name), 'dir');
  writeFileSync(
    path.join(consumer, 'resolve.mjs'),
    `const out = {};
for (const specifier of JSON.parse(process.argv[2])) {
  try { out[specifier] = import.meta.resolve(specifier); } catch (error) { out[specifier] = { error: error.code || error.message }; }
}
console.log(JSON.stringify(out));`
  );

  const resolveAll = conditions =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [...conditions, 'resolve.mjs', JSON.stringify(cases.map(c => c.specifier))],
        { cwd: consumer, encoding: 'utf8' }
      )
    );

  const failures = [];
  for (const [label, conditions, expectDev] of [
    ['default', [], false],
    ['development', ['--conditions=development'], true],
  ]) {
    const resolved = resolveAll(conditions);
    for (const { specifier, devFolder, alwaysDev } of cases) {
      const result = resolved[specifier];
      if (typeof result !== 'string') {
        failures.push(`${label}: ${specifier} did not resolve (${result.error})`);
        continue;
      }
      const file = fileURLToPath(result);
      if (!existsSync(file)) {
        failures.push(`${label}: ${specifier} resolved to missing ${path.relative(root, file)}`);
        continue;
      }
      const inDev = file.includes(`${path.sep}dist${path.sep}dev${path.sep}`);
      if (devFolder && inDev !== (expectDev || Boolean(alwaysDev))) {
        failures.push(`${label}: ${specifier} resolved to ${path.relative(root, file)}`);
      }
    }
  }

  if (failures.length) {
    console.error(`${failures.length} export check(s) failed:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`All ${cases.length} import paths resolve under both conditions`);
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
