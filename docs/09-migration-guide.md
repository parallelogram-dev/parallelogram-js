# Migration Guide: Adding Parallelogram-JS Web Components to Existing Projects

This guide will help you integrate Parallelogram-JS Web Components (PModal, PDatetime, PSelect, etc.) into your existing projects.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Migration (Web Components Only)](#quick-migration-web-components-only)
3. [Full Framework Migration](#full-framework-migration)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Common Scenarios](#common-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- Node.js and npm installed
- A bundler (Webpack, Rollup, Vite, Parcel, etc.) configured for ES modules
- Basic understanding of Web Components / Custom Elements

**If you don't have a bundler:**
- You can use `<script type="module">` tags to import directly
- See [No Bundler Setup](#no-bundler-setup) section

---

## Quick Migration (Web Components Only)

If you **only** want to use Web Components (PModal, PDatetime, PSelect) without the full framework:

### Step 1: Install

```bash
npm install @parallelogram-js/core
```

### Step 2: Import Web Components

In your main JavaScript file:

```javascript
/* Import only the Web Components you need */
import '@parallelogram-js/core/dist/components/PModal.js';
import '@parallelogram-js/core/dist/components/PDatetime.js';
import '@parallelogram-js/core/dist/components/PSelect.js';
import '@parallelogram-js/core/dist/components/PToasts.js';
import '@parallelogram-js/core/dist/components/PUploader.js';

/* That's it! They're now registered as custom elements */
console.log('Web components loaded:', {
  PModal: customElements.get('p-modal'),
  PDatetime: customElements.get('p-datetime'),
  PSelect: customElements.get('p-select')
});
```

### Step 3: Use in HTML

```html
<!-- Modal -->
<button onclick="document.getElementById('example').open()">
  Open Modal
</button>

<p-modal id="example" data-modal-size="md">
  <h2 slot="title">Modal Title</h2>
  <p>Modal content</p>
  <div slot="actions">
    <button class="btn" data-modal-close>Close</button>
  </div>
</p-modal>

<!-- Datetime Picker -->
<label>Event Date:</label>
<p-datetime name="eventDate" mode="date"></p-datetime>

<!-- Select Dropdown -->
<label>Country:</label>
<p-select name="country" placeholder="Select country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="uk">United Kingdom</option>
</p-select>

<!-- Toast Container (add once to page) -->
<p-toasts placement="top-right"></p-toasts>

<!-- File Uploader -->
<p-uploader
  name="files"
  accept="image/*,.pdf"
  max-files="5"
  upload-url="/api/upload">
</p-uploader>
```

### Step 4: (Optional) Add CSS

```javascript
/* Import base styles if needed */
import '@parallelogram-js/core/dist/styles/index.css';
```

**Done!** Web Components work immediately without any framework initialization.

---

## Full Framework Migration

If you want the **complete framework** with ComponentRegistry, PageManager, and routing:

### Step 1: Install

```bash
npm install @parallelogram-js/core
```

### Step 2: Create Initialization File

Create `src/app.js`:

```javascript
import {
  ComponentRegistry,
  PageManager,
  EventManager,
  RouterManager,
  DevLogger
} from '@parallelogram-js/core';

/* Import Web Components (auto-register) */
import '@parallelogram-js/core/dist/components/PModal.js';
import '@parallelogram-js/core/dist/components/PDatetime.js';
import '@parallelogram-js/core/dist/components/PSelect.js';
import '@parallelogram-js/core/dist/components/PToasts.js';

/* Import CSS */
import '@parallelogram-js/core/dist/styles/index.css';

async function initApp() {
  /* Initialize logger */
  const logger = new DevLogger('App', true);

  /* Build component registry for regular components */
  const registry = ComponentRegistry.create()
    .component('lazysrc', '[data-lazysrc]', {
      loader: () => import('@parallelogram-js/core/dist/components/Lazysrc.js')
    })
    .component('modal', '[data-modal][data-modal-target]', {
      loader: () => import('@parallelogram-js/core/dist/components/Modal.js')
    })
    .component('tabs', '[data-tabs]', {
      loader: () => import('@parallelogram-js/core/dist/components/Tabs.js')
    })
    .component('carousel', '[data-carousel]', {
      dependsOn: ['lazysrc'],
      loader: () => import('@parallelogram-js/core/dist/components/Carousel.js')
    })
    .build();

  /* Initialize event bus */
  const eventBus = new EventManager();

  /* Initialize router (optional) */
  const router = new RouterManager({
    eventBus,
    logger,
    options: {
      timeout: 10000
    }
  });

  /* Initialize page manager */
  const pageManager = new PageManager({
    containerSelector: '[data-view="main"]',
    registry,
    eventBus,
    logger,
    router,
    options: {
      enableComponentPooling: true,
      trackPerformance: true
    }
  });

  /* Make available globally if needed */
  window.app = {
    pageManager,
    eventBus,
    router,
    logger,
    registry
  };

  logger.info('Application initialized successfully');
}

/* Initialize when DOM is ready */
document.addEventListener('DOMContentLoaded', initApp);
```

### Step 3: Update HTML Structure

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
  </head>
  <body>
    <!-- Main container for PageManager -->
    <main data-view="main">
      <!-- Your content here -->

      <!-- Web Components work anywhere -->
      <p-modal id="settings" data-modal-size="lg">
        <h2 slot="title">Settings</h2>
        <div>
          <p-select name="theme" placeholder="Select theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </p-select>
        </div>
      </p-modal>

      <!-- Regular components use data attributes -->
      <img data-lazysrc="/image.jpg" alt="Lazy loaded">
      <button data-modal data-modal-target="#settings">Settings</button>
    </main>

    <!-- Toast container -->
    <p-toasts placement="top-right"></p-toasts>

    <!-- Your bundled JavaScript -->
    <script type="module" src="/dist/app.js"></script>
  </body>
</html>
```

**Done!** Full framework with Web Components is now integrated.

---

## Step-by-Step Migration

### Scenario 1: Adding PModal to Existing Project

**Current code (example with Bootstrap Modal):**

```html
<!-- Bootstrap Modal -->
<button data-bs-toggle="modal" data-bs-target="#myModal">
  Open Modal
</button>

<div class="modal fade" id="myModal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Modal title</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p>Modal content</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary">Save</button>
      </div>
    </div>
  </div>
</div>
```

**Migrated to PModal:**

```javascript
/* 1. Import PModal */
import '@parallelogram-js/core/dist/components/PModal.js';
```

```html
<!-- 2. Replace Bootstrap Modal with PModal -->
<button onclick="document.getElementById('myModal').open()">
  Open Modal
</button>

<p-modal id="myModal" data-modal-size="md">
  <h2 slot="title">Modal title</h2>
  <div>
    <p>Modal content</p>
  </div>
  <div slot="actions">
    <button class="btn btn-secondary" data-modal-close>Close</button>
    <button class="btn btn-primary">Save</button>
  </div>
</p-modal>
```

**Benefits:**
- No jQuery dependency
- Smaller bundle size
- Native Web Component
- Better accessibility

---

### Scenario 2: Adding PDatetime to Forms

**Current code (native input):**

```html
<form>
  <label for="eventDate">Event Date:</label>
  <input type="date" id="eventDate" name="eventDate" required>

  <label for="eventTime">Event Time:</label>
  <input type="time" id="eventTime" name="eventTime" required>

  <button type="submit">Submit</button>
</form>
```

**Migrated to PDatetime:**

```javascript
/* 1. Import PDatetime */
import '@parallelogram-js/core/dist/components/PDatetime.js';
```

```html
<!-- 2. Replace with PDatetime (combines date + time) -->
<form>
  <label for="eventDateTime">Event Date & Time:</label>
  <p-datetime
    id="eventDateTime"
    name="eventDate"
    mode="datetime"
    time-format="12"
    show-quick-dates
    quick-dates="today,tomorrow">
  </p-datetime>

  <button type="submit">Submit</button>
</form>
```

**Benefits:**
- Single component for date + time
- Calendar interface with quick presets
- Better mobile UX
- Automatic hidden input creation for form submission

---

### Scenario 3: Adding PSelect to Replace Native Select

**Current code:**

```html
<label for="country">Country:</label>
<select id="country" name="country" required>
  <option value="">-- Select Country --</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="uk">United Kingdom</option>
  <option value="de">Germany</option>
</select>
```

**Migrated to PSelect:**

```javascript
/* 1. Import PSelect */
import '@parallelogram-js/core/dist/components/PSelect.js';
```

```html
<!-- 2. Replace with PSelect (same option structure!) -->
<label for="country">Country:</label>
<p-select
  id="country"
  name="country"
  placeholder="Choose a country"
  theme="inherit"
  required>
  <option value="">-- Select Country --</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="uk">United Kingdom</option>
  <option value="de">Germany</option>
</p-select>
```

**Benefits:**
- Same `<option>` syntax - easy migration!
- Better styling and UX
- Search/filter capability
- Keyboard navigation
- `theme="inherit"` matches your design

---

### Scenario 4: Adding Toast Notifications

**Current code (using alert or custom toast):**

```javascript
/* Current implementation */
function showNotification(message) {
  alert(message);  // Or custom toast system
}

showNotification('Saved successfully!');
```

**Migrated to PToasts:**

```javascript
/* 1. Import PToasts and AlertManager */
import '@parallelogram-js/core/dist/components/PToasts.js';
import { AlertManager } from '@parallelogram-js/core';

/* 2. Initialize AlertManager */
const alerts = new AlertManager();

/* 3. Use toast methods */
alerts.success('Saved successfully!');
alerts.error('Something went wrong');
alerts.info('Processing your request...');
alerts.warn('Are you sure?');
```

```html
<!-- 4. Add toast container to page (once) -->
<p-toasts placement="top-right"></p-toasts>
```

**Benefits:**
- Professional toast UI
- Multiple severity types
- Auto-dismiss with configurable duration
- Non-blocking notifications

---

## Common Scenarios

### Scenario: Using with React

```javascript
/* React component */
import { useEffect, useRef } from 'react';
import '@parallelogram-js/core/dist/components/PModal.js';

function MyComponent() {
  const modalRef = useRef(null);

  const openModal = () => {
    modalRef.current?.open();
  };

  return (
    <>
      <button onClick={openModal}>Open Modal</button>

      <p-modal ref={modalRef} data-modal-size="md">
        <h2 slot="title">React Modal</h2>
        <p>Web Components work great with React!</p>
      </p-modal>
    </>
  );
}
```

### Scenario: Using with Vue

```vue
<template>
  <div>
    <button @click="openModal">Open Modal</button>

    <p-modal ref="modal" data-modal-size="md">
      <h2 slot="title">Vue Modal</h2>
      <p>Web Components work great with Vue!</p>
    </p-modal>
  </div>
</template>

<script>
import '@parallelogram-js/core/dist/components/PModal.js';

export default {
  methods: {
    openModal() {
      this.$refs.modal.open();
    }
  }
}
</script>
```

### Scenario: Using with Svelte

```svelte
<script>
  import '@parallelogram-js/core/dist/components/PModal.js';

  let modalElement;

  function openModal() {
    modalElement?.open();
  }
</script>

<button on:click={openModal}>Open Modal</button>

<p-modal bind:this={modalElement} data-modal-size="md">
  <h2 slot="title">Svelte Modal</h2>
  <p>Web Components work great with Svelte!</p>
</p-modal>
```

### Scenario: No Bundler Setup

If you don't use a bundler (Webpack, Vite, etc.):

```html
<!doctype html>
<html>
  <head>
    <title>No Bundler Example</title>
  </head>
  <body>
    <button onclick="document.getElementById('modal1').open()">
      Open Modal
    </button>

    <p-modal id="modal1">
      <h2 slot="title">Modal</h2>
      <p>Works without bundlers!</p>
    </p-modal>

    <!-- Import as ES modules -->
    <script type="module">
      import './node_modules/@parallelogram-js/core/dist/components/PModal.js';
      import './node_modules/@parallelogram-js/core/dist/components/PDatetime.js';
      import './node_modules/@parallelogram-js/core/dist/components/PSelect.js';

      console.log('Web components loaded!');
    </script>
  </body>
</html>
```

Or use a CDN (if available):

```html
<script type="module">
  import 'https://cdn.example.com/@parallelogram-js/core/dist/components/PModal.js';
  import 'https://cdn.example.com/@parallelogram-js/core/dist/components/PDatetime.js';
</script>
```

---

## Troubleshooting

### Issue: "customElements is not defined"

**Cause:** Browser doesn't support Web Components (very old browser)

**Solution:** Add polyfills for older browsers

```bash
npm install @webcomponents/webcomponentsjs
```

```html
<script src="/node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>
```

---

### Issue: Web Component not rendering

**Checklist:**

1. **Did you import the component?**
   ```javascript
   import '@parallelogram-js/core/dist/components/PModal.js';
   ```

2. **Is it registered?**
   ```javascript
   console.log(customElements.get('p-modal')); // Should not be undefined
   ```

3. **Check browser console for errors**

4. **Verify HTML syntax:**
   ```html
   <!-- ✅ Correct -->
   <p-modal id="test">...</p-modal>

   <!-- ❌ Wrong -->
   <pmodal id="test">...</pmodal>
   <p-modal id="test" />  <!-- Must have closing tag -->
   ```

---

### Issue: Components not found in import

**Cause:** Incorrect import path

**Solutions:**

```javascript
/* If using npm package */
import '@parallelogram-js/core/dist/components/PModal.js';

/* If using relative paths */
import './node_modules/@parallelogram-js/core/dist/components/PModal.js';

/* Check your package.json "exports" field */
```

---

### Issue: Trying to register Web Components in ComponentRegistry

**Wrong:**

```javascript
/* ❌ DON'T DO THIS */
const registry = ComponentRegistry.create()
  .component('p-modal', 'p-modal', {  // Wrong!
    loader: () => import('./PModal.js')
  });
```

**Correct:**

```javascript
/* ✅ Just import - they auto-register */
import './components/PModal.js';

/* Only register regular enhancement components */
const registry = ComponentRegistry.create()
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('./Modal.js')  // Enhancement wrapper
  });
```

---

### Issue: Modal/Datetime methods not available immediately

**Cause:** Custom element not defined yet

**Solution:** Wait for definition

```javascript
/* ❌ Too early - might fail */
const modal = document.querySelector('p-modal');
modal.open();

/* ✅ Wait for definition */
await customElements.whenDefined('p-modal');
const modal = document.querySelector('p-modal');
modal.open();

/* ✅ Or handle in DOMContentLoaded */
document.addEventListener('DOMContentLoaded', async () => {
  await customElements.whenDefined('p-modal');
  const modal = document.querySelector('p-modal');
  modal.open();
});
```

---

### Issue: Form submission doesn't include Web Component values

**Cause:** Web Components create hidden inputs asynchronously

**Solution:** Ensure components are connected before submission

```javascript
/* Wait for components to initialize */
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  /* Ensure all web components are ready */
  await Promise.all([
    customElements.whenDefined('p-datetime'),
    customElements.whenDefined('p-select')
  ]);

  /* Now submit */
  const formData = new FormData(e.target);
  console.log(Object.fromEntries(formData));
});
```

---

### Issue: Styles not applying / Component looks unstyled

**Solutions:**

1. **Import base CSS:**
   ```javascript
   import '@parallelogram-js/core/dist/styles/index.css';
   ```

2. **Override with CSS custom properties:**
   ```css
   p-modal {
     --modal-panel-bg: #ffffff;
     --modal-accent: #3b82f6;
   }

   p-datetime {
     --datetime-accent: #10b981;
   }
   ```

3. **Use theme inheritance:**
   ```html
   <p-select theme="inherit" name="test">
     <!-- Will inherit parent styles -->
   </p-select>
   ```

---

## Migration Checklist

- [ ] Install `@parallelogram-js/core` package
- [ ] Import Web Components you need
- [ ] Verify components are registered (`customElements.get()`)
- [ ] Update HTML to use custom element tags
- [ ] Add `<p-toasts>` container if using notifications
- [ ] Test form submission with Web Components
- [ ] Add CSS custom properties for styling
- [ ] Set up event listeners if needed
- [ ] Test in target browsers
- [ ] Remove old dependencies (if replacing existing solutions)

---

## Next Steps

After successful migration:

1. **Read the [Web Components Guide](./08-web-components-guide.md)** for complete API reference
2. **Explore [Component System](./03-component-system.md)** if using regular components
3. **Review [Coding Standards](./06-coding-standards.md)** for best practices
4. **Check out the demo** at `npm run demo` for examples

---

## Need Help?

- **Documentation:** [docs/](./README.md)
- **Examples:** Check `demo/` folder in the repository
- **Issues:** https://github.com/parallelogram-dev/@parallelogram-js/core/issues

Good luck with your migration! 🚀