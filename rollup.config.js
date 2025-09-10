import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
    { file: 'dist/index.umd.js', format: 'umd', name: 'ParallelogramJS', sourcemap: true }
  ],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),
    copy({ targets: [{ src: 'src/styles/**/*', dest: 'dist/styles' }] })
  ]
};