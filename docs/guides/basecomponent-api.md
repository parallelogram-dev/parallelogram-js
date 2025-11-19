# BaseComponent API - State Management Helper Methods

**Status**: ✅ Complete
**Last Updated**: 2025-11-19
**Version**: 1.0.0

---

## Overview

BaseComponent provides a set of helper methods to simplify state management and data attribute manipulation across all components. These methods automatically handle component-specific attribute naming, reducing boilerplate and preventing typos.

## Core Concept

Each component has a unique data attribute prefix derived from its class name:
- `Toggle` → `data-toggle`
- `Lightbox` → `data-lightbox`
- `DataTable` → `data-data-table`
- `PModal` → `data-p-modal`

The helper methods automatically apply this prefix, so you write less code and maintain consistency.

---

## API Methods

### State Management

#### `setState(element, state)`

Set component state using the component's data attribute.

**Parameters:**
- `element` (HTMLElement) - Target element
- `state` (string) - State value

**Example:**
```javascript
// In Toggle component
this.setState(targetElement, ExtendedStates.OPEN);
// Sets: <div data-toggle="open">

// In Lightbox component
this.setState(overlayElement, 'opening');
// Sets: <div data-lightbox="opening">
```

**Before (manual):**
```javascript
element.setAttribute('data-toggle-target', 'open');
```

**After (with API):**
```javascript
this.setState(element, 'open');
```

---

#### `getElementState(element)`

Get current component state from the element's data attribute.

**Parameters:**
- `element` (HTMLElement) - Target element

**Returns:** `string|null` - Current state value or null

**Example:**
```javascript
const currentState = this.getElementState(targetElement);
if (currentState === ExtendedStates.OPENING) {
  return; // Prevent concurrent state changes
}
```

---

### Attribute Management

#### `setAttr(element, attr, value)`

Set a component-specific attribute.

**Parameters:**
- `element` (HTMLElement) - Target element
- `attr` (string) - Attribute name (without `data-` prefix)
- `value` (string|number|boolean) - Attribute value

**Example:**
```javascript
// In Toggle component
this.setAttr(targetElement, 'target', ExtendedStates.OPEN);
// Sets: <div data-toggle-target="open">

this.setAttr(targetElement, 'duration', 300);
// Sets: <div data-toggle-duration="300">
```

**Before (manual):**
```javascript
element.setAttribute('data-toggle-target', 'open');
element.setAttribute('data-toggle-duration', '300');
```

**After (with API):**
```javascript
this.setAttr(element, 'target', 'open');
this.setAttr(element, 'duration', 300);
```

---

#### `getAttr(element, attr, defaultValue)`

Get a component-specific attribute value.

**Parameters:**
- `element` (HTMLElement) - Target element
- `attr` (string) - Attribute name (without `data-` prefix)
- `defaultValue` (*) - Default value if attribute doesn't exist (optional)

**Returns:** `string|null` - Attribute value or default value

**Example:**
```javascript
const duration = this.getAttr(element, 'duration', '300');
const target = this.getAttr(element, 'target');

if (target === ExtendedStates.OPEN) {
  // Handle open state
}
```

**Before (manual):**
```javascript
const duration = element.getAttribute('data-toggle-duration') || '300';
const target = element.getAttribute('data-toggle-target');
```

**After (with API):**
```javascript
const duration = this.getAttr(element, 'duration', '300');
const target = this.getAttr(element, 'target');
```

---

#### `removeAttr(element, attr)`

Remove a component-specific attribute.

**Parameters:**
- `element` (HTMLElement) - Target element
- `attr` (string) - Attribute name (without `data-` prefix)

**Example:**
```javascript
this.removeAttr(element, 'disabled');
// Removes: data-toggle-disabled
```

---

#### `hasAttr(element, attr)`

Check if a component-specific attribute exists.

**Parameters:**
- `element` (HTMLElement) - Target element
- `attr` (string) - Attribute name (without `data-` prefix)

**Returns:** `boolean` - True if attribute exists

**Example:**
```javascript
if (this.hasAttr(element, 'disabled')) {
  return; // Skip if disabled
}

if (!this.hasAttr(element, 'initialized')) {
  this.setAttr(element, 'initialized', 'true');
  // Initialize component
}
```

---

## Internal Method

### `_getSelector()`

Automatically extracts the component's data attribute selector from the class name.

**Returns:** `string` - Data attribute selector (e.g., `data-toggle`)

**How it works:**
```javascript
class Toggle extends BaseComponent {}
// _getSelector() returns "data-toggle"

class DataTable extends BaseComponent {}
// _getSelector() returns "data-data-table"

class PModal extends BaseComponent {}
// _getSelector() returns "data-p-modal"
```

**Conversion Rules:**
- PascalCase → kebab-case
- `Toggle` → `toggle`
- `DataTable` → `data-table`
- `PModal` → `p-modal`
- Prefix with `data-`

**Override if needed:**
```javascript
class CustomComponent extends BaseComponent {
  _getSelector() {
    return 'data-custom'; // Override default behavior
  }
}
```

---

## Usage Examples

### Toggle Component

**Before:**
```javascript
// Setting state manually
target.setAttribute('data-toggle-target', ExtendedStates.OPEN);

// Getting state manually
const currentState = target.getAttribute('data-toggle-target');
if (currentState === ExtendedStates.OPENING || currentState === ExtendedStates.OPEN) {
  return;
}
```

**After:**
```javascript
// Setting state with API
this.setAttr(target, 'target', ExtendedStates.OPEN);

// Getting state with API
const currentState = this.getAttr(target, 'target');
if (currentState === ExtendedStates.OPENING || currentState === ExtendedStates.OPEN) {
  return;
}
```

---

### Lightbox Component

**Before:**
```javascript
// Setting state manually
this.lightboxElement.setAttribute('data-lightbox', 'opening');

// Later...
if (state.lightboxState === 'closed') {
  this.lightboxElement.setAttribute('data-lightbox', 'closed');
}
```

**After:**
```javascript
// Setting state with API
this.setState(this.lightboxElement, 'opening');

// Later...
if (state.lightboxState === 'closed') {
  this.setState(this.lightboxElement, 'closed');
}
```

---

### Custom Component Example

```javascript
class Accordion extends BaseComponent {
  _init(element) {
    const state = super._init(element);

    // Get configuration using helper
    const duration = this.getAttr(element, 'duration', 300);
    const allowMultiple = this.getAttr(element, 'allow-multiple', false);

    // Find target panel
    const panelId = this.getAttr(element, 'panel');
    const panel = document.getElementById(panelId);

    // Set initial state
    this.setState(panel, 'closed');

    // Mark as initialized
    this.setAttr(element, 'initialized', 'true');

    return state;
  }

  expand(element) {
    const state = this.getState(element);
    const panelId = this.getAttr(element, 'panel');
    const panel = document.getElementById(panelId);

    // Check current state
    const currentState = this.getElementState(panel);
    if (currentState === 'opening' || currentState === 'open') {
      return; // Already opening or open
    }

    // Expand with animation
    this.setState(panel, 'opening');

    setTimeout(() => {
      this.setState(panel, 'open');
    }, this.getAttr(element, 'duration', 300));
  }
}
```

**HTML:**
```html
<button data-accordion
        data-accordion-panel="panel-1"
        data-accordion-duration="500">
  Panel 1
</button>

<div id="panel-1" data-accordion="closed">
  Panel content
</div>
```

**CSS:**
```css
[data-accordion="closed"] {
  display: none;
}

[data-accordion="opening"] {
  display: block;
  animation: slideDown 0.5s ease-out;
}

[data-accordion="open"] {
  display: block;
}
```

---

## Benefits

### 1. Less Boilerplate
```javascript
// Before: 48 characters
element.setAttribute('data-toggle-target', 'open');

// After: 32 characters
this.setAttr(element, 'target', 'open');
```

### 2. Prevents Typos
```javascript
// Before: Easy to make mistakes
element.setAttribute('data-togle-target', 'open'); // ❌ typo: "togle"
element.setAttribute('data-toggle-targt', 'open'); // ❌ typo: "targt"

// After: Component name extracted from class
this.setAttr(element, 'target', 'open'); // ✅ Always correct
```

### 3. Consistency
All components use the same pattern:
```javascript
this.setState(element, state);
this.setAttr(element, attr, value);
this.getAttr(element, attr, default);
this.removeAttr(element, attr);
this.hasAttr(element, attr);
```

### 4. Refactoring Safety
If you rename a component class, attributes update automatically:
```javascript
// Rename: Toggle → Toggler
class Toggler extends BaseComponent {}
// data-toggle → data-toggler (automatic!)
```

### 5. Type Safety (Future)
Easy to add TypeScript support:
```typescript
setState<T extends string>(element: HTMLElement, state: T): void;
getElementState(element: HTMLElement): string | null;
```

---

## Helper Methods Using New API

BaseComponent provides additional helper methods that now use the new API internally:

### `_getConfigFromAttrs(element, mapping)`

Parse multiple data attributes into a configuration object.

**Parameters:**
- `element` (HTMLElement) - Element with data attributes
- `mapping` (Object) - Map of config keys to **short** attribute names (without component prefix)

**Returns:** `Object` - Configuration object

**Example:**
```javascript
// In SelectLoader component:
const config = this._getConfigFromAttrs(element, {
  target: 'target',               // ✅ Short name - reads data-selectloader-target
  loadingClass: 'loading-class',  // ✅ Short name - reads data-selectloader-loading-class
  transition: 'transition'        // ✅ Short name - reads data-selectloader-transition
});

// ❌ INCORRECT - Don't use full names anymore
const config = this._getConfigFromAttrs(element, {
  target: 'selectloader-target',         // ❌ Old style - will fail
  loadingClass: 'selectloader-loading-class' // ❌ Old style - will fail
});
```

**Before (used `_getDataAttr` internally):**
```javascript
_getConfigFromAttrs(element, mapping) {
  const config = {};
  for (const [key, attrName] of Object.entries(mapping)) {
    config[key] = this._getDataAttr(element, attrName, defaultValue);
  }
  return config;
}
```

**After (uses `getAttr` internally):**
```javascript
_getConfigFromAttrs(element, mapping) {
  const config = {};
  for (const [key, attrName] of Object.entries(mapping)) {
    config[key] = this.getAttr(element, attrName, defaultValue);
  }
  return config;
}
```

---

### `_getTargetElement(element, dataAttr, options)`

Get target element from data attribute with validation. Supports both CSS selectors and data-view lookups.

**Parameters:**
- `element` (HTMLElement) - Element containing the data attribute
- `dataAttr` (string) - **Short** attribute name (without `data-` and component prefix)
- `options` (Object) - Options object
  - `required` (boolean) - Whether to warn if not found

**Returns:** `HTMLElement|null` - Target element or null

**Example:**
```javascript
// In SelectLoader component:
const target = this._getTargetElement(element, 'target', { required: true });
// ✅ Reads data-selectloader-target attribute

// ❌ INCORRECT - Don't use full name
const target = this._getTargetElement(element, 'selectloader-target', { required: true });
// ❌ Would try to read data-selectloader-selectloader-target
```

**Supports two patterns:**

1. **CSS Selector:**
```html
<select data-selectloader-target="#content">...</select>
<div id="content">...</div>
```

2. **Data-View (preferred):**
```html
<select data-selectloader-target-view="main-content">...</select>
<div data-view="main-content">...</div>
```

**Before (used `_getDataAttr` internally):**
```javascript
_getTargetElement(element, dataAttr, options) {
  const viewAttr = `${dataAttr}-view`;
  const viewName = this._getDataAttr(element, viewAttr);
  // ...
  const selector = this._getDataAttr(element, dataAttr);
}
```

**After (uses `getAttr` internally):**
```javascript
_getTargetElement(element, dataAttr, options) {
  const viewAttr = `${dataAttr}-view`;
  const viewName = this.getAttr(element, viewAttr);
  // ...
  const selector = this.getAttr(element, dataAttr);
}
```

---

## Migration Guide

### Step 1: Find Manual Attributes

Search for:
```javascript
element.setAttribute('data-<component>
element.getAttribute('data-<component>
element.removeAttribute('data-<component>
element.hasAttribute('data-<component>
```

### Step 2: Replace with API

| Before | After |
|--------|-------|
| `element.setAttribute('data-toggle', state)` | `this.setState(element, state)` |
| `element.getAttribute('data-toggle')` | `this.getElementState(element)` |
| `element.setAttribute('data-toggle-duration', value)` | `this.setAttr(element, 'duration', value)` |
| `element.getAttribute('data-toggle-duration')` | `this.getAttr(element, 'duration')` |
| `element.removeAttribute('data-toggle-disabled')` | `this.removeAttr(element, 'disabled')` |
| `element.hasAttribute('data-toggle-disabled')` | `this.hasAttr(element, 'disabled')` |

### Step 3: Test

Build and verify:
```bash
npm run build
npm run demo
```

---

## Best Practices

### 1. Use setState for Component State

```javascript
// ✅ Good - Use setState for main state
this.setState(element, ExtendedStates.OPEN);

// ❌ Avoid - Don't use setAttr for main state
this.setAttr(element, 'state', ExtendedStates.OPEN);
```

### 2. Use setAttr for Configuration

```javascript
// ✅ Good - Use setAttr for component-specific attributes
this.setAttr(element, 'duration', 300);
this.setAttr(element, 'auto-close', 'true');

// ❌ Avoid - Don't use setState for configuration
this.setState(element, 'duration-300'); // Wrong!
```

### 3. Provide Defaults

```javascript
// ✅ Good - Always provide sensible defaults
const duration = this.getAttr(element, 'duration', 300);
const enabled = this.getAttr(element, 'enabled', true);

// ❌ Avoid - No default can cause issues
const duration = this.getAttr(element, 'duration'); // Could be null
```

### 4. Check Before Remove

```javascript
// ✅ Good - Check before removing
if (this.hasAttr(element, 'temporary')) {
  this.removeAttr(element, 'temporary');
}

// ⚠️ Works but unnecessary
this.removeAttr(element, 'temporary'); // No error if doesn't exist
```

---

## Component Compatibility

### ✅ Using New API (Fully Migrated)
All components extending BaseComponent have been migrated to use the new API:

- **Toggle** - 6 `getAttr()` calls
- **Lightbox** - 24 `getAttr()` calls
- **Tabs** - 3 `getAttr()` calls
- **FormEnhancer** - 4 `getAttr()` calls
- **Toast** - 5 `getAttr()` calls
- **CopyToClipboard** - 5 `getAttr()` calls
- **DataTable** - 5 `getAttr()` calls
- **Scrollreveal** - 5 `getAttr()` calls
- **Scrollhide** - 6 `getAttr()` calls
- **Videoplay** - 9 `getAttr()` calls
- **SelectLoader** - Uses `_getConfigFromAttrs()` and `_getTargetElement()` with short attribute names
- **Modal** (legacy) - Migrated
- **Lazysrc** - Migrated

### ℹ️ Not Applicable (Web Components)
These components extend HTMLElement, not BaseComponent, so they don't use the new API:

- **PModal** - Web Component
- **PDatetime** - Web Component
- **PSelect** - Web Component
- **PToasts** - Web Component
- **PUploader** - Web Component

Web Components use standard `getAttribute()` methods as per Web Component standards.

---

## Summary

The BaseComponent API provides:
- ✅ **Automatic attribute naming** based on class name
- ✅ **Reduced boilerplate** (shorter, cleaner code)
- ✅ **Type safety** (prevents typos)
- ✅ **Consistency** (same pattern across all components)
- ✅ **Maintainability** (easier to refactor)
- ✅ **State management** helpers
- ✅ **Attribute management** helpers

Use these methods in all components to ensure consistent, maintainable state management across the framework.