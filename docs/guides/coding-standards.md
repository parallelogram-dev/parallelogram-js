# Coding Standards

This document defines the coding standards and conventions for the Parallelogram-JS framework. These standards ensure consistency, maintainability, and clarity across all code and markup.

## Table of Contents

1. [Code Formatting Standards](#code-formatting-standards)
2. [HTML Structure & Conventions](#html-structure--conventions)
3. [CSS/SCSS Standards](#cssscss-standards)
4. [JavaScript Conventions](#javascript-conventions)
5. [Data Attributes](#data-attributes)
6. [BEM Methodology](#bem-methodology)
7. [Naming Conventions](#naming-conventions)
8. [Size Notation Standards](#size-notation-standards)
9. [Accessibility Requirements](#accessibility-requirements)

---

## Code Formatting Standards

### Indentation Rules

**CRITICAL**: Consistent indentation is essential for code readability and maintainability:

- **HTML files**: 4 spaces for indentation (tab size = 4)
- **CSS/SCSS files**: 2 spaces for indentation (tab size = 2)
- **JavaScript files**: 2 spaces for indentation (tab size = 2)
- **JSON files**: 2 spaces for indentation (tab size = 2)

```html
<!-- CORRECT: HTML with 4-space indentation -->
<div class="modal">
    <div class="modal__header">
        <h2 class="modal__title">Title</h2>
        <button class="modal__close">
            <span>Close</span>
        </button>
    </div>
</div>
```

```scss
/* CORRECT: SCSS with 2-space indentation */
.modal {
  display: block;

  &__header {
    padding: 1rem;

    .modal__title {
      font-size: 1.5rem;
      margin: 0;
    }
  }
}
```

```javascript
// CORRECT: JavaScript with 2-space indentation
class Component {
  constructor(options) {
    this.options = options;
    this.init();
  }

  init() {
    if (this.options.autoStart) {
      this.start();
    }
  }
}
```

### File Formatting Requirements

- **Line endings**: Use LF (Unix-style) line endings only
- **Final newline**: All files MUST end with a single empty newline
- **Trailing whitespace**: Remove all trailing whitespace from lines
- **Max line length**: 100 characters (soft limit), 120 characters (hard limit)

### Prettier Configuration

Use Prettier for automated code formatting with these settings:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "trimTrailingWhitespace": true,
  "overrides": [
    {
      "files": "*.html",
      "options": {
        "tabWidth": 4,
        "printWidth": 120
      }
    }
  ]
}
```

---

## HTML Structure & Conventions

### Semantic HTML First

Always start with semantic, accessible HTML that works without JavaScript:

```html
<!-- CORRECT: Semantic foundation -->
<nav class="navbar">
    <ul class="navbar__list">
        <li class="navbar__item">
            <a href="/" class="navbar__link">Home</a>
        </li>
        <li class="navbar__item">
            <a href="/about" class="navbar__link">About</a>
        </li>
    </ul>
</nav>

<!-- INCORRECT: Non-semantic divs -->
<div class="navbar">
    <div class="navbar__list">
        <div class="navbar__item">Home</div>
        <div class="navbar__item">About</div>
    </div>
</div>
```

### Progressive Enhancement Attributes

Use `data-*` attributes for JavaScript enhancement, never `class` or `id`:

```html
<!-- CORRECT: Data attributes for enhancement -->
<button class="btn btn--primary" data-modal data-modal-target="#contact-form" data-modal-size="lg">
    Open Contact Form
</button>

<div
    id="contact-form"
    class="modal modal--lg"
    data-modal-closable="true"
    data-modal-backdrop-close="true"
>
    <!-- Modal content -->
</div>

<!-- INCORRECT: Using classes for JavaScript hooks -->
<button class="btn btn--primary js-modal-trigger">Open Modal</button>
```

### Required Accessibility Attributes

Always include proper ARIA attributes and semantic roles:

```html
<!-- CORRECT: Complete accessibility -->
<div class="carousel" data-carousel role="region" aria-label="Featured products">
    <div class="carousel__track" role="group" aria-live="polite">
        <div class="carousel__slide" role="tabpanel" aria-label="Slide 1 of 3" tabindex="0">
            <img src="product1.jpg" alt="Premium Widget - $29.99" />
        </div>
    </div>

    <button class="carousel__arrow carousel__arrow--prev" aria-label="Previous slide">‹</button>
    <button class="carousel__arrow carousel__arrow--next" aria-label="Next slide">›</button>
</div>
```

---

## CSS/SCSS Standards

### Comment Notation

**🚨 CRITICAL:** All CSS/SCSS comments MUST use block comment notation `/* */`. Single-line comments `//` are FORBIDDEN:

```scss
/* CORRECT: Block comments only */
.component {
  /* Main component styles */
  color: #333;

  /* Responsive adjustments */
  @media (max-width: 768px) {
    color: #666; /* Lighter on mobile */
  }
}

/* INCORRECT: Single-line comments break CSS compilation */
// .component {
//   color: #333; // This will break CSS builds
// }
```

### SCSS Architecture

Use modern `@use` directives and organized imports:

```scss
/* CORRECT: Modern SCSS structure */
@use './settings';
@use './components/button';
@use './components/modal';

/* Component-level variables */
:root {
  --component-bg: var(--surface-color, #fff);
  --component-border: var(--border-color, #e5e7eb);
}

/* INCORRECT: Deprecated @import */
@import './settings';
@import './components/button';
```

### CSS Custom Properties

Use CSS custom properties with fallbacks for theming:

```scss
/* CORRECT: Custom properties with fallbacks */
.btn {
  background: var(--btn-bg, var(--primary-color, #3b82f6));
  color: var(--btn-text, var(--primary-contrast, #fff));
  border-radius: var(--btn-radius, var(--border-radius-md, 6px));
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --btn-bg: var(--primary-dark, #1d4ed8);
  }
}
```

---

## JavaScript Conventions

### Component Class Structure

Follow consistent component patterns:

```javascript
// CORRECT: Standard component structure
export default class ComponentName extends BaseComponent {
  static get defaults() {
    return {
      // Use semantic, descriptive names
      isEnabled: true,
      animationDuration: 300,
      closeOnOutsideClick: false,
      // Numeric values default to appropriate units (following CSS conventions)
      // Time values default to milliseconds
      delay: 0,
      // Dimensions default to pixels when numeric
      maxWidth: 800,
    };
  }

  _init(element) {
    const config = this._getConfiguration(element);

    const state = {
      // Component state
      isActive: false,
      config,

      // DOM references
      elements: {
        trigger: element,
        target: this._getTarget(element),
        controls: [...element.querySelectorAll('[data-control]')],
      },

      // Event cleanup
      controller: new AbortController(),

      // Cleanup function
      cleanup: () => {
        this._resetState(element, state);
      },
    };

    this._setupEventListeners(element, state);
    this._initializeState(element, state);

    return state;
  }

  _setupEventListeners(element, state) {
    // Use AbortController for cleanup
    element.addEventListener(
      'click',
      event => {
        this._handleClick(event, element, state);
      },
      { signal: state.controller.signal }
    );

    // Global events
    this.eventBus.on('component:event', data => {
      this._handleGlobalEvent(data, element, state);
    });
  }
}
```

### Error Handling

Always include comprehensive error handling:

```javascript
// CORRECT: Defensive programming
_handleUserAction(event, element, state) {
  // Validate element still exists
  if (!document.contains(element)) {
    this.logger?.warn('Element removed from DOM, unmounting');
    this.unmount(element);
    return;
  }

  // Validate state integrity
  if (!state || !state.config) {
    this.logger?.error('Invalid component state');
    return;
  }

  try {
    this._performAction(event, element, state);
  } catch (error) {
    this.logger?.error('Action failed:', error);
    this._handleActionError(error, element, state);
  }
}
```

---

## Data Attributes

### Naming Convention

Data attributes follow a hierarchical naming pattern:

```html
<!-- Pattern: data-[component]-[option] -->
<!-- IMPORTANT: Component names use camelCase without hyphens -->
<!-- Component class: Mycomponent, Data attribute: data-mycomponent -->
<!-- Component class: Datatable, Data attribute: data-datatable -->
<!-- Component identification -->
<div data-carousel>
    <!-- Component configuration -->
    <div
        data-carousel
        data-carousel-autoplay="true"
        data-carousel-duration="5000"
        data-carousel-transition="slide"
    >
        <!-- Sub-element identification -->
        <button data-carousel-control="prev">Previous</button>
        <button data-carousel-control="next">Next</button>

        <!-- Boolean attributes -->
        <div
            data-modal
            data-modal-closable="true"
            data-modal-backdrop-close="false"
            data-modal-keyboard="true"
        ></div>
    </div>
</div>
```

### Value Types

Use consistent data types and formatting:

```html
<!-- CORRECT: Proper data types -->
<div data-component
    data-component-enabled="true"          <!-- Boolean: "true"/"false" -->
    data-component-count="5"               <!-- Number: numeric string -->
    data-component-delay="300"             <!-- Time: milliseconds -->
    data-component-size="lg"               <!-- Enum: xs/sm/md/lg/xl -->
    data-component-target="#element-id"    <!-- Selector: CSS selector -->
    data-component-class="active highlight" <!-- Classes: space-separated -->
    data-component-data='{"key": "value"}'> <!-- JSON: valid JSON string -->

<!-- INCORRECT: Inconsistent types -->
<div data-component
    data-component-enabled="yes"           <!-- Use "true" not "yes" -->
    data-component-count="five"            <!-- Use "5" not "five" -->
    data-component-size="large">           <!-- Use "lg" not "large" -->
```

### Component Targeting

Components support two targeting approaches for consistency with the framework:

#### Option 1: CSS Selector (Traditional)
Use `data-*-target` with a CSS selector:

```html
<button data-toggle data-toggle-target="#sidebar">Toggle Sidebar</button>
<div id="sidebar">Sidebar content</div>

<select data-selectloader data-selectloader-target="#product-details">
  <option value="">Choose product...</option>
  <option value="/products/1">Product 1</option>
</select>
<div id="product-details">Details here</div>
```

#### Option 2: data-view Reference (Recommended)
Use `data-*-target-view` to reference elements by their `data-view` attribute. This is more consistent with the framework's PageManager fragment system:

```html
<!-- RECOMMENDED: Using data-view for consistency -->
<button data-toggle data-toggle-target-view="sidebar">Toggle Sidebar</button>
<div data-view="sidebar">Sidebar content</div>

<select data-selectloader data-selectloader-target-view="product-details">
  <option value="">Choose product...</option>
  <option value="/products/1">Product 1</option>
</select>
<div data-view="product-details">Details here</div>

<!-- Works with any component that uses targeting -->
<button data-modal data-modal-target-view="contact">Open Contact</button>
<div data-view="contact" data-modal-closable="true">Modal content</div>
```

**Benefits of data-view approach:**
- Consistent with PageManager's fragment targeting system
- No need for unique IDs when not semantically necessary
- Clearer semantic intent (view vs generic element)
- Better integration with framework routing and navigation

#### Other Relationship Patterns

```html
<!-- Parent → Child relationship -->
<div data-tabs>
    <button data-tab="panel-1" aria-selected="true">Tab 1</button>
    <button data-tab="panel-2">Tab 2</button>
    <div id="panel-1" data-tab-panel>Panel 1 content</div>
    <div id="panel-2" data-tab-panel>Panel 2 content</div>
</div>

<!-- Collection relationship -->
<div data-lightbox-gallery="products">
    <img data-lightbox-item src="product1.jpg" alt="Product 1" />
    <img data-lightbox-item src="product2.jpg" alt="Product 2" />
</div>
```

---

## BEM Methodology

### Block Element Modifier Structure

Strictly follow BEM naming for all CSS classes:

```html
<!-- CORRECT: BEM structure -->
<!-- Block: btn -->
<button class="btn btn--primary btn--lg">Primary Button</button>

<!-- Block with Element: modal__header -->
<div class="modal modal--lg">
    <header class="modal__header">
        <h2 class="modal__title">Modal Title</h2>
        <button class="modal__close">×</button>
    </header>
    <div class="modal__body">
        <p class="modal__text">Modal content</p>
    </div>
    <footer class="modal__footer">
        <button class="btn btn--secondary modal__button">Cancel</button>
        <button class="btn btn--primary modal__button">Confirm</button>
    </footer>
</div>

<!-- INCORRECT: Mixed naming conventions -->
<div class="modal large-modal">
    <div class="modalHeader">
        <h2 class="modal-title">Title</h2>
    </div>
</div>
```

### SCSS BEM Implementation

Use nested SCSS to maintain BEM structure:

```scss
/* CORRECT: BEM with SCSS nesting */
.modal {
  /* Block styles */
  position: fixed;
  top: 50%;
  left: 50%;

  /* Elements */
  &__header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  &__title {
    margin: 0;
    font-size: 1.25rem;
  }

  &__close {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }

  /* Modifiers */
  &--lg {
    max-width: 800px;
  }

  &--sm {
    max-width: 400px;
  }

  /* Element modifiers */
  &__button {
    &--full-width {
      width: 100%;
    }
  }
}

/* INCORRECT: Deep nesting */
.modal {
  .header {
    .title {
      .text {
        color: red; /* Too deeply nested */
      }
    }
  }
}
```

---

## Naming Conventions

### Component Names

Use consistent naming patterns:

```javascript
// CORRECT: Component naming
class DataTable extends BaseComponent {} // PascalCase for classes
export default DataTable;

// File: DataTable.js (matches class name)
// Selector: [data-datatable] (kebab-case)
// CSS: .datatable (lowercase)
// Event prefix: datatable: (lowercase)
```

### File Organization

Follow consistent file naming and organization:

```
src/
├── components/
│   ├── Modal.js              // Component classes
│   ├── DataTable.js
│   ├── PModal.js             // Web components (P prefix)
│   └── PSelect.js
├── core/
│   ├── BaseComponent.js      // Core framework files
│   └── ComponentRegistry.js
├── managers/
│   ├── EventManager.js       // Manager classes
│   └── RouterManager.js
└── styles/
    ├── framework/
    │   └── components/
    │       ├── modal.scss    // Component styles (lowercase)
    │       └── datatable.scss
    └── demo/
        └── components/
            ├── button.scss   // Demo-specific styles
            └── form.scss
```

### Method Naming

Use consistent method naming patterns:

```javascript
// CORRECT: Method naming conventions
class Component extends BaseComponent {
  // Public methods (no underscore)
  mount(element) {}
  update(element) {}
  unmount(element) {}

  // Private methods (underscore prefix)
  _init(element) {}
  _setupEventListeners(element, state) {}
  _handleClick(event, element, state) {}

  // Event handlers
  _handleUserAction(event, element, state) {}
  _handleGlobalEvent(data, element, state) {}

  // State management
  _setState(element, state, updates) {}
  _getState(element) {}

  // Utility methods
  _getConfiguration(element) {}
  _parseDataAttributes(element) {}
  _dispatchEvent(element, eventName, detail) {}
}
```

---

## Size Notation Standards

### Standardized Size System

**ALWAYS** use the standardized size notation across all components:

```html
<!-- CORRECT: Standardized sizes -->
<button class="btn btn--xs">Extra Small</button>
<button class="btn btn--sm">Small</button>
<button class="btn">Regular (no modifier)</button>
<button class="btn btn--lg">Large</button>
<button class="btn btn--xl">Extra Large</button>

<!-- Modal sizes -->
<div data-modal data-modal-size="sm">Small Modal</div>
<div data-modal data-modal-size="md">Medium Modal</div>
<div data-modal data-modal-size="lg">Large Modal</div>

<!-- Form elements -->
<input class="form__control form__control--sm" type="text" />
<input class="form__control" type="text" />
<!-- Default/medium -->
<input class="form__control form__control--lg" type="text" />

<!-- INCORRECT: Non-standard size names -->
<button class="btn btn--small">Wrong</button>
<!-- Use btn--sm -->
<button class="btn btn--large">Wrong</button>
<!-- Use btn--lg -->
<button class="btn btn--tiny">Wrong</button>
<!-- Use btn--xs -->
<div data-modal data-modal-size="small">Wrong</div>
<!-- Use sm -->
```

### Size Mapping Reference

| Size        | Abbreviation | Usage                      | Example Min-Height |
| ----------- | ------------ | -------------------------- | ------------------ |
| Extra Small | `xs`         | Compact UI, inline actions | 2rem (32px)        |
| Small       | `sm`         | Secondary actions, mobile  | 2rem (32px)        |
| Medium      | _(default)_  | Standard UI elements       | 3.125rem (50px)    |
| Large       | `lg`         | Primary actions, desktop   | 3.5rem (56px)      |
| Extra Large | `xl`         | Hero elements, emphasis    | 4rem (64px)        |

### Size Implementation in CSS

Use consistent size variables and implementation:

```scss
/* CORRECT: Size variable system */
:root {
  /* Form input sizing */
  --form-input-min-height-xs: 1.75rem; /* 28px */
  --form-input-min-height-sm: 2rem; /* 32px */
  --form-input-min-height-md: 3.125rem; /* 50px - DEFAULT */
  --form-input-min-height-lg: 3.5rem; /* 56px */
  --form-input-min-height-xl: 4rem; /* 64px */

  /* Corresponding padding */
  --form-input-padding-xs: 0.375rem 0.5rem;
  --form-input-padding-sm: 0.5rem 0.75rem;
  --form-input-padding-md: 0.75rem 1rem; /* DEFAULT */
  --form-input-padding-lg: 1rem 1.25rem;
  --form-input-padding-xl: 1.25rem 1.5rem;
}

.btn {
  /* Default/medium size */
  min-height: var(--form-input-min-height-md);
  padding: var(--form-input-padding-md);

  /* Size modifiers */
  &--xs {
    min-height: var(--form-input-min-height-xs);
    padding: var(--form-input-padding-xs);
    font-size: 0.75rem;
  }

  &--sm {
    min-height: var(--form-input-min-height-sm);
    padding: var(--form-input-padding-sm);
    font-size: 0.875rem;
  }

  &--lg {
    min-height: var(--form-input-min-height-lg);
    padding: var(--form-input-padding-lg);
    font-size: 1.125rem;
  }

  &--xl {
    min-height: var(--form-input-min-height-xl);
    padding: var(--form-input-padding-xl);
    font-size: 1.25rem;
  }
}
```

---

## Accessibility Requirements

### Minimum Accessibility Standards

Every component MUST include:

```html
<!-- CORRECT: Complete accessibility -->
<div class="carousel" data-carousel role="region" aria-label="Product showcase">
    <!-- Keyboard navigation support -->
    <button class="carousel__arrow carousel__arrow--prev" aria-label="Previous product" tabindex="0">
        ‹
    </button>

    <!-- Screen reader announcements -->
    <div class="carousel__track" aria-live="polite" aria-atomic="false">
        <div class="carousel__slide" role="tabpanel" aria-label="Product 1 of 5" tabindex="0">
            <img src="product.jpg" alt="Wireless headphones - $99.99" />
        </div>
    </div>

    <!-- Meaningful indicators -->
    <div class="carousel__indicators" role="tablist">
        <button
            role="tab"
            aria-selected="true"
            aria-label="View product 1"
            class="carousel__dot carousel__dot--active"
        ></button>
    </div>
</div>
```

### Focus Management

Implement proper focus management:

```javascript
// CORRECT: Focus management in components
class Modal extends BaseComponent {
  _open(element, state) {
    // Store previous focus
    state.previousFocus = document.activeElement;

    // Focus first focusable element in modal
    const firstFocusable = this._getFirstFocusable(element);
    firstFocusable?.focus({ preventScroll: true });

    // Trap focus within modal
    this._trapFocus(element, state);
  }

  _close(element, state) {
    // Restore previous focus
    if (state.previousFocus && document.contains(state.previousFocus)) {
      state.previousFocus.focus({ preventScroll: true });
    }
  }

  _trapFocus(element, state) {
    element.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Tab') {
          this._handleTabKey(event, element);
        }
      },
      { signal: state.controller.signal }
    );
  }
}
```

### Color Contrast and Theme Support

Ensure proper contrast and theme support:

```scss
/* CORRECT: Theme-aware colors */
.btn {
  background: var(--btn-bg, #3b82f6);
  color: var(--btn-text, #ffffff);
  border: 1px solid var(--btn-border, transparent);

  /* Focus states */
  &:focus-visible {
    outline: 2px solid var(--focus-color, #3b82f6);
    outline-offset: 2px;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    border: 2px solid currentColor;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    --btn-bg: #1d4ed8;
    --btn-text: #f9fafb;
  }
}
```

---

## Quality Assurance Checklist

Before submitting any code, ensure it meets these standards:

### HTML/CSS Checklist

- [ ] Uses semantic HTML elements
- [ ] Follows BEM methodology strictly
- [ ] Uses only `/* */` comments in CSS/SCSS
- [ ] Implements standardized size notation (xs/sm/md/lg/xl)
- [ ] Includes proper ARIA attributes
- [ ] Provides focus management
- [ ] Supports keyboard navigation
- [ ] Uses CSS custom properties for theming

### JavaScript Checklist

- [ ] Extends BaseComponent properly
- [ ] Uses data attributes for configuration
- [ ] Implements AbortController for cleanup
- [ ] Includes comprehensive error handling
- [ ] Follows consistent naming conventions
- [ ] Emits appropriate events
- [ ] Includes proper JSDoc comments

### Accessibility Checklist

- [ ] Includes semantic roles
- [ ] Provides aria-labels and descriptions
- [ ] Supports keyboard navigation
- [ ] Manages focus properly
- [ ] Announces state changes to screen readers
- [ ] Meets WCAG 2.1 AA color contrast requirements
- [ ] Works with high contrast mode
- [ ] Respects prefers-reduced-motion

### Performance Checklist

- [ ] Uses WeakMap for state storage
- [ ] Implements proper event cleanup
- [ ] Debounces expensive operations
- [ ] Caches DOM queries where appropriate
- [ ] Lazy loads when beneficial
- [ ] Minimizes DOM manipulations

This coding standards document serves as the definitive reference for all development work on the Parallelogram-JS framework. Following these standards ensures consistency, accessibility, maintainability, and performance across the entire codebase.
