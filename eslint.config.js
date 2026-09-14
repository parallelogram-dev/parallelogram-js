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
    rules: {
      ...compat.configs['flat/recommended'].rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/demo/**/*.js'],
    rules: {
      'compat/compat': 'off',
    },
  },
  {
    files: ['*.js', 'scripts/**/*.{js,mjs}', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
