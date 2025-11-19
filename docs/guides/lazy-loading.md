# Web Component Lazy Loading

This guide explains how to lazy-load Parallelogram web components to prevent webpack tree-shaking and enable code splitting.

## The Problem

Web components use `customElements.define()` which has side effects when imported. If you import a web component but don't directly use its class, bundlers like webpack may tree-shake it away, preventing the component from registering.

## The Solution

### 1. Package Configuration

The package is configured with proper `sideEffects` to prevent tree-shaking:

```json
{
  "sideEffects": [
    "./dist/components/*.js",
    "*.css"
  ]
}
```

This tells webpack that all component files have side effects and should not be tree-shaken.

### 2. Using WebComponentLoader

The `WebComponentLoader` utility provides automatic lazy-loading of web components based on DOM presence.

#### Basic Usage

```javascript
import { WebComponentLoader } from '@parallelogram-js/core/core/WebComponentLoader';

// Define which components you want to lazy-load
const loader = new WebComponentLoader({
  'p-modal': () => import('@parallelogram-js/core/components/PModal'),
  'p-select': () => import('@parallelogram-js/core/components/PSelect'),
  'p-datetime': () => import('@parallelogram-js/core/components/PDatetime'),
});

// Initialize - scans DOM and loads components found
loader.init();
```

#### Webpack Code Splitting

The dynamic `import()` statements work with webpack's code-splitting:

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

Each component import will create a separate chunk that's loaded on demand.

#### Advanced Options

```javascript
const loader = new WebComponentLoader(
  {
    'p-modal': () => import('@parallelogram-js/core/components/PModal'),
    'p-toasts': () => import('@parallelogram-js/core/components/PToasts'),
  },
  {
    // Auto-scan DOM on init (default: true)
    eager: true,

    // Watch for dynamically added components
    observeDOM: true,

    // Custom root element to observe
    rootElement: document.body,

    // Callback when component loads
    onLoad: (tagName) => {
      console.log(`Component ${tagName} loaded`);
    },

    // Callback on load error
    onError: (tagName, error) => {
      console.error(`Failed to load ${tagName}:`, error);
    },
  }
);

loader.init();
```

#### Manual Loading

You can disable automatic scanning and load components manually:

```javascript
const loader = new WebComponentLoader(
  {
    'p-modal': () => import('@parallelogram-js/core/components/PModal'),
  },
  {
    eager: false, // Don't auto-scan on init
  }
);

// Load when user interacts
document.querySelector('[data-modal-trigger]').addEventListener('click', () => {
  loader.loadComponent('p-modal').then(() => {
    // Component is now loaded and registered
    const modal = document.querySelector('#my-modal');
    modal.open = true;
  });
});
```

#### Dynamic Registration

Add components to the loader after initialization:

```javascript
const loader = new WebComponentLoader();
loader.init();

// Later, register a new component
loader.register('p-uploader', () =>
  import('@parallelogram-js/core/components/PUploader')
);

// Manually trigger load
loader.loadComponent('p-uploader');
```

#### Check Loading Status

```javascript
if (loader.isLoaded('p-modal')) {
  // Component is ready
}

if (loader.isLoading('p-select')) {
  // Component is currently loading
}
```

## Direct Import (Not Recommended for Production)

If you want to eagerly load all components without code splitting:

```javascript
// This imports and registers immediately (larger initial bundle)
import '@parallelogram-js/core/components/PModal';
import '@parallelogram-js/core/components/PSelect';
```

This approach:

- Works correctly (won't be tree-shaken due to `sideEffects` config)
- Increases initial bundle size
- No code splitting benefits

## Best Practices

### 1. Only Include Components You Use

Don't create a loader with all components if you only use a few:

```javascript
// Bad - includes components you don't use
const loader = new WebComponentLoader({
  'p-modal': () => import('@parallelogram-js/core/components/PModal'),
  'p-select': () => import('@parallelogram-js/core/components/PSelect'),
  'p-datetime': () => import('@parallelogram-js/core/components/PDatetime'),
  'p-toasts': () => import('@parallelogram-js/core/components/PToasts'),
  'p-uploader': () => import('@parallelogram-js/core/components/PUploader'),
});

// Good - only components actually used
const loader = new WebComponentLoader({
  'p-modal': () => import('@parallelogram-js/core/components/PModal'),
  'p-select': () => import('@parallelogram-js/core/components/PSelect'),
});
```

### 2. Use observeDOM for Dynamic Content

If you add components to the DOM dynamically (e.g., from AJAX responses):

```javascript
const loader = new WebComponentLoader(
  {
    'p-modal': () => import('@parallelogram-js/core/components/PModal'),
  },
  {
    observeDOM: true, // Watch for new components
  }
);

loader.init();
```

### 3. Centralize Component Loading

Create a single loader instance for your application:

```javascript
// app/components.js
import { WebComponentLoader } from '@parallelogram-js/core/core/WebComponentLoader';

export const componentLoader = new WebComponentLoader(
  {
    'p-modal': () => import('@parallelogram-js/core/components/PModal'),
    'p-select': () => import('@parallelogram-js/core/components/PSelect'),
    'p-datetime': () => import('@parallelogram-js/core/components/PDatetime'),
  },
  {
    observeDOM: true,
    onLoad: (tagName) => console.log(`[Components] Loaded ${tagName}`),
  }
);

// app/main.js
import { componentLoader } from './components.js';

componentLoader.init();
```

## Package Exports

The package exposes the following exports for web components:

```javascript
// Individual components
import PModal from '@parallelogram-js/core/components/PModal';

// Core utilities
import { WebComponentLoader } from '@parallelogram-js/core/core/WebComponentLoader';

// Full framework
import Parallelogram from '@parallelogram-js/core';
```

## Troubleshooting

### Component Not Loading

If a component isn't loading, check:

1. **Is it in the component map?**

   ```javascript
   console.log(loader.componentMap); // Should include your component
   ```

2. **Is it in the DOM?**

   ```javascript
   document.querySelectorAll('p-modal'); // Should find elements
   ```

3. **Check for errors:**
   ```javascript
   const loader = new WebComponentLoader(componentMap, {
     onError: (tagName, error) => console.error(tagName, error),
   });
   ```

### Webpack Not Code-Splitting

Ensure you're using dynamic imports:

```javascript
// Dynamic import - creates separate chunk
() => import('@parallelogram-js/core/components/PModal');

// Static import - bundled in main chunk
import PModal from '@parallelogram-js/core/components/PModal';
```

### Tree-Shaking Still Happening

Verify the `sideEffects` field in package.json includes component files. If you're using a monorepo or custom build setup, ensure webpack can see the package.json configuration.