# Test Files

This directory contains test files and test documentation for the Parallelogram-JS framework.

## Test Pages

### test-state-system.html
Comprehensive test page for the component state management system. Tests:
- Multiple components on the same element (Lazysrc + Reveal)
- Component state transitions
- State attribute updates
- Multi-component compatibility
- FIFO queue staggering for reveal animations

**How to run:**
```bash
npm run demo
# Then navigate to http://localhost:3000/test/test-state-system.html
```

### test-picture-lazysrc.html
Test page specifically for lazy loading `<picture>` elements with Lazysrc component.

**How to run:**
```bash
npm run demo
# Then navigate to http://localhost:3000/test/test-picture-lazysrc.html
```

## Test Documentation

### TEST-CHECKLIST.md
Detailed test checklist and validation procedures for the state management system. Includes:
- Step-by-step test procedures
- Expected behaviors
- Console inspection commands
- Success criteria
- Known issues to watch for

**Use this checklist when:**
- Testing state management changes
- Validating multi-component functionality
- Debugging component mounting issues
- Verifying state transitions

## Running Tests

All test pages are served via the demo server:

```bash
npm run demo
```

Then navigate to:
- http://localhost:3000/test/test-state-system.html
- http://localhost:3000/test/test-picture-lazysrc.html

## Test Setup

The `setup.js` file contains any shared test utilities or configuration used across test files.