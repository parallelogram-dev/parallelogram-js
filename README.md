# Parallelogram

`@parallelogram-js/core` adds behaviour to server-rendered HTML through data attributes and a small set of web components. Each component loads the first time a page uses it, and links swap the page in place instead of reloading it, falling back to a normal page load whenever that can't be done.

Documentation, with a live example of every component: **[dev.parallelogram.com.au](https://dev.parallelogram.com.au)**

Upgrading from 0.4? Read the [upgrade guide](https://dev.parallelogram.com.au/upgrading.html).

## Install

```bash
npm install @parallelogram-js/core
```

## Start

Create the framework, register the components your pages use, and run it:

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  router: {},
  pageManager: { containerSelector: '[data-view="main"]' },
});

app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-modal][data-modal-target]', () => import('@parallelogram-js/core/components/Modal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

app.run();
```

A tag name such as `p-modal` registers a web component, and any other selector registers an enhancement component. Nothing is downloaded until a page contains a matching element. With `router` set, following a link fetches the next page and swaps the element marked `data-view="main"`, and the components inside it mount and unmount with it.

```html
<main data-view="main">
  <button type="button" data-toggle data-toggle-target="#account-menu" data-toggle-capture>
    Account
  </button>
  <nav id="account-menu">
    <a href="/bookings">Bookings</a>
    <a href="/sign-out">Sign out</a>
  </nav>

  <button type="button" data-modal data-modal-target="#release-table">Release table</button>
  <p-modal id="release-table">
    <h2 slot="title">Release this table?</h2>
    <p>The 7pm booking will be offered to the waitlist.</p>
  </p-modal>
</main>
```

A web component can also be used without the framework: importing its module defines the element.

```js
import '@parallelogram-js/core/components/PModal';
```

## Styles

Web components style themselves inside their shadow roots, and custom properties and shadow parts let a page adjust them. Enhancement components that need styles use the package stylesheet, or only the stylesheets they need:

```css
@import '@parallelogram-js/core/styles';
@import '@parallelogram-js/core/styles/toggle.css';
```

## Browser support

The package is ESM only and targets Baseline 2023: Chrome and Edge 120, Firefox 121, and Safari 17.2 on macOS and iOS, or later. It ships modern JavaScript without transpiling it.

## Components

<!-- components:start -->

### Web components

| Element                                                            | Import                 | What it does                                                 |
| ------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------ |
| [`<p-datetime>`](https://dev.parallelogram.com.au/p-datetime.html) | `components/PDatetime` | Date, time and date range picker with a calendar dialog      |
| [`<p-modal>`](https://dev.parallelogram.com.au/p-modal.html)       | `components/PModal`    | Modal dialog built on the native &lt;dialog&gt; element      |
| [`<p-select>`](https://dev.parallelogram.com.au/p-select.html)     | `components/PSelect`   | A select that can be searched, built as an editable combobox |
| [`<p-toasts>`](https://dev.parallelogram.com.au/p-toasts.html)     | `components/PToasts`   | A stack of toast notifications                               |
| [`<p-uploader>`](https://dev.parallelogram.com.au/p-uploader.html) | `components/PUploader` | Upload, order and describe a set of files                    |

### Enhancements

| Component                                                                  | Selector                                      | Import                       | Stylesheet             | What it does                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| [CopyToClipboard](https://dev.parallelogram.com.au/copy-to-clipboard.html) | `[data-copytoclipboard]`                      | `components/CopyToClipboard` |                        | Copy text to the clipboard from a button                                       |
| [DataTable](https://dev.parallelogram.com.au/data-table.html)              | `[data-datatable]`                            | `components/DataTable`       | `styles/datatable.css` | Sorting, filtering and pagination for an existing table                        |
| [DeferTracker](https://dev.parallelogram.com.au/defer-tracker.html)        | `[data-defer-tracker]`                        | `components/DeferTracker`    |                        | Load third-party trackers after the first interaction, described by inert JSON |
| [FormEnhancer](https://dev.parallelogram.com.au/form-enhancer.html)        | `form[data-form-enhancer]`                    | `components/FormEnhancer`    |                        | Accessible error messages for the browser's own form validation                |
| [Lazysrc](https://dev.parallelogram.com.au/lazysrc.html)                   | `[data-lazysrc]:not([data-lazysrc-complete])` | `components/Lazysrc`         | `styles/lazysrc.css`   | Lazy image loading built on the browser's own loading="lazy"                   |
| [Lightbox](https://dev.parallelogram.com.au/lightbox.html)                 | `[data-lightbox]`                             | `components/Lightbox`        | `styles/lightbox.css`  | Image gallery viewer shown in a native modal dialog                            |
| [Modal](https://dev.parallelogram.com.au/modal.html)                       | `[data-modal][data-modal-target]`             | `components/Modal`           |                        | Buttons that open a &lt;p-modal&gt;                                            |
| [Scrollhide](https://dev.parallelogram.com.au/scrollhide.html)             | `[data-scrollhide]`                           | `components/Scrollhide`      |                        | Hide an element while the page scrolls down and show it again on scrolling up  |
| [Scrollreveal](https://dev.parallelogram.com.au/scrollreveal.html)         | `[data-reveal]`                               | `components/Scrollreveal`    | `styles/reveal.css`    | Reveal elements as they scroll into view, one after another                    |
| [SelectLoader](https://dev.parallelogram.com.au/select-loader.html)        | `[data-selectloader]`                         | `components/SelectLoader`    |                        | Load an HTML fragment into a target when a select's choice changes             |
| [Tabs](https://dev.parallelogram.com.au/tabs.html)                         | `[data-tabs]`                                 | `components/Tabs`            | `styles/tabs.css`      | Tabbed panels built from a list of tab buttons or in-page links                |
| [Toast](https://dev.parallelogram.com.au/toast.html)                       | `[data-toast-trigger][data-toast-message]`    | `components/Toast`           |                        | Show a toast when a trigger is clicked                                         |
| [Toggle](https://dev.parallelogram.com.au/toggle.html)                     | `[data-toggle]`                               | `components/Toggle`          | `styles/toggle.css`    | Show and hide a target element from one or more trigger buttons                |
| [Videoplay](https://dev.parallelogram.com.au/videoplay.html)               | `[data-videoplay]`                            | `components/Videoplay`       |                        | Play videos as they scroll into view and pause them as they leave              |

DeferTracker loads third-party trackers through adapters imported from `@parallelogram-js/core/adapters/<name>`: `bing-uet`, `clarity`, `fathom`, `ga4`, `google-ads`, `gtm`, `hotjar`, `hubspot`, `linkedin-insight`, `meta-pixel`, `pinterest-tag`, `plausible`, `tiktok-pixel`.

<!-- components:end -->

Import paths are relative to `@parallelogram-js/core`, with or without `.js`. Each component's page on the documentation site lists its attributes, events, properties, methods, slots, parts and custom properties.

## TypeScript and editors

The package includes TypeScript declarations, with typed events and `HTMLElementTagNameMap` entries for the web components, and a [Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest) at `@parallelogram-js/core/custom-elements.json` for editors and tools that read one.

## Development

Development needs Node `^22.22.3`, `^24.15.0` or `>=26`.

```bash
npm install
npm run site           # documentation site at localhost:3000
npm run build          # library, stylesheets, declarations and manifest
npm run test:unit
npm run test:browser   # Chromium, Firefox and WebKit through Playwright
npm run lint
npm run check:types
```

Every component has a contract beside its source, `src/components/<Name>.contract.js`, that describes its markup API. The documentation site, the TypeScript declarations for web components, `custom-elements.json` and the component tables above are generated from the contracts, and tests check each contract against its component. Run `npm run readme` after changing a contract.

The guides in `docs/` were written before 0.5 and are no longer published with the package.

## License

[MIT](LICENSE)
