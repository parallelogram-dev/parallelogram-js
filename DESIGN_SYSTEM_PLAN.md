# Parallelogram Design System Implementation Plan

## Executive Summary

Based on comprehensive analysis of all component SCSS files, this plan outlines the creation of a unified, scalable design system that will:
- **Reduce complexity** by consolidating 50+ unique colors into a structured palette
- **Improve consistency** with standardized spacing, typography, and animation scales
- **Enable theming** with CSS custom properties for dark mode and developer customization
- **Enhance accessibility** with standardized motion preferences and focus states
- **Increase maintainability** through semantic token naming

---

## 1. Design System File Structure

```
src/styles/design-system/
├── _index.scss                    # Main entry point
├── _colors.scss                   # Color tokens
├── _typography.scss               # Typography tokens
├── _spacing.scss                  # Spacing & sizing tokens
├── _borders.scss                  # Border & radius tokens
├── _shadows.scss                  # Elevation & shadow tokens
├── _animation.scss                # Animation & transition tokens
├── _z-index.scss                  # Layering tokens
├── _accessibility.scss            # A11y mixins & tokens
└── _themes.scss                   # Theme overrides (light/dark)
```

---

## 2. Color System

### 2.1 Color Palette Structure

#### Gray Scale (Neutral)
```scss
$gray-50:  #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-400: #9ca3af;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;
```

#### Semantic Colors
```scss
// Primary (Blue)
$primary-50:  #eff6ff;
$primary-100: #dbeafe;
$primary-500: #3b82f6;  // Main
$primary-600: #2563eb;  // Hover
$primary-700: #1d4ed8;  // Active

// Success (Green)
$success-50:  #f0fdf4;
$success-100: #dcfce7;
$success-500: #22c55e;  // Main
$success-600: #16a34a;  // Hover
$success-700: #15803d;  // Active
$success-900: #065f46;  // Dark

// Warning (Orange)
$warning-50:  #fff7ed;
$warning-100: #ffedd5;
$warning-500: #f97316;  // Main
$warning-600: #ea580c;  // Hover
$warning-700: #c2410c;  // Active
$warning-800: #7c2d12;  // Dark

// Error (Red)
$error-50:  #fef2f2;
$error-100: #fee2e2;
$error-500: #ef4444;    // Main
$error-600: #dc2626;    // Hover
$error-700: #b91c1c;    // Active

// Info (Sky)
$info-50:  #f0f9ff;
$info-100: #e0f2fe;
$info-500: #0ea5e9;     // Main
$info-600: #0284c7;     // Hover
$info-900: #0c4a6e;     // Dark
```

### 2.2 Semantic Token Mapping
```scss
// Text colors
$color-text-primary:   $gray-900;
$color-text-secondary: $gray-700;
$color-text-tertiary:  $gray-500;
$color-text-disabled:  $gray-400;
$color-text-inverse:   white;
$color-text-link:      $primary-600;

// Background colors
$color-bg-primary:     white;
$color-bg-secondary:   $gray-50;
$color-bg-tertiary:    $gray-100;
$color-bg-disabled:    $gray-200;
$color-bg-inverse:     $gray-900;
$color-bg-overlay:     rgba(0, 0, 0, 0.45);

// Border colors
$color-border-default:  $gray-300;
$color-border-hover:    $gray-400;
$color-border-focus:    $primary-500;
$color-border-error:    $error-500;
$color-border-disabled: $gray-200;

// State overlays (for hover/active states)
$overlay-black-5:  rgba(0, 0, 0, 0.05);
$overlay-black-10: rgba(0, 0, 0, 0.10);
$overlay-black-20: rgba(0, 0, 0, 0.20);
$overlay-black-50: rgba(0, 0, 0, 0.50);
$overlay-white-10: rgba(255, 255, 255, 0.10);
$overlay-white-20: rgba(255, 255, 255, 0.20);
$overlay-white-50: rgba(255, 255, 255, 0.50);
```

### 2.3 CSS Custom Properties (for theming)
```scss
:root {
  // Core colors
  --color-text-primary: #{$color-text-primary};
  --color-text-secondary: #{$color-text-secondary};
  --color-bg-primary: #{$color-bg-primary};
  --color-bg-secondary: #{$color-bg-secondary};
  --color-border-default: #{$color-border-default};

  // Semantic colors
  --color-primary: #{$primary-500};
  --color-primary-hover: #{$primary-600};
  --color-success: #{$success-500};
  --color-warning: #{$warning-500};
  --color-error: #{$error-500};
  --color-info: #{$info-500};

  // Overlays
  --overlay-hover: #{$overlay-black-5};
  --overlay-active: #{$overlay-black-10};
}

// Dark mode
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #{$gray-50};
    --color-text-secondary: #{$gray-300};
    --color-bg-primary: #{$gray-900};
    --color-bg-secondary: #{$gray-800};
    --color-border-default: #{$gray-700};
    --overlay-hover: #{$overlay-white-10};
    --overlay-active: #{$overlay-white-20};
  }
}
```

---

## 3. Typography System

### 3.1 Font Size Scale
```scss
// Rem-based scale (browser default 16px)
$font-size-xs:   0.75rem;   // 12px
$font-size-sm:   0.875rem;  // 14px
$font-size-base: 1rem;      // 16px
$font-size-md:   1.125rem;  // 18px
$font-size-lg:   1.25rem;   // 20px
$font-size-xl:   1.5rem;    // 24px
$font-size-2xl:  1.875rem;  // 30px
$font-size-3xl:  2.25rem;   // 36px
$font-size-4xl:  3rem;      // 48px

// Em-based for component-internal scaling
$font-size-em-xs:  0.75em;
$font-size-em-sm:  0.875em;
$font-size-em-md:  1em;
$font-size-em-lg:  1.125em;
$font-size-em-xl:  1.25em;
```

### 3.2 Font Weight Scale
```scss
$font-weight-light:    300;
$font-weight-normal:   400;
$font-weight-medium:   500;
$font-weight-semibold: 600;
$font-weight-bold:     700;
$font-weight-extrabold: 800;
```

### 3.3 Line Height Scale
```scss
$line-height-tight:  1.25;   // 1.25em
$line-height-normal: 1.5;    // 1.5em
$line-height-relaxed: 1.75;  // 1.75em
$line-height-loose:  2;      // 2em
```

### 3.4 Letter Spacing
```scss
$letter-spacing-tight:  -0.025em;
$letter-spacing-normal: 0;
$letter-spacing-wide:   0.025em;
$letter-spacing-wider:  0.05em;
$letter-spacing-widest: 0.1em;
```

### 3.5 Font Families
```scss
$font-family-sans:  system-ui, -apple-system, 'Segoe UI', sans-serif;
$font-family-serif: Georgia, Cambria, 'Times New Roman', serif;
$font-family-mono:  'SF Mono', Monaco, 'Cascadia Code', monospace;
$font-family-inherit: inherit;
```

---

## 4. Spacing & Sizing System

### 4.1 Spacing Scale
```scss
// Rem-based spacing scale
$spacing-0:   0;
$spacing-px:  1px;
$spacing-0-5: 0.125rem;  // 2px
$spacing-1:   0.25rem;   // 4px
$spacing-1-5: 0.375rem;  // 6px
$spacing-2:   0.5rem;    // 8px
$spacing-2-5: 0.625rem;  // 10px
$spacing-3:   0.75rem;   // 12px
$spacing-4:   1rem;      // 16px
$spacing-5:   1.25rem;   // 20px
$spacing-6:   1.5rem;    // 24px
$spacing-8:   2rem;      // 32px
$spacing-10:  2.5rem;    // 40px
$spacing-12:  3rem;      // 48px
$spacing-16:  4rem;      // 64px
$spacing-20:  5rem;      // 80px
$spacing-24:  6rem;      // 96px

// Em-based for component-internal scaling
$spacing-em-xs:  0.125em;
$spacing-em-sm:  0.25em;
$spacing-em-md:  0.5em;
$spacing-em-lg:  0.75em;
$spacing-em-xl:  1em;
$spacing-em-2xl: 1.5em;
$spacing-em-3xl: 2em;
```

### 4.2 Component Sizes
```scss
// Form elements
$size-input-sm:  2rem;    // 32px
$size-input-md:  2.5rem;  // 40px
$size-input-lg:  3rem;    // 48px

// Buttons
$size-button-sm: 2rem;    // 32px
$size-button-md: 2.5rem;  // 40px
$size-button-lg: 3rem;    // 48px

// Icons
$size-icon-xs:  0.75rem;  // 12px
$size-icon-sm:  1rem;     // 16px
$size-icon-md:  1.5rem;   // 24px
$size-icon-lg:  2rem;     // 32px
$size-icon-xl:  3rem;     // 48px

// Containers
$size-container-xs:  20rem;   // 320px
$size-container-sm:  24rem;   // 384px
$size-container-md:  28rem;   // 448px
$size-container-lg:  32rem;   // 512px
$size-container-xl:  36rem;   // 576px
$size-container-2xl: 42rem;   // 672px
$size-container-3xl: 48rem;   // 768px
$size-container-4xl: 56rem;   // 896px
$size-container-5xl: 64rem;   // 1024px
$size-container-6xl: 72rem;   // 1152px
```

---

## 5. Borders & Radius System

### 5.1 Border Width
```scss
$border-width-0:  0;
$border-width-sm: 1px;
$border-width-md: 2px;
$border-width-lg: 4px;
$border-width-xl: 8px;
```

### 5.2 Border Radius
```scss
$border-radius-none: 0;
$border-radius-sm:   0.125rem;  // 2px
$border-radius-md:   0.25rem;   // 4px
$border-radius-lg:   0.5rem;    // 8px
$border-radius-xl:   0.75rem;   // 12px
$border-radius-2xl:  1rem;      // 16px
$border-radius-3xl:  1.5rem;    // 24px
$border-radius-full: 9999px;    // Pill shape

// Em-based for component scaling
$border-radius-em-sm: 0.25em;
$border-radius-em-md: 0.5em;
$border-radius-em-lg: 0.75em;
$border-radius-em-xl: 1em;
```

---

## 6. Shadow & Elevation System

### 6.1 Elevation Scale
```scss
$shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
$shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
$shadow-none: none;

// Inner shadows
$shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
```

### 6.2 Focus Shadows
```scss
$shadow-focus-primary:  0 0 0 3px rgba(59, 130, 246, 0.1);
$shadow-focus-error:    0 0 0 3px rgba(239, 68, 68, 0.1);
$shadow-focus-success:  0 0 0 3px rgba(34, 197, 94, 0.1);
$shadow-focus-inset:    inset 0 0 0 2px var(--color-primary);
```

---

## 7. Animation & Transition System

### 7.1 Duration Scale
```scss
$duration-instant: 0;
$duration-fast:    150ms;
$duration-normal:  250ms;
$duration-slow:    350ms;
$duration-slower:  500ms;
$duration-slowest: 1000ms;
```

### 7.2 Easing Functions
```scss
// Named easing curves
$ease-linear:     linear;
$ease-in:         cubic-bezier(0.4, 0, 1, 1);
$ease-out:        cubic-bezier(0, 0, 0.2, 1);
$ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);

// Custom easing
$ease-smooth:     cubic-bezier(0.4, 0, 0.6, 1);
$ease-bounce:     cubic-bezier(0.68, -0.55, 0.265, 1.55);
$ease-sharp:      cubic-bezier(0.4, 0, 0.6, 1);
$ease-standard:   cubic-bezier(0.5, 0, 0, 1);
```

### 7.3 Transform Tokens
```scss
// Common transforms
$transform-center:      translate(-50%, -50%);
$transform-center-x:    translateX(-50%);
$transform-center-y:    translateY(-50%);
$transform-scale-up:    scale(1.05);
$transform-scale-down:  scale(0.95);
$transform-rotate-45:   rotate(45deg);
$transform-rotate-90:   rotate(90deg);
$transform-rotate-180:  rotate(180deg);
```

---

## 8. Z-Index System

```scss
// Layering scale
$z-index-base:     0;
$z-index-dropdown: 100;
$z-index-sticky:   200;
$z-index-fixed:    300;
$z-index-overlay:  400;
$z-index-modal:    500;
$z-index-popover:  600;
$z-index-tooltip:  700;
$z-index-toast:    800;
$z-index-max:      999;
```

---

## 9. Accessibility System

### 9.1 Reduced Motion Mixin
```scss
@mixin motion-safe {
  @media (prefers-reduced-motion: no-preference) {
    @content;
  }
}

@mixin motion-reduce {
  @media (prefers-reduced-motion: reduce) {
    @content;
  }
}

// Usage:
// @include motion-safe {
//   transition: transform 0.3s;
// }
```

### 9.2 Dark Mode Mixin
```scss
@mixin dark-mode {
  @media (prefers-color-scheme: dark) {
    @content;
  }
}

// Usage:
// @include dark-mode {
//   background: $gray-900;
// }
```

### 9.3 Focus Visible Mixin
```scss
@mixin focus-visible {
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
```

### 9.4 Screen Reader Only
```scss
@mixin sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 10. Theme Override System

### 10.1 CSS Custom Property Strategy
All design tokens will be available as CSS custom properties, allowing developers to override them:

```scss
// Component example
.my-component {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-lg);

  // Developers can override in their CSS:
  // .my-component {
  //   --color-bg-primary: blue;
  //   --spacing-4: 2rem;
  // }
}
```

### 10.2 Theme Configuration File
```scss
// _themes.scss
// Developers can create custom theme files

@mixin theme-corporate {
  --color-primary: #003366;
  --color-primary-hover: #002244;
  --border-radius-lg: 0;     // Sharp corners
  --font-family-sans: 'Arial', sans-serif;
}

@mixin theme-playful {
  --color-primary: #ff6b6b;
  --color-primary-hover: #ee5a5a;
  --border-radius-lg: 1rem;  // Rounded
  --font-family-sans: 'Comic Sans MS', cursive; // (please don't actually do this)
}

// Apply theme
:root {
  @include theme-corporate;  // or theme-playful
}
```

---

## 11. Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create all design system SCSS files
2. Generate CSS custom properties
3. Write documentation
4. Create migration guide

### Phase 2: Component Migration (Week 2-3)
**High Priority Components:**
1. PDatetime - Most complex, benefits most from tokens
2. PModal - Widely used, sets precedent
3. PSelect - Theme-aware, good test case
4. PUploader - Already uses some tokens

**Medium Priority:**
5. DataTable
6. Lightbox
7. Tabs
8. Toggle

**Low Priority:**
9. Remaining components

### Phase 3: Testing & Refinement (Week 4)
1. Visual regression testing
2. Dark mode testing
3. Accessibility audit
4. Performance testing
5. Documentation completion

---

## 12. Success Metrics

1. **Code Reduction**: Reduce unique color values from 50+ to <30
2. **Consistency**: 100% of components use design tokens
3. **Dark Mode**: All components support dark mode
4. **Accessibility**: All components respect prefers-reduced-motion
5. **Customization**: Developers can override any token via CSS custom properties
6. **File Size**: CSS bundle size should decrease by 15-20%

---

## 13. Developer Documentation

### 13.1 Quick Start
```scss
// Import design system
@use 'design-system' as ds;

.my-component {
  // Use tokens with ds. prefix
  color: ds.$color-text-primary;
  padding: ds.$spacing-4;
  border-radius: ds.$border-radius-lg;

  // Or use CSS custom properties for runtime theming
  color: var(--color-text-primary);
  padding: var(--spacing-4);
}
```

### 13.2 Token Reference
Complete token reference will be generated and published at:
- `/docs/design-system/colors.md`
- `/docs/design-system/typography.md`
- `/docs/design-system/spacing.md`
- `/docs/design-system/shadows.md`
- `/docs/design-system/animation.md`

---

## 14. Breaking Changes & Backwards Compatibility

**Breaking Changes:**
- Component SCSS files will require design system import
- Some component-specific custom properties will be renamed
- Old variable names will be deprecated

**Backwards Compatibility Strategy:**
1. Keep old `_variables.scss` file as deprecated
2. Map old variable names to new tokens for 2 versions
3. Show deprecation warnings in build
4. Remove old variables in v2.0.0

---

## Next Steps

Once approved, implementation will proceed in this order:

1. ✅ Create design system file structure
2. ✅ Implement color system with dark mode
3. ✅ Implement typography system
4. ✅ Implement spacing/sizing system
5. ✅ Implement borders/radius system
6. ✅ Implement shadow/elevation system
7. ✅ Implement animation system
8. ✅ Implement z-index system
9. ✅ Implement accessibility mixins
10. ✅ Create theme override system
11. ✅ Migrate first component (PDatetime) as proof of concept
12. ✅ Document and iterate
13. ✅ Migrate remaining components

**Estimated Timeline:** 3-4 weeks for complete implementation and testing

**Review Questions:**
1. Are there any additional design tokens you'd like included?
2. Should we add theme presets (corporate, playful, minimal)?
3. Any specific color palette preferences?
4. Should we support CSS-in-JS token exports?