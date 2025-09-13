# Framework Overview

Parallelogram-JS is a progressive enhancement JavaScript framework designed for building robust, accessible, and performant web applications. It follows a component-based architecture that enhances HTML markup rather than replacing it.

## Core Architecture

The framework is built around several key concepts:

```javascript
// Framework initialization
import { ComponentRegistry, EventManager, DevLogger } from '@peptolab/parallelogram';

const registry = ComponentRegistry.create('production');
const eventBus = new EventManager();
const logger = new DevLogger({ level: 'debug' });
```

## Design Principles

### 1. Progressive Enhancement

Components work by enhancing existing HTML markup:

- HTML provides the foundational structure and content
- CSS provides styling and visual design
- JavaScript adds interactive behavior and dynamic functionality

```html
<!-- HTML Foundation -->
<div data-carousel>
  <img src="image1.jpg" alt="Image 1" />
  <img src="image2.jpg" alt="Image 2" />
</div>
```

### 2. Component-Based Architecture

Each component is a self-contained unit that:

- Extends the `BaseComponent` class
- Manages its own state through WeakMap storage
- Provides lifecycle methods (mount, update, unmount)
- Handles cleanup automatically

### 3. Dependency Injection

Components receive their dependencies through constructor injection:

```javascript
class MyComponent extends BaseComponent {
  constructor({ eventBus, logger, router }) {
    super({ eventBus, logger, router });
    // Component now has access to all framework services
  }
}
```

## Framework Layers

### Layer 1: Core System

- **BaseComponent** - Base class for all components
- **ComponentRegistry** - Component registration and loading
- **DevLogger** - Development logging and debugging

### Layer 2: Manager System

- **EventManager** - Global event bus for component communication
- **RouterManager** - Client-side routing and navigation
- **PageManager** - Page lifecycle and transitions
- **AlertManager** - User notifications and alerts
- **TransitionManager** - Smooth transitions between states

### Layer 3: Components

- **Traditional Components** - Extend BaseComponent (Modal, Carousel, etc.)
- **Web Components** - Native custom elements (PModal, PSelect, etc.)
- **Hybrid Components** - Components that work with web components

## Data Flow

```mermaid
graph TB
    A[HTML with data-* attributes] --> B[Component Registry]
    B --> C[Component Loader]
    C --> D[Component Instance]
    D --> E[BaseComponent.mount()]
    E --> F[Component._init()]
    F --> G[State Storage WeakMap]
    G --> H[Event Listeners]
    H --> I[User Interaction]
    I --> J[EventManager.emit()]
    J --> K[Other Components]
```

## Component Communication

Components communicate through multiple channels:

### 1. Event Bus (EventManager)

Global event system for loose coupling:

```javascript
// Component A emits event
this.eventBus.emit('user:action', { data: 'value' });

// Component B listens for event
this.eventBus.on('user:action', payload => {
  // Handle event
});
```

### 2. DOM Events

Standard DOM events for direct interaction:

```javascript
element.dispatchEvent(
  new CustomEvent('modal:open', {
    bubbles: true,
    detail: { modal: this },
  })
);
```

### 3. Router Events

Navigation and routing events:

```javascript
this.router.navigate('/new-page');
this.eventBus.on('router:changed', this._handleRouteChange.bind(this));
```

## State Management

State is managed at multiple levels:

### Component-Level State

Each component instance maintains its own state using WeakMap:

```javascript
class Component extends BaseComponent {
  _init(element) {
    const state = {
      isActive: false,
      data: this._parseDataAttributes(element),
      controller: new AbortController(),
      cleanup: () => {
        // Cleanup logic
      },
    };

    return state;
  }
}
```

### Global State

Shared state through managers and event system:

```javascript
// Through EventManager
this.eventBus.emit('state:update', { key: 'value' });

// Through RouterManager
this.router.getState(); // Current route state

// Through PageManager
pageManager.setPageData({ title: 'New Page' });
```

## Performance Characteristics

### Memory Management

- **WeakMap Usage**: Automatic garbage collection of component states
- **AbortController**: Automatic cleanup of event listeners
- **Lazy Loading**: Components loaded only when needed

### Loading Strategy

```javascript
// Priority-based loading
registry
  .component('critical-component', '[data-critical]', {
    priority: 'critical',
    loader: () => import('./CriticalComponent.js'),
  })
  .component('normal-component', '[data-normal]', {
    priority: 'normal',
    dependsOn: ['critical-component'],
    loader: () => import('./NormalComponent.js'),
  });
```

### Optimization Features

- **Component Dependencies**: Load components in correct order
- **State Cleanup**: Automatic cleanup prevents memory leaks
- **Event Debouncing**: Built-in performance optimizations
- **Selective Enhancement**: Only enhance elements that need it

## Browser Compatibility

The framework is designed to work across modern browsers:

- **ES6+ Features**: Uses modern JavaScript features
- **Graceful Degradation**: Works without JavaScript
- **Progressive Enhancement**: Adds features when supported
- **Web Standards**: Built on standard APIs (WeakMap, AbortController, etc.)

## Development Workflow

Typical development flow:

1. Create HTML structure with semantic markup
2. Add CSS styles for visual design
3. Add `data-*` attributes for enhancement
4. Create component class extending BaseComponent
5. Register component in ComponentRegistry
6. Test progressive enhancement behavior

This architecture ensures that applications are robust, maintainable, and performant while providing an excellent developer experience.
