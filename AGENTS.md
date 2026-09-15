# AGENTS.md

`@parallelogram-js/core` is a small, dependency-free progressive enhancement library: enhancement components that add behaviour to server-rendered HTML through data attributes, a few web components, and a router that swaps pages in place. It is ESM only and targets Baseline 2023 browsers.

[CONTRIBUTING.md](CONTRIBUTING.md) describes the layout, code style, components, contracts and tests. Read it before changing code. To use the library rather than work on it, read [llms.txt](https://dev.parallelogram.com.au/llms.txt).

## Where things live

- `src/components`: components, each with a `<Name>.contract.js` beside it
- `src/core`, `src/managers`, `src/adapters`, `src/utils`, `src/styles`: the framework, managers, tracker adapters, helpers and stylesheets
- `site`: the documentation site, generated from the contracts and the Markdown guides in `site/guides`
- `test/unit`, `test/browser`, `test/types`: unit, browser and TypeScript tests
- `scripts`: build steps and checks

## Before finishing

Run these and fix what they report:

```bash
npm run lint
npm run format:check
npm run test:unit
npm run build
npm run check:exports
npm run check:types
npm run check:size
```

Run `npm run test:browser` when a change touches focus, layout, animation or anything else happy-dom can't reproduce, and `npm run build:site` when it touches the site or a guide.

## Rules that are easy to miss

- Comments use block syntax, `/* ... */`, in JavaScript as well as CSS and SCSS. Never `//`.
- Update a component's contract, `src/components/<Name>.contract.js`, in the same change as the component. `test/unit/contracts.test.js` checks them against each other.
- Record user-facing changes under `[Unreleased]` in `CHANGELOG.md`, never under a released version.
- Tests that need a real browser go in `test/browser`; `test/unit` runs in happy-dom.
- Public import paths are `@parallelogram-js/core/components/<Name>`, with or without `.js`. Files inside `src` import each other by relative path.
- Enhancement components extend `BaseComponent` and are configured through `data-<component>-*` attributes, such as `data-toggle-capture`. They write state to `data-<component>-state` rather than classes.
- Web components are named `P<Name>` with the tag `p-<name>`.
