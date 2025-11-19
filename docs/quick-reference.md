# Quick Reference

## Minimal Setup

```javascript
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create();

app.components
  .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
  .add('[data-toggle]', () => import('@parallelogram-js/core/components/Toggle'));

app.run(); // Smart init - works with async/defer scripts
```

## Component Types

```javascript
// Web component (tag name)
.add('p-modal', () => import('./PModal'))

// Enhancement component (selector)
.add('[data-toggle]', () => import('./Toggle'))
.add('.lightbox', () => import('./Lightbox'))
.add('#main-nav', () => import('./MainNav'))
```

## Configuration Options

```javascript
Parallelogram.create({
  mode: 'production' | 'development',
  debug: true | false,

  router: {
    timeout: 10000,
    loadingClass: 'router-loading',
    errorClass: 'router-error'
  },

  pageManager: {
    containerSelector: '[data-view="main"]',
    mountDelay: 1200,
    scrollRestoration: true,
    scrollPosition: 'top' | 'preserve' | 'element',

    targetGroups: {
      'main': ['navbar', 'main', 'breadcrumb']
    },

    targetGroupTransitions: {
      'main': {
        out: 'reveal--down',
        in: 'reveal--up'
      }
    }
  }
});
```

## Defaults

When no config is provided:

- `mode: 'production'`
- `debug: false`
- Router: Disabled
- PageManager container: `'body'`
- Web components: MutationObserver enabled
- Enhancement components: Auto-scanned on init

## API Reference

### Parallelogram Class

```javascript
// Create instance
const app = Parallelogram.create(config);

// Smart initialization (recommended - handles async/defer scripts)
app.run();

// Manual initialization (use if you control timing)
app.init();

// Destroy and cleanup
app.destroy();

// Check initialization
app.isInitialized; // boolean

// Access managers (after init)
app.eventBus;
app.router;
app.pageManager;
app.logger;
app.componentRegistry;
app.webComponentLoader;
```

### Component Registration

```javascript
// Add component (chainable)
app.components.add(nameOrSelector, loader, options);

// Examples
app.components
  .add('p-modal', () => import('./PModal'))
  .add('[data-toggle]', () => import('./Toggle'))
  .add('[data-analytics]', {
    loader: () => import('./Analytics'),
    priority: 'low'
  });
```

## Common Patterns

### With Router

```javascript
const app = Parallelogram.create({
  router: { timeout: 10000 }
});
```

### Development Mode

```javascript
const app = Parallelogram.create({
  mode: 'development',
  debug: true
});
```

### Custom Container

```javascript
const app = Parallelogram.create({
  pageManager: {
    containerSelector: '[data-view="main"]'
  }
});
```

### Event Bus Usage

```javascript
app.init();

app.eventBus.on('custom-event', (data) => {
  console.log(data);
});

app.eventBus.emit('custom-event', { foo: 'bar' });
```

## Webpack Integration

```javascript
// Use magic comments for chunk names
app.components
  .add('p-modal', () =>
    import(/* webpackChunkName: "p-modal" */ './PModal')
  )
  .add('[data-toggle]', () =>
    import(/* webpackChunkName: "toggle" */ './Toggle')
  );
```

## Migration from Old API

### Old
```javascript
import { ComponentRegistry, EventManager, PageManager } from '@parallelogram-js/core';

const registry = ComponentRegistry.create('production');
const componentRegistry = registry
  .component('toggle', '[data-toggle]', { loader: () => import('./Toggle') })
  .build();

const eventBus = new EventManager();
const pageManager = new PageManager({
  containerSelector: 'body',
  registry: componentRegistry,
  eventBus
});
```

### New
```javascript
import { Parallelogram } from '@parallelogram-js/core';

const app = Parallelogram.create();
app.components.add('[data-toggle]', () => import('./Toggle'));
app.init();
```