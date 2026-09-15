/**
 * Compile the global stylesheets with Dart Sass and minify them with cssnano.
 *
 * `node scripts/build-css.mjs` builds the library styles into dist/styles:
 * index.css and index.min.css from the framework entry, plus one minified
 * file per enhancement component in dist/styles/components. Shadow DOM styles
 * (the P*.scss files) are bundled into their web components instead.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileAsync } from 'sass';
import postcss from 'postcss';
import cssnano from 'cssnano';

const minifier = postcss([cssnano()]);

async function build(input, output, { keepExpanded = false } = {}) {
  const { css } = await compileAsync(input, { loadPaths: ['src/styles'] });
  const { css: minified } = await minifier.process(css, { from: input, to: output });

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, minified);
  if (keepExpanded) await writeFile(output.replace(/\.min\.css$/, '.css'), css);

  return output;
}

async function library() {
  const componentDir = 'src/styles/framework/components';
  const components = (await readdir(componentDir)).filter(
    file => file.endsWith('.scss') && !file.startsWith('_') && !file.startsWith('P')
  );

  return Promise.all([
    build('src/styles/framework/index.scss', 'dist/styles/index.min.css', { keepExpanded: true }),
    ...components.map(file =>
      build(
        path.join(componentDir, file),
        `dist/styles/components/${path.basename(file, '.scss')}.css`
      )
    ),
  ]);
}

const targets = { library };
const target = process.argv[2] ?? 'library';

if (!targets[target]) {
  console.error(`Unknown target "${target}". Use one of: ${Object.keys(targets).join(', ')}`);
  process.exit(1);
}

const written = await targets[target]();
console.log(`Built ${written.length} stylesheet(s) for ${target}`);
