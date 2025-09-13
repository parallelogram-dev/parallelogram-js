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

```javascript
class DataTable extends BaseComponent {
  _init(element) {
    const state = {
      // ... other state

      // Debounced methods for performance
      debouncedSearch: this._debounce(this._performSearch.bind(this), 300),

      // Cached DOM queries
      cachedElements: {
        tbody: element.querySelector('tbody'),
        headers: [...element.querySelectorAll('th')],
        searchInput: element.querySelector('.search-input'),
      },
    };

    return state;
  }

  _debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
}
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

### 1. DOM Utilities

```javascript
// BaseComponent provides helper methods
class MyComponent extends BaseComponent {
  _init(element) {
    // Get related elements
    const target = this._getTarget(element);
    const triggers = this._getTriggers(element);

    // Parse data attributes
    const config = this._parseDataAttributes(element);

    // Generate unique IDs
    const id = this._generateId('my-component');

    return { target, triggers, config, id };
  }

  _getTarget(element) {
    const selector = element.dataset.target;
    return selector ? document.querySelector(selector) : null;
  }

  _getTriggers(element) {
    const id = element.id;
    return id ? [...document.querySelectorAll(`[data-target="#${id}"]`)] : [];
  }
}
```

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

### 3. Animation Helpers

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
  // Animate out
  await this._animate(element, 'fade-out');

  // Update state
  this._setState(element, state, newState);

  // Animate in
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
