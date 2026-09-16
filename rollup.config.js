import fs from 'node:fs';
import path from 'node:path';
import terser from '@rollup/plugin-terser';
import scss from './scripts/rollup-plugin-scss.js';

const entries = (folder, keep = () => true) =>
  fs
    .globSync(`src/${folder}/*.js`)
    .filter(file => keep(path.basename(file)))
    .map(file => [`${folder}/${path.basename(file, '.js')}`, file]);

/**
 * Every public import path is a Rollup entry, so one graph per mode emits them
 * all and moves code they share (BaseComponent, dom-utils, state helpers) into
 * dist/shared instead of inlining a copy into each file.
 */
const input = Object.fromEntries([
  ['index', 'src/index.js'],
  ...entries('components', file => !file.endsWith('.contract.js')),
  ...entries('adapters', file => !file.startsWith('_')),
  ...entries('core'),
  ...entries('managers'),
]);

const build = ({ dir, production }) => ({
  input,
  output: {
    dir,
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: 'shared/[name].js',
    /* The development build is readable as it is; its maps with sources inside were 1.2 MB of the package */
    sourcemap: production,
    sourcemapExcludeSources: true,
  },
  plugins: [
    scss({ loadPaths: ['src/styles'] }),
    ...(production
      ? [
          terser({
            ecma: 2022,
            compress: {
              drop_debugger: true,
              /* Debug-level logger calls are removed from production; warn and error stay */
              pure_funcs: [
                'this.logger.debug',
                'this.logger?.debug',
                'this.logger.log',
                'this.logger?.log',
                'this.logger.info',
                'this.logger?.info',
                'this.logger.group',
                'this.logger?.group',
                'this.logger.groupEnd',
                'this.logger?.groupEnd',
              ],
            },
            mangle: { keep_classnames: true },
            format: { comments: false },
          }),
        ]
      : []),
  ],
});

export default [
  build({ dir: 'dist', production: true }),
  build({ dir: 'dist/dev', production: false }),
];
