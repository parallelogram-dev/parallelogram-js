import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import scss from './rollup-plugin-scss.js';

/**
 * Delete chunks left over from earlier builds.
 *
 * Rollup never clears the output directory, so every rebuild would otherwise
 * add freshly hashed chunks alongside the ones they replace.
 */
const removeStaleChunks = () => ({
  name: 'remove-stale-chunks',
  writeBundle({ dir }, bundle) {
    for (const file of fs.globSync('*.js', { cwd: dir })) {
      if (!(file in bundle)) fs.rmSync(path.join(dir, file));
    }
  },
});

export default {
  input: 'src/demo/demo.js',
  output: {
    dir: 'demo/dist',
    format: 'es',
    entryFileNames: 'parallelogram-demo.min.js',
    chunkFileNames: '[name]-[hash].js',
  },
  plugins: [
    scss({ loadPaths: ['src/styles'] }),
    resolve({
      browser: true,
      extensions: ['.js', '.scss', '.css'],
    }),
    commonjs(),
    terser(), // Minify
    removeStaleChunks(),
  ],
};
