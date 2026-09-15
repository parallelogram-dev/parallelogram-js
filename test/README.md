# Tests

Automated tests run with [Vitest](https://vitest.dev) in two projects.

| Folder          | Project   | Environment                                          | Use it for                                                                              |
| --------------- | --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `test/unit/`    | `unit`    | happy-dom in Node                                    | Pure logic and DOM behaviour that doesn't need layout or a browser                      |
| `test/browser/` | `browser` | Real Chromium, Firefox and WebKit through Playwright | Custom elements, focus, keyboard, forms, CSS and anything else the platform must decide |

Both folders mirror `src/`, so the tests for `src/managers/EventManager.js` live in `test/unit/managers/EventManager.test.js`. Name tests after the behaviour they check.

## Commands

```bash
npm test                # both projects
npm run test:unit       # unit tests only
npm run test:browser    # browser tests only
npm run test:watch      # unit tests in watch mode
npm run coverage        # unit tests with a coverage report in coverage/
```

The first browser run needs the Playwright browsers:

```bash
npx playwright install chromium firefox webkit
```

## Manual checks

`test/manual/` holds the older hand-run state-system page and its checklist. They predate the automated suites and are being replaced by browser tests.
