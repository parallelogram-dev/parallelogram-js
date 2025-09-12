# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Build the framework (includes both JS and CSS compilation)
- `npm run build-css` - Build CSS only (compiles SCSS and minifies to dist/)
- `npm run compile-scss` - Compile main SCSS to CSS (src/styles/index.scss → dist/styles/index.css)
- `npm run compile-scss-components` - Compile individual component SCSS files
- `npm run minify-css` - Minify compiled CSS (creates index.min.css)
- `npm run build-all-css` - Complete CSS build pipeline with components
- `npm run demo` - Build and serve demo at localhost:3000
- `npm run build-demo` - Build demo files only
- `npm prepublishOnly` - Runs before publishing (calls build)

## Architecture Overview

Parallelogram-JS is a progressive enhancement JavaScript framework with a component-based architecture:

### Core Architecture
- **BaseComponent** (`src/core/BaseComponent.js`) - Base class all components extend from
  - Provides lifecycle management (mount, unmount, update)
  - Element state tracking via WeakMap
  - Data attribute parsing helpers
  - Event dispatching and cleanup via AbortController
- **ComponentRegistry** (`src/core/ComponentRegistry.js`) - Registry system for component configuration and dependency management

### Directory Structure
- `src/components/` - Individual component implementations
- `src/core/` - Core framework classes (BaseComponent, ComponentRegistry, etc.)
- `src/managers/` - System managers (EventManager, RouterManager, PageManager, etc.)
- `src/styles/` - SCSS files with modern architecture:
  - `reset.scss` - Comprehensive CSS reset with accessibility support
  - `settings.scss` - Design system variables and tokens
  - `index.scss` - Main entry point using @use directives
  - `components/` - Individual component SCSS files following BEM methodology
- `dist/` - Built output (ESM modules for each component + compiled CSS)

### Component System
Components follow a progressive enhancement pattern:
- HTML-first with `data-[component]-[param]` attributes
- BEM CSS class naming (`.block__element--modifier`)
- Each component builds to separate ESM module in `dist/components/`
- Components extend BaseComponent and implement `_init(element)` method

### Build System
- **JavaScript**: Rollup-based with separate builds for each component
- **CSS**: Modern SCSS compilation using Dart Sass
  - Main entry: `src/styles/index.scss` compiles to `dist/styles/index.css`
  - Modern `@use` directives (no deprecated `@import`)
  - Automatic minification to `dist/styles/index.min.css`
  - Strong BEM methodology with nested selectors
  - Comprehensive CSS reset and design system integration
- Components can be imported individually or as a bundle
- CSS custom properties for theming with fallback support