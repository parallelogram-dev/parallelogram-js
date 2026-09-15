import fs from 'node:fs';
import path from 'node:path';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import scss from './scripts/rollup-plugin-scss.js';
import stripLogger from './scripts/babel-plugin-strip-logger.js';

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
    sourcemap: true,
    sourcemapExcludeSources: true,
  },
  plugins: [
    scss({ loadPaths: ['src/styles'] }),
    ...(production
      ? [
          babel({ babelHelpers: 'bundled', plugins: [stripLogger] }),
          terser({
            ecma: 2022,
            compress: { drop_debugger: true },
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
