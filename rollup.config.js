// rollup.config.js
import glob from 'glob';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// Get all component files
const componentFiles = glob.sync('src/components/*.js');

// Get all core files
const coreFiles = glob.sync('src/core/*.js');

// Create completely separate builds for each component
const componentConfigs = componentFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/components/${name}.js`,
      format: 'esm',
      // Inline all dependencies to make components self-contained
      inlineDynamicImports: true,
    },
    // No external dependencies - bundle everything into the component
    plugins: [
      resolve({
        extensions: ['.js'],
      }),
      commonjs(),
    ],
  };
});

// Create separate builds for each core utility
const coreConfigs = coreFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/core/${name}.js`,
      format: 'esm',
    },
    plugins: [
      resolve({
        extensions: ['.js'],
      }),
      commonjs(),
    ],
  };
});

export default [
  // Core framework build - ESM
  {
    input: 'src/index.js',
    output: { file: 'dist/index.esm.js', format: 'esm' },
    plugins: [resolve(), commonjs()],
  },

  // Core framework build - CommonJS
  {
    input: 'src/index.js',
    output: { file: 'dist/index.cjs', format: 'cjs' },
    plugins: [resolve(), commonjs()],
  },

  // Individual component builds
  ...componentConfigs,

  // Individual core utility builds
  ...coreConfigs,
];
