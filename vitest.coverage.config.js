import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import scss from './scripts/rollup-plugin-scss.js';

/**
 * Coverage over both projects, which the ordinary config cannot report
 *
 * `npm test` runs the browser tests against chromium, firefox and webkit, and @vitest/coverage-v8
 * refuses more than one browser instance. So coverage is its own configuration, running the same
 * tests against chromium alone: the number it reports covers every test, and the three-engine matrix
 * stays where it belongs, on the test run that is checking for engine differences.
 */
export default defineConfig({
  plugins: [scss({ loadPaths: ['src/styles'] })],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.contract.js'],
      /* The real combined number when these were set, rounded down. The unit project alone reported
         about 51/44/50/53, which is why the gate used to sit there: it was measuring the half of the
         suite that does not cover PSelect, PDatetime or PUploader. */
      thresholds: { statements: 83, branches: 74, functions: 82, lines: 85 },
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'happy-dom', include: ['test/unit/**/*.test.js'] },
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
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
