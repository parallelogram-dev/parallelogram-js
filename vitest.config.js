import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import scss from './scripts/rollup-plugin-scss.js';

export default defineConfig({
  plugins: [scss({ loadPaths: ['src/styles'] })],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.contract.js'],
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
