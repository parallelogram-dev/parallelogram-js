# Writing a component

An enhancement component is a class that extends `BaseComponent` and adds behaviour to markup already on the page, configured through `data-<component>-<attr>` attributes. This guide covers how the framework loads and mounts your class, the helpers it inherits, and a complete example.

## How components are loaded

Register a component with `app.components.add(selector, loader)`. The selector is any CSS selector, and the loader returns the module, usually with a dynamic `import()`.

```js
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create();

app.components
  .add('[data-charcount]', () => import('./components/CharacterCount.js'))
  .add('[data-price-table]', {
    name: 'price-table',
    loader: () => import('./components/PriceTable.js'),
    priority: 'critical',
    dependsOn: ['[data-charcount]'],
  });

app.run();
```

A selector that is a valid custom element name, such as `price-table`, loads a web component instead, so give enhancement components an attribute or element selector.

| Option       | Type                       | Default      | What it does                                                                       |
| ------------ | -------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `name`       | `string`                   | The selector | The name `dependsOn` refers to. Registering the same name twice throws.            |
| `loader`     | `() => module`             |              | Loads the component, when it isn't the second argument                             |
| `priority`   | `'critical'` or `'normal'` | `'normal'`   | Critical components are mounted before the others on every pass                    |
| `dependsOn`  | `string[]`                 |              | Names of components whose modules must load first. An unknown name logs a warning. |
| `exportName` | `string`                   |              | The named export to use when the module has no default export                      |

The loader may return a module with a default export, a module with the export named by `exportName`, or the class itself. When it returns anything else, the component fails straight away without retrying. When the loader itself fails, it is retried three times, waiting 1 second and then twice as long before each retry.

### One instance per registration

The framework creates one instance of your class for each registration, the first time an element matches, and that instance is shared by every matching element. Keep per-element data in the state object `_init` returns, and data shared by all elements, such as a document listener, on the instance.

The constructor receives `{ eventBus, logger, router, config }`. `BaseComponent` stores `eventBus`, `logger` and `router` on the instance; `router` is `null` unless the app was created with router options. `config` is the registry entry (`name`, `selector`, `loader`, `priority`, `dependsOn`, `exportName`), and you need to keep it yourself if you want it.

```js
constructor(context = {}) {
  super(context);
  this.registration = context.config;
}
```

### Lifecycle

| Method             | When it runs                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `mount(element)`   | For each matching element, once the module has loaded. It calls `_init(element)` and stores the state it returns. |
| `update(element)`  | When `mount()` runs for an element that is already mounted or still initialising. The base method does nothing.   |
| `unmount(element)` | When the element leaves the page. It runs the state's `cleanup()`, then aborts the state's controller.            |
| `destroy()`        | When the app is destroyed, after every element has been unmounted. The base method unmounts anything left.        |

The framework skips elements that are already mounted, so in practice `update()` runs only for an element whose asynchronous `_init` hasn't finished, or when your own code calls `mount()` again. Override `destroy()` to release resources held by the instance, and call `super.destroy()`.

While a module loads, matching elements have the `component-loading` class. If loading fails for good, they get `component-error` instead. The event bus also reports `page:component-loaded`, `page:component-load-error`, `page:component-mounted`, `page:component-mount-error` and `page:component-unmounted`.

### Elements added or removed later

Components mount in `document.body` by default, or the element named by the `pageManager` option `observeRoot`, and a `MutationObserver` watches it for added and removed elements. An added element that matches a selector, or contains elements that do, is mounted. A mounted element that is no longer in the document is unmounted, so moving an element within the page in one task keeps it mounted.

Attribute changes aren't observed. Adding `data-charcount` to an element already on the page doesn't mount it.

Components added after `run()` mount on matching elements straight away.

## The component class

```js
import { BaseComponent } from '@parallelogram-js/core';

export default class CharacterCount extends BaseComponent {
  static selector = 'data-charcount';

  static defaults = {
    limit: 280,
    warnAt: 20,
  };
}
```

### `static selector`

`static selector` names the component's data attribute, and every attribute helper builds its names from it. Write it as `'data-charcount'`, `'charcount'` or `'[data-charcount]'`; all three mean `data-charcount`. It is the attribute name only, not a selector with a value.

Without it, the name comes from the class name, so `CharacterCount` becomes `data-character-count`. Minifiers change class names, so the logger warns once per class the first time the name is needed.

### `static defaults`

`static defaults` holds the component's option defaults. `_getConfigFromAttrs(element, mapping)` reads a set of attributes at once, taking each key's default from `static defaults` and converting the value by the default's type.

```js
const config = this._getConfigFromAttrs(element, {
  limit: 'limit',
  warnAt: 'warn-at',
});
```

| Type of the default | Read with                                |
| ------------------- | ---------------------------------------- |
| `boolean`           | `getBoolAttr()`                          |
| `number`            | `getNumberAttr()`                        |
| Anything else       | `getAttr()`, so the value stays a string |

A key with no default is read as a string and is `null` when the attribute is missing.

## Setting up an element

Override `_init(element)` and return a state object. Call `super._init(element)` first: it returns `{ controller, cleanup }`, where `controller` is an `AbortController` for the element and `cleanup()` aborts it.

Attach listeners with `{ signal: state.controller.signal }`, including listeners on the document or other elements, so they are removed when the element unmounts. If you allocate anything else, such as an observer, a timer or an element, wrap `cleanup` and call the original.

```js
_init(element) {
  const state = super._init(element);
  const baseCleanup = state.cleanup;
  const { signal } = state.controller;

  element.addEventListener('focus', () => this._onFocus(element), { signal });
  state.observer = new ResizeObserver(() => this._onResize(element));
  state.observer.observe(element);

  state.cleanup = () => {
    state.observer.disconnect();
    baseCleanup();
  };
  return state;
}
```

`unmount()` aborts `state.controller` after `cleanup()`, even if `cleanup()` throws.

### Asynchronous `_init`

`_init` may return a Promise of the state. The element counts as mounted straight away, and `trackedElements()` includes it, but `getState(element)` returns `undefined` until the Promise resolves.

- If the element is unmounted first, its controller is aborted, and the resolved state's `cleanup()` runs as soon as it arrives.
- If the Promise rejects, the element isn't tracked, its controller is aborted and the logger reports the error.

### When `_init` throws

If `_init` throws, the element isn't tracked, the controller from `super._init` is aborted and the error is rethrown. The framework logs it and emits `page:component-mount-error` with `componentName`, `error` and `element`, then carries on with other elements. It doesn't try that element again. Calling `super._init` before anything that might throw means listeners you had already attached are removed.

## Reading attributes

These helpers read and write `data-<component>-<attr>`, so on `CharacterCount`, `'warn-at'` means `data-charcount-warn-at`.

| Method          | Signature                                   | Default | What it does                                                                                                                |
| --------------- | ------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `getAttr`       | `(element, attr, defaultValue?) => string`  | `null`  | The raw string when the attribute is present, otherwise the default. `"false"` is a string, so use `getBoolAttr` for flags. |
| `getBoolAttr`   | `(element, attr, defaultValue?) => boolean` | `false` | The default when missing. `"false"` and `"0"`, in any case, are false; any other value, including an empty one, is true.    |
| `getNumberAttr` | `(element, attr, defaultValue?) => number`  | `null`  | The number, or the default when the attribute is missing, empty or not a finite number                                      |
| `setAttr`       | `(element, attr, value) => void`            |         | Sets the attribute to `String(value)`                                                                                       |
| `removeAttr`    | `(element, attr) => void`                   |         | Removes the attribute                                                                                                       |
| `hasAttr`       | `(element, attr) => boolean`                |         | Whether the attribute is present                                                                                            |

The element doesn't need to be the one the component is mounted on. Toggle, for example, reads `data-toggle-manual` from its target as well as its trigger.

## State

### State attribute

`setState(element, state)` writes `data-<component>-state`, which styles and scripts can read. `getElementState(element)` reads it back.

Until 0.6.0, `setState` also copies the value into `data-<component>` itself, and `getElementState` falls back to that attribute when the state attribute is missing. The copy replaces whatever value `data-<component>` had, so keep configuration out of that attribute's value.

`src/core/ComponentStates.js` defines standard names, which you can import from `@parallelogram-js/core/core/ComponentStates`:

| Export            | Values                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ComponentStates` | `PENDING` (`''`), `INITIALIZING`, `MOUNTED`, `ERROR`, `DESTROYED`                                                                                                                     |
| `ExtendedStates`  | `LOADING`, `LOADED`, `HIDDEN`, `REVEALING`, `REVEALED`, `OPEN`, `CLOSED`, `OPENING`, `CLOSING`, `PROCESSING`, `COMPLETE`, `VALIDATING`, `VALIDATED`, `PLAYING`, `PAUSED`, `BUFFERING` |

Each value is the lowercase name, such as `'open'`. Your own names are fine too. The state attribute is optional: [CopyToClipboard](copy-to-clipboard.html) writes `data-copytoclipboard-state` with `setAttr()` so it can remove it again.

### JavaScript state

`getState(element)` returns the object `_init` returned, or `undefined` for an element that isn't mounted. `_requireState(element, methodName)` does the same, and logs a warning when there is no state, which suits public methods that take an element.

```js
reset(element) {
  const state = this._requireState(element, 'reset');
  if (!state) return;
  this._render(element, state);
}
```

## Events

`_dispatch(element, type, detail)` dispatches a `CustomEvent` on the element that bubbles and is cancelable, with `detail` as its detail. It then emits the same type on the event bus, with `element` added to the payload, and returns the DOM event.

```js
const event = this._dispatch(element, 'charcount:change', { state: 'over', remaining: -4 });
if (event.defaultPrevented) return;
```

Name events `<component>:<verb>`, such as `toggle:show` and `toggle:hide`. For a message only scripts need, emit it on the bus alone with `this.eventBus?.emit(type, payload)`, as CopyToClipboard does with `copy-to-clipboard:success`. [Events and alerts](events-and-alerts.html) covers listening on the bus.

## Other helpers

These are `protected` helpers on `BaseComponent`.

| Method                  | Signature                                       | Default                | What it does                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_getTargetElement`     | `(element, attr, { required }?) => HTMLElement` |                        | Reads `data-<component>-<attr>-view` and finds `[data-view="<value>"]`, or else uses `data-<component>-<attr>` as a selector. Returns `null` when nothing is found, and warns if `required`. |
| `_debounce`             | `(func, wait?) => function`                     | `wait` 300 ms          | Calls `func` once calls have stopped for `wait` milliseconds                                                                                                                                 |
| `_throttle`             | `(func, limit?) => function`                    | `limit` 100 ms         | Calls `func` at most once every `limit` milliseconds                                                                                                                                         |
| `_generateId`           | `(prefix?) => string`                           | `prefix` `'elem'`      | A unique id starting with the prefix, for `aria-controls` and similar links                                                                                                                  |
| `_getFocusableElements` | `(container?) => HTMLElement[]`                 | `container` `document` | Links, enabled form controls and elements with a non-negative `tabindex`                                                                                                                     |
| `_trapFocus`            | `(container, event) => void`                    |                        | Call from a Tab `keydown` listener to keep focus cycling inside the container                                                                                                                |
| `_restoreFocus`         | `(element) => void`                             |                        | Focuses the element in the next animation frame                                                                                                                                              |

Debounced and throttled functions can't be cancelled, so a delayed call may run after the element unmounts. Check `state.controller.signal.aborted` inside them.

## Styling

Style the state attribute rather than classes you add and remove, because it is already there for scripts and it disappears with the state.

```css
[data-charcount-state='near'] + .charcount__output {
  color: #8a5a00;
}

[data-charcount-state='over'] + .charcount__output {
  color: #b00020;
  font-weight: 600;
}
```

Ship the stylesheet with your own site CSS. The library's stylesheets for its components are imported from `@parallelogram-js/core/styles/<name>.css`, such as `styles/toggle.css`, and [Toggle](toggle.html) is a good model: its stylesheet hides and animates targets by `data-toggle-state`, and the component waits for those animations. Style `.component-loading` if elements need to look different before their module arrives.

## Example: a character counter

`CharacterCount` shows how many characters are left in a textarea, and marks the textarea as near or over its limit.

```html
<label for="message">Message</label>
<textarea
  id="message"
  name="message"
  rows="4"
  data-charcount
  data-charcount-limit="280"
  data-charcount-warn-at="20"
  data-charcount-output="#message-count"
></textarea>
<p id="message-count" class="charcount__output"></p>
```

```js
import { BaseComponent } from '@parallelogram-js/core';

export default class CharacterCount extends BaseComponent {
  static selector = 'data-charcount';

  static defaults = {
    limit: 280,
    warnAt: 20,
  };

  _init(element) {
    const state = super._init(element);
    const baseCleanup = state.cleanup;
    const { signal } = state.controller;

    state.config = this._getConfigFromAttrs(element, { limit: 'limit', warnAt: 'warn-at' });
    state.output = this._getTargetElement(element, 'output', { required: true });
    if (!state.output) return state;

    element.addEventListener('input', () => this._render(element, state), { signal });
    element.form?.addEventListener(
      'reset',
      () =>
        setTimeout(() => {
          if (!signal.aborted) this._render(element, state);
        }),
      { signal }
    );
    this._render(element, state);

    state.cleanup = () => {
      state.output.textContent = '';
      this.removeAttr(element, 'state');
      baseCleanup();
    };
    return state;
  }

  _render(element, state) {
    const { limit, warnAt } = state.config;
    const remaining = limit - element.value.length;
    const next = remaining < 0 ? 'over' : remaining <= warnAt ? 'near' : 'ok';

    state.output.textContent =
      remaining < 0 ? `${-remaining} characters over` : `${remaining} characters left`;

    if (this.getElementState(element) !== next) {
      this.setState(element, next);
      this._dispatch(element, 'charcount:change', { state: next, remaining });
    }
  }
}
```

The form's `reset` event fires before the fields are reset, so the counter renders again on the next task, unless the element has been unmounted in the meantime. Both listeners go when the signal aborts, and `cleanup` clears the text and the state attribute the component wrote.

Register it, and listen for its event wherever you need it:

```js
app.components.add('[data-charcount]', () => import('./components/CharacterCount.js'));

document.addEventListener('charcount:change', event => {
  event.target.form
    ?.querySelector('[type="submit"]')
    ?.toggleAttribute('disabled', event.detail.state === 'over');
});
```

Use the stylesheet rules from [Styling](#styling). The limit is a hint in the browser, so check the length on the server as well.

## TypeScript

The package ships declarations. `mount`, `update`, `unmount`, `destroy`, `trackedElements`, `getState`, `setState`, `getElementState` and the attribute helpers are public. `_init`, `_dispatch`, `_getConfigFromAttrs`, `_getTargetElement` and the other underscore helpers are `protected`, so declare your overrides as `protected` and call the helpers only from inside the class.

`ComponentState` is exported from `@parallelogram-js/core/core/BaseComponent`. Its `controller` and `cleanup` are typed, and any other entry is `unknown`, so narrow values you read back from it.

```ts
import { BaseComponent } from '@parallelogram-js/core';
import type { ComponentState } from '@parallelogram-js/core/core/BaseComponent';

export default class CharacterCount extends BaseComponent {
  static selector = 'data-charcount';

  protected _init(element: HTMLElement): ComponentState {
    const state = super._init(element);
    state.limit = this.getNumberAttr(element, 'limit', 280);
    return state;
  }
}
```

## Contracts for components in this repository

Contracts apply to components inside the `@parallelogram-js/core` repository, not to components on your own site. Each one has a `<Name>.contract.js` beside it in `src/components`, whose default export describes its markup API in the shape `src/contract.js` defines. Components never import their contracts.

A contract generates the component's page on the documentation site, named after the kebab-cased class name, and its row in the README's component table. For web components it also generates the TypeScript declarations and `custom-elements.json` entry. Run `npm run readme` after changing a contract; a unit test fails while the README table is out of date.

| Field         | What it holds                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | The class name                                                                                                                        |
| `kind`        | `'enhancement'` for a class extending `BaseComponent`                                                                                 |
| `selector`    | The data attribute, matching `static selector`                                                                                        |
| `match`       | The selector to register with, when it isn't `[selector]`                                                                             |
| `module`      | The import path, such as `components/CharacterCount`                                                                                  |
| `summary`     | One line saying what the component does                                                                                               |
| `description` | Paragraphs separated by blank lines                                                                                                   |
| `stylesheet`  | The package stylesheet it needs, such as `styles/toggle.css`                                                                          |
| `states`      | Values of `data-<component>-state`                                                                                                    |
| `attributes`  | Each with `name`, `type`, `description`, and optionally `default`, `option`, `options`, `on`, `required`, `readonly` and `deprecated` |
| `events`      | Each with `name` and `description`, and optionally `detail`, `channel` (`dom`, `bus` or `both`), `on` and `cancelable`                |
| `examples`    | At least one, each with `id`, `title` and `markup`, and optionally `description` and `controls`                                       |

An attribute's `option` names the key in `static defaults` that holds its default. The contract may also list `cssProperties` and `accessibility` notes. [Toggle](toggle.html) and [CopyToClipboard](copy-to-clipboard.html) have contracts worth copying.

`test/unit/contracts.test.js` checks each contract against its component. It fails when the contract is badly formed, when `selector` doesn't match `static selector`, when the source reads an attribute through the attribute helpers or `_getConfigFromAttrs` that the contract doesn't declare, when an event named in the source under the component's prefix is missing, when a declared attribute, event or CSS property doesn't appear in the source or styles, when an `option` default differs from `static defaults`, or when an example doesn't contain the component.

Stylesheets for library components live in `src/styles/framework/components/<name>.scss` and build to `@parallelogram-js/core/styles/<name>.css`.
