# Parallelogram-JS

A lightweight, enhancement-first JavaScript framework for progressive web applications.

## Features

- 🎯 Progressive Enhancement - HTML first, JavaScript enhances
- 📊 Data-Driven - `data-[component]-[param]` attribute pattern
- 🎨 BEM CSS - `.block__element--modifier` class pattern
- ♿ Accessible - ARIA attributes, keyboard navigation
- 🔧 Modular - Use only what you need
- 🧩 Web Components - Self-contained custom HTML elements

## Quick Start

### Option 1: Framework with ComponentRegistry (Recommended)

Full framework with lifecycle management, routing, and component registry:

```bash
npm install @parallelogram-js/core
```

```javascript
import { ComponentRegistry, PageManager, EventManager } from '@parallelogram-js/core';

/* Import Web Components - they auto-register */
import '@parallelogram-js/core/components/PModal.js';
import '@parallelogram-js/core/components/PDatetime.js';
import '@parallelogram-js/core/components/PSelect.js';

/* Register regular enhancement components */
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

/* Initialize PageManager */
const eventBus = new EventManager();
const pageManager = new PageManager({
  containerSelector: '[data-view="main"]',
  registry,
  eventBus
});
```

**HTML:**
```html
<!-- Web Components: Use as custom HTML elements -->
<p-modal id="example-modal" data-modal-size="md">
  <h2 slot="title">Modal Title</h2>
  <p>Content goes here</p>
</p-modal>

<p-datetime name="eventDate" mode="date"></p-datetime>

<!-- Regular Components: Use data attributes on standard elements -->
<img data-lazysrc="/path/to/image.jpg" alt="Lazy loaded image">
<button data-modal data-modal-target="#example-modal">Open Modal</button>
<div data-tabs>...</div>
```

### Option 2: Web Components Only (No Framework)

Use just the Web Components without the framework:

```javascript
/* Import only the Web Components you need */
import '@parallelogram-js/core/components/PModal.js';
import '@parallelogram-js/core/components/PDatetime.js';
import '@parallelogram-js/core/components/PSelect.js';

/* That's it! Use them directly in HTML */
```

**HTML:**
```html
<button onclick="document.getElementById('my-modal').open()">
  Open Modal
</button>

<p-modal id="my-modal">
  <h2 slot="title">Simple Modal</h2>
  <p>No framework needed!</p>
</p-modal>

<p-datetime name="date" mode="date"></p-datetime>
<p-select name="country" placeholder="Select country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</p-select>
```

### Option 3: Individual Components

Use specific enhancement components without the full framework:

```javascript
import { Lazysrc } from '@parallelogram-js/core';

/* Mount on specific elements */
const lazyLoader = new Lazysrc();
document.querySelectorAll('[data-lazysrc]').forEach(el => {
  lazyLoader.mount(el);
});

/* Or enhance all matching elements */
Lazysrc.enhanceAll('[data-lazysrc]');
```

## Component Types

Parallelogram-JS has **two types of components**:

### 1. Regular Components (Enhancement)
Progressive enhancement components that enhance existing HTML:
- **Lazysrc**, **Toggle**, **Carousel**, **Tabs**, **Scrollreveal**
- **Modal**, **Toast**, **DataTable**, **Lightbox**, **FormEnhancer**

**Pattern:** Import → Register in ComponentRegistry → Use data attributes

### 2. Web Components (Custom Elements)
Self-contained custom HTML elements that work standalone:
- **PModal**, **PDatetime**, **PSelect**, **PToasts**, **PUploader**

**Pattern:** Import → Use as HTML tags (no registration needed)

**📚 See [Web Components Guide](./docs/08-web-components-guide.md) for detailed differences**

## Available Components

### Web Components
| Component | Tag | Purpose |
|-----------|-----|---------|
| PModal | `<p-modal>` | Modal dialogs with slots |
| PDatetime | `<p-datetime>` | Date/time picker with ranges |
| PSelect | `<p-select>` | Enhanced select dropdown |
| PToasts | `<p-toasts>` | Toast notification container |
| PUploader | `<p-uploader>` | File upload with drag-drop |

### Regular Components
| Component | Selector | Purpose |
|-----------|----------|---------|
| Lazysrc | `[data-lazysrc]` | Lazy load images/media |
| Modal | `[data-modal]` | Modal trigger enhancement |
| Toast | `[data-toast-trigger]` | Toast notifications |
| Tabs | `[data-tabs]` | Tab navigation |
| Toggle | `[data-toggle]` | Toggle visibility |
| Carousel | `[data-carousel]` | Image carousel |
| Scrollreveal | `[data-scrollreveal]` | Scroll animations |
| Scrollhide | `[data-scrollhide]` | Hide on scroll |
| DataTable | `[data-datatable]` | Sortable/filterable tables |
| Lightbox | `[data-lightbox]` | Image lightbox |
| FormEnhancer | `[data-form-validator]` | Form validation |

## Documentation

- **[Framework Overview](./docs/01-framework-overview.md)** - Architecture and concepts
- **[Application Lifecycle](./docs/02-application-lifecycle.md)** - Initialization flow
- **[Component System](./docs/03-component-system.md)** - Regular components
- **[Web Components Guide](./docs/08-web-components-guide.md)** - Custom elements usage
- **[Migration Guide](./docs/09-migration-guide.md)** - Migrate existing projects
- **[Component Registry](./docs/04-component-registry.md)** - Registry configuration
- **[Manager System](./docs/05-manager-system.md)** - PageManager, RouterManager
- **[Coding Standards](./docs/06-coding-standards.md)** - Code conventions
- **[Event System](./docs/07-event-system.md)** - EventManager and event bus
- **[Creating Components](./docs/10-creating-components.md)** - Build custom components

## Development

```bash
npm install
npm run build        # Build framework
npm run build-css    # Build CSS only
npm run demo         # Run demo at localhost:3000
```

## License

MIT
