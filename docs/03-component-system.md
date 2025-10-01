# Component System

The Parallelogram-JS component system is built around the `BaseComponent` class, which provides a consistent foundation for all interactive components. This document explains the component architecture, lifecycle, and patterns.

## BaseComponent Architecture

### Core Structure

```javascript
// src/core/BaseComponent.js
export class BaseComponent {
  constructor({ eventBus, logger, router }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.router = router;

    // Primary storage for element states
    this.elements = new WeakMap();

    // Backward-compat alias for older components
    this.states = this.elements;
  }
}
```

**Key Features:**

- **Dependency Injection**: Components receive shared services through constructor
- **WeakMap State Storage**: Automatic garbage collection when elements are removed
- **Service Access**: Direct access to eventBus, logger, and router
- **Backward Compatibility**: Maintains `states` alias for legacy code

### Component Lifecycle Methods

```javascript
class MyComponent extends BaseComponent {
  // Called when component is first attached to an element
  mount(element) {
    if (this.elements.has(element)) return this.update(element);
    const state = this._init(element);
    this.elements.set(element, state);
  }

  // Called when component data or DOM changes
  update(element) {
    const state = this.elements.get(element);
    if (!state) return;
    // Override in subclasses for update logic
  }

  // Called when component is removed from element
  unmount(element) {
    const state = this.elements.get(element);
    if (!state) return;

    try {
      state.cleanup?.();
    } finally {
      this.elements.delete(element);
    }
  }

  // Called when entire component is destroyed
  destroy() {
    for (const element of this._elementsKeys()) {
      this.unmount(element);
    }
  }
}
```

## Component Implementation Pattern

### 1. Basic Component Structure

```javascript
// Example: Toggle Component
import { BaseComponent } from '@peptolab/parallelogram';

export class Toggle extends BaseComponent {
  static get defaults() {
    return {
      activeClass: 'active',
      toggleEvent: 'click',
      closeOnOutsideClick: false,
    };
  }

  _init(element) {
    // Parse configuration from data attributes
    const config = this._getConfiguration(element);

    // Create component state
    const state = {
      isOpen: false,
      config,
      controller: new AbortController(),
      elements: {
        trigger: element,
        target: this._getTarget(element),
      },
      cleanup: () => {
        // Component-specific cleanup
        this._removeActiveClasses(state);
      },
    };

    // Set up event listeners
    this._setupEventListeners(element, state);

    // Initialize component
    this._initializeState(element, state);

    return state;
  }
}
```

### 2. Configuration Management

```javascript
_getConfiguration(element) {
  const defaults = this.constructor.defaults || {};

  // Parse data attributes
  const dataConfig = this._parseDataAttributes(element);

  // Merge with defaults
  return { ...defaults, ...dataConfig };
}

_parseDataAttributes(element) {
  const prefix = this._getAttributePrefix();
  const config = {};

  for (const attr of element.attributes) {
    if (attr.name.startsWith(prefix)) {
      const key = this._camelCase(attr.name.substring(prefix.length));
      config[key] = this._parseAttributeValue(attr.value);
    }
  }

  return config;
}
```

### 3. Event Handling

```javascript
_setupEventListeners(element, state) {
  const { config, controller } = state;

  // DOM event listeners with AbortController cleanup
  element.addEventListener(config.toggleEvent, (event) => {
    this._handleToggle(event, element, state);
  }, { signal: controller.signal });

  // Global event bus listeners
  this.eventBus.on('route:changed', (route) => {
    this._handleRouteChange(route, element, state);
  });

  // Conditional event listeners
  if (config.closeOnOutsideClick) {
    document.addEventListener('click', (event) => {
      this._handleOutsideClick(event, element, state);
    }, { signal: controller.signal });
  }
}
```

### 4. State Management

```javascript
_initializeState(element, state) {
  // Set initial state based on configuration
  if (state.config.initiallyOpen) {
    this._setState(element, state, { isOpen: true });
  }

  // Apply initial classes
  this._updateClasses(element, state);
}

_setState(element, state, updates) {
  // Update state
  Object.assign(state, updates);

  // Update DOM to reflect state
  this._updateClasses(element, state);

  // Emit state change events
  this.eventBus.emit('toggle:stateChanged', {
    element,
    state: { ...state }
  });
}
```

## Advanced Component Patterns

### 1. Component Communication

```javascript
// Event-driven communication between components
class Modal extends BaseComponent {
  _init(element) {
    const state = {
      /* ... */
    };

    // Listen for events from other components
    this.eventBus.on('form:submitted', data => {
      if (data.closeModal) {
        this._close(element, state);
      }
    });

    return state;
  }

  _close(element, state) {
    this._setState(element, state, { isOpen: false });

    // Notify other components
    this.eventBus.emit('modal:closed', {
      element,
      reason: 'programmatic',
    });
  }
}
```

### 2. Component Dependencies

```javascript
// Component that depends on other components
class Carousel extends BaseComponent {
  _init(element) {
    const state = {
      /* ... */
    };

    // Initialize lazy loading for carousel images
    const lazyImages = element.querySelectorAll('[data-lazysrc]');
    lazyImages.forEach(img => {
      // Trigger lazy loading component
      this.eventBus.emit('lazysrc:load', { element: img });
    });

    return state;
  }
}
```

### 3. Performance Optimizations

BaseComponent provides built-in `_debounce` and `_throttle` utility methods to optimize performance:

```javascript
class DataTable extends BaseComponent {
  _init(element) {
    const state = {
      // ... other state

      // Debounced search - delays execution until user stops typing
      debouncedSearch: this._debounce(this._performSearch.bind(this), 300),

      // Throttled scroll handler - limits execution rate
      throttledScroll: this._throttle(this._handleScroll.bind(this), 100),

      // Cached DOM queries for performance
      cachedElements: {
        tbody: element.querySelector('tbody'),
        headers: [...element.querySelectorAll('th')],
        searchInput: element.querySelector('.search-input'),
      },
    };

    // Use debounced search on input
    state.cachedElements.searchInput?.addEventListener('input', state.debouncedSearch);

    return state;
  }

  _performSearch(query) {
    // Search logic here
    console.log('Searching for:', query);
  }

  _handleScroll(event) {
    // Scroll handling logic
    console.log('Scrolled to:', window.scrollY);
  }
}
```

**Debounce vs Throttle:**

- **`_debounce(func, wait)`** - Delays execution until after `wait` milliseconds have elapsed since the last call
  - **Use for:** Search inputs, resize handlers, form validation
  - **Example:** Wait 300ms after user stops typing before searching

- **`_throttle(func, limit)`** - Ensures function is called at most once per `limit` milliseconds
  - **Use for:** Scroll handlers, mouse move tracking, resize events
  - **Example:** Update scroll position at most once every 100ms

```javascript
// Debounce example - waits for user to stop typing
searchInput.addEventListener('input', this._debounce((e) => {
  this.search(e.target.value);
}, 300));

// Throttle example - limits scroll handler execution rate
window.addEventListener('scroll', this._throttle(() => {
  this.updateScrollPosition();
}, 100));
```

## State Storage Patterns

### 1. Simple State

```javascript
_init(element) {
  return {
    isActive: false,
    config: this._getConfiguration(element),
    controller: new AbortController(),
    cleanup: () => { /* cleanup logic */ }
  };
}
```

### 2. Complex State with Nested Data

```javascript
_init(element) {
  return {
    // Component state
    currentSlide: 0,
    isPlaying: false,

    // Configuration
    config: this._getConfiguration(element),

    // DOM references
    elements: {
      container: element,
      slides: [...element.querySelectorAll('.slide')],
      indicators: [...element.querySelectorAll('.indicator')],
      controls: {
        play: element.querySelector('.play-btn'),
        pause: element.querySelector('.pause-btn'),
        prev: element.querySelector('.prev-btn'),
        next: element.querySelector('.next-btn')
      }
    },

    // Timers and intervals
    timers: {
      autoplay: null,
      transition: null
    },

    // Event controller
    controller: new AbortController(),

    // Cleanup function
    cleanup: () => {
      this._clearTimers(state);
      this._resetElements(state);
    }
  };
}
```

### 3. Shared State Management

```javascript
class ComponentWithSharedState extends BaseComponent {
  _init(element) {
    const state = {
      /* ... */
    };

    // Subscribe to shared state changes
    this.eventBus.on('sharedState:updated', data => {
      this._handleSharedStateUpdate(element, state, data);
    });

    // Contribute to shared state
    this.eventBus.emit('sharedState:register', {
      component: this.constructor.name,
      element,
      data: state.config,
    });

    return state;
  }
}
```

## Component Helper Methods

BaseComponent provides a comprehensive set of utility methods to eliminate code duplication across components.

### 1. DOM Utilities

```javascript
class MyComponent extends BaseComponent {
  _init(element) {
    // Get target element from data attribute with validation
    const target = this._getTargetElement(element, 'component-target', { required: true });
    if (!target) return this._init(element);

    // Parse multiple data attributes into config object
    const config = this._getConfigFromAttrs(element, {
      threshold: 'component-threshold',
      duration: 'component-duration',
      autoplay: 'component-autoplay'
    });

    // Generate unique IDs
    const id = element.id || this._generateId('my-component');

    // Create DOM elements
    const button = this._createElement('button', {
      className: 'component__button',
      'aria-label': 'Close',
      dataset: { action: 'close' }
    }, 'Close');

    return { target, config, id, button };
  }
}
```

**Available DOM Methods:**

- **`_getTargetElement(element, dataAttr, options)`** - Get target element from data attribute
  - `element` - Element containing the data attribute
  - `dataAttr` - Attribute name without 'data-' prefix
  - `options.required` - Whether to log warning if not found

- **`_getConfigFromAttrs(element, mapping)`** - Parse multiple data attributes at once
  - `element` - Element with data attributes
  - `mapping` - Object mapping config keys to attribute names
  - Returns configuration object with type conversion

- **`_generateId(prefix)`** - Generate unique ID with optional prefix
  - `prefix` - String prefix (default: 'elem')
  - Returns: `prefix-timestamp-random`

- **`_createElement(tag, attributes, content)`** - Create element with attributes
  - `tag` - HTML tag name
  - `attributes` - Object with attributes (className, style, dataset, etc.)
  - `content` - Text content or HTMLElement child
  - Returns: HTMLElement

### 2. Event Dispatching

```javascript
_dispatchEvent(element, eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail: { element, ...detail }
  });

  element.dispatchEvent(event);

  // Also emit on event bus for component communication
  this.eventBus.emit(eventName, { element, ...detail });
}
```

### 3. Performance Utilities

BaseComponent includes built-in `_debounce` and `_throttle` methods for optimizing event handlers:

```javascript
class SearchComponent extends BaseComponent {
  _init(element) {
    const state = super._init(element);

    const searchInput = element.querySelector('[data-search]');

    // Debounce search - waits until user stops typing
    const debouncedSearch = this._debounce((e) => {
      this.performSearch(e.target.value);
    }, 300);

    searchInput.addEventListener('input', debouncedSearch, {
      signal: state.controller.signal
    });

    return state;
  }

  performSearch(query) {
    // API call or heavy processing
    console.log('Searching for:', query);
  }
}
```

```javascript
class ScrollComponent extends BaseComponent {
  _init(element) {
    const state = super._init(element);

    // Throttle scroll - limits execution rate
    const throttledScroll = this._throttle(() => {
      this.updateScrollPosition();
    }, 100);

    window.addEventListener('scroll', throttledScroll, {
      signal: state.controller.signal,
      passive: true
    });

    return state;
  }

  updateScrollPosition() {
    // Update UI based on scroll position
    console.log('Scroll position:', window.scrollY);
  }
}
```

**Available Performance Methods:**

- `_debounce(func, wait = 300)` - Delays execution until after wait milliseconds
- `_throttle(func, limit = 100)` - Limits execution to once per limit milliseconds
- `_delay(ms)` - Returns promise that resolves after milliseconds

### 4. State Validation

```javascript
class MyComponent extends BaseComponent {
  toggle(element) {
    // Validate state exists before proceeding
    const state = this._requireState(element, 'toggle');
    if (!state) return;

    // Continue with logic
    state.isOpen = !state.isOpen;
    this._updateUI(element, state);
  }

  async loadData(element) {
    const state = this._requireState(element, 'loadData');
    if (!state) return;

    // Use delay helper for timing operations
    await this._delay(500);

    // Fetch and update
    const data = await fetch('/api/data');
    state.data = await data.json();
  }
}
```

**Available State Methods:**

- `_requireState(element, methodName)` - Validate state exists and log warning if not
- `getState(element)` - Get state for element without validation

### 5. Animation & Transition Helpers

BaseComponent provides utilities for smooth animations and transitions:

```javascript
class AnimatedComponent extends BaseComponent {
  async show(element) {
    const state = this._requireState(element, 'show');
    if (!state) return;

    // Fade in element
    state.target.style.display = 'block';
    await this._fadeIn(state.target, 300);

    // Wait for user interaction
    await this._delay(2000);

    // Fade out
    await this._fadeOut(state.target, 300);
    state.target.style.display = 'none';
  }

  async transition(element) {
    const state = this._requireState(element, 'transition');
    if (!state) return;

    // Add transition class
    state.target.classList.add('transitioning');

    // Wait for CSS transition to complete
    await this._waitForTransition(state.target, 500);

    // Cleanup
    state.target.classList.remove('transitioning');
  }
}
```

**Available Animation Methods:**

- `_fadeIn(element, duration = 300)` - Fade element from opacity 0 to 1
- `_fadeOut(element, duration = 300)` - Fade element from opacity 1 to 0
- `_waitForTransition(element, timeout = 2000)` - Wait for CSS transition/animation to complete
- `_delay(ms)` - Simple delay using promises

### 6. Focus Management

For modals, dialogs, and other components requiring focus control:

```javascript
class ModalComponent extends BaseComponent {
  _init(element) {
    const state = super._init(element);

    // Store trigger for focus restoration
    state.triggerElement = null;

    return state;
  }

  open(element, triggerElement) {
    const state = this._requireState(element, 'open');
    if (!state) return;

    // Save trigger for later restoration
    state.triggerElement = triggerElement;

    // Open modal
    element.classList.add('open');

    // Focus first focusable element
    const focusable = this._getFocusableElements(element);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Setup focus trap
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this._trapFocus(element, e);
      }
    }, { signal: state.controller.signal });
  }

  close(element) {
    const state = this._requireState(element, 'close');
    if (!state) return;

    // Close modal
    element.classList.remove('open');

    // Restore focus to trigger
    this._restoreFocus(state.triggerElement);
  }
}
```

**Available Focus Methods:**

- `_getFocusableElements(container)` - Get all focusable elements in container
- `_trapFocus(container, event)` - Trap Tab key within container
- `_restoreFocus(element)` - Restore focus with requestAnimationFrame

```javascript
_animate(element, animation) {
  return new Promise((resolve) => {
    const onAnimationEnd = () => {
      element.removeEventListener('animationend', onAnimationEnd);
      resolve();
    };

    element.addEventListener('animationend', onAnimationEnd);
    element.classList.add(animation);
  });
}

async _transition(element, state, newState) {
  /* Animate out */
  await this._animate(element, 'fade-out');

  /* Update state */
  this._setState(element, state, newState);

  /* Animate in */
  await this._animate(element, 'fade-in');
}
```

## Error Handling in Components

### 1. Graceful Degradation

```javascript
_init(element) {
  try {
    // Attempt enhanced functionality
    const state = this._initializeEnhancedFeatures(element);
    return state;
  } catch (error) {
    this.logger?.warn('Enhanced features failed, falling back to basic functionality', error);
    return this._initializeBasicFeatures(element);
  }
}
```

### 2. Validation and Safety

```javascript
_handleUserAction(event, element, state) {
  // Validate element still exists in DOM
  if (!document.contains(element)) {
    this.logger?.warn('Element no longer in DOM, unmounting component');
    this.unmount(element);
    return;
  }

  // Validate state integrity
  if (!state || !state.config) {
    this.logger?.error('Invalid component state');
    return;
  }

  // Proceed with action
  this._performAction(event, element, state);
}
```

This component system provides a robust foundation for building interactive web components that are maintainable, performant, and follow consistent patterns throughout the framework.
