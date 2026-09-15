# Upgrading from 0.5 to 0.6

0.6 removes the names 0.5 deprecated and makes a few start-up changes. If your site runs on 0.5 without deprecation warnings in the development build, most of it needs no changes. Coming from 0.4, work through [Upgrading from 0.4 to 0.5](upgrading-from-0-4.html) first.

## Imports

The `@parallelogram-js/core/dev/*` paths are gone. Import the normal paths; bundlers that resolve the `development` export condition, as Vite does during development, pick the development build.

| Removed                                       | Use instead                                    |
| --------------------------------------------- | ---------------------------------------------- |
| `@parallelogram-js/core/dev/components/...`   | `@parallelogram-js/core/components/...`        |
| `@parallelogram-js/core/dev/core/...`         | `@parallelogram-js/core/core/...`              |
| `@parallelogram-js/core/dev/adapters/...`     | `@parallelogram-js/core/adapters/...`          |
| `@parallelogram-js/core/core/ComponentStates` | Plain strings such as `'open'` and `'loading'` |

## Starting the router and page manager

With `Parallelogram`, the router's code now loads on demand, and only when `router` options are given. The promise `run()` returns resolves once it has loaded, so code that waits for it works as before. After calling `init()` directly, `app.router` is `null` until the router has loaded; listen for `router:initialized` on the event bus if you need it straight away.

If you create a [`PageManager`](pages-and-router.html) yourself, call `start()` after creating it. The constructor no longer mounts components or handles navigations:

```js
const pageManager = new PageManager({ containerSelector: '#app', eventBus, router, registry });
pageManager.start();
```

A listener for `page-manager:initialized` added before `start()` now hears that event.

## State attributes

Components write their state only to `data-<component>-state`. Update styles and scripts that read the old copies:

| Removed                                                             | Use instead                     |
| ------------------------------------------------------------------- | ------------------------------- |
| `[data-lazysrc="loaded"]` and other `data-<component>` state copies | `[data-lazysrc-state="loaded"]` |
| `data-toggle-target` on a Toggle's target                           | `data-toggle-state`             |
| `data-modal` on `<p-modal>`                                         | `data-modal-state`              |

## Events

| Removed                                                                                     | Use instead                                                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `modal:open` and `modal:close`                                                              | `p-modal:open` and `p-modal:close`                                                       |
| `toast:show` and `toast:close`                                                              | `p-toasts:show` and `p-toasts:close`                                                     |
| `upload:success`, `upload:error` and `sequence:update`                                      | The `p-uploader:*` events                                                                |
| `file:update` and `file:delete`                                                             | The `p-uploader-file:*` events                                                           |
| `form-validator:mounted`, `form-validator:submit-blocked` and `form-validator:submit-valid` | `form-enhancer:mounted`, `form-enhancer:submit-blocked` and `form-enhancer:submit-valid` |

## Attributes and properties

| Removed                                                                                 | Use instead                                                                         |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `data-form-validator`, `data-validate` and `data-validate-message`                      | `data-form-enhancer`, native validation attributes and `data-form-enhancer-message` |
| [CopyToClipboard](copy-to-clipboard.html)'s `data-copy-target` and `data-copy-text`     | `data-copytoclipboard-target` and `data-copytoclipboard-text`                       |
| [Lightbox](lightbox.html)'s `data-lightbox-state-closed-class`, which was never applied | The `lightbox:closed` event                                                         |
| `<p-datetime>`'s `isRange`                                                              | `range`                                                                             |

## Dates and times from `<p-datetime>`

In datetime and time modes, [`<p-datetime>`](p-datetime.html) now stores, submits and reports the wall-clock time the user picked, with no timezone, the same as `datetime-local` and `time` inputs: `2024-01-15T14:30` and `14:30`. It used to use UTC instants such as `2024-01-15T03:30:00.000Z`. If your server expects an instant, set `format="iso-tz"` to submit the local time with its offset, or convert on the server with the user's timezone. Instants already in your markup still work and are read as local time, but `value` and event details are local strings too.

## Styles

The legacy `design-system/variables` module is gone. `@use` the `design-system` module and switch to its tokens:

| Removed                                             | Use instead                                               |
| --------------------------------------------------- | --------------------------------------------------------- |
| `$spacing-xs` to `$spacing-2xl`                     | `$space-xs` to `$space-xxl`, whose values differ slightly |
| `$font-size-sm`, `$font-size-md`, `$font-size-base` | `$font-xs`, `$font-sm`, `$font-base`                      |
| `$font-weight-normal`, `-semibold`, `-bold`         | `$font-normal`, `$font-semibold`, `$font-bold`            |
| `$transition-fast`, `-normal`, `-slow`              | `$duration-fast`, `$duration-normal`, `$duration-slow`    |
| `$easing-standard`                                  | `$ease-standard`                                          |
| `$border-width-sm`, `$border-width-md`              | `$border-width`, `$border-width-thick`                    |
| `$border-radius-sm`                                 | `$radius-sm`                                              |
| `$legacy-color-*`                                   | The matching `$color-*` token                             |
| `$color-focus-shadow`                               | `--framework-focus-color`                                 |

The legacy module set `$color-bg-overlay` to white at 95%, while the token is black at 50%. The modal backdrop and uploader overlay keep the white value, so set your own if you used the variable elsewhere.

## Writing components

| Removed                                                                       | Use instead                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| BaseComponent's `_elementsKeys()`                                             | `trackedElements()`                                |
| BaseComponent's `_getDataAttr()`                                              | `getAttr()`, `getBoolAttr()` and `getNumberAttr()` |
| BaseComponent's `_camelCase()`, `_waitForTransition()` and `_createElement()` | Your own helper, or `document.createElement()`     |
| ComponentRegistry's `fork()`                                                  | `ComponentRegistry.create()`                       |
| ComponentRegistry's `validate()`, `detectCycles()` and `toPascalCase()`       | Nothing; they weren't used                         |
