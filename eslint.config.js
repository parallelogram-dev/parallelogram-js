import js from '@eslint/js';
import compat from 'eslint-plugin-compat';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'demo/dist/', 'coverage/', 'node_modules/'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    ...compat.configs['flat/recommended'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    files: ['*.js', 'scripts/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
