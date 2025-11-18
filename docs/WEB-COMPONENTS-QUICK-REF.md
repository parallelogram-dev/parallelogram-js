# Web Components Quick Reference

One-page reference for Parallelogram-JS Web Components.

---

## Import Pattern

```javascript
/* Web Components: Import once, use everywhere */
import '@parallelogram-js/core/dist/components/PModal.js';
import '@parallelogram-js/core/dist/components/PDatetime.js';
import '@parallelogram-js/core/dist/components/PSelect.js';
import '@parallelogram-js/core/dist/components/PToasts.js';
import '@parallelogram-js/core/dist/components/PUploader.js';

/* NO registration needed - they auto-register! */
```

---

## PModal

### Basic Usage

```html
<button onclick="document.getElementById('modal1').open()">Open</button>

<p-modal id="modal1" data-modal-size="md">
  <h2 slot="title">Title</h2>
  <div>Content</div>
  <div slot="actions">
    <button data-modal-close>Close</button>
  </div>
</p-modal>
```

### Attributes

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-modal-size` | xs, sm, md, lg, xl, fullscreen | md |
| `data-modal-closable` | true, false | true |
| `data-modal-backdrop-close` | true, false | true |
| `data-modal-keyboard` | true, false | true |

### Methods

```javascript
const modal = document.getElementById('modal1');
modal.open();     // Open modal
modal.close();    // Close modal
modal.toggle();   // Toggle open/close
```

### Events

```javascript
modal.addEventListener('modal:open', (e) => {
  console.log('Modal opened:', e.detail.modal);
});

modal.addEventListener('modal:close', (e) => {
  console.log('Modal closed:', e.detail.modal);
});
```

---

## PDatetime

### Basic Usage

```html
<!-- Date only -->
<p-datetime name="date" mode="date"></p-datetime>

<!-- Date + Time -->
<p-datetime name="datetime" mode="datetime" time-format="12"></p-datetime>

<!-- Time only -->
<p-datetime name="time" mode="time" time-format="12"></p-datetime>

<!-- Date range -->
<p-datetime
  name="startDate"
  range
  range-to="endDate"
  from-label="Check-in"
  to-label="Check-out"
  mode="date">
</p-datetime>
```

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `mode` | date, datetime, time | date | Picker type |
| `name` | string | - | Form field name |
| `value` | ISO string | - | Initial value |
| `time-format` | 12, 24 | 24 | Time format |
| `show-quick-dates` | boolean | false | Show preset buttons |
| `quick-dates` | string | yesterday,today,tomorrow | Comma-separated presets |
| `range` | boolean | false | Enable range mode |
| `range-to` | string | - | End date field name |
| `from-label` | string | From | Start label |
| `to-label` | string | To | End label |
| `format` | string | - | Custom output format |

### Format Presets

| Preset | Output Example |
|--------|----------------|
| `iso` | 2025-10-20 |
| `iso-tz` | 2025-10-20T14:30:00-0700 |
| `iso-datetime` | 2025-10-20 14:30:00 |
| `us-date` | 10/20/2025 |
| `eu-date` | 20/10/2025 |
| `mysql` | 2025-10-20 14:30:00 |

### Custom Format Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `yyyy` | 4-digit year | 2025 |
| `mm` | 2-digit month | 10 |
| `dd` | 2-digit day | 20 |
| `hh` | 2-digit hour | 14 |
| `ii` | 2-digit minute | 30 |
| `ss` | 2-digit second | 00 |
| `tz` | Timezone offset | -07:00 |
| `tzz` | Timezone offset (no colon) | -0700 |

**Example:**
```html
<p-datetime name="date" format="yyyy-mm-dd hh:ii:ss tz"></p-datetime>
<!-- Output: 2025-10-20 14:30:00 -07:00 -->
```

### Methods

```javascript
const picker = document.querySelector('p-datetime');
picker.open();     // Open picker
picker.close();    // Close picker
picker.toggle();   // Toggle open/close
```

### Events

```javascript
picker.addEventListener('change', (e) => {
  console.log('Date changed:', e.detail.value);
  /* Range mode: e.detail = { value, toValue, from, to } */
});
```

---

## PSelect

### Basic Usage

```html
<p-select name="country" placeholder="Select country" theme="inherit">
  <option value="">-- Select --</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</p-select>

<!-- With optgroups -->
<p-select name="category">
  <optgroup label="Technology">
    <option value="web">Web Dev</option>
    <option value="mobile">Mobile</option>
  </optgroup>
  <optgroup label="Design">
    <option value="ui">UI Design</option>
  </optgroup>
</p-select>
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Form field name |
| `placeholder` | string | Placeholder text |
| `required` | boolean | Required field |
| `disabled` | boolean | Disabled state |
| `value` | string | Selected value |
| `theme` | inherit | Inherit parent styles |

### Methods

```javascript
const select = document.querySelector('p-select');
select.open();     // Open dropdown
select.close();    // Close dropdown
```

### Events

```javascript
select.addEventListener('change', (e) => {
  console.log('Selection changed:', e.detail.value);
});
```

---

## PToasts

### Basic Usage

```html
<!-- Add once to page -->
<p-toasts placement="top-right"></p-toasts>
```

### Attributes

| Attribute | Values |
|-----------|--------|
| `placement` | top-left, top-right, top-center, bottom-left, bottom-right, bottom-center |

### Using with AlertManager

```javascript
import { AlertManager } from '@parallelogram-js/core';

const alerts = new AlertManager();
alerts.success('Success message!');
alerts.error('Error message');
alerts.info('Info message');
alerts.warn('Warning message');
```

### Direct Usage

```javascript
const toasts = document.querySelector('p-toasts');
toasts.show('Message', 'success', 3000);  // message, type, duration
```

---

## PUploader

### Basic Usage

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

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Form field name |
| `accept` | string | Accepted file types |
| `max-files` | number | Max number of files |
| `max-size` | number | Max size in bytes |
| `upload-url` | string | Upload endpoint |
| `multiple` | boolean | Allow multiple files |

### Events

```javascript
const uploader = document.querySelector('p-uploader');

uploader.addEventListener('files:added', (e) => {
  console.log('Files added:', e.detail.files);
});

uploader.addEventListener('files:removed', (e) => {
  console.log('File removed:', e.detail.file);
});

uploader.addEventListener('upload:progress', (e) => {
  console.log('Progress:', e.detail.progress);
});

uploader.addEventListener('upload:complete', (e) => {
  console.log('Upload complete:', e.detail.response);
});

uploader.addEventListener('upload:error', (e) => {
  console.error('Upload error:', e.detail.error);
});
```

---

## Styling Web Components

### CSS Custom Properties

```css
/* PModal */
p-modal {
  --modal-panel-bg: #ffffff;
  --modal-text: #1f2937;
  --modal-accent: #3b82f6;
  --modal-radius-lg: 12px;
  --modal-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

/* PDatetime */
p-datetime {
  --datetime-accent: #10b981;
  --datetime-border: rgba(0, 0, 0, 0.2);
  --datetime-radius-lg: 8px;
  --datetime-bg: #ffffff;
}

/* PSelect */
p-select {
  --select-border: #d1d5db;
  --select-focus: #3b82f6;
  --select-bg: #ffffff;
  --select-radius: 8px;
}
```

---

## Form Integration

All form Web Components create hidden inputs automatically:

```html
<form action="/submit" method="POST">
  <!-- Creates hidden input name="date" -->
  <p-datetime name="date" mode="date"></p-datetime>

  <!-- Creates hidden input name="country" -->
  <p-select name="country">
    <option value="us">United States</option>
  </p-select>

  <!-- Creates hidden inputs for files -->
  <p-uploader name="files" multiple></p-uploader>

  <button type="submit">Submit</button>
</form>
```

---

## Framework Integration

### React

```jsx
import { useRef } from 'react';
import '@parallelogram-js/core/dist/components/PModal.js';

function MyComponent() {
  const modalRef = useRef(null);

  return (
    <>
      <button onClick={() => modalRef.current?.open()}>Open</button>
      <p-modal ref={modalRef}>
        <h2 slot="title">Modal</h2>
      </p-modal>
    </>
  );
}
```

### Vue

```vue
<template>
  <button @click="$refs.modal.open()">Open</button>
  <p-modal ref="modal">
    <h2 slot="title">Modal</h2>
  </p-modal>
</template>

<script>
import '@parallelogram-js/core/dist/components/PModal.js';
export default {};
</script>
```

### Svelte

```svelte
<script>
  import '@parallelogram-js/core/dist/components/PModal.js';
  let modal;
</script>

<button on:click={() => modal?.open()}>Open</button>
<p-modal bind:this={modal}>
  <h2 slot="title">Modal</h2>
</p-modal>
```

---

## Verification

```javascript
/* Check if components are registered */
console.log('Registered:', {
  PModal: customElements.get('p-modal'),
  PDatetime: customElements.get('p-datetime'),
  PSelect: customElements.get('p-select'),
  PToasts: customElements.get('p-toasts'),
  PUploader: customElements.get('p-uploader')
});

/* Wait for components to be ready */
await Promise.all([
  customElements.whenDefined('p-modal'),
  customElements.whenDefined('p-datetime'),
  customElements.whenDefined('p-select')
]);

console.log('All components ready!');
```

---

## Common Patterns

### Open Modal from JavaScript

```javascript
document.getElementById('myModal').open();
```

### Set Datetime Value

```javascript
const picker = document.querySelector('p-datetime');
picker.value = '2025-10-20T14:30:00.000Z';
```

### Get Select Value

```javascript
const select = document.querySelector('p-select');
console.log(select.value);  // Selected value
```

### Show Toast Notification

```javascript
import { AlertManager } from '@parallelogram-js/core';
const alerts = new AlertManager();
alerts.success('Operation completed!');
```

### Handle Upload Progress

```javascript
const uploader = document.querySelector('p-uploader');
uploader.addEventListener('upload:progress', (e) => {
  console.log(`Upload ${e.detail.progress}% complete`);
});
```

---

## Don't Forget!

✅ **Import** Web Components before using
✅ **Add** `<p-toasts>` container if using notifications
✅ **Wait** for `customElements.whenDefined()` if accessing methods immediately
✅ **Use** CSS custom properties for styling
❌ **Don't** register Web Components in ComponentRegistry
❌ **Don't** use data attributes on Web Components (they're already custom elements)

---

## See Full Documentation

- [Web Components Guide](./08-web-components-guide.md) - Complete API reference
- [Migration Guide](./09-migration-guide.md) - Step-by-step migration
- [Component System](./03-component-system.md) - Regular components