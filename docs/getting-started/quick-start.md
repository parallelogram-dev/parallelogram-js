# Simplified API Guide

This guide demonstrates the new, simplified API for initializing Parallelogram with minimal boilerplate.

## Quick Start

### Minimal Setup

The absolute minimum to get started:

```javascript
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create();

app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

app.run(); // Smart initialization - works with async/defer scripts
```

**Note:** Use `app.run()` instead of `app.init()` to handle async/defer scripts automatically. The `run()` method checks if the DOM is ready and initializes immediately, or waits for `DOMContentLoaded` if needed.

That's it! The framework will:
- Create event bus, logger, and page manager with sane defaults
- Lazy-load web components when they appear in the DOM
- Lazy-load enhancement components when matching elements are found
- Watch for dynamically added components
- Handle component mounting/unmounting automatically

## Component Registration

### Auto-Detection

The `.add()` method automatically detects component type:

```javascript
app.components
  // Web component - simple tag name
  .add('p-uploader', () => import('@parallelogram-js/core/components/PUploader'))
  .add('p-datetime', () => import('@parallelogram-js/core/components/PDatetime'))

  // Enhancement component - has selector characters [, ., #, :
  .add('[data-lazysrc]', () => import('@parallelogram-js/core/components/Lazysrc'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('.lightbox', () => import('@parallelogram-js/core/components/Lightbox'))

  // Local custom components
  .add('[data-collection]', () => import('./components/CollectionHelper'))
  .add('[data-student-search]', () => import('./components/StudentSearch'));
```

**Detection Logic:**
- Contains `[`, `.`, `#`, `:`, or space → Enhancement component (uses selector)
- Simple tag name → Web component (uses tag name)

### Web Components

Web components are custom elements that extend HTMLElement:

```javascript
app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('p-select', () => import('@parallelogram-js/core/components/PSelect'));
```

**Behavior:**
- Loads when `<p-modal>` or `<p-select>` tags appear in DOM
- Auto-registers via `customElements.define()`
- Uses MutationObserver to detect dynamically added elements
- Works with standard Web Component lifecycle

**HTML Usage:**
```html
<p-modal id="confirm-dialog" data-modal-closable="true">
  <h2 slot="title">Confirm Action</h2>
  <p>Are you sure?</p>
</p-modal>
```

### Enhancement Components

Enhancement components progressively enhance existing HTML:

```javascript
app.components
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-lazysrc]', () => import('@parallelogram-js/core/components/Lazysrc'));
```

**Behavior:**
- Loads when elements matching selector appear in DOM
- Framework mounts component class to elements
- Uses BaseComponent lifecycle (mount, unmount, update)
- PageManager handles scanning and mounting

**HTML Usage:**
```html
<img data-lazysrc="/images/hero.jpg" alt="Hero image">
<button data-toggle data-toggle-target="#menu">Toggle Menu</button>
```

### Component Options

Enhancement components can include additional options:

```javascript
app.components
  .add('[data-critical]', {
    loader: () => import('./components/Critical'),
    priority: 'critical',
    dependsOn: ['base-utils']
  })
  .add('[data-analytics]', {
    loader: () => import('./components/Analytics'),
    priority: 'low'
  });
```

## Configuration

### Default Configuration

Without any config, you get sensible defaults:

```javascript
const app = Parallelogram.create();
app.run();
```

**Defaults:**
- `mode: 'production'` - No debug logging
- `debug: false` - Minimal console output
- Router: Disabled (no client-side navigation)
- PageManager: Container is `'body'`, observes DOM changes
- Web components: MutationObserver enabled

### Development Mode

Enable detailed logging:

```javascript
const app = Parallelogram.create({
  mode: 'development',
  debug: true
});
```

### Router Configuration

Enable client-side routing by providing router config:

```javascript
const app = Parallelogram.create({
  router: {
    timeout: 10000,
    loadingClass: 'router-loading',
    errorClass: 'router-error'
  }
});
```

**Auto-enabled:** Router is automatically enabled when config is provided.

### Page Manager Configuration

Customize page management behavior:

```javascript
const app = Parallelogram.create({
  pageManager: {
    containerSelector: '[data-view="main"]',
    mountDelay: 1200,

    // Define target groups for fragment updates
    targetGroups: {
      'main': ['navbar', 'main', 'breadcrumb'],
      'gallery': ['header-filter', 'header-nav', 'gallery']
    },

    // Transition animations per group
    targetGroupTransitions: {
      'main': {
        out: 'reveal--down',
        in: 'reveal--up'
      }
    },

    // Scroll behavior
    scrollRestoration: true,
    scrollPosition: 'top' // 'top', 'preserve', 'element'
  }
});
```

### Full Configuration Example

Everything together:

```javascript
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  mode: 'development',
  debug: true,

  router: {
    timeout: 10000,
    loadingClass: 'router-loading'
  },

  pageManager: {
    containerSelector: '[data-view="main"]',
    targetGroups: {
      'main': ['navbar', 'main']
    }
  }
});

// Register components
app.components
  // Web components
  .add('p-uploader', () => import('@parallelogram-js/core/components/PUploader'))
  .add('p-datetime', () => import('@parallelogram-js/core/components/PDatetime'))

  // Framework enhancement components
  .add('[data-lazysrc]', () => import('@parallelogram-js/core/components/Lazysrc'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-lightbox]', () => import('@parallelogram-js/core/components/Lightbox'))
  .add('[data-reveal]', () => import('@parallelogram-js/core/components/Scrollreveal'))
  .add('[data-videoplay]', () => import('@parallelogram-js/core/components/Videoplay'))

  // Local custom components
  .add('[data-collection]', () => import('./components/CollectionHelper'))
  .add('[data-smoothscroll]', () => import('./components/SmoothScroll'))
  .add('[data-student-search]', () => import('./components/StudentSearch'))
  .add('[data-dashboard-chart]', () => import('./components/DashboardChart'))
  .add('[data-confirm]', () => import('./components/ConfirmAction'));

// Initialize
app.init();
```

## Migration from Old API

### Before (Verbose)

```javascript
import {ComponentRegistry, DevLogger, EventManager, PageManager, RouterManager} from '@parallelogram-js/core';
import '@parallelogram-js/core/components/PUploader';
import '@parallelogram-js/core/components/PDatetime';

async function initFramework() {
  const registry = ComponentRegistry.create('production');
  const logger = new DevLogger({}, true);

  const componentRegistry = registry
    .component('lazysrc', '[data-lazysrc]', {
      loader: () => import('@parallelogram-js/core/components/Lazysrc')
    })
    .component('toggle', '[data-toggle]', {
      loader: () => import('@parallelogram-js/core/components/Toggle')
    })
    .build();

  const eventBus = new EventManager();
  const router = new RouterManager({ eventBus, logger, options: {} });
  const pageManager = new PageManager({
    containerSelector: '[data-view="main"]',
    registry: componentRegistry,
    eventBus,
    logger,
    router,
    options: {}
  });

  pageManager.mountAllWithin(document.body, { trigger: 'initial-global' });
}

document.addEventListener('DOMContentLoaded', initFramework);
```

### After (Simplified)

```javascript
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create({
  debug: true,
  pageManager: {
    containerSelector: '[data-view="main"]'
  }
});

app.components
  .add('p-uploader', () => import('@parallelogram-js/core/components/PUploader'))
  .add('p-datetime', () => import('@parallelogram-js/core/components/PDatetime'))
  .add('[data-lazysrc]', () => import('@parallelogram-js/core/components/Lazysrc'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

document.addEventListener('DOMContentLoaded', () => app.init());
```

**Benefits:**
- 70% less boilerplate
- Single, unified API for all components
- Automatic lazy-loading for web components
- Cleaner, more maintainable code
- Sane defaults with opt-in configuration

## Advanced Usage

### Access Managers Directly

For advanced use cases, you can access managers after initialization:

```javascript
app.init();

// Access event bus
app.eventBus.on('custom-event', (data) => {
  console.log('Event received:', data);
});

// Access router
app.router?.navigate('/new-page');

// Access page manager
app.pageManager.mountAllWithin(document.querySelector('#dynamic-content'));

// Access logger
app.logger?.info('Custom log message');
```

### Check Initialization State

```javascript
if (app.isInitialized) {
  console.log('Framework is ready');
}
```

### Cleanup

Destroy the framework and release resources:

```javascript
app.destroy();
```

## Webpack Integration

The simplified API works seamlessly with webpack code-splitting:

### Webpack Config

```javascript
// webpack.config.js
module.exports = {
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};
```

### Result

Each component import creates a separate chunk:

```
main.abc123.js         (Your app code)
PUploader.def456.js    (Loaded when <p-uploader> appears)
PDatetime.ghi789.js    (Loaded when <p-datetime> appears)
Lazysrc.jkl012.js      (Loaded when [data-lazysrc] appears)
Toggle.mno345.js       (Loaded when [data-toggle] appears)
```

## Best Practices

### 1. Only Register Components You Use

Don't register components that aren't in your HTML:

```javascript
// Good - only components actually used
app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

// Bad - registering everything "just in case"
app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('p-select', () => import('@parallelogram-js/core/components/PSelect'))
  .add('p-datetime', () => import('@parallelogram-js/core/components/PDatetime'))
  .add('p-toasts', () => import('@parallelogram-js/core/components/PToasts'))
  .add('p-uploader', () => import('@parallelogram-js/core/components/PUploader'));
```

### 2. Use Webpack Magic Comments

Help identify chunks in webpack:

```javascript
app.components
  .add('p-modal', () =>
    import(/* webpackChunkName: "p-modal" */ '@parallelogram-js/core/components/PModal')
  )
  .add('[data-toggle]', () =>
    import(/* webpackChunkName: "toggle" */ '@parallelogram-js/core/components/Toggle')
  );
```

### 3. Group Related Components

Keep component registration organized:

```javascript
app.components
  // Web Components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('p-uploader', () => import('@parallelogram-js/core/components/PUploader'))

  // Media Components
  .add('[data-lazysrc]', () => import('@parallelogram-js/core/components/Lazysrc'))
  .add('[data-lightbox]', () => import('@parallelogram-js/core/components/Lightbox'))
  .add('[data-videoplay]', () => import('@parallelogram-js/core/components/Videoplay'))

  // Interaction Components
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'))
  .add('[data-reveal]', () => import('@parallelogram-js/core/components/Scrollreveal'))

  // Application Components
  .add('[data-collection]', () => import('./components/CollectionHelper'))
  .add('[data-student-search]', () => import('./components/StudentSearch'));
```

### 4. Use run() for Async/Defer Scripts

**Always use `app.run()` instead of `app.init()`** - it handles async/defer scripts correctly:

```javascript
// BEST - Works with any script loading strategy
app.run();

// Good - Manual control, but requires you to handle timing
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// BAD - Breaks with async/defer scripts
app.init(); // May run before DOM is ready!
```

**Why `run()` is better:**
- Checks `document.readyState` - runs immediately if DOM is ready
- Waits for `DOMContentLoaded` if DOM is not ready
- Works correctly with `<script async>` and `<script defer>`
- Returns a Promise for async/await usage

```javascript
// Works with async/await
await app.run();
console.log('App is initialized!');
```

## Backward Compatibility

The old API still works! You can continue using managers directly:

```javascript
import { ComponentRegistry, EventManager, PageManager } from '@parallelogram-js/core';

// Old approach still supported
const registry = ComponentRegistry.create('production');
// ... rest of old code
```

This allows gradual migration to the simplified API.
