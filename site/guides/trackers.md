# Deferred trackers

[DeferTracker](defer-tracker.html) loads analytics and advertising scripts after the first interaction instead of during page load. This guide covers setting it up, when trackers start, consent, the adapters in the package and the API for writing your own.

## Adding a tracker

Each tracker is a JSON block that the browser never runs. `data-defer-tracker` names the adapter, and the block's JSON is the adapter's config.

```html
<script type="application/json" data-defer-tracker="ga4">
  { "id": "G-XXXXXXX" }
</script>
```

Register the adapters a site uses before `app.run()`, importing them from the same module specifier the component loads from, because the registry lives in that module. Only the adapters you import are bundled.

```js
import { registerTrackerAdapter } from '@parallelogram-js/core/components/DeferTracker';
import ga4 from '@parallelogram-js/core/adapters/ga4';

registerTrackerAdapter('ga4', ga4);

app.components.add(
  '[data-defer-tracker]',
  () => import('@parallelogram-js/core/components/DeferTracker')
);
```

Blocks must sit inside the element the framework observes, which is the body by default. Blocks in `<head>` or elsewhere are never mounted, and the first tracker to start logs a warning listing them.

## Which scripts can load

Tracker blocks are markup, and adapters give the scripts they load the page's CSP nonce, so a block injected into a page could otherwise load any script. Limit what blocks can load when registering adapters.

```js
import { registerTrackerAdapter } from '@parallelogram-js/core/components/DeferTracker';
import gtm from '@parallelogram-js/core/adapters/gtm';
import plausible from '@parallelogram-js/core/adapters/plausible';

registerTrackerAdapter('gtm', gtm, { ids: ['GTM-XXXXXX'] });
registerTrackerAdapter('plausible', plausible, { origins: ['https://stats.example.com'] });
```

- With `ids`, a block whose tracker id (its `id`, `site`, `domain` or `scriptId`) isn't listed gets the status `error`, logs a warning naming the tracker and id, and its adapter isn't called. Without `ids`, any id is accepted.
- A block's `src` loads only from the page's own origin, the vendor's origin that the adapter declares, or an origin listed in `origins`. Any other `src` gets the status `error` and a warning, and nothing loads. Fathom declares `https://cdn.usefathom.com` and Plausible `https://plausible.io`. A custom adapter declares its own as `boot.origins`.
- Register Tag Manager with `ids`: a container's Custom HTML tags run any script, so without them a block can load any container. DeferTracker logs a warning once when `gtm` starts without `ids`.

## When trackers start

Trackers start on the first `pointerdown`, `touchstart`, `keydown` or `click` on the window. Without interaction, they start after a fallback: once the page's load event has fired, then 5 seconds, then the browser's next idle period, waiting at most 2 seconds for it where `requestIdleCallback` is supported.

`configureDeferTracker()` changes these, and must be called before the first tracker mounts.

| Option        | Default                                             | What it does                                                                                                                                                     |
| ------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events`      | `['pointerdown', 'touchstart', 'keydown', 'click']` | The window events that count as interaction. `scroll` and `mousemove` are left out because scroll restoration and a resting pointer fire them without a gesture. |
| `idleTimeout` | `5000`                                              | Milliseconds after the load event before trackers start without interaction. `null` or `0` turns the fallback off.                                               |
| `nonce`       | none                                                | The CSP nonce adapters give the scripts they add. Without it, adapters use the block's own `nonce`.                                                              |

`data-defer-tracker-status` on each block moves through `pending`, `awaiting-consent`, `loading`, `booted`, `duplicate` and `error`, and the block dispatches `defer-tracker:booted` or `defer-tracker:error`.

## Consent

Give a block a `consent` category in its config and pass a resolver to `setTrackerConsent()`. The tracker waits, with the status `awaiting-consent`, until the resolver returns true for its category.

```html
<script type="application/json" data-defer-tracker="meta-pixel">
  { "id": "1234567890", "consent": "marketing" }
</script>
```

```js
import {
  setTrackerConsent,
  reevaluateTrackerConsent,
} from '@parallelogram-js/core/components/DeferTracker';

setTrackerConsent(category => consentBanner.allows(category), { requireCategory: true });

consentBanner.onChange(() => reevaluateTrackerConsent());
```

Waiting trackers check again when `consent:granted` is emitted on the event bus, or when `reevaluateTrackerConsent()` is called, which works without a bus. A resolver that throws counts as not granted. Without `requireCategory`, a block with no `consent` field starts without asking; with it, the block waits too, so a missing or misspelt field fails closed.

Consent is checked again before each page step, so a tracker stops recording later pages once consent is withdrawn. A vendor script that has already loaded can't be unloaded, so also call the vendor's own consent update, such as `gtag('consent', 'update', …)`, or use an adapter's `consentDefault` so the vendor starts in a denied state.

## Several blocks and later pages

A tracker is identified by its adapter name and its config's `id`, `site`, `domain` or `scriptId`, so two properties of the same kind both start. Each adapter's script loads once per page session.

- A second block for a tracker already on the page goes to the adapter's `block` step when its config differs, such as a Google Ads conversion beside a remarketing block with the same id. A repeated block, or a block for an adapter without a `block` step, is marked `duplicate`.
- When the router shows a new page, the adapter's `page` step runs for each tracker still on the page, for page views and conversions the vendor script doesn't record itself. A block for a loaded tracker that mounts on a later page runs the `page` step instead of starting the tracker again.

## Adapters

Every adapter is at `@parallelogram-js/core/adapters/<name>`, and every block also accepts `consent`. Register each one under the name in the first column.

| Name               | Config                                                  | Notes                                                                                                                                         |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ga4`              | `id`, `config`, `consentDefault`                        | `config` is passed to `gtag('config', id, …)`. Enhanced measurement records later pages.                                                      |
| `google-ads`       | `id`, `conversion`, `consentDefault`                    | `conversion`, such as `{ "send_to": "AW-1/abc", "value": 30, "currency": "AUD" }`, is sent once, on the first page or a later one.            |
| `gtm`              | `id`                                                    | Defers every tag the container manages.                                                                                                       |
| `meta-pixel`       | `id`, `events`, `consentDefault`                        | `events` defaults to `["PageView"]`; pairs such as `["Purchase", { "value": 30 }]` carry parameters. `consentDefault` is `revoke` or `grant`. |
| `tiktok-pixel`     | `id`, `events`, `consentDefault`                        | `consentDefault` is `hold`, `revoke` or `grant`.                                                                                              |
| `pinterest-tag`    | `id`, `em`                                              | `em` is the customer's email, hashed with SHA-256. One page visit is recorded per page for all Pinterest tags.                                |
| `linkedin-insight` | `id`                                                    | The partner id.                                                                                                                               |
| `bing-uet`         | `id`, `consentDefault`                                  | The UET tag id. A second tag id gets its own queue at `window.uetq_<id>`.                                                                     |
| `hubspot`          | `id`, `events`                                          | The hub id. `events` are other `_hsq` calls, such as `[["setContentType", "blog-post"]]`.                                                     |
| `hotjar`           | `id`, `sv`                                              | `sv` is the snippet version, 6 by default.                                                                                                    |
| `clarity`          | `id`                                                    |                                                                                                                                               |
| `plausible`        | `scriptId`, `options`, `src`, or `domain`, `src`, `api` | `scriptId` loads the site script, with `options` for `plausible.init()`. `domain` loads the older shared script, with `api` as its endpoint.  |
| `fathom`           | `site`, `src`                                           | `src` points at a custom domain or self-hosted copy, on an allowed origin.                                                                    |

`consentDefault` for the Google adapters and Bing is an object such as `{ "ad_storage": "denied" }`, queued before the tag starts.

## Writing an adapter

An adapter is a function that starts the vendor's tracking for a block, with optional steps attached to it as properties. In this example, `loadScript` stands for your own function that adds a script and returns a Promise that settles when it loads.

```js
function statsAdapter(config, { logger, eventBus, nonce }) {
  if (!config.id) {
    throw new Error('stats: no id in config');
  }
  window.stats = window.stats || [];
  window.stats.push(['init', config.id]);
  return loadScript('https://stats.example/script.js', nonce);
}

statsAdapter.page = (config, ctx, { url, mounted }) => {
  window.stats.push(['page', url]);
};

registerTrackerAdapter('stats', statsAdapter);
```

| Step                                       | When it runs                                                                                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boot(config, ctx)`                        | Once per tracker, when it starts. Return a Promise that settles when the script loads, so the status stays `loading` until then and becomes `error` if it rejects. Throwing also reports `error`.                                             |
| `boot.page(config, ctx, { url, mounted })` | When the router shows a new page, or a block for a loaded tracker mounts on a later page. `mounted` is true when a block has just mounted, so its config's events should be sent, and false when the page changed around a block that stayed. |
| `boot.block(config, ctx)`                  | For a second block with a different config on the same page. Leave it out when a second block would only repeat the page view.                                                                                                                |

`ctx` holds the component's `logger` and `eventBus`, and the `nonce` for scripts the adapter adds. Steps that record something shared by every tag of a kind, such as a page view through one global queue, should record it once per address.

## Functions

These are exported from `@parallelogram-js/core/components/DeferTracker`.

| Function                                      | What it does                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `registerTrackerAdapter(name, boot, options)` | Registers an adapter under the name used in `data-defer-tracker`, with optional `ids` and `origins`.   |
| `configureDeferTracker(options)`              | Sets `events`, `idleTimeout` and `nonce`, before the first tracker mounts.                             |
| `setTrackerConsent(fn, options)`              | Sets the consent resolver, `(category) => boolean`, or clears it with `null`. Takes `requireCategory`. |
| `reevaluateTrackerConsent()`                  | Checks consent again for every tracker waiting for it.                                                 |
