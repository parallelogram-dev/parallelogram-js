/**
 * Rollup and Vite plugin that imports .scss and .css files as minified CSS strings.
 *
 * Compiles with Dart Sass's modern API and minifies with cssnano, so a
 * component can `import styles from './Component.scss'` and inline the result
 * into its Shadow DOM. Style imports resolve to virtual `.js` module ids, which
 * keeps Vite's own CSS pipeline (used by the Vitest browser runner) from also
 * processing them.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileString } from 'sass';
import postcss from 'postcss';
import cssnano from 'cssnano';

const STYLE_FILE = /\.s?css$/;
const PREFIX = '\0scss-string:';
const SUFFIX = '.js';

export default function scssPlugin({ loadPaths = [] } = {}) {
  const minifier = postcss([cssnano()]);

  return {
    name: 'scss-string',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer || !STYLE_FILE.test(source)) return null;

      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved || resolved.external) return null;
      if (resolved.id.startsWith(PREFIX)) return resolved.id;

      return PREFIX + resolved.id + SUFFIX;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;

      const file = id.slice(PREFIX.length, -SUFFIX.length);
      const compiled = compileString(await readFile(file, 'utf8'), {
        url: pathToFileURL(file),
        loadPaths,
      });
      for (const url of compiled.loadedUrls) {
        if (url.protocol === 'file:') this.addWatchFile(fileURLToPath(url));
      }

      const { css } = await minifier.process(compiled.css, { from: file, to: file });

      return { code: `export default ${JSON.stringify(css)};`, map: { mappings: '' } };
    },
  };
}
