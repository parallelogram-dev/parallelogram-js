# Getting started

This guide adds `@parallelogram-js/core` to a server-rendered site: installing it, choosing import paths, starting the framework, registering components and loading their styles.

## Install

```bash
npm install @parallelogram-js/core
```

The package is ESM only. Load it with `import`, or with `await import()` from CommonJS code. There is no `require` export condition.

It targets Baseline 2023: Chrome and Edge 120, Firefox 121, and Safari 17.2 on macOS and iOS, or later. It ships modern JavaScript without transpiling it, so a bundler only needs to resolve and bundle it. Older browsers aren't tested or supported.

## Import paths

Every path below works with or without `.js`, so `@parallelogram-js/core/components/Toggle` and `@parallelogram-js/core/components/Toggle.js` load the same file.

| Path                                          | What it loads                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `@parallelogram-js/core`                      | The root entry, described below                                           |
| `@parallelogram-js/core/components/*`         | One component, such as `components/Toggle` or `components/PModal`         |
| `@parallelogram-js/core/managers/*`           | One manager, such as `managers/RouterManager`                             |
| `@parallelogram-js/core/core/*`               | One core class, such as `core/BaseComponent` or `core/WebComponentLoader` |
| `@parallelogram-js/core/adapters/*`           | A DeferTracker adapter, such as `adapters/ga4`                            |
| `@parallelogram-js/core/styles`               | The package stylesheet                                                    |
| `@parallelogram-js/core/styles/*.css`         | One component stylesheet, such as `styles/toggle.css`                     |
| `@parallelogram-js/core/custom-elements.json` | The Custom Elements Manifest                                              |

The root entry exports `Parallelogram`, also as its default export, and `ComponentRegistry`, `WebComponentLoader`, `DevLogger`, `BaseComponent`, `EventManager`, `RouterManager` and `PageManager`.

```js
import { Parallelogram, BaseComponent } from '@parallelogram-js/core';
import Toggle from '@parallelogram-js/core/components/Toggle';
```

Code that several paths use, such as `BaseComponent`, is built into shared files, so it loads once however many paths you import.

### Development and production builds

Each path has two builds. The default build is minified, and a bundler that resolves the `development` export condition picks the development build instead. Vite resolves it during development. With esbuild, pass `--conditions=development`.

The production build differs from the development build in these ways:

- The framework's own `this.logger` calls to `debug()`, `log()`, `info()`, `group()` and `groupEnd()` are removed. Calls to `warn()` and `error()` stay, because they report real problems.
- `debugger` statements are removed and comments are dropped.
- Names are minified, but class names are kept.

Both builds include source maps. Because the production build has no debug calls, `debug: true` only shows the framework's debug output in the development build. Your own calls to `app.logger.info()` are not removed.

### Deprecated `dev/*` paths

`@parallelogram-js/core/dev/components/*`, `dev/core/*` and `dev/adapters/*` load the development build directly. They are deprecated and removed in 0.6.0. Use the normal paths with the `development` export condition.

## Start the framework

Create an instance with `Parallelogram.create()`, register components, then call `run()`.

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  router: {},
  pageManager: { containerSelector: '[data-view="main"]' },
});

app.components.add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

await app.run();
```

### Options

`Parallelogram.create(config)` takes these options. All are optional.

| Option        | Type      | Default | What it does                                                                                                                                            |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`       | `boolean` | `false` | Shows `debug`, `log`, `info` and `group` output from `app.logger`. The framework's own debug calls only exist in the development build                  |
| `silent`      | `boolean` | `false` | Hides all logger output, including warnings and errors. Overrides `debug`                                                                               |
| `router`      | `object`  | `null`  | Router options. The router is only created when this is set, so without it links load pages normally. See [Pages and the router](pages-and-router.html) |
| `pageManager` | `object`  | `{}`    | PageManager options, plus `containerSelector`. See [Pages and the router](pages-and-router.html) for the options that affect navigation                 |

`pageManager.containerSelector` names the page manager's container, `body` by default. Components mount in it, and it is watched for added elements, only when `observeRoot` isn't set. The framework sets `observeRoot` to `document.body`, so components mount anywhere in the body, including a header or footer outside the container, unless you pass your own `observeRoot`. The router finds fragments by their `data-view` names anywhere in the page, whatever the container is.

Two PageManager options affect loading on every page:

| Option             | Type      | Default | What it does                                                           |
| ------------------ | --------- | ------- | ---------------------------------------------------------------------- |
| `retryFailedLoads` | `boolean` | `true`  | Retry an enhancement component whose module fails to load              |
| `maxRetryAttempts` | `number`  | `3`     | How many times to retry before giving up; ignored when retries are off |

### `run()` and `init()`

`init()` creates the logger, event bus, router, page manager and web component loader, mounts components already on the page and starts watching it. It returns the instance. Calling it a second time logs a warning and does nothing else.

`run()` calls `init()` at the right moment. If the document has finished parsing, it calls `init()` straight away and returns a promise that resolves with the instance. Otherwise it waits for `DOMContentLoaded` first. Use `run()` unless you know the DOM is ready, for example in a script that runs after the markup.

The promise resolves once the framework has started, not once components have loaded. Component modules load in the background.

### `destroy()` and `isInitialized`

`destroy()` stops the web component loader, unmounts every enhancement component, removes the router's listeners and clears every event bus listener. It does nothing when the framework hasn't started. `app.isInitialized` is `true` between `init()` and `destroy()`.

### Instances

After `init()`, the instance exposes the parts it created. They are `null` before then.

| Property                 | What it is                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `app.eventBus`           | The `EventManager` components and managers communicate through                       |
| `app.router`             | The `RouterManager`, or `null` when `router` isn't set                               |
| `app.pageManager`        | The `PageManager`, which mounts components through `app.pageManager.host`            |
| `app.logger`             | The `DevLogger`, which prefixes messages with `[parallelogram]`                      |
| `app.webComponentLoader` | The `WebComponentLoader` that loads web components                                   |
| `app.componentRegistry`  | The array of enhancement component entries: name, selector, loader and their options |

`app.components` exists from the start, so you can register components before `run()`.

```js
app.eventBus.on('page:component-load-error', ({ componentName, error }) => {
  app.logger.warn(`${componentName} did not load`, error);
});
```

[Events and alerts](events-and-alerts.html) describes the event bus.

## Register components

`app.components.add()` takes a tag name or a selector, and a loader or an options object. It returns `app.components`, so calls chain.

```js
app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-modal][data-modal-target]', () => import('@parallelogram-js/core/components/Modal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-tabs]', {
    loader: () => import('@parallelogram-js/core/components/Tabs'),
    priority: 'critical',
  });
```

### Tag names and selectors

A valid custom element name, lowercase with a hyphen such as `p-modal`, registers a web component. Every other string is a CSS selector and registers an enhancement component, including plain element selectors such as `form`.

A loader returns the module, usually with a dynamic `import()`. It can also return the component class itself, or the module without a promise.

### Enhancement component options

| Option       | Type                     | Default      | What it does                                                       |
| ------------ | ------------------------ | ------------ | ------------------------------------------------------------------ |
| `loader`     | `function`               |              | Loads the component, when the second argument is an options object |
| `name`       | `string`                 | The selector | The name `dependsOn` lists and `app.pageManager.instances` use     |
| `priority`   | `'critical' \| 'normal'` | `'normal'`   | Critical components mount before the others on every pass          |
| `dependsOn`  | `string[]`               |              | Names of components that must load before this one's loader runs   |
| `exportName` | `string`                 |              | The named export to use when the module has no default export      |

You can also pass the loader as the second argument and the options as the third.

Registering two enhancement components with the same name throws `A component named "…" is already registered`. Give components that share a selector different names. A `dependsOn` name that isn't registered logs a warning and is ignored. A component waits while its dependencies retry; if one fails for good, the component isn't loaded either, its elements get the `component-error` class, and `page:component-load-error` is emitted for it with the dependency's error as the `cause`. Components that depend on each other in a cycle throw when the entry that closes the cycle is registered.

`priority: 'critical'` orders mounting: critical components mount before the others on every pass. After a page swap the page manager mounts critical components first and waits `mountDelay` for the rest, but with `Parallelogram.create()` the whole body is watched, so components in the new content usually mount as soon as it is added. Web components don't take options other than `loader`.

### When components load

Nothing downloads when you register a component. An enhancement component's loader runs the first time an element matching its selector is on the page, or is added to it later. The module loads once, and every matching element found while it loads mounts when it arrives, if the element is still on the page. Elements waiting for a module have the `component-loading` class.

When a loader fails, it is retried after 1 second, then 2, then 4, up to `maxRetryAttempts`. After the last attempt the waiting elements get the `component-error` class and the event bus emits `page:component-load-error`. A module without a component class is not retried.

Removing an element unmounts its component. Adding matching markup, whether through the router or your own script, mounts it.

### Components added after `run()`

Components added after the framework has started are registered at once, and matching elements already on the page mount straight away.

```js
await app.run();

app.components.add('[data-datatable]', () => import('@parallelogram-js/core/components/DataTable'));
```

## Web components

Web components don't need the framework. Importing a component module defines its element, and markup already on the page upgrades.

```js
import '@parallelogram-js/core/components/PModal';
```

To load a web component only on pages that use it, register it with the framework:

```js
app.components.add('p-modal', () => import('@parallelogram-js/core/components/PModal'));
```

The framework hands tag names to a `WebComponentLoader`. It loads a component when the page contains its tag, and watches the page for tags added later until every registered component has loaded. A loader whose module doesn't define the element counts as a failure, which is logged as an error.

`WebComponentLoader` also works on its own:

```js
import { WebComponentLoader } from '@parallelogram-js/core';

const loader = new WebComponentLoader(
  { 'p-select': () => import('@parallelogram-js/core/components/PSelect') },
  { observeDOM: true }
);

loader.init();
```

| Option        | Type       | Default                    | What it does                                              |
| ------------- | ---------- | -------------------------- | --------------------------------------------------------- |
| `eager`       | `boolean`  | `true`                     | Scan the page for registered tags on `init()`             |
| `observeDOM`  | `boolean`  | `false`                    | Watch for registered tags added later                     |
| `rootElement` | `Element`  | `document.documentElement` | The element to scan and watch                             |
| `onLoad`      | `function` |                            | Called with the tag name when a component loads           |
| `onError`     | `function` |                            | Called with the tag name and error when a component fails |
| `logger`      | `object`   |                            | Receives warnings and errors instead of the console       |

With `eager: false`, call `loader.loadComponent('p-select')` yourself, for example on the first click of a button.

## Styles

Web components style themselves. Their styles are bundled into each module and adopted in the shadow root, so `<p-modal>` looks right without a stylesheet. Adjust them with the custom properties and shadow parts each component's page lists, such as `--modal-panel-bg` and `p-modal::part(panel)`.

```css
p-modal {
  --modal-panel-bg: #fffdf7;
  --modal-radius: 0.25rem;
}

p-modal::part(panel)::backdrop {
  background: rgb(0 0 0 / 0.6);
}
```

Enhancement components that need styles use a document stylesheet. Import the package stylesheet, or only the ones your pages need. A bundler that resolves package paths in CSS, such as Vite, handles these imports.

```css
@import '@parallelogram-js/core/styles';
```

```css
@import '@parallelogram-js/core/styles/toggle.css';
@import '@parallelogram-js/core/styles/tabs.css';
```

The component stylesheets are `datatable.css`, `lazysrc.css`, `lightbox.css`, `reveal.css`, `tabs.css`, `toasts.css` and `toggle.css`. The package stylesheet contains all of them, focus outlines for framework components, and the design tokens below. Web components inherit these tokens through their shadow roots and carry their own fallbacks, so they render without them.

### Design tokens

The package stylesheet declares these custom properties on `:root`. Set them in your own `:root` rule, after the package stylesheet, to change every component that reads them.

| Properties                                                                                                                          | What they set                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--surface-<surface>-radius`, `-border-width`, `-border-color`, `-color-bg`, `-color-text`, `-shadow`                               | Each surface: `control` for form fields, `button`, `panel`, `dialog`, `dropdown`, `item`, `card` and `touch`. Buttons have only the radius, border width and shadow                                                                                                  |
| `--surface-dropdown-item-hover-bg`, `-selected-bg`, `-current-bg`, `--surface-touch-hover-bg`, `--surface-touch-hover-border-color` | Dropdown option and touch area states                                                                                                                                                                                                                                |
| `--form-control-*`                                                                                                                  | Form field padding and font size, with `-sm` and `-lg` variants, font family, placeholder colour, focus ring width and colour, focus and hover border colours, and disabled opacity and background. Borders, background and text colour follow the `control` surface |
| `--button-*`                                                                                                                        | Button padding, font size and minimum height, with `-sm` and `-lg` variants, font weight, and `--button-<variant>-bg`, `-color`, `-border`, `-hover-bg` and `-hover-border` for `primary`, `secondary`, `danger` and `ghost`                                         |
| `--panel-*`                                                                                                                         | Panel padding, with `-sm` and `-lg` variants, and header and footer padding and borders. Background, border, radius and shadow follow the `panel` surface                                                                                                            |
| `--framework-focus-color`, `--framework-focus-width`, `--framework-focus-offset`                                                    | Focus outlines on framework components                                                                                                                                                                                                                               |
| `--framework-transition-duration`, `--framework-transition-easing`                                                                  | How focus outlines transition                                                                                                                                                                                                                                        |

When the user prefers a dark colour scheme, form fields, secondary button hovers and panels switch to dark values; set the same properties inside `@media (prefers-color-scheme: dark)` to change them. Properties for one component, such as `--modal-panel-bg` or `--toggle-transition-duration`, are listed under CSS custom properties on that component's page.

Toggle's stylesheet hides closed targets and animates opening and closing, and Toggle waits for those animations. A target the markup marks `data-toggle-state="closed"` is hidden before Toggle mounts, but only while scripts are enabled. Tabs' stylesheet shows only the first panel until Tabs mounts, or the panel the markup marks `data-tab-panel="active"`, and Scrollreveal's hides its elements until Scrollreveal mounts. Both show the content again if the component fails to load, but not if it was never registered. Load them for pages that use those components, and register the components wherever their stylesheets are used.

## A complete page

This page has an account menu outside the swapped container, and tabs, a toggle and a modal inside it.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bookings</title>
    <script type="module" src="/assets/app.js"></script>
  </head>
  <body>
    <header>
      <button type="button" data-toggle data-toggle-target="#account-menu" data-toggle-capture>
        Account
      </button>
      <nav id="account-menu">
        <a href="/bookings">Bookings</a>
        <a href="/sign-out">Sign out</a>
      </nav>
    </header>

    <main data-view="main">
      <h1>Bookings</h1>

      <div data-tabs>
        <div data-tabs-list>
          <a href="#upcoming" data-tab="upcoming">Upcoming</a>
          <a href="#past" data-tab="past">Past</a>
        </div>
        <div data-tabs-panels>
          <section id="upcoming" data-tab-panel>
            <h2>Upcoming</h2>
            <p>Table for four, 2 October at 7pm.</p>
            <button type="button" data-modal data-modal-target="#cancel-booking">
              Cancel booking
            </button>
          </section>
          <section id="past" data-tab-panel>
            <h2>Past</h2>
            <p>Table for two, 14 August at 8pm.</p>
          </section>
        </div>
      </div>

      <button type="button" data-toggle data-toggle-target="#refunds">Can I get a refund?</button>
      <div id="refunds">
        <p>Yes, up to 48 hours before your booking.</p>
      </div>

      <p-modal id="cancel-booking" data-modal-size="sm">
        <h2 slot="title">Cancel this booking?</h2>
        <p>Your table for four on 2 October will be released.</p>
        <div slot="actions">
          <button type="button" data-modal-close>Keep booking</button>
          <button type="button" data-modal-close>Cancel booking</button>
        </div>
      </p-modal>
    </main>
  </body>
</html>
```

`/assets/app.js` is the bundled output of this script:

```js
import { Parallelogram } from '@parallelogram-js/core';
import './app.css';

const app = Parallelogram.create({
  router: {},
  pageManager: { containerSelector: '[data-view="main"]' },
});

app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-modal][data-modal-target]', () => import('@parallelogram-js/core/components/Modal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-tabs]', () => import('@parallelogram-js/core/components/Tabs'));

app.run();
```

And `app.css` imports the stylesheets the page uses:

```css
@import '@parallelogram-js/core/styles/toggle.css';
@import '@parallelogram-js/core/styles/tabs.css';
```

Module scripts are deferred, so `run()` starts the framework once the document has been parsed. The Modal component opens the `<p-modal>` from its trigger, so register both. Without JavaScript, the tab links jump to their sections and the page still reads in order.

## Next steps

- [Pages and the router](pages-and-router.html): swapping pages in place, fragments, scrolling and focus.
- [Writing components](writing-components.html): building your own enhancement components on `BaseComponent`.
- [Events and alerts](events-and-alerts.html): the event bus and the events components emit.
- [Upgrading from 0.4 to 0.5](upgrading.html): changes to imports, markup and events.
- Component pages, with attributes, events and live examples: [Toggle](toggle.html), [Tabs](tabs.html), [Modal](modal.html) and [`<p-modal>`](p-modal.html).
