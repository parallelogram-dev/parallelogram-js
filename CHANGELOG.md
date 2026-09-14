# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@parallelogram-js/core/managers/*` import paths for AlertManager, EventManager, PageManager, RouterManager and TransitionManager.
- `@parallelogram-js/core/styles/*.css` for the per-component stylesheets (datatable, lazysrc, lightbox, reveal, tabs, toasts, toggle), which the build now compiles.
- `@parallelogram-js/core/package.json` is exported.
- Source maps for production and development bundles.
- MIT `LICENSE` file, which `package.json` referenced but the package never shipped.
- `BaseComponent#getBoolAttr()` and `BaseComponent#getNumberAttr()` for reading typed component attributes. `_getConfigFromAttrs()` now converts values to the type of each entry in `static defaults`.

### Deprecated

- The `@parallelogram-js/core/dev/*` import paths. Use the `development` export condition instead; the `dev/*` paths will be removed in 0.6.0.

### Removed

- **BREAKING:** The CommonJS build (`dist/index.cjs`) and the `require` export condition. The package is ESM only, and the root entry is now `dist/index.js`.
- `src/demo` from the published package.
- Stale `dist/components/Carousel.js`, `Uploader.js` and `WIP.js` builds. Their sources were deleted in an earlier cleanup, but the built files were still published and importable via `@parallelogram-js/core/components/*`.

### Security

- `p-uploader` inserted filenames, field values, edited text and server error responses into its shadow DOM as HTML, allowing stored cross-site scripting (for example through an uploaded file's name or a saved caption). File cards are now built with DOM APIs and all data is written as text. Failed uploads, updates and deletes show a JSON `message`/`error` or a short plain-text reason, and fall back to a generic message for anything else, such as an HTML error page.

### Fixed

- **Behaviour change:** boolean attributes set to `"false"` (or `"0"`) now turn options off. Previously every component read them as the truthy string `"false"`, so opt-outs such as `data-toggle-close-navigation="false"`, `data-tabs-keyboard="false"`, `data-reveal-once="false"`, `data-videoplay-autopause="false"`, `data-lightbox-close-escape="false"` and `data-datatable-sortable="false"` did nothing, and `data-toggle-manual="false"` or `data-tabs-autofocus="false"` switched the option on. Empty attributes (`data-toggle-capture`) now count as true. Affects Toggle, Tabs, Modal, Lightbox, DataTable, FormEnhancer, Scrollreveal, Scrollhide, Videoplay, Toast, CopyToClipboard and SelectLoader.
- Components can be constructed without options (`new Toggle()`, `Tabs.enhanceAll()`); the BaseComponent constructor used to throw when called with no argument.
- Components registered with `priority: 'critical'` never mounted on the initial page load or when matching elements were added later; they only mounted after a router fragment swap. Critical components now mount first on every pass, followed by the rest.
- `document.createElement('p-modal')`, `Modal.create()` and framework renderers (React, Vue, Svelte, Lit) produced a dead, never-upgraded element, because the `p-modal` constructor set an attribute. `p-modal` also added a new set of listeners every time it was moved in the DOM; they are now removed on disconnect.
- **Behaviour change:** a `data-modal` trigger no longer overwrites the size and dismiss settings authored on its `<p-modal>` with defaults. It only forwards `data-modal-size`, `data-modal-closable`, `data-modal-backdrop-close` and `data-modal-keyboard` when the trigger sets them. `aria-controls` now points at the modal's id (generated if missing) instead of a string derived from the selector.
- Lightbox waited for a `transitionend` event that the shipped stylesheet never fires, so it stayed in the `opening` state until a mouse happened to hover a button. Until then, Escape, the arrow keys and Next/Prev did nothing, which left keyboard, touch and reduced-motion users unable to use it. Lightbox now waits for its own CSS animations with a timeout fallback, accepts navigation and Escape while opening, and no longer gets stuck in `transitioning` when a gallery image fails to load.
- CopyToClipboard ignored its documented `data-copytoclipboard-target` and `data-copytoclipboard-text` attributes and copied the button's own label. It now resolves both at click time, still accepts the legacy `data-copy-target`/`data-copy-text` spellings, and copies input values. `CopyToClipboard.enhanceAll()` and the framework focus style used the wrong `[data-copy-to-clipboard]` selector.
- **Behaviour change:** CopyToClipboard no longer disables the button or replaces its contents while confirming a copy, which dropped keyboard focus and deleted icons. It sets `data-copytoclipboard-state="copied|failed"`, swaps the text of an optional `[data-copytoclipboard-label]` child (or of a text-only button), and announces the result through a shared `role="status"` region. The fallback copy path now reports failure when the browser rejects the copy and restores focus.
- `p-select` did not submit a value that was selected in markup or set through its `value` property or attribute, and ignored `required`. It now reports its value and validity to the form through `ElementInternals`, restores its initial selection on form reset, follows disabled fieldsets, and exposes `form`, `labels`, `validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()` and reflected `name`, `required` and `disabled` properties.
- **Behaviour change:** a `p-select` placeholder option with `value=""` now submits an empty value. Previously its label was used as the value, so a required select with a placeholder could never be empty.
- Lazysrc's asynchronous `_init` stored a Promise as each image's state, so unmounting never ran its cleanup. Observers, force-load listeners and detached images piled up on every router navigation, and `getStatus()`/`loadAll()` found no elements. `_init` is synchronous again, cleanup disconnects per-element observers and clears retry timers, and `isLoaded()`, `isLoading()` and `hasError()` return booleans instead of Promises.
- Lazysrc downloaded the images in view one after another, waiting for each to finish before starting the next. All images entering the viewport now start loading together, and `loadAll()` loads in parallel.
- **Behaviour change:** Tabs now follows the WAI-ARIA tabs keyboard pattern. Arrow keys, Home and End always move focus to the target tab; previously selection changed but focus stayed put, so keyboard navigation stalled after one step. Tabs never moves focus on mount. `data-tabs-activation="manual"` selects on Enter or Space instead of on focus, and replaces `data-tabs-autofocus`, which is no longer read. Tabs get `aria-controls` and `type="button"`, and panels are only given `tabindex="0"` when they contain nothing focusable.
- `alerts.warn()` toasts rendered white text on a transparent background, because AlertManager sent the type `warn` while `p-toasts` only styled `warning`. `warn` is now an alias of `warning`, toasts of unknown types fall back to a dark background, the dismiss button shows a focus ring, and toasts no longer overflow 320px-wide screens.
- DeferTracker's idle fallback booted trackers almost immediately in Chromium, and so inside Lighthouse traces, because `idleTimeout` was passed to `requestIdleCallback` as a deadline. Safari, which lacks `requestIdleCallback`, waited the full 5 seconds. Without interaction, trackers now boot after the page's load event, then `idleTimeout`, then the next idle period where supported, so the delay is consistent across browsers.
- `Modal.create()` returns the created modal, defaults to the `md` size, respects `close: false` on actions, and accepts a Node as `content`.
- `data-datatable-paginate` accepts a page size (`"5"`) as documented, or `"true"` to paginate with `data-datatable-page-size`. Previously only numeric values enabled pagination and the number was ignored.
- Documented import paths ending in `.js` (for example `@parallelogram-js/core/components/PModal.js`) resolved to `PModal.js.js` and failed. Every subpath now accepts both spellings and honours the `development` condition.
- The `Modal` bundle silently dropped its `p-modal` dependency, and `PSelect` and `AlertManager` dropped `p-toasts`. `sideEffects` now covers the self-registering `p-*` elements.
- Development bundles contained production code, because components imported BaseComponent through the package name and Rollup resolved it to the previous build's minified output.

### Changed

- The library builds as one production and one development Rollup graph. Code shared between entries (BaseComponent, DOM helpers, state helpers) lives once in `dist/shared/` instead of being copied into every component bundle.

- Web component SCSS is now compiled by a local Rollup plugin (`rollup-plugin-scss.js`) using Sass's modern API and cssnano 9, replacing the unmaintained `rollup-plugin-postcss`. Minified CSS now keeps declarations in source order, and inline SVGs keep the `viewBox` from source (cssnano 5 stripped it).
- Updated dev dependencies and removed unused ones (`@rollup/plugin-replace`, `babel-plugin-transform-remove-console`, `postcss-cli`, `postcss-import`).
- Development now requires Node `^22.22.3`, `^24.15.0` or `>=26`, enforced through `devEngines`.
- The demo build deletes stale hashed chunks from `demo/dist`.

## [0.4.0] - 2026-06-03

### Added

- **DeferTracker component** (`src/components/DeferTracker.js`) — declarative, deferred third-party trackers driven by inert JSON config blocks (`<script type="application/json" data-defer-tracker="…">`). Trackers boot only after the first user interaction (or an idle fallback), keeping their cost off the cold-load main thread and out of Lighthouse lab traces. Includes a shared page-wide interaction gate, name-based dedup (router/fragment safe), per-node `data-defer-tracker-status`, and `defer-tracker:booted` / `defer-tracker:error` events.
- Tracker adapter API: `registerTrackerAdapter(name, boot)`, optional eventBus-driven `setTrackerConsent(fn)`, and `configureDeferTracker({ events, idleTimeout })`.
- 13 tree-shakeable tracker adapters under `src/adapters/`: `ga4`, `meta-pixel`, `gtm`, `clarity`, `tiktok-pixel`, `hotjar`, `linkedin-insight`, `pinterest-tag`, `google-ads`, `bing-uet`, `plausible`, `fathom`, `hubspot`. The Google family shares a single internal `gtag.js` loader so it is injected only once.
- New package export paths `@parallelogram-js/core/adapters/*` and `@parallelogram-js/core/dev/adapters/*`.

### Changed

- Rollup build now emits individual adapter bundles to `dist/adapters/` and `dist/dev/adapters/` (production strips logger calls); shared `_`-prefixed adapter helpers are inlined rather than emitted as standalone files.

## [0.1.2] - 2025-01-19

### Added

- Component state management system (ComponentStates.js)
- State-based CSS architecture with attribute selectors
- Multi-component support - multiple components can now mount on same element
- `will-change` performance optimizations in component CSS
- Comprehensive test suite (test/test-state-system.html, test/TEST-CHECKLIST.md)
- TODO.md with framework roadmap and improvement ideas
- Organized test directory with README documentation
- reveal.scss - New component stylesheet for Reveal component
- toggle.scss - New component stylesheet for Toggle component

### Changed

- **BREAKING**: Renamed `data-scrollreveal` to `data-reveal` throughout framework
- Updated Reveal component CSS with optimized transition timing
- State tracking now uses component-specific attributes instead of generic `data-component-mounted`
- BaseComponent now supports `stateAttribute` parameter and state management methods
- ComponentRegistry extracts state attribute from selectors automatically
- Updated all demos to use current attribute naming conventions
- Reorganized documentation into subdirectories (architecture/, getting-started/, guides/, reference/)
- Updated all documentation package names (`@peptolab/parallelogram` → `@parallelogram-js/core`)
- Updated documentation import paths (removed unnecessary `/dist/` prefix)
- Removed emojis from all documentation and demo files

### Fixed

- Critical bug where multiple components couldn't mount on same element
- Reveal component initial state timing (elements now start hidden immediately)
- Lazysrc error state styling (changed from border to box-shadow to prevent layout shift)
- Demo component registry to use `[data-reveal]` selector
- Documentation accuracy across all guides and references

### Performance

- Added `will-change` CSS property to active animation states in:
  - Reveal component (revealing state)
  - Lazysrc component (loading state)
  - Toggle component (opening/closing states)
  - Lightbox component (active animation states)

## [0.1.1] - 2025-01-19

### Added

- Simplified API with `createApp()` and `app.run()` methods
- Web component lazy-loading support via `WebComponentLoader`
- Documentation for simplified API (simplified-api.md)
- Documentation for web component lazy-loading (web-component-lazy-loading.md)

### Changed

- Improved async/defer script handling in initialization
- Enhanced ComponentRegistry validation and error messaging

## [0.1.0] - 2025-01-18

### Changed

- **BREAKING**: Package renamed from `@peptolab/parallelogram` to `@parallelogram-js/core`
- **BREAKING**: Version reset to 0.1.0 for pre-release status
- Updated all documentation to reflect new package name
- Updated README with comprehensive usage examples
- Reorganized under @parallelogram-js organization

### Added

- Comprehensive Web Components documentation (`docs/08-web-components-guide.md`)
- Migration guide for existing projects (`docs/09-migration-guide.md`)
- Quick reference guide for Web Components (`docs/WEB-COMPONENTS-QUICK-REF.md`)
- Import paths reference documentation (`docs/IMPORT-PATHS.md`)
- Clear distinction between Regular Components and Web Components in all docs

### Documentation

- Clarified that Web Components (PModal, PDatetime, PSelect, PToasts, PUploader) should NOT be registered in ComponentRegistry
- Added troubleshooting section for common Web Component issues
- Added framework integration examples (React, Vue, Svelte)
- Added form integration documentation
- Updated all import examples to use `@parallelogram-js/core`

## Migration from @peptolab/parallelogram

If migrating from the old package:

1. Update package.json:

   ```diff
   - "@peptolab/parallelogram": "^1.2.9"
   + "@parallelogram-js/core": "^0.1.0"
   ```

2. Update all imports:

   ```diff
   - import { ComponentRegistry } from '@peptolab/parallelogram';
   + import { ComponentRegistry } from '@parallelogram-js/core';

   - import '@peptolab/parallelogram/components/PModal.js';
   + import '@parallelogram-js/core/components/PModal.js';
   ```

3. Run:
   ```bash
   npm uninstall @peptolab/parallelogram
   npm install @parallelogram-js/core
   ```

## Previous Versions (as @peptolab/parallelogram)

### [1.2.9] - 2025-01-XX

- Improve Lazysrc picture element support
- Fix page transition flicker in PageManager
- Various bug fixes

### [1.2.8] - 2025-01-XX

- Bug fixes and improvements

### [1.2.7] - 2025-01-XX

- Performance improvements
- Component enhancements
