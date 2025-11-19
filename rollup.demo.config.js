import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/demo/demo.js', // Your demo entry point
  output: {
    file: 'demo/dist/parallelogram-demo.min.js',
    format: 'iife', // Self-executing function for browsers
    name: 'ParallelogramDemo',
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
