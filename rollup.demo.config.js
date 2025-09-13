import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/demo/demo.js', // Your demo entry point
  output: {
    file: 'demo/dist/parallelogram-demo.min.js',
    format: 'iife', // Self-executing function for browsers
    name: 'ParallelogramDemo',
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    terser(), // Minify
  ],
};
