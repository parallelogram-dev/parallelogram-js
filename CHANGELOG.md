# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-01-19

### Added
- Component state management system (ComponentStates.js)
- State-based CSS architecture with attribute selectors
- Multi-component support - multiple components can now mount on same element
- `will-change` performance optimizations in component CSS
- Comprehensive test suite (test/test-state-system.html, test/TEST-CHECKLIST.md)
- TODO.md with framework roadmap and improvement ideas
- Organized test directory with README documentation
- reveal.scss - New component stylesheet for Reveal component
- toggle.scss - New component stylesheet for Toggle component

### Changed
- **BREAKING**: Renamed `data-scrollreveal` to `data-reveal` throughout framework
- Updated Reveal component CSS with optimized transition timing
- State tracking now uses component-specific attributes instead of generic `data-component-mounted`
- BaseComponent now supports `stateAttribute` parameter and state management methods
- ComponentRegistry extracts state attribute from selectors automatically
- Updated all demos to use current attribute naming conventions
- Reorganized documentation into subdirectories (architecture/, getting-started/, guides/, reference/)
- Updated all documentation package names (`@peptolab/parallelogram` → `@parallelogram-js/core`)
- Updated documentation import paths (removed unnecessary `/dist/` prefix)
- Removed emojis from all documentation and demo files

### Fixed
- Critical bug where multiple components couldn't mount on same element
- Reveal component initial state timing (elements now start hidden immediately)
- Lazysrc error state styling (changed from border to box-shadow to prevent layout shift)
- Demo component registry to use `[data-reveal]` selector
- Documentation accuracy across all guides and references

### Performance
- Added `will-change` CSS property to active animation states in:
  - Reveal component (revealing state)
  - Lazysrc component (loading state)
  - Toggle component (opening/closing states)
  - Lightbox component (active animation states)

## [0.1.1] - 2025-01-19

### Added
- Simplified API with `createApp()` and `app.run()` methods
- Web component lazy-loading support via `WebComponentLoader`
- Documentation for simplified API (simplified-api.md)
- Documentation for web component lazy-loading (web-component-lazy-loading.md)

### Changed
- Improved async/defer script handling in initialization
- Enhanced ComponentRegistry validation and error messaging

## [0.1.0] - 2025-01-18

### Changed
- **BREAKING**: Package renamed from `@peptolab/parallelogram` to `@parallelogram-js/core`
- **BREAKING**: Version reset to 0.1.0 for pre-release status
- Updated all documentation to reflect new package name
- Updated README with comprehensive usage examples
- Reorganized under @parallelogram-js organization

### Added
- Comprehensive Web Components documentation (`docs/08-web-components-guide.md`)
- Migration guide for existing projects (`docs/09-migration-guide.md`)
- Quick reference guide for Web Components (`docs/WEB-COMPONENTS-QUICK-REF.md`)
- Import paths reference documentation (`docs/IMPORT-PATHS.md`)
- Clear distinction between Regular Components and Web Components in all docs

### Documentation
- Clarified that Web Components (PModal, PDatetime, PSelect, PToasts, PUploader) should NOT be registered in ComponentRegistry
- Added troubleshooting section for common Web Component issues
- Added framework integration examples (React, Vue, Svelte)
- Added form integration documentation
- Updated all import examples to use `@parallelogram-js/core`

## Migration from @peptolab/parallelogram

If migrating from the old package:

1. Update package.json:
   ```diff
   - "@peptolab/parallelogram": "^1.2.9"
   + "@parallelogram-js/core": "^0.1.0"
   ```

2. Update all imports:
   ```diff
   - import { ComponentRegistry } from '@peptolab/parallelogram';
   + import { ComponentRegistry } from '@parallelogram-js/core';

   - import '@peptolab/parallelogram/components/PModal.js';
   + import '@parallelogram-js/core/components/PModal.js';
   ```

3. Run:
   ```bash
   npm uninstall @peptolab/parallelogram
   npm install @parallelogram-js/core
   ```

## Previous Versions (as @peptolab/parallelogram)

### [1.2.9] - 2025-01-XX
- Improve Lazysrc picture element support
- Fix page transition flicker in PageManager
- Various bug fixes

### [1.2.8] - 2025-01-XX
- Bug fixes and improvements

### [1.2.7] - 2025-01-XX
- Performance improvements
- Component enhancements