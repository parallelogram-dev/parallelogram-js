# Web Components Guide

## Overview

Parallelogram-JS includes two distinct types of components that serve different purposes:

1. **Regular Components** - Framework-managed enhancement components
2. **Web Components** - Self-contained custom HTML elements

Understanding the difference is crucial for proper implementation.

---

## Component Types Comparison

### Regular Components (BaseComponent)

Regular components **enhance existing HTML** elements using progressive enhancement patterns.

**Examples:** Modal, Toast, Lazysrc, Toggle, Carousel, DataTable, Lightbox

**Characteristics:**
- Extend `BaseComponent` class
- Must be registered in `ComponentRegistry`
- Enhance elements matching CSS selectors
- Use data attributes: `data-[component]-[param]`
- Managed by PageManager lifecycle
- Can have dependencies on other components

**Usage Pattern:**
```javascript
import { Modal } from '@parallelogram-js/core';
import { ComponentRegistry } from '@parallelogram-js/core';

const registry = ComponentRegistry.create()
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('./components/Modal.js')
  })
  .build();
```

```html
<!-- HTML: Use data attributes on standard elements -->
<button data-modal data-modal-target="#my-modal">Open Modal</button>
```

---

### Web Components (HTMLElement)

Web Components are **custom HTML elements** that work standalone without framework initialization.

**Examples:** PModal, PDatetime, PSelect, PToasts, PUploader

**Characteristics:**
- Extend native `HTMLElement` class
- Self-register using `customElements.define()`
- Used as custom HTML tags: `<p-modal>`, `<p-datetime>`
- Work independently of framework
- Include Shadow DOM for encapsulation
- Auto-register when imported

**Usage Pattern:**
```javascript
// Just import - they register automatically!
import './components/PModal.js';
import './components/PDatetime.js';
import './components/PSelect.js';
```

```html
<!-- HTML: Use custom element tags directly -->
<p-modal id="my-modal" data-modal-size="md">
  <h2 slot="title">Modal Title</h2>
  <p>Content goes here</p>
</p-modal>

<p-datetime name="eventDate" mode="date"></p-datetime>
```

---

## Critical Difference: DO NOT Mix These Patterns!

### Common Mistakes

```javascript
// WRONG: Don't register Web Components in ComponentRegistry
const registry = ComponentRegistry.create()
  .component('p-modal', 'p-modal', {  // NO!
    loader: () => import('./components/PModal.js')
  });

// WRONG: Don't try to enhance Web Components
PModal.enhanceAll('[data-modal]');  // NO!

// WRONG: Don't import both if you only need one
import { Modal } from './Modal.js';  // Regular component
import PModal from './PModal.js';    // Web component
// Pick ONE approach per use case!
```

### Correct Patterns

```javascript
// CORRECT: Import Web Components directly
import './components/PModal.js';
import './components/PDatetime.js';
import './components/PSelect.js';

// CORRECT: Register ONLY regular components
const registry = ComponentRegistry.create()
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('./components/Modal.js')  // Regular Modal
  })
  .component('lazysrc', '[data-lazysrc]', {
    loader: () => import('./components/Lazysrc.js')
  })
  .build();
```

---

## Available Web Components

### PModal - Modal Dialog
Custom modal dialog with slots for title, content, and actions.

```html
<p-modal id="example-modal" data-modal-size="lg" data-modal-closable="true">
  <h2 slot="title">Modal Title</h2>
  <div>
    <p>Modal content goes here.</p>
  </div>
  <div slot="actions">
    <button class="btn btn--secondary" data-modal-close>Cancel</button>
    <button class="btn btn--primary">Save</button>
  </div>
</p-modal>
```

**Attributes:**
- `data-modal-size`: xs | sm | md | lg | xl | fullscreen
- `data-modal-closable`: true | false
- `data-modal-backdrop-close`: true | false
- `data-modal-keyboard`: true | false

**Methods:**
- `modal.open()` - Open the modal
- `modal.close()` - Close the modal
- `modal.toggle()` - Toggle open/closed state

**Events:**
- `modal:open` - Fired when modal opens
- `modal:close` - Fired when modal closes

---

### PDatetime - Date/Time Picker
Comprehensive datetime picker with calendar, time selection, and ranges.

```html
<!-- Simple date picker -->
<p-datetime name="eventDate" mode="date"></p-datetime>

<!-- Date and time with 12-hour format -->
<p-datetime name="appointment" mode="datetime" time-format="12"></p-datetime>

<!-- Date range -->
<p-datetime
  name="startDate"
  range
  range-to="endDate"
  from-label="Check-in"
  to-label="Check-out"
  mode="date">
</p-datetime>

<!-- Time only -->
<p-datetime name="alarmTime" mode="time" time-format="12"></p-datetime>
```

**Attributes:**
- `mode`: date | datetime | time
- `name`: Form field name (creates hidden input)
- `value`: ISO date string (initial value)
- `time-format`: 12 | 24 (default: 24)
- `show-quick-dates`: boolean (shows preset buttons)
- `quick-dates`: yesterday,today,tomorrow (comma-separated)
- `range`: boolean (enables date range mode)
- `range-to`: string (name for end date field)
- `from-label`: string (label for start date)
- `to-label`: string (label for end date)
- `range-to-value`: ISO date string (end date value)
- `format`: Custom output format (e.g., 'yyyy-mm-dd', 'iso-tz', 'us-date')

**Format Presets:**
- `iso`: yyyy-mm-dd
- `iso-tz`: yyyy-mm-ddThh:ii:sstzz
- `iso-datetime`: yyyy-mm-dd hh:ii:ss
- `us-date`: mm/dd/yyyy
- `eu-date`: dd/mm/yyyy
- `mysql`: yyyy-mm-dd hh:ii:ss

**Methods:**
- `picker.open()` - Open the picker
- `picker.close()` - Close the picker
- `picker.toggle()` - Toggle open/closed state

**Events:**
- `change` - Fired when date/time changes (detail contains `{ value }` or `{ value, toValue }` for ranges)

---

### PSelect - Enhanced Select
Custom select component with search and accessibility.

```html
<p-select name="country" placeholder="Choose a country">
  <option value="">-- Select Country --</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="uk">United Kingdom</option>
</p-select>

<!-- With optgroups -->
<p-select name="category" placeholder="Choose category">
  <optgroup label="Technology">
    <option value="web-dev">Web Development</option>
    <option value="mobile-dev">Mobile Development</option>
  </optgroup>
  <optgroup label="Design">
    <option value="ui-design">UI Design</option>
    <option value="ux-design">UX Design</option>
  </optgroup>
</p-select>
```

**Attributes:**
- `name`: Form field name
- `placeholder`: Placeholder text
- `required`: Boolean attribute
- `disabled`: Boolean attribute
- `value`: Selected value
- `theme`: inherit (inherits parent styles)

**Methods:**
- `select.open()` - Open the dropdown
- `select.close()` - Close the dropdown

**Events:**
- `change` - Fired when selection changes

---

### PToasts - Toast Notifications
Toast notification container.

```html
<!-- Add to page (typically in body) -->
<p-toasts placement="top-right"></p-toasts>
```

**Attributes:**
- `placement`: top-left | top-right | bottom-left | bottom-right | top-center | bottom-center

**Methods:**
- `toasts.show(message, type, duration)` - Show a toast
  - `message`: string - Toast message
  - `type`: success | info | warn | error
  - `duration`: number - Duration in ms (default: 3000)

**Usage with AlertManager:**
```javascript
import { AlertManager } from '@parallelogram-js/core';

const alerts = new AlertManager();
alerts.success('Operation completed!');
alerts.error('Something went wrong');
```

---

### PUploader - File Uploader
Drag-and-drop file uploader with preview and progress.

```html
<p-uploader
  name="files"
  accept="image/*,.pdf"
  max-files="5"
  max-size="10485760"
  upload-url="/api/upload"
  multiple>
</p-uploader>
```

**Attributes:**
- `name`: Form field name
- `accept`: Accepted file types (MIME types or extensions)
- `max-files`: Maximum number of files
- `max-size`: Maximum file size in bytes
- `upload-url`: Server endpoint for uploads
- `multiple`: Allow multiple files

**Events:**
- `files:added` - Fired when files are added
- `files:removed` - Fired when file is removed
- `upload:progress` - Fired during upload progress
- `upload:complete` - Fired when upload completes
- `upload:error` - Fired on upload error

---

## How to Import Web Components

### Option 1: Direct Import (Recommended for Bundlers)

```javascript
// Import the web component files - they auto-register
import './node_modules/@parallelogram-js/core/dist/components/PModal.js';
import './node_modules/@parallelogram-js/core/dist/components/PDatetime.js';
import './node_modules/@parallelogram-js/core/dist/components/PSelect.js';
import './node_modules/@parallelogram-js/core/dist/components/PToasts.js';
import './node_modules/@parallelogram-js/core/dist/components/PUploader.js';

// That's it! They're now available as HTML elements
```

### Option 2: Named Import (If Exported from Package)

```javascript
// Check your package's main export
import { PModal, PDatetime, PSelect } from '@parallelogram-js/core/webcomponents';

// Or import individually
import PModal from '@parallelogram-js/core/dist/components/PModal.js';
import PDatetime from '@parallelogram-js/core/dist/components/PDatetime.js';
```

### Option 3: Script Tag (No Bundler)

```html
<!-- Load from CDN or local files -->
<script type="module" src="/path/to/PModal.js"></script>
<script type="module" src="/path/to/PDatetime.js"></script>
<script type="module" src="/path/to/PSelect.js"></script>
```

---

## Verification & Debugging

### Check if Web Components are Registered

```javascript
// After importing, verify registration
console.log('PModal registered:', customElements.get('p-modal'));
console.log('PDatetime registered:', customElements.get('p-datetime'));
console.log('PSelect registered:', customElements.get('p-select'));

// Wait for all to be defined
Promise.all([
  customElements.whenDefined('p-modal'),
  customElements.whenDefined('p-datetime'),
  customElements.whenDefined('p-select'),
]).then(() => {
  console.log('All web components are ready!');

  // Count instances in DOM
  console.log('Modals in DOM:', document.querySelectorAll('p-modal').length);
  console.log('Datetime pickers:', document.querySelectorAll('p-datetime').length);
  console.log('Selects:', document.querySelectorAll('p-select').length);
});
```

### Common Issues

#### Issue: "Element not found" or components not rendering

**Cause:** Web components not imported
```javascript
// Forgot to import
// <p-modal id="test">...</p-modal>  // Won't work!

// Import first
import './components/PModal.js';
// <p-modal id="test">...</p-modal>  // Now it works!
```

#### Issue: "customElements.define failed"

**Cause:** Trying to register the same component twice
```javascript
// Check if already registered before importing again
if (!customElements.get('p-modal')) {
  import('./components/PModal.js');
}
```

#### Issue: Modal/Datetime methods not available

**Cause:** Trying to use before custom element is defined
```javascript
// Too early
const modal = document.querySelector('p-modal');
modal.open();  // Might fail if not defined yet

// Wait for definition
await customElements.whenDefined('p-modal');
const modal = document.querySelector('p-modal');
modal.open();  // Safe!
```

---

## Integration with Modal Regular Component

The `Modal.js` regular component is a **wrapper/enhancement** that works WITH the `PModal` web component.

### How They Work Together

```javascript
// 1. Import the PModal web component (registers <p-modal>)
import './components/PModal.js';

// 2. Register the Modal enhancement component
const registry = ComponentRegistry.create()
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => import('./components/Modal.js')
  })
  .build();
```

```html
<!-- 3. Use data-modal trigger (enhanced by Modal component) -->
<button data-modal data-modal-target="#my-modal">Open Modal</button>

<!-- 4. Reference the PModal web component -->
<p-modal id="my-modal" data-modal-size="md">
  <h2 slot="title">Title</h2>
  <p>Content</p>
</p-modal>
```

**What happens:**
1. `PModal.js` registers the `<p-modal>` custom element
2. `Modal.js` enhances `[data-modal]` trigger buttons
3. Clicking the button tells the PModal instance to open
4. Modal component manages ARIA attributes, focus, etc.

**You can also use PModal directly without Modal.js:**

```html
<button onclick="document.getElementById('my-modal').open()">
  Open Modal
</button>

<p-modal id="my-modal">
  <h2 slot="title">Direct Usage</h2>
  <p>No framework needed!</p>
</p-modal>
```

---

## Styling Web Components

Web Components use **Shadow DOM**, so they have encapsulated styles.

### Using CSS Custom Properties

```css
/* Override component styles using CSS custom properties */
p-modal {
  --modal-panel-bg: #ffffff;
  --modal-text: #1f2937;
  --modal-accent: #3b82f6;
  --modal-radius-lg: 12px;
}

p-datetime {
  --datetime-accent: #10b981;
  --datetime-border: rgba(0, 0, 0, 0.2);
  --datetime-radius-lg: 8px;
}

p-select {
  --select-border: #d1d5db;
  --select-focus: #3b82f6;
  --select-bg: #ffffff;
}
```

### Theme Inheritance

Some components support `theme="inherit"` to inherit parent styles:

```html
<div style="color: #10b981; font-size: 16px;">
  <p-select theme="inherit" name="test">
    <!-- Will inherit color and font-size from parent -->
    <option>Option 1</option>
  </p-select>
</div>
```

---

## Form Integration

All form-related Web Components (`<p-datetime>`, `<p-select>`, `<p-uploader>`) automatically create hidden inputs for form submission.

```html
<form action="/submit" method="POST">
  <!-- Creates hidden input with name="eventDate" -->
  <p-datetime name="eventDate" mode="date"></p-datetime>

  <!-- Creates hidden input with name="priority" -->
  <p-select name="priority">
    <option value="high">High</option>
    <option value="low">Low</option>
  </p-select>

  <!-- Creates hidden inputs for files -->
  <p-uploader name="documents" multiple></p-uploader>

  <button type="submit">Submit</button>
</form>
```

The hidden inputs are automatically updated when values change, ensuring seamless form submission.

---

## Summary: Quick Decision Guide

**Use Regular Components when:**
- Enhancing existing HTML elements progressively
- Need framework lifecycle management
- Building complex interactions with dependencies
- Want PageManager to handle mounting/unmounting

**Use Web Components when:**
- Need self-contained, reusable UI elements
- Want components that work without framework
- Building form controls (select, datetime, file upload)
- Need Shadow DOM encapsulation

**Import Pattern:**
```javascript
// Web Components: Just import, they auto-register
import './components/PModal.js';
import './components/PDatetime.js';

// Regular Components: Import + register in ComponentRegistry
import Modal from './components/Modal.js';

const registry = ComponentRegistry.create()
  .component('modal', '[data-modal][data-modal-target]', {
    loader: () => Promise.resolve({ default: Modal })
  })
  .build();
```

---

## See Also

- [Component System](./03-component-system.md) - Regular components documentation
- [Creating Components](./10-creating-components.md) - How to create your own components
- [Migration Guide](./09-migration-guide.md) - Migrating existing projects