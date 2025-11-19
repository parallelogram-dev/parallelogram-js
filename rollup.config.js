// rollup.config.js
import glob from 'glob';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import stripLogger from './babel-plugin-strip-logger.js';
import fs from 'fs';

// Get all component files
const componentFiles = glob.sync('src/components/*.js');

// Get all core files
const coreFiles = glob.sync('src/core/*.js');

// Helper to create plugin array for components
const createComponentPlugins = (isProduction = false) => {
  const plugins = [
    postcss({
      extensions: ['.scss', '.css'],
      inject: false,
      extract: false,
      minimize: true,
      sourceMap: false,
      // Note: rollup-plugin-postcss 4.0.2 still uses legacy Sass API
      // This will show deprecation warnings until the plugin is updated
      // See: https://github.com/egoist/rollup-plugin-postcss/issues
      use: [
        ['sass', {
          includePaths: ['src/styles']
        }]
      ]
    }),
    resolve({
      extensions: ['.js', '.scss', '.css'],
    }),
    commonjs(),
  ];

  // Add babel to strip logger calls in production
  if (isProduction) {
    plugins.push(
      babel({
        babelHelpers: 'bundled',
        plugins: [stripLogger],
        exclude: 'node_modules/**',
      })
    );

    // Add terser for minification in production
    plugins.push(
      terser({
        compress: {
          drop_debugger: true,
          pure_funcs: [], // Don't drop functions, babel handles logger removal
        },
        mangle: {
          // Preserve class names for better debugging
          keep_classnames: true,
        },
        format: {
          comments: false,
        },
      })
    );
  }

  return plugins;
};

// Create DEVELOPMENT builds for each component (dist/dev/components/)
const devComponentConfigs = componentFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/dev/components/${name}.js`,
      format: 'esm',
      inlineDynamicImports: true,
    },
    plugins: createComponentPlugins(false), // Development build - keep logger
  };
});

// Create PRODUCTION builds for each component (dist/components/)
const prodComponentConfigs = componentFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/components/${name}.js`,
      format: 'esm',
      inlineDynamicImports: true,
    },
    plugins: createComponentPlugins(true), // Production build - strip logger
  };
});

// Create DEVELOPMENT builds for core files (dist/dev/core/)
const devCoreConfigs = coreFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/dev/core/${name}.js`,
      format: 'esm',
    },
    plugins: [
      resolve({ extensions: ['.js'] }),
      commonjs(),
    ],
  };
});

// Create PRODUCTION builds for core files (dist/core/)
const prodCoreConfigs = coreFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/core/${name}.js`,
      format: 'esm',
    },
    plugins: [
      resolve({ extensions: ['.js'] }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        plugins: [stripLogger],
        exclude: 'node_modules/**',
      }),
      terser({
        compress: { drop_debugger: true },
        mangle: { keep_classnames: true },
        format: { comments: false },
      }),
    ],
  };
});

export default [
  // Core framework build - ESM (production)
  {
    input: 'src/index.js',
    output: { file: 'dist/index.esm.js', format: 'esm' },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        plugins: [stripLogger],
        exclude: 'node_modules/**',
      }),
      terser({
        compress: { drop_debugger: true },
        mangle: { keep_classnames: true },
        format: { comments: false },
      }),
    ],
  },

  // Core framework build - ESM (development)
  {
    input: 'src/index.js',
    output: { file: 'dist/dev/index.esm.js', format: 'esm' },
    plugins: [resolve(), commonjs()],
  },

  // Core framework build - CommonJS (production)
  {
    input: 'src/index.js',
    output: { file: 'dist/index.cjs', format: 'cjs' },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        plugins: [stripLogger],
        exclude: 'node_modules/**',
      }),
      terser({
        compress: { drop_debugger: true },
        mangle: { keep_classnames: true },
        format: { comments: false },
      }),
    ],
  },

  // Core framework build - CommonJS (development)
  {
    input: 'src/index.js',
    output: { file: 'dist/dev/index.cjs', format: 'cjs' },
    plugins: [resolve(), commonjs()],
  },

  // Individual component builds - PRODUCTION
  ...prodComponentConfigs,

  // Individual component builds - DEVELOPMENT
  ...devComponentConfigs,

  // Individual core utility builds - PRODUCTION
  ...prodCoreConfigs,

  // Individual core utility builds - DEVELOPMENT
  ...devCoreConfigs,
];