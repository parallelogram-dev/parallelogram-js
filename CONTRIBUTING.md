# Contributing

This guide covers working on `@parallelogram-js/core` itself: setting up, the conventions the code follows, and how changes are tested and released. The [documentation site](https://dev.parallelogram.com.au) covers using the library.

## Setting up

Development needs Node `^22.22.3`, `^24.15.0` or `>=26`.

```bash
npm install
```

| Command                     | What it does                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run site`              | Serves the documentation site at `localhost:3000`, rebuilding pages as contracts change                           |
| `npm run build`             | Builds the library, stylesheets, TypeScript declarations and `custom-elements.json`                               |
| `npm run test:unit`         | Runs the unit tests in happy-dom                                                                                  |
| `npm run coverage`          | Runs the unit tests with coverage, failing below the thresholds in `vitest.config.js`                             |
| `npm run test:browser`      | Runs the browser tests in Chromium, Firefox and WebKit through Playwright                                         |
| `npm run lint`              | Runs ESLint, including browser compatibility checks against Baseline 2023                                         |
| `npm run format`            | Formats the repository with Prettier                                                                              |
| `npm run check:exports`     | Checks every public import path resolves, after a build                                                           |
| `npm run check:doc-imports` | Checks the imports in the guides, contracts and JSDoc examples resolve with the names they import, after a build  |
| `npm run check:logger`      | Checks the production build has no debug, log, info or group logger calls, after a build                          |
| `npm run check:package`     | Runs publint on the packed package                                                                                |
| `npm run check:types`       | Compiles the TypeScript consumer tests and runs arethetypeswrong                                                  |
| `npm run check:size`        | Checks each entry's gzipped size, with everything it imports, against its budget in `package.json`, after a build |

CI runs all of these on every pull request. Budgets sit 5% above the sizes they were set at, so growth is a decision rather than an accident: when an increase is intended, run `npm run check:size -- --update` and commit the new budgets with the change.

## Layout

| Path                                      | What it holds                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `src/components`                          | Components, each with a `<Name>.contract.js` beside it                    |
| `src/core`                                | `Parallelogram`, `BaseComponent`, component loading and fragment swapping |
| `src/managers`                            | The event bus, router, page manager, alerts and transitions               |
| `src/adapters`                            | DeferTracker's third-party tracker adapters                               |
| `src/utils`                               | Shared helpers, such as events, motion and shadow root styles             |
| `src/styles`                              | The design system and component stylesheets                               |
| `site`                                    | The documentation site and its Markdown guides in `site/guides`           |
| `scripts`                                 | Build steps and checks                                                    |
| `test/unit`, `test/browser`, `test/types` | Unit, browser and TypeScript tests                                        |

## Code style

- Prettier formats everything: two-space indentation, single quotes and 100-character lines, with four spaces for HTML files. Run `npm run format` before committing.
- Comments use block syntax, `/* ... */`, in JavaScript as well as CSS and SCSS. Document public classes, methods and options with `/** ... */` JSDoc, which the TypeScript declarations are generated from.
- The package is ESM only. Files inside `src` import each other by relative path.
- Code targets Baseline 2023 browsers. ESLint's compatibility rules flag newer APIs; use them only behind feature detection.
- Markup never uses inline event handlers such as `onclick`. Components bind their own listeners.

## Enhancement components

Enhancement components extend `BaseComponent` and add behaviour to existing markup.

- Declare `static selector`, such as `'data-toggle'`, and the option defaults in `static defaults`.
- Attributes are named `data-<component>-<option>`, such as `data-toggle-capture`. Read them with `getAttr()`, `getBoolAttr()`, `getNumberAttr()` or `_getConfigFromAttrs()`.
- Write state with `setState()`, which sets `data-<component>-state`, and style that attribute rather than adding classes for state.
- Attach listeners with `{ signal: state.controller.signal }` in `_init`, so unmounting removes them, and release anything else in the state's `cleanup`.
- Dispatch events with `_dispatch()`, named `<component>:<verb>`, such as `toggle:show`.

The [Writing a component](https://dev.parallelogram.com.au/writing-components.html) guide covers the API in full.

## Web components

- Web components are named `P<Name>`, with the tag `p-<name>`, and define themselves when their module loads.
- Custom element constructors don't add attributes or children to the host; do that in `connectedCallback`.
- Styles are SCSS files in `src/styles/framework/components`, adopted into the shadow root, with custom properties and `part` attributes for pages to adjust them.
- Events are named `<tag>:<verb>`, such as `p-modal:open`, and dispatched with `dispatchComponentEvent()` so they leave shadow roots.
- Write user data with `textContent`, attributes and properties, never as HTML.

## Contracts

Every component has a contract, `src/components/<Name>.contract.js`, describing its attributes, events, properties, methods, slots, parts, custom properties and examples in the shape `src/contract.js` defines. The contract generates the component's page on the documentation site, and for web components its TypeScript declarations and `custom-elements.json` entry.

`test/unit/contracts.test.js` checks each contract against its component. Update the contract in the same change as the component.

## CSS

- Class names follow BEM: `block`, `block__element` and `block--modifier`.
- Use `@use`, not `@import`, and design tokens as custom properties with fallbacks.
- Graded sizes are `xs`, `sm`, `md`, `lg` and `xl`, in class modifiers and attribute values alike. A size outside that scale gets a descriptive name, such as `<p-modal>`'s `data-modal-size="fullscreen"`.
- Focus stays visible with a solid outline, works in forced colours, and motion is skipped when the user prefers reduced motion.

## Accessibility

Components work from the keyboard, name their controls, move and return focus predictably, announce changes that aren't otherwise visible, and keep content readable without JavaScript. The browser tests check these behaviours, so add a test with each one.

## Tests

- Unit tests in `test/unit` run in happy-dom and cover logic that doesn't need a real browser.
- Browser tests in `test/browser` run in Chromium, Firefox and WebKit, and cover focus, layout, animation and anything else happy-dom can't reproduce.
- Name tests after the behaviour they check, give each one logical expectation, and add a failing test before fixing a bug.
- Changes to public types need a case in `test/types`.

## Changes and releases

- Keep each commit to one change with its tests.
- Record user-facing changes under `[Unreleased]` in `CHANGELOG.md`. Deprecate a public name for at least one release before removing it, except where a release says otherwise.
- Commits are authored by the person responsible for them, without co-author trailers for tools.

To release, set the version with `npm version <version> --no-git-tag-version`, move `[Unreleased]` to the new version with its date, name the new line in `SECURITY.md` when the minor changes, and merge to `main`. Then push a `v<version>` tag on `main`. The Publish workflow runs every check and publishes to npm with provenance.
