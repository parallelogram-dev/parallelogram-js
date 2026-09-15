# Upgrading from 0.4 to 0.5

0.5 is a breaking release. Renamed attributes and events keep working until 0.6.0, so most pages still run, but some changes need updates to your build, styles, markup or server code. Work through the sections that apply to your site, then replace the deprecated names before 0.6.0.

## Imports and builds

The package is ESM only. The CommonJS build (`dist/index.cjs`) and the `require` export condition are gone, so load it with `import`, or with `await import()` from CommonJS code.

```js
import { Parallelogram } from '@parallelogram-js/core';
import Toggle from '@parallelogram-js/core/components/Toggle';
```

Import paths work with or without `.js`. The `@parallelogram-js/core/dev/*` paths are deprecated: use the normal paths, and bundlers that resolve the `development` export condition, as Vite does during development, pick the development build.

The package now ships TypeScript declarations and a `custom-elements.json` manifest, so you can delete declarations you wrote for it yourself.

## Supported browsers

The package targets Baseline 2023: Chrome and Edge 120, Firefox 121, and Safari 17.2 on macOS and iOS, or later. It uses the native `<dialog>` element, form-associated custom elements and constructable stylesheets, and ships modern JavaScript without transpiling it. Older browsers aren't tested or supported.

## Registering components

`app.components.add()` tells components apart differently:

- Only a valid custom element name, with a hyphen such as `p-modal`, loads a web component. Every other selector, including `form` or `ul > li`, registers an enhancement component.
- An enhancement component is named by its `name` option, or otherwise by its full selector. Names used to come from the first data attribute or class in the selector, so update `dependsOn` lists and `pageManager.instances` lookups. Registering the same name twice throws.

```js
app.components
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-tabs]', {
    loader: () => import('@parallelogram-js/core/components/Tabs'),
    dependsOn: ['[data-toggle]'],
  });
```

Components you write should declare `static selector = 'data-your-component'`. Without it their attribute name comes from the class name, which minifiers change, and a warning is logged.

## State attributes

Components write their state to `data-<component>-state` instead of the attribute they are selected by. Update styles and scripts that read state:

| Before                                    | From 0.5                           |
| ----------------------------------------- | ---------------------------------- |
| `[data-<component>="open"]`               | `[data-<component>-state="open"]`  |
| `[data-toggle-target="open"]` on a target | `[data-toggle-state="open"]`       |
| `p-modal[data-modal="open"]`              | `p-modal[data-modal-state="open"]` |

The old attributes still receive a copy of the state until 0.6.0, so existing styles keep working in the meantime. In your own components, `setState()` writes the new attribute and `getElementState()` reads it.

## Dialogs

[`<p-modal>`](p-modal.html) and [Lightbox](lightbox.html) open the native `<dialog>` element as a modal, so they render in the top layer, the page behind them is inert, and focus returns to the element that opened them.

- `z-index` no longer affects `<p-modal>`, because nothing on the page sits above the top layer.
- The `backdrop` part is gone. Style the dimmed page with `p-modal::part(panel)::backdrop`.
- The `panel` part is now the `<dialog>` itself.
- With `data-modal-closable="false"`, the modal’s own `data-modal-close` buttons now close it. Escape, the backdrop and its close button still don’t.
- Setting `modal.open = true` before the element is defined now opens it. `modal.open()`, the `open` attribute and `[data-modal]` triggers work as before.

## Web component events

Web component events are named `<tag>:<verb>` and bubble out of shadow roots, so a listener on `document` hears them wherever the element is. The old names are dispatched straight after, with the same detail, until 0.6.0.

| Old name                         | New name                                               |
| -------------------------------- | ------------------------------------------------------ |
| `modal:open`, `modal:close`      | `p-modal:open`, `p-modal:close`                        |
| `toast:show`, `toast:close`      | `p-toasts:show`, `p-toasts:close`                      |
| `upload:success`, `upload:error` | `p-uploader:upload-success`, `p-uploader:upload-error` |
| `sequence:update`                | `p-uploader:sequence-update`                           |
| `file:update`, `file:delete`     | `p-uploader-file:update`, `p-uploader-file:delete`     |

```js
document.addEventListener('p-modal:close', event => {
  console.log(event.detail.modal.id);
});
```

## Dates from `<p-datetime>`

In date mode, [`<p-datetime>`](p-datetime.html) stores, emits and submits a plain `yyyy-mm-dd` date. It used to submit a UTC instant, such as `2026-09-09T14:00:00.000Z` for 10 September in Sydney, so update server code that parsed instants for date fields. Datetime and time modes still use ISO instants, and date mode still accepts an instant as its `value`.

The element is now form-associated. It submits under its `name`, and `range-to` in range mode, without adding hidden `<input>` elements, so remove scripts or styles that looked for those inputs. It supports `required`, `min`, `max`, form reset and `disabled`. In range mode, read the `range` property instead of the deprecated `isRange`.

## Toggle

[Toggles](toggle.html) are independent. Opening one no longer closes every other toggle on the page, and only toggles with `data-toggle-capture` close on an outside click. The `multiple` option is gone: give toggles that should close each other, such as an accordion's, a shared `data-toggle-group`.

```html
<button type="button" data-toggle data-toggle-target="#refunds" data-toggle-group="faq">
  Can I get a refund?
</button>
```

## Forms

[FormEnhancer](form-enhancer.html) uses the browser's constraint validation. Declare rules with native attributes such as `required`, `type`, `minlength`, `min`, `max` and `pattern`, which also work without JavaScript, and move to the new names:

| Before                    | From 0.5                                   |
| ------------------------- | ------------------------------------------ |
| `data-form-validator`     | `data-form-enhancer`                       |
| `data-validate` rules     | Native validation attributes               |
| `data-validate-message`   | `data-form-enhancer-message`               |
| `form-validator:*` events | `form-enhancer:*` events, also on the form |

The old names keep working until 0.6.0.

## Images

[Lazysrc](lazysrc.html) hands images to the browser's own `loading="lazy"`.

- `src` and `srcset` already in the markup are left alone. `data-lazysrc-src`, `data-lazysrc-srcset` and `data-lazysrc-sizes` are copied across as soon as the image mounts, and the browser decides when they load.
- `data-lazysrc-threshold` and `data-lazysrc-root-margin` only apply to `data-lazysrc-bg` background images. `data-lazysrc-use-native` is gone.
- The default classes are `lazysrc--loading`, `lazysrc--loaded` and `lazysrc--error`. Set `data-lazysrc-loaded-class="loaded"`, and the loading and error equivalents, to keep the old names.

## Uploads

- [`<p-uploader>`](p-uploader.html) no longer falls back to `/upload`, `/update`, `/delete` and `/sequence`. Set `upload-action`, and `update-action`, `delete-action` or `sequence-action` for each feature you want.
- Fields show only when `<p-uploader-fields>` declares them.
- `<p-uploader-file>` edits all of a file's fields in one dialog opened by its Edit details button. The per-field edit panels and buttons are gone.
- `window.MockXHR` is gone; use `setXHR()` in tests.

## Removed options

Many options and properties that did nothing were removed, such as Toggle's `transitionDuration`, Tabs' `activeClass` and Scrollhide's `debounce`. The Removed section of the [changelog](https://github.com/parallelogram-dev/parallelogram-js/blob/main/CHANGELOG.md) lists them all.

## Deprecated until 0.6.0

These work in 0.5 and are removed in 0.6.0:

| Deprecated                                                                                  | Use instead                                                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `@parallelogram-js/core/dev/*` imports                                                      | The normal paths with the `development` export condition                                 |
| State copies in `data-<component>`, `data-toggle-target` and `data-modal`                   | `data-<component>-state`, `data-toggle-state` and `data-modal-state`                     |
| `modal:open`, `modal:close`, `toast:show` and `toast:close`                                 | `p-modal:open`, `p-modal:close`, `p-toasts:show` and `p-toasts:close`                    |
| `upload:success`, `upload:error`, `sequence:update`, `file:update` and `file:delete`        | The `p-uploader:*` and `p-uploader-file:*` events                                        |
| `data-form-validator`, `data-validate` and `data-validate-message`                          | `data-form-enhancer`, native validation attributes and `data-form-enhancer-message`      |
| `form-validator:mounted`, `form-validator:submit-blocked` and `form-validator:submit-valid` | `form-enhancer:mounted`, `form-enhancer:submit-blocked` and `form-enhancer:submit-valid` |
| [CopyToClipboard](copy-to-clipboard.html)'s `data-copy-target` and `data-copy-text`         | `data-copytoclipboard-target` and `data-copytoclipboard-text`                            |
| `<p-datetime>`'s `isRange`                                                                  | `range`                                                                                  |
| BaseComponent's `_getDataAttr()` and `_elementsKeys()`                                      | `getAttr()`, `getBoolAttr()`, `getNumberAttr()` and `trackedElements()`                  |
