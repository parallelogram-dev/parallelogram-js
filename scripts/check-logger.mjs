/**
 * Check that the production build has no debug-level logger calls
 *
 * Terser's pure_funcs in rollup.config.js removes `this.logger` debug, log, info, group and groupEnd
 * calls from the production build and keeps warn and error. This fails if any of those calls are
 * left in a JavaScript file in dist outside dist/dev. Run after `npm run build`.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const CALL = /\.logger\??\.(?:debug|log|info|group|groupEnd)\s*(?:\?\.)?\(/g;
const devFolder = `dist${path.sep}dev${path.sep}`;

const files = globSync('dist/**/*.js', { cwd: root }).filter(file => !file.startsWith(devFolder));
if (files.length === 0) {
  console.error('No JavaScript files in dist; run npm run build first');
  process.exit(1);
}

const failures = files.flatMap(file =>
  [...readFileSync(path.join(root, file), 'utf8').matchAll(CALL)].map(
    match => `${file}: ${match[0]}`
  )
);

if (failures.length) {
  console.error(
    `${failures.length} logger call(s) left in the production build:\n  ${failures.join('\n  ')}`
  );
  process.exit(1);
}
console.log(`No debug-level logger calls in ${files.length} production files`);
