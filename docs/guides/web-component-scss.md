# Using SCSS in Web Components

This guide explains how to use SCSS for styling Web Components in Parallelogram-JS.

## Overview

Web Components can now use external SCSS files for their Shadow DOM styles, providing:

- Better organization (styles in separate `.scss` files)
- SCSS features (variables, nesting, mixins)
- Easier maintenance
- Better IDE support
- Automatic minification
- Shared design tokens across components

## How It Works

The build system uses `rollup-plugin-postcss` to:

1. Import `.scss` files as JavaScript strings
2. Compile SCSS to CSS using Dart Sass
3. Minify the CSS with cssnano
4. Bundle it into the component's JavaScript file

## File Structure

For each web component, you can create one or more SCSS files:

```
src/components/
  ├── PUploader.js           # Component logic
  ├── PUploader.scss         # Shadow DOM styles
  └── PUploaderHost.scss     # Host element styles (optional)
```

## Example: PUploader Component

### 1. Create SCSS Files

**PUploader.scss** (Shadow DOM styles):

```scss
@use '../styles/web-components/variables' as *;

:host {
  display: block;
  border: $border-width-md solid $color-black;
  padding: $spacing-sm;
  background: $color-white;
}

.uploader {
  &__container {
    display: flex;
    gap: $spacing-sm;
  }

  &__preview {
    width: $size-preview;
    height: $size-preview;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.field {
  &__label {
    font-weight: $font-weight-semibold;
    font-size: $font-size-sm;
  }

  &__value {
    font-size: $font-size-sm;
    opacity: $color-text-muted;

    &--editable {
      cursor: pointer;

      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }
  }
}
```

**PUploaderHost.scss** (optional, for :host styles):

```scss
@use '../styles/web-components/variables' as *;

:host {
  display: block;
  font-family: $font-family;
  padding: $spacing-sm;
}

.uploader {
  &__selector {
    border: $border-width-md solid $color-border-hover;
    padding: $spacing-2xl;
    background: $color-bg-light;

    &:hover {
      background: $color-bg-lighter;
    }
  }
}
```

### 2. Import SCSS in Component

```javascript
import hostStyles from './PUploaderHost.scss';
import fileStyles from './PUploader.scss';

export default class PUploader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>

      <div class="uploader__selector">
        <label>+ Add files</label>
      </div>
    `;
  }
}

export class PUploaderFile extends HTMLElement {
  _render() {
    const preview = this.getAttribute('preview') || '';

    this.shadowRoot.innerHTML = `
      <style>${fileStyles}
      .uploader__preview {
        display: ${preview ? 'block' : 'none'};
      }
      </style>

      <div class="uploader__container">
        <picture class="uploader__preview">
          <img src="${preview}" alt="">
        </picture>
        <div class="field">
          <span class="field__label">Title</span>
          <span class="field__value field__value--editable">My Title</span>
        </div>
      </div>
    `;
  }
}
```

## Shared Variables

Design tokens and shared variables are available in `src/styles/web-components/_variables.scss`:

### Available Variables

#### Colors
- `$color-white`, `$color-black`
- `$color-border`, `$color-border-hover`, `$color-border-active`
- `$color-bg-light`, `$color-bg-lighter`, `$color-bg-hover`
- `$color-error`, `$color-error-bg`
- `$color-primary`, `$color-primary-dark`
- `$color-text-muted`

#### Spacing
- `$spacing-xs` (3px), `$spacing-sm` (6px), `$spacing-md` (8px)
- `$spacing-lg` (12px), `$spacing-xl` (16px), `$spacing-2xl` (32px)

#### Typography
- `$font-family: inherit`
- `$font-size-xs` (10px), `$font-size-sm` (12px), `$font-size-md` (14px), `$font-size-base` (16px)
- `$font-weight-normal`, `$font-weight-semibold`, `$font-weight-bold`

#### Borders
- `$border-width-sm` (1px), `$border-width-md` (2px)
- `$border-radius-sm` (0.125rem)

#### Transitions
- `$transition-fast` (0.2s), `$transition-normal` (0.375s), `$transition-slow` (0.4s)
- `$easing-standard`, `$easing-ease-out`

#### Z-index
- `$z-overlay`, `$z-panel`, `$z-preview`

### Usage

```scss
@use '../styles/web-components/variables' as *;

.my-component {
  color: $color-primary;
  padding: $spacing-md;
  transition: all $transition-fast $easing-standard;

  &:hover {
    background: $color-bg-hover;
  }
}
```

## Build Configuration

The Rollup configuration handles SCSS compilation automatically:

**rollup.config.js**:

```javascript
import postcss from 'rollup-plugin-postcss';

const componentConfigs = componentFiles.map(file => ({
  input: file,
  output: {
    file: `dist/components/${name}.js`,
    format: 'esm',
  },
  plugins: [
    postcss({
      extensions: ['.scss', '.css'],
      inject: false,          // Don't auto-inject (we control it)
      extract: false,         // Don't extract to separate file
      minimize: true,         // Minify the CSS
      sourceMap: false,
      use: [
        ['sass', {
          includePaths: ['src/styles']  // Allow @use from src/styles
        }]
      ]
    }),
    resolve({
      extensions: ['.js', '.scss', '.css'],
    }),
    commonjs(),
  ],
}));
```

## Benefits

### 1. Better Organization
- Styles live in dedicated `.scss` files
- Easier to find and edit component styles
- Clear separation between logic and presentation

### 2. SCSS Features
- Variables for design consistency
- Nesting for cleaner code
- Mixins for reusable styles
- Functions and calculations

### 3. Shared Design Tokens
- Import `web-components/_variables.scss` in any component
- Consistent spacing, colors, typography across all components
- Update design tokens in one place

### 4. Better Developer Experience
- Syntax highlighting in SCSS files
- CSS linting and formatting
- IDE autocomplete for variables
- No escaping quotes in template literals

### 5. Build-time Optimization
- SCSS compiled to CSS at build time
- Automatic minification
- No runtime CSS parsing overhead

## Migration Guide

### Before (Inline Styles)

```javascript
export default class MyComponent extends HTMLElement {
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 0.5rem;
          background: white;
        }

        .component__header {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .component__content {
          padding: 0.375rem;
        }
      </style>

      <div class="component__header">Header</div>
      <div class="component__content">Content</div>
    `;
  }
}
```

### After (External SCSS)

**MyComponent.scss**:

```scss
@use '../styles/web-components/variables' as *;

:host {
  display: block;
  padding: $spacing-md;
  background: $color-white;
}

.component {
  &__header {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
  }

  &__content {
    padding: $spacing-sm;
  }
}
```

**MyComponent.js**:

```javascript
import styles from './MyComponent.scss';

export default class MyComponent extends HTMLElement {
  _render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="component__header">Header</div>
      <div class="component__content">Content</div>
    `;
  }
}
```

## Best Practices

### 1. Use BEM Methodology

```scss
.component {           // Block
  &__element {         // Element
    &--modifier {      // Modifier
      // styles
    }
  }
}
```

### 2. Import Shared Variables

```scss
@use '../styles/web-components/variables' as *;

.my-component {
  padding: $spacing-md;  // Use token
  color: $color-primary; // Use token
}
```

### 3. Keep Styles Scoped

Shadow DOM provides encapsulation, but still follow good practices:

```scss
/* Good - scoped to component */
.uploader__preview {
  width: 6rem;
}

/* Avoid - too generic */
.preview {
  width: 6rem;
}
```

### 4. Use :host for Component Styles

```scss
:host {
  display: block;
  /* Component-level styles */
}

:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}
```

### 5. Minimize Dynamic Styles

Keep dynamic styles minimal:

```javascript
// ✅ Good - most styles in SCSS, minimal dynamic
this.shadowRoot.innerHTML = `
  <style>${styles}
  .dynamic-element { display: ${show ? 'block' : 'none'}; }
  </style>
`;

// ❌ Avoid - too many dynamic styles
this.shadowRoot.innerHTML = `
  <style>
    .element { color: ${color}; background: ${bg}; width: ${width}px; }
  </style>
`;
```

## Troubleshooting

### Build Errors

**Error: Cannot find module './Component.scss'**

Make sure the SCSS file exists and the path is correct:

```javascript
// Correct
import styles from './MyComponent.scss';

// Wrong - file doesn't exist
import styles from './MyComponentStyles.scss';
```

**Error: Undefined variable $color-primary**

Import the variables file:

```scss
// Add this at the top
@use '../styles/web-components/variables' as *;

.component {
  color: $color-primary; // Now works
}
```

### PostCSS Configuration

The `postcss.config.cjs` file must use CommonJS format (`.cjs` extension) because the project uses ES modules:

```javascript
module.exports = {
  plugins: [
    require('cssnano'),
  ],
};
```

## Performance

### Bundle Size Impact

- SCSS is compiled and minified at build time
- No runtime performance impact
- CSS is inlined as a string in the JavaScript bundle
- Example: PUploader component
  - Before: ~1200 lines of inline styles
  - After: ~8KB minified CSS string (comparable size)

### Best Practices

1. **Share common styles** via variables instead of duplicating
2. **Minimize unused styles** - remove dead CSS
3. **Use shorthand properties** when possible
4. **Avoid deep nesting** (>3 levels)

## Future Enhancements

Potential improvements:

1. **Constructable Stylesheets** - More efficient style adoption
2. **CSS Custom Properties** - Runtime theming support
3. **Critical CSS extraction** - Above-the-fold optimization
4. **Style caching** - Share styles between component instances

## Related

- [Coding Standards](./coding-standards.md)
- [Component Development](../components/)
- [SCSS Variables](../../src/styles/web-components/_variables.scss)