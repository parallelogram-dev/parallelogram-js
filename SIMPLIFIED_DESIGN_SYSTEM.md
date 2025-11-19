# Parallelogram Simplified Design System

Based on PDatetime component patterns - minimal, flexible, using golden ratio principles.

---

## 1. Colors (Light/Dark variants only)

```scss
/* ============================================================================
   Base Colors
   ============================================================================ */

/* Neutrals (4 shades only) */
$neutral-100: #f5f5f5;  /* Light backgrounds */
$neutral-300: #d4d4d4;  /* Borders, disabled */
$neutral-600: #525252;  /* Muted text */
$neutral-900: #171717;  /* Primary text */

/* Primary (Blue) */
$primary:       #3b82f6;
$primary-light: #60a5fa;
$primary-dark:  #2563eb;

/* Success (Green) */
$success:       #22c55e;
$success-light: #4ade80;
$success-dark:  #16a34a;

/* Warning (Orange) */
$warning:       #f97316;
$warning-light: #fb923c;
$warning-dark:  #ea580c;

/* Error (Red) */
$error:       #ef4444;
$error-light: #f87171;
$error-dark:  #dc2626;

/* ============================================================================
   Semantic Tokens (using CSS custom properties pattern)
   ============================================================================ */

/* Text */
--color-text:        currentColor;
--color-text-muted:  rgba(0, 0, 0, 0.5);

/* Backgrounds */
--color-bg:          #ffffff;
--color-bg-hover:    rgba(0, 0, 0, 0.05);
--color-bg-overlay:  rgba(0, 0, 0, 0.5);

/* Borders */
--color-border:      rgba(0, 0, 0, 0.1);

/* Accent/Interactive */
--color-accent:      #3b82f6;

/* Shadows */
--color-shadow:      rgba(0, 0, 0, 0.12);
--color-focus-shadow: rgba(59, 130, 246, 0.1);

/* States */
--color-error:       #dc2626;
--color-error-bg:    #fee2e2;
--color-success:     #16a34a;
--color-success-bg:  #dcfce7;

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
  --color-text-muted:  rgba(255, 255, 255, 0.5);
  --color-bg-hover:    rgba(255, 255, 255, 0.1);
}
```

---

## 2. Spacing (Golden Ratio: ~1.618)

```scss
/* Using em units for scalability */
--space-xs:  0.125em;  /* ~2px at 16px base */
--space-sm:  0.25em;   /* ~4px */
--space-md:  0.5em;    /* ~8px */
--space-lg:  0.75em;   /* ~12px */
--space-xl:  1.25em;   /* ~20px - golden ratio jump */
--space-2xl: 2em;      /* ~32px */
```

---

## 3. Typography

```scss
/* Font Sizes (minimal scale) */
--font-xs:   0.75em;   /* 12px */
--font-sm:   0.875em;  /* 14px */
--font-base: 1em;      /* 16px */
--font-lg:   1.125em;  /* 18px */

/* Font Weights */
--font-normal:   400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;

/* Line Heights */
--leading-tight:  1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

---

## 4. Borders

```scss
/* Border Widths (1px and 2px only) */
--border-width:       1px;
--border-width-thick: 2px;

/* Border Radius (3 settings) */
--radius-sm: 0.25em;  /* ~4px - subtle */
--radius-md: 0.5em;   /* ~8px - default */
--radius-lg: 0.75em;  /* ~12px - panel/modal */
```

---

## 5. Shadows & Elevation

```scss
/* Simple shadow system */
--shadow-sm: 0 1px 2px var(--color-shadow);
--shadow-md: 0 4px 6px var(--color-shadow);
--shadow-lg: 0 10px 30px var(--color-shadow);
--shadow-focus: 0 0 0 3px var(--color-focus-shadow);
```

---

## 6. Transitions & Animation

```scss
/* Duration */
--duration-fast:   0.15s;
--duration-normal: 0.3s;
--duration-slow:   0.5s;

/* Easing */
--ease-standard: cubic-bezier(0.5, 0, 0, 1);
--ease-smooth:   ease-in-out;

/* Conditional transitions (respecting prefers-reduced-motion) */
@mixin transition($property: all) {
  @media (prefers-reduced-motion: no-preference) {
    transition: $property var(--duration-fast) var(--ease-smooth);
  }
}
```

---

## 7. Z-Index Scale

```scss
/* Simplified layering */
--z-base:    1;
--z-dropdown: 10;
--z-overlay:  100;
--z-modal:    1000;
--z-toast:    2000;
```

---

## 8. Opacity Scale

```scss
--opacity-disabled:     0.3;
--opacity-muted:        0.6;
--opacity-icon:         0.7;
--opacity-hover:        0.9;
```

---

## File Structure

```
src/styles/design-system/
├── _tokens.scss           # All design tokens in one file
├── _mixins.scss           # Utility mixins (transition, focus-visible, etc.)
└── _index.scss            # Main entry point
```

---

## Usage Example

```scss
/* Component using design tokens */
@use '../../design-system' as ds;

:host {
  /* Use CSS custom properties for runtime theming */
  color: var(--color-text);
  background: var(--color-bg);
  padding: var(--space-md);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);

  /* Or use SCSS variables for compile-time values */
  font-weight: ds.$font-medium;
}

button {
  @include ds.transition(background-color);
  background: var(--color-accent);

  &:hover {
    opacity: var(--opacity-hover);
  }
}
```

---

## Migration Strategy

**Phase 1**: Create new design system files
- `_tokens.scss` with all variables
- `_mixins.scss` with utility functions
- `_index.scss` as main export

**Phase 2**: Keep old `_variables.scss` with mappings for backwards compatibility
```scss
/* Legacy mappings */
$color-primary: var(--color-accent);
$spacing-md: var(--space-md);
/* etc... */
```

**Phase 3**: Gradually migrate components one at a time, starting with simpler ones

---

## Benefits

- ✅ **Minimal**: ~40 tokens total (vs 100+ in original plan)
- ✅ **Flexible**: CSS custom properties allow runtime theming
- ✅ **Scalable**: Em-based spacing scales with font-size
- ✅ **Accessible**: Built-in dark mode and reduced-motion support
- ✅ **Golden ratio**: Visually harmonious spacing progression
- ✅ **PDatetime-aligned**: Follows existing best practices in codebase
