# Import Paths Reference

The package name is `@parallelogram-js/core` and all import paths should use this scope.

## Core Framework

```javascript
import {
  ComponentRegistry,
  PageManager,
  EventManager,
  RouterManager,
  DevLogger,
  BaseComponent
} from '@parallelogram-js/core';
```

## Web Components

All Web Components use the `/components/` subpath:

```javascript
import '@parallelogram-js/core/components/PModal.js';
import '@parallelogram-js/core/components/PDatetime.js';
import '@parallelogram-js/core/components/PSelect.js';
import '@parallelogram-js/core/components/PToasts.js';
import '@parallelogram-js/core/components/PUploader.js';
```

## Regular Components

Regular components can be imported from the main package OR from `/components/`:

```javascript
/* From main package */
import { Lazysrc, Modal, Tabs } from '@parallelogram-js/core';

/* Or individually from /components/ */
import '@parallelogram-js/core/components/Lazysrc.js';
import '@parallelogram-js/core/components/Modal.js';
import '@parallelogram-js/core/components/Tabs.js';
```

## Styles

```javascript
import '@parallelogram-js/core/styles';
```

This imports the minified CSS: `dist/styles/index.min.css`

## Package.json Exports Configuration

The package uses the following export configuration:

```json
{
  "name": "@parallelogram-js/core",
  "version": "0.1.0",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs",
      "browser": "./dist/index.umd.js"
    },
    "./components/*": {
      "import": "./dist/components/*.js"
    },
    "./styles": "./dist/styles/index.min.css"
  }
}
```

This allows:
- `@parallelogram-js/core` → Core framework exports
- `@parallelogram-js/core/components/*` → Individual component files
- `@parallelogram-js/core/styles` → Minified CSS

## Dynamic Imports in ComponentRegistry

When using dynamic imports in the ComponentRegistry, use the same paths:

```javascript
const registry = ComponentRegistry.create()
  .component('lazysrc', '[data-lazysrc]', {
    loader: () => import('@parallelogram-js/core/components/Lazysrc.js')
  })
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('@parallelogram-js/core/components/Modal.js')
  })
  .component('tabs', '[data-tabs]', {
    loader: () => import('@parallelogram-js/core/components/Tabs.js')
  })
  .build();
```

## Complete Example

```javascript
/* Core framework */
import {
  ComponentRegistry,
  PageManager,
  EventManager
} from '@parallelogram-js/core';

/* Web Components - auto-register */
import '@parallelogram-js/core/components/PModal.js';
import '@parallelogram-js/core/components/PDatetime.js';
import '@parallelogram-js/core/components/PSelect.js';

/* Styles */
import '@parallelogram-js/core/styles';

/* Initialize framework */
const registry = ComponentRegistry.create()
  .component('lazysrc', '[data-lazysrc]', {
    loader: () => import('@parallelogram-js/core/components/Lazysrc.js')
  })
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('@parallelogram-js/core/components/Modal.js')
  })
  .build();

const eventBus = new EventManager();
const pageManager = new PageManager({
  containerSelector: '[data-view="main"]',
  registry,
  eventBus
});
```

## TypeScript

If using TypeScript, the same import paths apply:

```typescript
import type {
  ComponentRegistry,
  PageManager,
  EventManager
} from '@parallelogram-js/core';

import '@parallelogram-js/core/components/PModal.js';
```

## Common Mistakes

### Wrong

```javascript
/* Don't use these paths */
import PModal from '@parallelogram-js/core/dist/components/PModal.js';
import { Modal } from '@parallelogram-js/core';
import 'parallelogram/components/PModal.js';
import '@parallelogram-js/core/components/PModal.js'; // Old package name
```

### Correct

```javascript
/* Use these paths */
import '@parallelogram-js/core/components/PModal.js';
import { Modal } from '@parallelogram-js/core';
import '@parallelogram-js/core/components/PModal.js';
```

## Verification

To verify the package is correctly installed and paths work:

```javascript
import '@parallelogram-js/core/components/PModal.js';

console.log('PModal registered:', customElements.get('p-modal'));
// Should log the PModal class, not undefined
```