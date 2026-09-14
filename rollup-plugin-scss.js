/**
 * Rollup plugin that imports .scss and .css files as minified CSS strings.
 *
 * Compiles with Dart Sass's modern API and minifies with cssnano, so a
 * component can `import styles from './Component.scss'` and inline the result
 * into its Shadow DOM. Replaces rollup-plugin-postcss, which relied on Sass's
 * deprecated legacy JS API.
 */
import { fileURLToPath, pathToFileURL } from 'url';
import { compileString } from 'sass';
import postcss from 'postcss';
import cssnano from 'cssnano';

const STYLE_FILE = /\.s?css$/;

export default function scssPlugin({ loadPaths = [] } = {}) {
  const minifier = postcss([cssnano()]);

  return {
    name: 'scss',
    async transform(code, id) {
      if (!STYLE_FILE.test(id)) return null;

      const compiled = compileString(code, { url: pathToFileURL(id), loadPaths });
      for (const url of compiled.loadedUrls) {
        if (url.protocol === 'file:') this.addWatchFile(fileURLToPath(url));
      }

      const { css } = await minifier.process(compiled.css, { from: id, to: id });

      return { code: `export default ${JSON.stringify(css)};`, map: { mappings: '' } };
    },
  };
}
