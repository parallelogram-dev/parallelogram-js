import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import scss from './scripts/rollup-plugin-scss.js';

export default defineConfig({
  plugins: [scss({ loadPaths: ['src/styles'] })],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    /* Coverage is reported by vitest.coverage.config.js, which runs both projects: v8 will not
       instrument the three browsers this config runs, and a number from the unit project alone
       describes the half of the suite that covers the least. */
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
            commands: {
              emulateColorScheme: ({ page }, colorScheme) => page.emulateMedia({ colorScheme }),
            },
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
          },
        },
      },
    ],
  },
});
