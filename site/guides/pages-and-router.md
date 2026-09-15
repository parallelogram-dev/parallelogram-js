# Pages and the router

The router fetches same-origin pages when links are followed and swaps the matching `data-view` fragments into the current page, then mounts components, moves focus and restores scroll. Anything it can't show in place loads as a normal page, so a site behaves the same with or without it.

## Turning the router on

Pass `router` options to `Parallelogram.create()`. The router is only created when `router` is set, and an empty object is enough. `pageManager` holds the options for swapping fragments and mounting components.

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  router: { timeout: 8000 },
  pageManager: {
    targetGroups: { main: ['navbar', 'main'] },
    focusTarget: 'h1',
  },
});

app.components.add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

await app.run();

app.eventBus.on('router:navigate-end', ({ url, status }) => {
  console.log(url.pathname, status);
});
```

`app.router`, `app.pageManager` and `app.eventBus` exist once `run()` or `init()` has run. Subscribe to events after that.

### Router options

| Option                  | Type       | Default            | What it does                                                                                              |
| ----------------------- | ---------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `timeout`               | `number`   | `10000`            | Milliseconds before a page request is abandoned with a `TimeoutError`.                                    |
| `loadingClass`          | `string`   | `'router-loading'` | Class on the body and the followed link while a navigation is in progress.                                |
| `errorClass`            | `string`   | `'router-error'`   | Class on the body and the followed link after a navigation fails.                                         |
| `fullLoadOnError`       | `boolean`  | `true`             | Load the page normally when a request or swap fails.                                                      |
| `nonRoutableExtensions` | `string[]` | See below          | Lowercase file extensions, without the dot, that links open natively. Setting it replaces the whole list. |

The default extensions are `pdf`, `zip`, `rar`, `7z`, `tar`, `gz`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `csv`, `rtf`, `txt`, `dmg`, `exe`, `pkg`, `apk`, `mp3`, `mp4`, `wav`, `avi`, `mov`, `mkv`, `webm`, `jpg`, `jpeg`, `png`, `gif`, `svg`, `webp`, `avif`, `xml`, `rss` and `ics`.

### Page manager options

| Option                   | Type                                 | Default         | What it does                                                                                                                  |
| ------------------------ | ------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `containerSelector`      | `string`                             | `'body'`        | The element components mount in and are watched in, when `observeRoot` isn't set. It doesn't limit where fragments are found. |
| `observeRoot`            | `Element \| string \| null`          | `document.body` | The element, or its selector, whose subtree components mount in and are watched.                                              |
| `targetGroups`           | `Record<string, string[]>`           | `{}`            | Fragments that update together, by target name.                                                                               |
| `targetGroupTransitions` | `Record<string, FragmentTransition>` | None            | Transitions for each fragment, by its `data-view` name.                                                                       |
| `fragmentFallbacks`      | `boolean`                            | `false`         | Also find a fragment without `data-view` by its id, common main-content selectors or class.                                   |
| `runScripts`             | `boolean`                            | `true`          | Run the scripts in swapped fragments.                                                                                         |
| `assetTimeout`           | `number`                             | `3000`          | Milliseconds to wait for each stylesheet or script the new page's head adds.                                                  |
| `mountDelay`             | `number`                             | `1200`          | Milliseconds before components that aren't critical mount after a swap.                                                       |
| `focusTarget`            | `string \| false`                    | `'h1'`          | The selector focused in the new main fragment, or `false` to leave focus alone.                                               |
| `announce`               | `boolean`                            | `true`          | Announce the new page's title after a navigation.                                                                             |
| `scrollPosition`         | `'top' \| 'preserve' \| 'element'`   | `'top'`         | Where the page scrolls after a navigation.                                                                                    |
| `scrollElement`          | `string \| null`                     | `null`          | The selector scrolled to when `scrollPosition` is `'element'`.                                                                |
| `retryFailedLoads`       | `boolean`                            | `true`          | Retry a component whose module fails to load.                                                                                 |
| `maxRetryAttempts`       | `number`                             | `3`             | Retries for a component module.                                                                                               |

`observeRoot` defaults to `document.body` when you use `Parallelogram.create()`. A `PageManager` you construct yourself defaults it to `null`, which means the `containerSelector` element.

## Using the managers directly

`EventManager`, `RouterManager` and `PageManager` are exported from the package root and from `@parallelogram-js/core/managers/*`. Create them yourself when you need control over the order or the event bus. Give both managers the same bus, and pass the router to the page manager so components receive it.

```js
import { EventManager } from '@parallelogram-js/core/managers/EventManager';
import { RouterManager } from '@parallelogram-js/core/managers/RouterManager';
import { PageManager } from '@parallelogram-js/core/managers/PageManager';

const eventBus = new EventManager();
const router = new RouterManager({ eventBus, options: { fullLoadOnError: true } });

const pageManager = new PageManager({
  containerSelector: '#app',
  eventBus,
  router,
  registry: [
    {
      name: 'toggle',
      selector: '[data-toggle]',
      priority: 'critical',
      loader: () => import('@parallelogram-js/core/components/Toggle'),
    },
  ],
  options: { targetGroups: { main: ['navbar', 'main'] } },
});
```

Both constructors also take a `logger`. Each manager has a `destroy()` method: the router removes its listeners, cancels the navigation in progress and gives scroll restoration back to the browser, and the page manager unmounts every component and stops handling navigations.

`pageManager.replaceFragments(html, options)` swaps fragments from any HTML string, without the router. It takes `viewTargets` (default `['main']`), `url`, `fromNavigation`, `fromPopstate`, `preserveScroll`, `scroll` and `signal`. Target groups aren't resolved here, so list every fragment name. It rejects before changing the page when a fragment is missing or tracked assets changed.

## Links the router follows

The router listens for clicks on the document, so links added later are handled too. It takes over a click on an `a[href]` or `area[href]` only when all of these hold:

- The event isn't already cancelled, it is the primary button, and no modifier key (Meta, Ctrl, Shift or Alt) is held.
- The `href` is present and doesn't start with `#`.
- Neither the link nor an ancestor has `data-router-skip`.
- The link has no `download` attribute, no `rel="external"`, and no `target` other than `_self`.
- The URL is on the same origin as the page.
- The path doesn't end in an extension from `nonRoutableExtensions`, unless the link has `data-router-enhance`.
- The link doesn't point to a hash on the current page. Those keep native scrolling, focus and `:target`.

`router.handlesLink(link)` applies the same rules, apart from the click and same-page hash checks.

These attributes change what a followed link does:

| Attribute                   | On               | What it does                                                                                                    |
| --------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `data-view-target`          | Link             | The fragment or target group to replace. Defaults to `main`.                                                    |
| `data-router-replace`       | Link             | Replace the current history entry instead of adding one.                                                        |
| `data-router-immutable-url` | Link or ancestor | Leave the address bar and history untouched. Set it to `"false"` on a link inside a marked ancestor to opt out. |
| `data-router-skip`          | Link or ancestor | Leave the click to the browser.                                                                                 |
| `data-router-enhance`       | Link             | Route a link to a file type in `nonRoutableExtensions`.                                                         |

Page requests are `GET` requests with `credentials: 'same-origin'`, and send `X-Requested-With: XMLHttpRequest` and `Accept: text/html,application/json,*/*`. The server should still return the full page.

## When the page loads normally

The router hands a navigation to the browser in these cases. A navigation from history, or one with `replace`, uses `location.replace()`; others use `location.assign()`.

| Case                                                                      | Result                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| The response isn't `text/html`, or redirected to another origin           | Loads the requested URL normally, whatever `fullLoadOnError` is set to.  |
| The server returns a status outside 200 to 299                            | An `HttpError`, handled as a failure.                                    |
| The request fails or times out                                            | The fetch error or a `TimeoutError`, handled as a failure.               |
| A requested fragment is missing from either page                          | A `FragmentMismatchError`, handled as a failure. The page isn't changed. |
| The `data-router-track="reload"` assets differ between the pages          | A `TrackedAssetsChangedError`, handled as a failure.                     |
| A `waitUntil()` promise from a `router:navigate-success` listener rejects | Handled as a failure.                                                    |

A failure emits `router:navigate-error`, adds `errorClass`, and with `fullLoadOnError` loads the page normally. If the address bar had already changed, the new URL is loaded in place of the current entry. With `fullLoadOnError: false` the page stays as it is and `navigate()` rejects with the error.

Mark your versioned bundles with `data-router-track="reload"`. When a deploy changes them, the next navigation loads the new page in full so the visitor gets the new code.

```html
<link rel="stylesheet" href="/assets/app.3f9a1c.css" data-router-track="reload" />
<script type="module" src="/assets/app.3f9a1c.js" data-router-track="reload"></script>
```

## Fragments

A fragment is an element with a `data-view` name. The router asks the page manager to replace a target, which is a fragment name or a target group. Each fragment is found by `[data-view="name"]` in the fetched page and in the current page, anywhere in either document. Every fragment is looked up before anything changes.

With `fragmentFallbacks: true`, a fragment without `data-view` is also looked up by `#name`, then for `main` by `main`, `[role="main"]`, `#app` and `.main-content`, then by `.name`.

### Target groups

`targetGroups` maps a target name to the fragments that update with it. A target without a group is used as a fragment name. Only the `main` fragment is replaced unless a group or `data-view-target` says otherwise.

```js
Parallelogram.create({
  router: {},
  pageManager: {
    targetGroups: {
      main: ['navbar', 'main'],
      results: ['results', 'pagination'],
    },
  },
});
```

Back and forward replace the target of whichever of the two history entries is newer, so going back undoes the navigation that created the entry being left.

### Transitions

`targetGroupTransitions` is keyed by fragment name, not group name. Each value can have `out`, `in`, `duration` (default `300`) and `easing` (default `'ease'`).

- A value without `(` is a class name. The class is added on the next frame and the fragment's CSS animations and transitions are awaited. `duration` only bounds the wait when an animation has no end time.
- A value containing `(` runs the built-in fade and 20px slide on inline styles, over `duration` with `easing`.
- When both are classes, the `out` class stays on the fragment through the swap and is removed a frame after the `in` class is added. The `in` class is removed when it finishes.
- Transitions are skipped when the user prefers reduced motion. A failing transition doesn't stop the swap.

```js
Parallelogram.create({
  router: {},
  pageManager: {
    targetGroupTransitions: {
      main: { out: 'is-leaving', in: 'is-entering', duration: 250 },
    },
  },
});
```

Fragments in a group are replaced independently, so a slow transition on one doesn't hold up the others.

### Root attributes

The fragment element itself stays in the page, and its content is replaced. Its attributes are made to match the new page's fragment, so a page component selected by an attribute on the root matches the new content. `data-view` is left alone, and classes starting with `component-`, `router-` or `page-` are kept.

### Scripts in fragments

With `runScripts`, scripts inside a swapped fragment run again on every visit, as on a full page load. Scripts with `data-router-skip` and data blocks, such as `type="application/json"`, don't run. Only an empty type, `module`, or a JavaScript or ECMAScript type runs.

## The head

Before any fragment changes, and only when the fetched page has head content:

1. The tracked assets are compared, as described above.
2. Stylesheets (`link[rel~="stylesheet"][href]`) and external scripts (`script[src]`) in the new head that the current page doesn't have are appended to the head. URLs are resolved against the new page's address, and scripts keep their order.
3. The swap waits for each one to load or fail, for up to `assetTimeout` milliseconds each.

Assets are never removed, and a head script already on the page doesn't run again.

When the `main` fragment is replaced, the head is reconciled with the new page. The title is updated when the new one isn't empty, and `lang` and `dir` on the `html` element are copied or removed. These tags are replaced as sets, so tags the new page lacks are removed and repeated tags are all kept:

- `meta` named `description`, `keywords`, `robots`, `author` or `theme-color`, and `twitter:*`
- `meta` with an `og:*` or `article:*` property
- `link[rel="canonical"]` and `link[rel="alternate"]`

Other head elements are left alone. A navigation that doesn't replace `main` doesn't update the title.

## Content Security Policy and Trusted Types

On a page that enforces Trusted Types with `require-trusted-types-for 'script'`, the library inserts HTML and scripts through two policies, which the page's `trusted-types` directive must list:

| Policy                  | What goes through it                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parallelogram`         | Web component templates, the pages the router fetches, the fragments SelectLoader loads, `Modal.create()` string content and `<p-toasts>` messages with `allowHTML` |
| `parallelogram-scripts` | Scripts the router runs from a fetched page, in swapped fragments and added to the head, and the scripts DeferTracker's adapters load                               |

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types parallelogram parallelogram-scripts
```

Add `'allow-duplicates'` to `trusted-types` when more than one copy of the library loads on a page. When a policy can't be created, the library logs a console warning naming it and inserts plain strings, which the browser then rejects. Without `parallelogram-scripts`, scripts in swapped content don't run and tracker adapters can't load their scripts, though the rest of the page still works.

Both policies pass values through unchanged. They mark what the library already inserts rather than checking it:

- The router trusts HTML from its own origin, as a full page load would, and SelectLoader fragments must come from the same trusted source.
- `Modal.create()` strings and `allowHTML` messages must only carry trusted HTML. Pass a Node to `Modal.create()`, or leave `allowHTML` off, for anything built from user data.

Trusted Types sit alongside `script-src` rather than replacing it, so scripts still need to be allowed there. To give the scripts that tracker adapters add a nonce, pass it to `configureDeferTracker({ nonce })`.

## After a swap

Each fragment goes through these steps:

1. `page:fragment-will-replace` is emitted, then the `out` transition runs.
2. Components in the fragment are unmounted and its content and root attributes are replaced.
3. For `main`, scroll is set and the head is reconciled.
4. Scripts run, then components with `priority: 'critical'` mount. `dom:content-loaded` is emitted.
5. The other components mount after `mountDelay`, or straight away when it is `0`.
6. For `main`, focus moves and the title is announced. Without `main`, this happens once after every fragment is replaced, as described under Focus.
7. `page:fragment-did-replace` is emitted, then the `in` transition runs.

Components mounted through the swap get a `data-fragment-target` attribute with the fragment name, removed when they unmount. Register critical components with `app.components.add(selector, { loader, priority: 'critical' })`, as described in [Writing components](writing-components.html).

Components also mount as soon as their elements are added inside the observed root, which is the whole body with `Parallelogram.create()`. In that setup, normal components in a swapped fragment mount straight after the swap rather than after `mountDelay`, and without `data-fragment-target`.

### Focus

For the `main` fragment, focus moves to the first of these that exists: the element the URL hash names, an `[autofocus]` element in the fragment, the `focusTarget` match, or the fragment itself. An element that isn't natively focusable gets `tabindex="-1"`. Focus doesn't scroll the page. `focusTarget: false` leaves focus where it is.

A navigation that doesn't replace `main`, such as one to the `results` group above, moves focus only when nothing on the page has it any more, for example because the link that was activated was in a replaced fragment. Once every fragment is replaced, focus moves by the same rules into the first fragment replaced. Focus that was elsewhere on the page stays there.

### Announcements

With `announce`, the new `document.title`, or the fragment's first `h1` when there is no title, is read out through a visually hidden `role="status"` live region. A navigation that doesn't replace `main` announces the fetched page's title, or the current title when the response has none, once all its fragments are replaced. A navigation that is aborted doesn't move focus or announce anything.

### Scroll

Scroll only changes when the `main` fragment is replaced.

| Situation                                            | Scroll                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Back or forward to an entry with a saved position    | Restored instantly, unless `scrollPosition` is `'preserve'`.               |
| The URL has a hash naming an element in the new page | That element is scrolled to the top of the viewport.                       |
| `scrollPosition: 'top'`                              | Scrolls to the top after the `out` transition, before the content changes. |
| `scrollPosition: 'element'`                          | `scrollElement` is scrolled into view, smoothly unless motion is reduced.  |
| `scrollPosition: 'preserve'`                         | The position isn't changed, including on back and forward.                 |

## History and scroll restoration

The router sets `history.scrollRestoration` to `'manual'` and restores the previous value when destroyed. It remembers each entry's scroll position while the page scrolls, and saves it into `history.state` before adding an entry and when the page is hidden. After a reload, the saved position is restored once the page loads, unless the visitor has already scrolled.

Moving through history within the same document, such as between hash entries, restores the saved position without fetching anything. `router:popstate` isn't emitted for those moves.

When the browser restores the page from the back/forward cache, the router emits `router:bfcache-restore` and fetches nothing. `router:bfcache-store` is emitted on every `pagehide`, whether or not the browser keeps the page in the cache.

## Navigating from code

| Member                   | Returns                        | What it does                                                                                                |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `navigate(url, options)` | `Promise<string \| undefined>` | Fetches and shows a page. Resolves with the HTML, or `undefined` when skipped, replaced or loaded normally. |
| `get(url, init)`         | `Promise<{ response, data }>`  | Fetches a URL without navigating. `data` is parsed JSON when the response says so, otherwise text.          |
| `back()`                 | `void`                         | Calls `history.back()`.                                                                                     |
| `forward()`              | `void`                         | Calls `history.forward()`.                                                                                  |
| `getCurrentUrl()`        | `URL`                          | The URL of the page currently shown.                                                                        |
| `handlesLink(link)`      | `boolean`                      | Whether the router takes over clicks on the link.                                                           |
| `navigating`             | `boolean`                      | Whether a navigation, including its swap, is in progress. `isNavigating()` returns the same.                |
| `destroy()`              | `void`                         | Removes listeners and cancels the navigation in progress.                                                   |

`navigate()` options:

| Option         | Type                               | Default          | What it does                                                               |
| -------------- | ---------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| `viewTarget`   | `string`                           | `'main'`         | The fragment or target group to replace.                                   |
| `replace`      | `boolean`                          | `false`          | Replace the current history entry.                                         |
| `immutableUrl` | `boolean`                          | `false`          | Leave the address bar and history untouched.                               |
| `force`        | `boolean`                          | `false`          | Navigate even when the URL is the current one.                             |
| `trigger`      | `string`                           | `'programmatic'` | Passed through to events. Clicks use `'link-click'`, history `'popstate'`. |
| `element`      | `Element \| null`                  | `null`           | The element that started the navigation; it receives the classes.          |
| `scroll`       | `{ x: number, y: number } \| null` | `null`           | A position for listeners to restore after the swap.                        |

A navigation to the current URL without `force` does nothing and emits no events. A new navigation cancels the request in progress, and waits for the previous swap to settle before changing the page. `navigate()` rejects with the error when a navigation fails.

```js
await app.router.navigate('/search?q=tents', { viewTarget: 'results', replace: true });
```

`get()` accepts `fetch` options plus `timeout`, which overrides the router's. Its `signal` cancels the request, and a request made with `get()` doesn't cancel a navigation. It rejects with an `HttpError` (with `status`, `statusText`, `response` and `url`) for a status outside 200 to 299, a `TimeoutError`, or the signal's abort reason.

```js
const { data } = await app.router.get('/fragments/price.html', { timeout: 3000 });
```

### Waiting for work after a navigation

A `router:navigate-success` listener that changes the page passes a promise to `waitUntil()` before it returns. The navigation stays in progress, and the loading class stays on, until every promise settles. A rejected promise fails the navigation. `signal` aborts when a newer navigation starts.

```js
app.eventBus.on('router:navigate-success', ({ html, signal, waitUntil }) => {
  waitUntil(updateCart(html, { signal }));
});
```

## Loading and error classes

When a navigation starts, `errorClass` is removed from the body and from the link that failed last, and `loadingClass` is added to the body and to the followed link. The link loses `loadingClass` when its navigation finishes, and the body when the latest navigation finishes. After a failure, `errorClass` stays on the body and the link until the next navigation starts.

Style `.router-loading` on the body to show that a page is loading, and on a link to mark the one that was followed.

## Events

These are emitted on the event bus, not as DOM events. [Events and alerts](events-and-alerts.html) covers the bus itself. Subscribe with `app.eventBus.on(name, listener)`.

| Event                          | When                                                                           | Payload                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `router:initialized`           | The router has started.                                                        | `{ currentUrl }`                                                                                                          |
| `router:navigate-start`        | A navigation starts.                                                           | `{ url, trigger, element, replace }`                                                                                      |
| `router:navigate-success`      | The page is fetched and the address updated, before anything is swapped.       | `{ url, requestedUrl, redirected, html, trigger, element, replace, viewTarget, immutableUrl, scroll, signal, waitUntil }` |
| `router:navigate-error`        | A navigation failed.                                                           | `{ url, error, trigger, element }`                                                                                        |
| `router:navigate-end`          | Every navigation that started, once it finishes.                               | `{ url, trigger, status }`                                                                                                |
| `router:popstate`              | The browser moved to a history entry for a different document.                 | `{ url, state, trigger }`                                                                                                 |
| `router:bfcache-restore`       | The page was restored from the back/forward cache.                             | `{ url }`                                                                                                                 |
| `router:bfcache-store`         | The page is being hidden.                                                      | `{ url }`                                                                                                                 |
| `router:destroyed`             | The router was destroyed.                                                      | `{}`                                                                                                                      |
| `page-manager:initialized`     | The page manager has started and begun mounting components.                    | `{ containerSelector, options }`                                                                                          |
| `page-manager:destroyed`       | The page manager was destroyed.                                                | `{}`                                                                                                                      |
| `page:fragment-will-replace`   | A fragment is about to transition out and be replaced.                         | `{ sourceFragment, targetFragment, viewTarget, html, options, transitionConfig }`                                         |
| `page:fragment-transition-out` | A fragment's `out` transition finished.                                        | `{ fragment, viewTarget, transitionType, duration }`                                                                      |
| `page:fragment-did-replace`    | A fragment's content was replaced, before its `in` transition.                 | `{ targetFragment, viewTarget, options, transitionConfig }`                                                               |
| `page:fragment-transition-in`  | A fragment's `in` transition finished.                                         | `{ fragment, viewTarget, transitionType, duration }`                                                                      |
| `page:fragments-replaced`      | Every requested fragment has been processed.                                   | `{ results, viewTargets, options }`                                                                                       |
| `page:fragments-replace-error` | A swap failed, such as a missing fragment or changed tracked assets.           | `{ viewTargets, error, options }`                                                                                         |
| `page:head-updated`            | The head was reconciled after `main` was replaced.                             | `{ updatedElements, newTitle }`                                                                                           |
| `page:head-update-error`       | Reconciling the head threw.                                                    | `{ error }`                                                                                                               |
| `dom:content-loaded`           | A fragment's new content is in place and its critical components have mounted. | `{ fragment, viewTarget, trigger: 'fragment-replacement' }`                                                               |
| `page:component-loaded`        | A component's module loaded.                                                   | `{ componentName, instance, queueSize }`                                                                                  |
| `page:component-load-error`    | A component's module failed after its retries.                                 | `{ componentName, error, retries }`                                                                                       |
| `page:component-mounted`       | A component mounted on an element.                                             | `{ componentName, element, instance, fragmentTarget }`                                                                    |
| `page:component-mount-error`   | Mounting threw, or a component's selector is invalid.                          | `{ componentName, error, element, fragmentTarget }`, or `{ componentName, error }` for a selector                         |
| `page:component-unmounted`     | A component unmounted from an element.                                         | `{ componentName, element, instance }`                                                                                    |

In `router:navigate-success`:

- `url` is the final URL after redirects, keeping the requested hash. `requestedUrl` is the URL asked for, and `redirected` says whether the server redirected.
- `scroll` is the saved `{ x, y }` position for a back or forward move, otherwise the `scroll` option, or `null`.
- `signal` aborts when a newer navigation replaces this one.
- `waitUntil(promise)` keeps the navigation in progress until the promise settles; call it synchronously.

`router:navigate-end` has a `status` of `'success'`, `'full-load'` (handed to the browser because the response couldn't be shown in place), `'aborted'` (replaced by a newer navigation) or `'error'`. Its `url` is the requested URL.

Each entry in the `results` of `page:fragments-replaced` has `viewTarget` and `success`. A replaced fragment also has `sourceFragment`, `targetFragment` and `transitionConfig`, a fragment skipped because a newer navigation started has `aborted: true`, and a failed one has an `error` message.

## A server-rendered page

Every page renders the same layout with the same `data-view` names. This page has a `navbar` fragment and a `main` fragment, and the `main` group replaces both, so the current link in the navigation updates with the content.

```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <title>Tents | Outdoor Shop</title>
    <meta name="description" content="Tents for every season." />
    <link rel="canonical" href="https://shop.example/tents" />
    <link rel="stylesheet" href="/assets/app.3f9a1c.css" data-router-track="reload" />
    <script type="module" src="/assets/app.3f9a1c.js" data-router-track="reload"></script>
  </head>
  <body>
    <header>
      <nav data-view="navbar">
        <a href="/">Home</a>
        <a href="/tents" aria-current="page">Tents</a>
        <a href="/catalogue.pdf">Catalogue</a>
        <a href="/logout" data-router-skip>Sign out</a>
      </nav>
    </header>

    <main data-view="main">
      <h1>Tents</h1>
      <a href="/tents?sort=price" data-router-replace>Sort by price</a>
      <ul>
        <li><a href="/tents/ridge-2">Ridge 2</a></li>
      </ul>
    </main>
  </body>
</html>
```

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  router: {},
  pageManager: {
    targetGroups: { main: ['navbar', 'main'] },
    targetGroupTransitions: {
      main: { out: 'is-leaving', in: 'is-entering', duration: 200 },
    },
  },
});

app.run();
```

The catalogue link is a PDF, so the browser opens it. The sign-out link is skipped. The other links replace both fragments, update the head, move focus to the `h1` and scroll to the top. If the server renders a page without a `navbar` fragment, the router loads it normally.
