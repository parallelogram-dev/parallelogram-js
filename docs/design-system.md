# Design System

Parallelogram uses a minimal, opinionated design system with ~40 tokens for consistency and flexibility.

## Quick Start

```scss
/* New components - use the design system */
@use '../../design-system' as ds;

.my-component {
  padding: ds.$space-md;
  color: ds.$primary;
  border-radius: ds.$radius-md;

  @include ds.transition(opacity);
  @include ds.focus-visible;
}
```

```scss
/* Existing components - legacy variables still work */
@use '../../design-system/variables' as *;

.legacy-component {
  padding: $spacing-md;
  color: $color-primary;
  /* All old variables mapped to new system */
}
```

## Design Tokens

### Colors

**Neutrals** (4 shades):
- `$neutral-100` → `#f5f5f5` (light backgrounds)
- `$neutral-300` → `#d4d4d4` (borders, disabled)
- `$neutral-600` → `#525252` (muted text)
- `$neutral-900` → `#171717` (primary text)

**Semantic Colors** (light/dark variants):
- `$primary` / `$primary-light` / `$primary-dark` (Blue)
- `$success` / `$success-light` / `$success-dark` (Green)
- `$warning` / `$warning-light` / `$warning-dark` (Orange)
- `$error` / `$error-light` / `$error-dark` (Red)

**Semantic Tokens** (for theming):
```scss
$color-text:       currentColor;
$color-text-muted: rgba(0, 0, 0, 0.5);
$color-bg:         #ffffff;
$color-bg-hover:   rgba(0, 0, 0, 0.05);
$color-border:     rgba(0, 0, 0, 0.1);
$color-accent:     $primary;
```

### Spacing (Golden Ratio)

```scss
$space-xs:  0.125em;  /* ~2px */
$space-sm:  0.25em;   /* ~4px */
$space-md:  0.5em;    /* ~8px */
$space-lg:  0.75em;   /* ~12px */
$space-xl:  1.25em;   /* ~20px */
$space-2xl: 2em;      /* ~32px */
```

### Typography

```scss
/* Sizes */
$font-xs:   0.75em;   /* 12px */
$font-sm:   0.875em;  /* 14px */
$font-base: 1em;      /* 16px */
$font-lg:   1.125em;  /* 18px */

/* Weights */
$font-normal:   400;
$font-medium:   500;
$font-semibold: 600;
$font-bold:     700;

/* Line Heights */
$leading-tight:  1.25;
$leading-normal: 1.5;
$leading-relaxed: 1.75;
```

### Borders

```scss
/* Widths */
$border-width:       1px;
$border-width-thick: 2px;

/* Radius */
$radius-sm: 0.25em;  /* ~4px - subtle */
$radius-md: 0.5em;   /* ~8px - default */
$radius-lg: 0.75em;  /* ~12px - panels */
```

### Shadows & Elevation

```scss
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.12);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.12);
$shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.12);
```

### Z-Index

```scss
$z-base:     1;
$z-dropdown: 10;
$z-overlay:  100;
$z-modal:    1000;
$z-toast:    2000;
```

### Opacity

```scss
$opacity-disabled: 0.3;
$opacity-muted:    0.6;
$opacity-icon:     0.7;
$opacity-hover:    0.9;
```

### Animation

```scss
/* Duration */
$duration-fast:   0.15s;
$duration-normal: 0.3s;
$duration-slow:   0.5s;

/* Easing */
$ease-standard: cubic-bezier(0.5, 0, 0, 1);
$ease-smooth:   ease-in-out;
```

## Utility Mixins

### Transitions

```scss
/* Respects prefers-reduced-motion */
@include ds.transition(opacity);
@include ds.transition(all, ds.$duration-normal, ds.$ease-smooth);
```

### Focus States

```scss
/* Keyboard focus only with custom color */
@include ds.focus-visible;
@include ds.focus-visible(ds.$error);
```

### Dark Mode

```scss
@include ds.dark-mode {
  background: black;
  color: white;
}
```

### Hover (with pointer detection)

```scss
@include ds.hover {
  background: ds.$color-bg-hover;
}
```

### Layout Helpers

```scss
/* Flex center */
@include ds.flex-center;

/* Text truncation */
@include ds.truncate;

/* Button reset */
@include ds.button-reset;

/* Screen reader only */
@include ds.sr-only;
```

### Elevation

```scss
@include ds.elevation(1);  /* shadow-sm */
@include ds.elevation(2);  /* shadow-md */
@include ds.elevation(3);  /* shadow-lg */
```

## CSS Custom Properties Pattern

For components that need runtime theming (like PDatetime), use CSS custom properties:

```scss
:host {
  /* Define theme variables */
  --component-bg: var(--color-bg, #{ds.$color-bg});
  --component-text: var(--color-text, #{ds.$color-text});
  --component-accent: var(--color-accent, #{ds.$primary});

  /* Use them */
  background: var(--component-bg);
  color: var(--component-text);

  /* Dark mode override */
  @include ds.dark-mode {
    --component-text: #{ds.$color-text-muted-dark};
  }
}
```

Then developers can override:

```css
my-component {
  --component-accent: #ff0000;
}
```

## Accessibility

### Reduced Motion

All transitions automatically respect `prefers-reduced-motion`:

```scss
button {
  @include ds.transition(transform);
  /* No transition for users who prefer reduced motion */
}
```

### Dark Mode

Use semantic color tokens and the dark mode mixin:

```scss
.panel {
  background: ds.$color-bg;
  color: ds.$color-text;

  @include ds.dark-mode {
    /* Custom dark mode styles if needed */
  }
}
```

## Migration Guide

### For New Components

Use the design system directly:

```scss
@use '../../design-system' as ds;
```

### For Existing Components

No changes needed! Legacy variables still work:

```scss
@use '../../design-system/variables' as *;
/* All old variables ($color-primary, $spacing-md, etc.) still work */
```

### When to Migrate

Migrate components when:
- Adding new features
- Major refactoring
- Need runtime theming
- Want to use new mixins

**Legacy variables will be removed in v0.3.0**

## File Structure

```
src/styles/design-system/
├── _index.scss       # Main entry point (use this for new components)
├── _tokens.scss      # All design tokens (~40 variables)
├── _mixins.scss      # Utility mixins (accessibility, layout, etc.)
└── _variables.scss   # Legacy compatibility layer (deprecated)
```

## Philosophy

- **Minimal**: ~40 tokens, not 100+
- **Opinionated**: Clear defaults, fewer decisions
- **Flexible**: CSS custom properties for overrides
- **Scalable**: Em-based spacing scales with font-size
- **Accessible**: Built-in dark mode and reduced motion
- **Golden Ratio**: Visually harmonious spacing progression

## Examples

See `PDatetime.scss` for a complete example of the CSS custom properties pattern in action.