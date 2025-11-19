import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/demo/demo.js',
  output: {
    dir: 'demo/dist',
    format: 'es',
    entryFileNames: 'parallelogram-demo.min.js',
    chunkFileNames: '[name]-[hash].js',
  },
  plugins: [
    postcss({
      extensions: ['.scss', '.css'],
      inject: false,
      extract: false,
      minimize: true,
      sourceMap: false,
      use: [
        ['sass', {
          includePaths: ['src/styles']
        }]
      ]
    }),
    resolve({
      browser: true,
      extensions: ['.js', '.scss', '.css']
    }),
    commonjs(),
    terser(), // Minify
  ],
};
