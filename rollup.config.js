// rollup.config.js (ESM)
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';

export default {
  input: 'src/index.js', // your barrel that re-exports components
  output: [
    // ESM: readable per-file
    {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].js',
    },
    // ESM: minified per-file
    {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].min.js',
      plugins: [terser()],
    },
    // CJS: readable per-file
    {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].js',
    },
    // CJS: minified per-file
    {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].min.js',
      plugins: [terser()],
    },
    // Keep your single UMD (aggregate)
    { file: 'dist/index.umd.js', format: 'umd', name: 'ParallelogramJS', sourcemap: true },
    { file: 'dist/index.umd.min.js', format: 'umd', name: 'ParallelogramJS', sourcemap: true, plugins: [terser()] },
  ],
  plugins: [
    del({ targets: ['dist/*', 'demo/dist/*'], force: true, hook: 'buildStart' }),
    resolve({ browser: true }),
    commonjs(),
    babel({ babelHelpers: 'bundled', exclude: 'node_modules/**' }),

    // copy your styles → dist and mirror dist → demo (once)
    copy({
      targets: [
        { src: 'src/styles/**/*', dest: 'dist' },     // dist/styles/**
        { src: 'dist/**', dest: 'demo/dist' },        // mirror build for demo
      ],
      hook: 'closeBundle',
      overwrite: true,
      verbose: true,
    }),
  ],
  treeshake: { moduleSideEffects: false },
};
