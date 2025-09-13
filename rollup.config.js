// rollup.config.js
import glob from 'glob';
import path from 'path';

// Get all component files
const componentFiles = glob.sync('src/components/*.js');

// Create completely separate builds for each component
const componentConfigs = componentFiles.map(file => {
  const name = path.basename(file, '.js');

  return {
    input: file,
    output: {
      file: `dist/components/${name}.js`,
      format: 'esm',
      // Don't create any shared chunks at all
      inlineDynamicImports: true,
    },
    // Don't mark anything as external - let each component be self-contained
    // OR mark your core as external if you want components to reference it
    external: id => {
      // Only mark the main framework as external
      return (
        id.includes('BaseComponent') || id.includes('DevLogger') || id === '@peptolab/parallelogram'
      );
    },
    plugins: [
      /* your plugins */
    ],
  };
});

export default [
  // Core framework build
  {
    input: 'src/index.js',
    output: { file: 'dist/index.esm.js', format: 'esm' },
  },

  // Individual component builds
  ...componentConfigs,
];
