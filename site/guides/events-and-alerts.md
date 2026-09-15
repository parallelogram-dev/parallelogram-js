# Events and alerts

Parallelogram reports what it does through DOM events on elements and through messages on a shared event bus, and shows toast notifications through `AlertManager`. This guide explains both channels, lists every message the framework puts on the bus, and covers alerts.

## Two channels

Components and managers tell the page what happened in two ways.

- **DOM events** are dispatched on elements. Listen with `addEventListener` on the element, an ancestor or `document`.
- **Bus messages** are sent through the application's `EventManager`. Listen with `app.eventBus.on()`.

Enhancement components, which extend `BaseComponent`, dispatch their events with `_dispatch()`. It creates a `CustomEvent` that bubbles and is cancelable, dispatches it on the element, and then emits a message with the same name on the bus, with the element added to the payload as `element`. The bus copy is sent whether or not a DOM listener cancelled the event.

Web components dispatch their events with `dispatchComponentEvent()`. These events bubble and are composed, so they leave shadow roots and reach `document`. They aren't cancelable unless the component says so, and they aren't sent to the bus.

Managers and the framework core only use the bus. Navigation, fragment replacement and component loading are reported there, and nowhere else.

As a rule:

- Listen to the bus for navigation, page updates and component lifecycle.
- Listen to DOM events for what a particular component did, and for anything you want to cancel.

### Reaching the bus

`Parallelogram` creates the bus in `init()`, which `run()` calls, and exposes it as `app.eventBus`. It is `null` before then.

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({ router: {} });
await app.run();

app.eventBus.on('router:navigate-end', ({ url, status }) => {
  console.log(url.href, status);
});
```

The router and page manager are created inside `init()`, so `router:initialized` and `page-manager:initialized` are sent before your code can reach `app.eventBus`. Only a listener on a bus you pass to `RouterManager` or `PageManager` yourself hears them.

`app.destroy()` destroys the page manager and router, which send their `destroyed` messages, and then removes every listener from the bus.

## The EventManager API

`EventManager` is exported from `@parallelogram-js/core`. Listeners run synchronously, in the order they subscribed, and receive the payload passed to `emit()`.

| Method                            | What it does                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `on(event, callback, { signal })` | Subscribes to an event. Returns a function that removes the listener. When `signal` aborts, the listener is removed. |
| `once(event, callback, options)`  | Subscribes to the next emission only. Takes the same `signal` option and returns the same kind of function.          |
| `off(event, callback)`            | Removes one listener. Without a callback, removes every listener for the event.                                      |
| `emit(event, payload)`            | Calls every listener for the event with the payload.                                                                 |
| `listenerCount(event)`            | Returns the number of listeners for the event.                                                                       |
| `clear(event)`                    | Removes every listener for the event, or for every event when no name is given.                                      |

Subscribing with a signal that has already aborted does nothing and returns a function that does nothing. Tie a group of listeners to one `AbortController` to remove them together.

`emit()` works on a copy of the listener list. A listener added during an emission isn't called until the next one, and a listener removed during an emission is still called that time.

A listener that throws doesn't stop the others. The error is reported with the message `[EventManager] Error in listener for "<event>":` through the logger passed to the constructor, or through `console.error` when there is none. `app.eventBus` uses the application's logger.

```js
import { EventManager } from '@parallelogram-js/core';

const bus = new EventManager();
const stop = bus.on('basket:change', ({ count }) => updateBadge(count));

bus.once('basket:change', () => console.log('First change'));
bus.emit('basket:change', { count: 2 });

stop();
bus.listenerCount('basket:change'); // 0
```

Your own messages can use any name. Prefix them, as the framework does, so they don't collide with its names.

## Framework bus messages

Every message below is sent on the bus by the framework itself. URLs in payloads are `URL` objects. The [pages and router guide](pages-and-router.html) explains navigation, fragments and scrolling in depth.

### RouterManager

Sent when the router is enabled with the `router` option.

| Event                     | When it fires                                                                                                | Payload                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `router:initialized`      | The router has started listening for clicks and history changes                                              | `{ currentUrl }`                                                                                                          |
| `router:navigate-start`   | A navigation begins, after any navigation in progress is cancelled; not sent when the URL is the current one | `{ url, trigger, element, replace }`                                                                                      |
| `router:navigate-success` | The new page was fetched and history updated, before the page changes                                        | `{ url, requestedUrl, redirected, html, trigger, element, replace, viewTarget, immutableUrl, scroll, signal, waitUntil }` |
| `router:navigate-error`   | The fetch, or work passed to `waitUntil()`, failed                                                           | `{ url, error, trigger, element }`                                                                                        |
| `router:navigate-end`     | A navigation finished, whatever the outcome                                                                  | `{ url, trigger, status }`                                                                                                |
| `router:popstate`         | The user moved through history to a different document                                                       | `{ url, state, trigger }`                                                                                                 |
| `router:bfcache-restore`  | The page was restored from the back/forward cache                                                            | `{ url }`                                                                                                                 |
| `router:bfcache-store`    | The page is being hidden, on every `pagehide`                                                                | `{ url }`                                                                                                                 |
| `router:destroyed`        | The router was destroyed                                                                                     | `{}`                                                                                                                      |

`trigger` is `'link-click'`, `'popstate'` or `'programmatic'`, or the value passed to `navigate()`. `status` is `'success'`, `'error'`, `'aborted'` when a newer navigation replaced this one, or `'full-load'` when the response couldn't be shown in place and the browser loads the page instead.

`router:navigate-success` listeners that change the page pass a promise to `waitUntil()` synchronously. The navigation stays in progress until it settles. `PageManager` does this to replace fragments.

### PageManager

| Event                      | When it fires                                             | Payload                          |
| -------------------------- | --------------------------------------------------------- | -------------------------------- |
| `page-manager:initialized` | The page manager finished setting up and mounted the page | `{ containerSelector, options }` |
| `page-manager:destroyed`   | The page manager was destroyed                            | `{}`                             |

### Components (ComponentHost)

The page manager mounts and unmounts enhancement components through `ComponentHost`, which sends these.

| Event                        | When it fires                                                        | Payload                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `page:component-loaded`      | A component's module loaded and its instance was created             | `{ componentName, instance, queueSize }`                                                                     |
| `page:component-load-error`  | A component's module failed to load after every retry                | `{ componentName, error, retries }`                                                                          |
| `page:component-mounted`     | A component mounted on an element                                    | `{ componentName, element, instance, fragmentTarget }`                                                       |
| `page:component-mount-error` | Mounting on an element threw, or the component's selector is invalid | `{ componentName, error, element, fragmentTarget }`; only `{ componentName, error }` for an invalid selector |
| `page:component-unmounted`   | A component unmounted from an element                                | `{ componentName, element, instance }`                                                                       |

### Fragments (FragmentSwapper)

Sent while the page manager replaces fragments of the page with those of a fetched page.

| Event                          | When it fires                                                                                        | Payload                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `page:fragment-will-replace`   | Before a fragment's out transition and swap                                                          | `{ sourceFragment, targetFragment, viewTarget, html, options, transitionConfig }` |
| `page:fragment-transition-out` | A fragment's out transition finished                                                                 | `{ fragment, viewTarget, transitionType, duration }`                              |
| `page:fragment-did-replace`    | A fragment's content was replaced, before its in transition                                          | `{ targetFragment, viewTarget, options, transitionConfig }`                       |
| `page:fragment-transition-in`  | A fragment's in transition finished                                                                  | `{ fragment, viewTarget, transitionType, duration }`                              |
| `page:fragments-replaced`      | Every requested fragment was processed                                                               | `{ results, viewTargets, options }`                                               |
| `page:fragments-replace-error` | Replacement failed, for example when a fragment is missing from either page, before anything changed | `{ viewTargets, error, options }`                                                 |
| `page:head-updated`            | The head was updated from the new page, when the `main` fragment is replaced                         | `{ updatedElements, newTitle }`                                                   |
| `page:head-update-error`       | Updating the head threw                                                                              | `{ error }`                                                                       |
| `dom:content-loaded`           | A fragment's new content is in place and critical components have mounted                            | `{ fragment, viewTarget, trigger }`                                               |

The transition messages are only sent for fragments with configured transitions, and not when the user prefers reduced motion. `results` holds one `{ viewTarget, success }` entry for each fragment, with `error` when that fragment failed.

`dom:content-loaded` isn't sent for the first page load, only after a fragment is replaced, and its `trigger` is always `'fragment-replacement'`. Use it to set up content that isn't a registered component.

### AlertManager

Sent only by an `AlertManager` created with an `eventBus`. Alerts on the bus, under Alerts, explains which toasts they report.

| Event          | When it fires                                   | Payload                 |
| -------------- | ----------------------------------------------- | ----------------------- |
| `alerts:show`  | A toast was shown in the manager's `<p-toasts>` | `{ id, type, message }` |
| `alerts:close` | A toast in the manager's `<p-toasts>` closed    | `{ id, type, message }` |

## Component events

Each component's page lists its events, with the channel each uses and the type of its `detail`. For example, see [Toggle](toggle.html), [`<p-modal>`](p-modal.html) and [`<p-uploader>`](p-uploader.html). An enhancement component event marked as sent on both channels arrives on the bus with `element` added to its detail.

Web component events are named `<tag>:<verb>`, such as `p-modal:close` or `p-uploader:upload-success`, and bubble out of shadow roots to `document`. One listener on `document` hears them from every instance on the page, including elements added after it subscribed.

The package's TypeScript declarations add each web component's events to the global event map, so `addEventListener` on an element, the document or the window infers the `detail` type from the event name.

```js
document.addEventListener('p-toasts:close', event => {
  console.log(`Toast ${event.detail.id} closed: ${event.detail.message}`);
});
```

Events marked cancelable on a component's page let you replace its default behaviour by calling `preventDefault()`.

## Alerts

`AlertManager` is the programmatic API for toast notifications. It shows them through a [`<p-toasts>`](p-toasts.html) element. It isn't exported from the package root, and `Parallelogram` doesn't create one, so import it from its own path.

```js
import { AlertManager } from '@parallelogram-js/core/managers/AlertManager';

const alerts = new AlertManager({ eventBus: app.eventBus, placement: 'bottom-right' });

alerts.success('Booking saved');
```

### Constructor options

| Option      | Type           | Default         | What it does                                                                                                                          |
| ----------- | -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `eventBus`  | `EventManager` | none            | Receives `alerts:show` and `alerts:close`                                                                                             |
| `placement` | string         | `'top-right'`   | The `placement` of a `<p-toasts>` it creates: `top-right`, `top-left`, `top-center`, `bottom-right`, `bottom-left` or `bottom-center` |
| `container` | `HTMLElement`  | `document.body` | Where it creates a `<p-toasts>`                                                                                                       |
| `logger`    | `DevLogger`    | none            | Logs what it does                                                                                                                     |

The manager uses the first `<p-toasts>` on the page. When there is none, it creates one with its `placement` and appends it to `container`. It does this as soon as it is constructed. `placement` and `container` have no effect when the page already has a `<p-toasts>`. If the element it uses is removed, it finds or creates one again when it next shows a toast.

### Showing toasts

| Method                      | Type of toast                              |
| --------------------------- | ------------------------------------------ |
| `info(message, options)`    | `info`                                     |
| `success(message, options)` | `success`                                  |
| `warn(message, options)`    | `warning`                                  |
| `error(message, options)`   | `error`                                    |
| `toast(options)`            | The `type` in `options`, `info` by default |

Each returns a function that closes the toast. Calling it after the toast has closed does nothing.

`toast()` passes its options to the `<p-toasts>` element's `toast()` method:

| Option        | Type    | Default                    | What it does                                                                                                      |
| ------------- | ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `message`     | string  | `''`                       | The text of the toast                                                                                             |
| `type`        | string  | `'info'`                   | `info`, `success`, `warning` or `error`; `warn` and `danger` are read as `warning` and `error`                    |
| `title`       | string  | none                       | A heading above the message                                                                                       |
| `timeout`     | number  | `4000`, or `0` for `error` | Milliseconds before the toast closes, or `0` to keep it until it is dismissed; `duration` is accepted as an alias |
| `dismissible` | boolean | `true`                     | Whether the toast has a dismiss button                                                                            |
| `allowHTML`   | boolean | `false`                    | Treat the message as trusted HTML instead of text                                                                 |

Error toasts stay until they are dismissed unless you give them a `timeout`. Every other type closes after four seconds. The timers wait while the pointer or keyboard focus is on the stack. Info and success toasts are announced politely to screen readers, and warnings and errors straight away.

Only set `allowHTML` for markup you control. Never pass it user input.

A toast without a dismiss button and without a timeout stays until your code calls the function `toast()` returned.

### While a modal is open

Everything outside an open modal dialog is inert. When a toast is shown while a `<p-modal>` or a modal `<dialog>` is open, the `<p-toasts>` element moves inside the most recently opened one, so the toast can be read and dismissed. It returns to its place when that modal closes.

### Without an instance

`AlertManager.notify(message, type, options)` shows a toast through a shared `AlertManager`, created the first time it is called. `type` defaults to `'info'`, and `options` takes the other `toast()` options. It returns the close function.

```js
AlertManager.notify('Link copied', 'success', { timeout: 2000 });
```

The shared instance has no event bus. It uses the page's `<p-toasts>` like any other `AlertManager`.

### Alerts on the bus

An `AlertManager` created with an `eventBus` forwards the `p-toasts:show` and `p-toasts:close` events of the `<p-toasts>` it uses to the bus as `alerts:show` and `alerts:close`, with the same detail. Because it listens to the element, it forwards every toast shown there, including toasts from `AlertManager.notify()`, the Toast component or code calling the element's `toast()` directly.

```js
app.eventBus.on('alerts:close', ({ type, message }) => {
  if (type === 'error') {
    analytics.track('error-dismissed', { message });
  }
});
```

Each such manager forwards separately. Two managers on the same bus and element send each message twice, so create one and share it.

### Toasts from markup

The [Toast](toast.html) enhancement component shows a toast when a trigger is clicked, through `AlertManager.notify()`. Its attributes set the type, message, title, duration and dismiss button, and are read on each click.

```html
<button
  type="button"
  data-toast-trigger="success"
  data-toast-message="Table booked for 7pm"
  data-toast-title="Booked"
>
  Book
</button>
```

## Examples

### Following navigations with an AbortSignal

Tie bus listeners to an `AbortController` and abort it to remove them all at once, for example when the part of the page that needs them goes away.

```js
const controller = new AbortController();
const { signal } = controller;
const progress = document.querySelector('.progress');

app.eventBus.on('router:navigate-start', () => progress.removeAttribute('hidden'), { signal });

app.eventBus.on(
  'router:navigate-end',
  ({ status }) => {
    progress.setAttribute('hidden', '');
    if (status === 'error') {
      progress.textContent = 'That page could not be loaded.';
    }
  },
  { signal }
);

controller.abort();
```

### Listening to a web component on the document

```js
document.addEventListener('p-modal:close', event => {
  console.log(`Closed ${event.detail.modal.id}`);
});
```

### Cancelling a cancelable event

`<p-uploader>` dispatches `p-uploader:reject` for each file it refuses, with `{ file, reason }`, where `reason` is `'type'` or `'size'`. Cancel it to replace the uploader's own message with yours.

```js
import { AlertManager } from '@parallelogram-js/core/managers/AlertManager';

const alerts = new AlertManager();

document.addEventListener('p-uploader:reject', event => {
  event.preventDefault();
  const { file, reason } = event.detail;
  alerts.warn(
    reason === 'size' ? `${file.name} is too large to upload.` : `${file.name} can't be uploaded.`
  );
});
```

### Showing a toast when a form is sent

```js
import { AlertManager } from '@parallelogram-js/core/managers/AlertManager';

const alerts = new AlertManager({ placement: 'bottom-center' });
const form = document.querySelector('#booking');

form.addEventListener('submit', async event => {
  event.preventDefault();
  const closeSaving = alerts.info('Saving your booking', { timeout: 0, dismissible: false });

  try {
    const response = await fetch(form.action, { method: 'POST', body: new FormData(form) });
    closeSaving();
    if (!response.ok) {
      throw new Error(`The server responded with ${response.status}`);
    }
    alerts.success('Booking saved');
  } catch (error) {
    closeSaving();
    alerts.error(error.message, { title: 'Booking not saved' });
  }
});
```

The error toast stays until it is dismissed, because error toasts have no timeout by default.
