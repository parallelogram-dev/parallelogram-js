import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import scss from './scripts/rollup-plugin-scss.js';

/**
 * Run the browser tests against the Chrome already installed on this machine
 *
 * `npm run test:browser` downloads Playwright's own browsers, which CI does but a working machine
 * often hasn't. This config points Playwright at the installed Chrome instead, so the suite runs
 * with nothing to download. It runs Chrome only; CI still runs Chromium, Firefox and WebKit.
 *
 * Set CHROME_PATH when Chrome lives somewhere else.
 */
const chrome =
  process.env.CHROME_PATH ||
  {
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: '/usr/bin/google-chrome',
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  }[process.platform];

export default defineConfig({
  plugins: [scss({ loadPaths: ['src/styles'] })],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    name: 'browser',
    include: ['test/browser/**/*.test.js'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { executablePath: chrome } }),
      commands: {
        emulateColorScheme: ({ page }, colorScheme) => page.emulateMedia({ colorScheme }),
      },
      instances: [{ browser: 'chromium' }],
    },
  },
});
