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
- `ComponentHost` (`@parallelogram-js/core/core/ComponentHost`) loads registry components and mounts them on matching elements, watching its root with a single MutationObserver. `PageManager` delegates to it and exposes it as `pageManager.host`.
- `app.components.add()` accepts a `name` option, and components added after `run()` are mounted straight away.
- `BaseComponent#trackedElements()` lists the elements a component is mounted on, including ones whose asynchronous `_init` is still running.
- `EventManager#on()` and `EventManager#once()` accept `{ signal }` and remove the listener when the signal aborts; `EventManager#listenerCount()` reports how many listeners an event has; listener errors go to the logger passed to the constructor.
- `BaseComponent#getBoolAttr()` and `BaseComponent#getNumberAttr()` for reading typed component attributes. `_getConfigFromAttrs()` now converts values to the type of each entry in `static defaults`.
- `RouterManager#handlesLink(link)` reports whether the router takes over clicks on a link, and the `router.navigating` getter reports whether a navigation (including its fragment swap) is in progress.
- `router:navigate-success` carries `waitUntil(promise)`, which keeps the navigation in progress until the page swap settles, plus `requestedUrl`, `redirected` and the navigation's abort `signal`. `router:navigate-end` reports a `status` of `success`, `error`, `aborted` or `full-load`.
- `RouterManager#get()` accepts `signal` and `timeout` in its second argument, and a `fullLoadOnError` router option (default `true`) controls the full page load fallback.
- `static selector` names a BaseComponent subclass's data attribute (`'data-toggle'`, `'toggle'` or `'[data-toggle]'`). Every built-in component declares one, and a component that still derives its attribute from its class name logs a warning, because minifiers rename classes.
- PageManager `focusTarget` (default `'h1'`, or `false` to leave focus alone) and `announce` (default `true`) options for what happens after a router navigation. `router:navigate-success` carries the `scroll` position saved for a Back/Forward entry.

### Deprecated

- Component state written to a component's own data attribute. `BaseComponent#setState()` now writes `data-<component>-state` and still copies the value into `data-<component>`, Toggle copies target state into `data-toggle-target` on targets that are not toggles themselves, and `p-modal` copies `data-modal-state` into `data-modal`. The copies stop in 0.6.0; style and query the `-state` attributes, which `getElementState()` now reads first.
- The `@parallelogram-js/core/dev/*` import paths. Use the `development` export condition instead; the `dev/*` paths will be removed in 0.6.0.

### Removed

- `QueuedComponentProxy` (`@parallelogram-js/core/core/QueuedComponentProxy`), PageManager's internal loading methods (`_ensureInstance`, `_handleAsyncLoading`, `_createInstance`, `unmountRemoved`) and its unused `batchUpdates`, `updateThrottleMs`, `lazyLoadThreshold` and `scrollRestoration` options.
- TransitionManager's unused `root` option and property.
- RouterManager's per-link listeners and the `data-router-enhanced` attribute, its `router:anchor-scroll` event, the unused `scrollDuration` and `scrollEasing` options, and the `controller`, `boundPopState`, `boundLinkClick` and `boundAnchorClick` properties. PageManager no longer fetches pages on `router:popstate`, and its `page:popstate-error` event is gone; failures are reported through `router:navigate-error`.
- **BREAKING:** The CommonJS build (`dist/index.cjs`) and the `require` export condition. The package is ESM only, and the root entry is now `dist/index.js`.
- `src/demo` from the published package.
- Stale `dist/components/Carousel.js`, `Uploader.js` and `WIP.js` builds. Their sources were deleted in an earlier cleanup, but the built files were still published and importable via `@parallelogram-js/core/components/*`.

### Security

- `p-uploader` inserted filenames, field values, edited text and server error responses into its shadow DOM as HTML, allowing stored cross-site scripting (for example through an uploaded file's name or a saved caption). File cards are now built with DOM APIs and all data is written as text. Failed uploads, updates and deletes show a JSON `message`/`error` or a short plain-text reason, and fall back to a generic message for anything else, such as an HTML error page.

### Fixed

- **BREAKING:** enhancement components registered with `app.components.add()` are named by their `name` option or, by default, their full selector. Names used to come from the first `data-*` attribute or class in the selector, so `[data-widget="chart"]` and `[data-widget="map"]` shared one instance and mounted the wrong class. `dependsOn` and `pageManager.instances` use the new names, and registering a name twice throws.
- **BREAKING:** `app.components.add()` only treats valid custom element names (containing a hyphen, such as `p-modal`) as web components. Plain selectors such as `form`, `details` or `ul > li` were sent to the web component loader and never mounted.
- Parallelogram mounted every component twice on startup (once in PageManager's constructor and again over `document.body`), and components outside a narrower `containerSelector` were never observed. It now mounts and observes the whole document once; a standalone PageManager observes `options.observeRoot`, which defaults to its container.
- When a component's module failed to load and then loaded on retry, the elements that were waiting were never mounted. Elements removed while their module was loading were still mounted afterwards, `dependsOn` did not wait for dependencies to load, and loaders that return a class directly or a named export (`exportName`) failed to instantiate.
- `PageManager#destroy()` and `RouterManager#destroy()` left their event bus, window and link listeners attached, because `EventManager#off(event)` without a callback did nothing. Managers now remove only their own listeners through an abort signal, and `off(event)` without a callback removes every listener for that event. SelectLoader no longer adds a permanent `router:navigate-success` listener each time it mounts, and DeferTracker's pending consent listener is removed on unmount.
- BaseComponent leaked when `_init` threw or returned a Promise, or when a state's `cleanup()` threw: the element stayed tracked and its abort signal was never aborted. `mount()` now untracks and aborts on failure, `unmount()` always aborts the signal, an asynchronous `_init` is supported and is cleaned up if the element is unmounted first, and mounted elements live in one `Map` instead of a WeakMap plus a separate Set.
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
- **Behaviour change:** a link click during a slow navigation used to be swallowed, and a request cancelled by another could leave the newer one impossible to cancel, so fast Back/Forward presses could show an older page. The most recent navigation now wins: earlier requests are aborted, and page swaps run one after another.
- **Behaviour change:** a navigation that fails (an HTTP error, network failure or timeout), returns something other than HTML, or is redirected to another site now falls back to a normal page load, so the browser shows the server's own error page. Previously the old page stayed on screen, the router refused to retry the same URL, and the link click caused an unhandled promise rejection. With `fullLoadOnError: false`, the `router-error` class now stays on the page until the next navigation starts instead of being removed in the same tick.
- **Behaviour change:** fragment transitions, TransitionManager animations, SelectLoader fades, Scrollreveal's inline fallback and PageManager's `scrollPosition: 'element'` smooth scroll now respect `prefers-reduced-motion: reduce`. Fragment transitions are skipped, TransitionManager and the fade helpers finish at once, and Scrollreveal leaves content visible instead of hiding it with inline styles that overrode the stylesheet's reduced-motion rules.
- **Behaviour change:** a fragment swap only replaced the fragment's content and a handful of its attributes, so the root kept the previous page's attributes and page components keyed on the root (such as the demo's `<main data-view="main" data-demo="media">`) mounted the previous page's component again. The root's attributes now match the new page, apart from `data-view`, classes starting with `component-`, `router-` or `page-`, and an out-transition class that an in-transition is about to replace.
- **Behaviour change:** `targetGroups` defaults to `{}`, so a navigation replaces only the fragment it names. The old default also replaced `menubar` and `breadcrumb` with `main` and `toolbar` with `sidebar`, and logged errors on every navigation for sites without them.
- **Behaviour change:** fragments are matched only by `[data-view]`, with the name escaped. The previous guesses by id, class and common main-content selectors, which could replace the wrong element, need the new `fragmentFallbacks: true` option.
- **Behaviour change:** when the new page or the current page lacks a requested fragment, `replaceFragments()` now rejects with a `FragmentMismatchError` before changing anything, so the router loads the page normally. Previously the fragments that were found were swapped and the rest were logged as errors, leaving a mix of old and new content.
- Navigating kept head metadata the new page did not have (such as `<meta name="robots" content="noindex">`, `og:image` or `canonical`), kept only the last of repeated tags such as several `og:image` entries, removed hreflang alternates whenever the new page also linked a feed, and never updated `<html lang>` or `dir`. Managed head tags are now replaced as a set from the new page, `lang` and `dir` follow it, the fetched HTML is parsed once, and a response without head content leaves the head alone.
- **Behaviour change:** scripts in swapped-in content never ran, because the browser ignores scripts inserted through `innerHTML`, and stylesheets or scripts in the new page's `<head>` were never loaded, so pages reached by client-side navigation could miss their behaviour and styles. Scripts in new fragments now run (skip one with `data-router-skip`, or all with the new `runScripts: false` PageManager option), and stylesheets and external scripts the new head adds are loaded before the content is shown, for up to `assetTimeout` milliseconds (default 3000). When the assets marked `data-router-track="reload"` differ from the current page's, nothing is replaced and the router loads the page normally, so a deploy with new bundles is picked up.
- **Behaviour change:** the framework stylesheets for Toggle, Lightbox, DataTable and Scrollreveal now style the `data-<component>-state` attributes. `reveal.scss` targeted `data-reveal="hidden|revealing|revealed"`, which Scrollreveal never wrote, so none of its state styles applied; it now uses `data-reveal-state` and Scrollreveal's `visible` state. The Toggle transition rule matched every trigger through `[data-toggle-target]`.
- With a page observer watching `[data-lightbox]`, such as `Parallelogram` on `document.body`, Lightbox mounted on its own overlay because the overlay's state attribute matched, and clicking the open image opened a second overlay.
- A Toggle target that is also a toggle, such as a nested menu, had its `data-toggle-target` selector overwritten with its open state.
- Fragments in a target group were replaced one after another, and components, the page title, scroll position and focus were only updated once every fragment's in-transition had finished. Fragments are now replaced independently, so a slow or failing one no longer holds up the rest, and each fragment's components mount as soon as its content is swapped.
- TransitionManager's class animations never removed their class, so repeating one never restarted it, and waited forever for an `animationend` that a class without an animation never fires. Classes are now removed when their animation ends, a class that does not animate finishes at once, a new transition cancels the one running on the same element, and the JavaScript animation uses the Web Animations API. `p-select` could end up with a hidden listbox and `aria-expanded="true"` when reopened while its close animation was running.
- Fragment transitions set through `targetGroupTransitions` waited for an `animationend` or `transitionend` event that never fired when the class defined no animation or the fragment was hidden, so the swap never finished and the page title, component mounting and later navigations never happened (as in the demo's navbar). Transitions now wait for the fragment's running animations, finish straight away when there are none, and give up shortly after the longest animation should have ended.
- **Behaviour change:** after a client-side navigation, keyboard focus fell back to `<body>` (the activated link was usually swapped out) and screen readers heard nothing, unlike a full page load. PageManager now moves focus, without scrolling, to the element named by the URL hash, an `[autofocus]` element, or the new main fragment's first `h1` (falling back to the fragment itself, given `tabindex="-1"` when needed), and announces the new `document.title` through a shared polite live region.
- **Behaviour change:** Back and Forward landed at the top of the page (or scrolled the old content before it was replaced). While the router runs it sets `history.scrollRestoration` to `manual`, remembers the scroll position of each history entry, restores it once the page is replaced, and saves it into `history.state` so it also survives a reload. Moves between hash entries of the same page restore their position too.
- Back and Forward always replaced the `main` target group, even for entries created by a `data-view-target` link. They now replace the fragment changed by the navigation being undone or redone.
- Links to another page with a hash (`/pricing#plans`) landed at the top of the new page. The target is now scrolled into view and focused after the swap.
- After a server redirect, the address bar and `router.currentUrl` show the URL the page came from instead of the one that was requested.
- `router.isNavigating()` threw a TypeError, because a boolean property of the same name hid the method.
- `router.get()` cancelled any navigation in progress and was cancelled by the next one, so SelectLoader loads and page navigations aborted each other and showed error messages. Requests made with `router.get()` are now independent, and a `signal` passed to it no longer disables the timeout. Timeouts reject with a `TimeoutError` instead of an `AbortError`.
- **Behaviour change:** the router handles link clicks with one listener on the document, so links added by components or scripts after startup are routed too. It ignores clicks that another handler has cancelled or that use a mouse button other than the main one, respects `data-router-skip` on any ancestor, and leaves `rel="external"` links and cross-origin links to the browser (`data-router-enhance` now only overrides the file extension check).
- **Behaviour change:** the router no longer intercepts same-page `#hash` links, which scrolled without moving focus, never applied `:target` and ignored reduced motion. Use `scroll-behavior: smooth` inside `@media (prefers-reduced-motion: no-preference)` for smooth scrolling. Back and Forward between entries that differ only by hash no longer re-fetch the page.
- **Behaviour change:** SelectLoader shows the most recent choice when an earlier one is still loading, instead of ignoring the new choice. It marks the target `aria-busy` instead of disabling the select, clears its error class after a successful load, and cancels a pending load when the choice is cleared or the component is unmounted.

### Changed

- Router history entries store `key`, `position`, `viewTarget` and `scroll` in `history.state`, and the router adds a `key` and `position` to entries it did not create (the first page and native hash navigations).
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
