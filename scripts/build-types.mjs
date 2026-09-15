/**
 * Finish the TypeScript declarations and write custom-elements.json
 *
 * Runs after `tsc -p tsconfig.types.json` has declared every module in dist/types from its JSDoc.
 * Each custom element's declaration is replaced by one generated from its contract, and the build
 * fails if tsc found an export the contract doesn't declare or two elements type the same global
 * event differently. Internal members, named with an underscore and not protected, are then
 * removed from every class, and custom-elements.json is written from the same contracts.
 */
import { existsSync, globSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  conflictingGlobalEvents,
  elementDeclarations,
  exportedNames,
} from './types/declarations.mjs';
import { withoutInternalMembers } from './types/internals.mjs';
import { customElementsManifest } from './types/manifest.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const componentsDir = path.join(root, 'src/components');
const typesDir = path.join(root, 'dist/types');

const contracts = await Promise.all(
  readdirSync(componentsDir)
    .filter(file => file.endsWith('.contract.js'))
    .sort()
    .map(async file => (await import(pathToFileURL(path.join(componentsDir, file)).href)).default)
);
const elements = contracts.filter(contract => contract.kind === 'element');

const problems = conflictingGlobalEvents(contracts);

for (const contract of elements) {
  const file = path.join(typesDir, `${contract.module}.d.ts`);
  if (!existsSync(file)) {
    problems.push(`${path.relative(root, file)} is missing; run tsc -p tsconfig.types.json first`);
    continue;
  }

  const generated = elementDeclarations(contract);
  const declared = exportedNames(generated);
  const missing = [...exportedNames(readFileSync(file, 'utf8'))].filter(
    name => !declared.has(name)
  );
  if (missing.length) {
    problems.push(
      `${contract.module} exports ${missing.join(', ')}, which its contract doesn't declare`
    );
  }

  writeFileSync(file, generated);
}

if (problems.length) {
  console.error(`Declarations could not be generated:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

let internals = 0;
for (const file of globSync('**/*.d.ts', { cwd: typesDir })) {
  const declarations = readFileSync(path.join(typesDir, file), 'utf8');
  const { text, removed } = withoutInternalMembers(declarations);
  if (removed > 0) {
    writeFileSync(path.join(typesDir, file), text);
    internals += removed;
  }
}

writeFileSync(
  path.join(root, 'dist/custom-elements.json'),
  `${JSON.stringify(customElementsManifest(contracts), null, 2)}\n`
);

console.log(
  `Declared ${elements.length} custom elements from their contracts, removed ${internals} internal members and wrote custom-elements.json`
);
