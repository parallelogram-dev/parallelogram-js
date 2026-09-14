import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import scss from './rollup-plugin-scss.js';

export default defineConfig({
  plugins: [scss({ loadPaths: ['src/styles'] })],
  resolve: {
    alias: [
      {
        find: /^@parallelogram-js\/core$/,
        replacement: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      },
    ],
  },
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/demo/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['test/unit/**/*.test.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.js'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
          },
        },
      },
    ],
  },
});
