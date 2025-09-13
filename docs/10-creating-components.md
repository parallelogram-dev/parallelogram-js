# Creating Components

This guide walks you through creating components in Parallelogram-JS, from basic enhancements to complex interactive features.

## Quick Start

### 1. Basic Component Template

```javascript
// src/components/Mycomponent.js
import { BaseComponent } from '@peptolab/parallelogram';

export default class Mycomponent extends BaseComponent {
  static get defaults() {
    return {
      // Default configuration values
      activeClass: 'active',
      duration: 300,
      autoStart: false,
    };
  }

  _init(element) {
    // Get configuration from data attributes + defaults
    const config = this._getConfiguration(element);

    // Create component state
    const state = {
      isActive: config.autoStart,
      config,
      controller: new AbortController(),
      elements: {
        trigger: element,
        target: this._getTarget(element),
      },
      cleanup: () => {
        // Component cleanup logic
        this._removeActiveClass(element, state);
      },
    };

    // Set up event listeners
    this._setupEventListeners(element, state);

    // Initialize component
    this._initializeState(element, state);

    return state;
  }

  _setupEventListeners(element, state) {
    // DOM event listeners with cleanup
    element.addEventListener(
      'click',
      event => {
        this._handleClick(event, element, state);
      },
      { signal: state.controller.signal }
    );

    // Global event listeners
    this.eventBus.on('app:theme-changed', theme => {
      this._handleThemeChange(element, state, theme);
    });
  }

  _handleClick(event, element, state) {
    event.preventDefault();

    // Toggle state
    const newState = !state.isActive;
    this._setState(element, state, { isActive: newState });

    // Emit event
    this._dispatchEvent(element, 'mycomponent:toggled', {
      isActive: newState,
    });
  }

  _setState(element, state, updates) {
    // Update state
    Object.assign(state, updates);

    // Update DOM
    this._updateDOM(element, state);
  }

  _updateDOM(element, state) {
    element.classList.toggle(state.config.activeClass, state.isActive);
    element.setAttribute('aria-expanded', state.isActive);

    if (state.elements.target) {
      state.elements.target.classList.toggle('visible', state.isActive);
    }
  }
}
```

### 2. Register Component

```javascript
// In your app initialization
registry.component('mycomponent', '[data-mycomponent]', {
  priority: 'normal',
  loader: () => import('./components/Mycomponent.js'),
});
```

### 3. HTML Usage

```html
<!-- Basic usage -->
<div data-mycomponent>
    <button>Toggle</button>
    <div data-target>Content to toggle</div>
</div>

<!-- With configuration -->
<div
    data-mycomponent
    data-mycomponent-active-class="highlight"
    data-mycomponent-duration="500"
    data-mycomponent-auto-start="true"
>
    <button>Toggle</button>
    <div data-target>Content</div>
</div>
```

## Step-by-Step Development

### Step 1: Plan Your Component

Before coding, define:

```javascript
/**
 * Component Planning Checklist:
 *
 * 1. What HTML structure will it enhance?
 * 2. What user interactions will it handle?
 * 3. What configuration options are needed?
 * 4. What events will it emit?
 * 5. What dependencies does it have?
 * 6. How will it handle errors?
 * 7. What cleanup is required?
 */
```

### Step 2: Define Component Structure

```javascript
// Example: Image Carousel Component
import { BaseComponent } from '@peptolab/parallelogram';

export default class Carousel extends BaseComponent {
  static get defaults() {
    return {
      autoplay: false,
      duration: 5000,
      transition: 'slide',
      indicators: true,
      controls: true,
      loop: true,
      startIndex: 0,
    };
  }

  _init(element) {
    // Validate required elements
    if (!this._validateStructure(element)) {
      throw new Error('Invalid carousel structure');
    }

    const config = this._getConfiguration(element);
    const slides = [...element.querySelectorAll('.slide')];

    const state = {
      currentIndex: config.startIndex,
      totalSlides: slides.length,
      isPlaying: config.autoplay,
      config,

      elements: {
        container: element,
        track: element.querySelector('.carousel-track'),
        slides,
        indicators: this._createIndicators(element, slides.length),
        prevBtn: this._createButton(element, 'prev'),
        nextBtn: this._createButton(element, 'next'),
        playBtn: this._createButton(element, 'play'),
      },

      timers: {
        autoplay: null,
        transition: null,
      },

      controller: new AbortController(),

      cleanup: () => {
        this._clearTimers(state);
        this._removeGeneratedElements(state);
      },
    };

    // Initialize carousel
    this._setupEventListeners(element, state);
    this._setupAccessibility(element, state);
    this._initializeSlides(element, state);

    if (state.isPlaying) {
      this._startAutoplay(state);
    }

    return state;
  }

  _validateStructure(element) {
    // Check required elements exist
    const track = element.querySelector('.carousel-track');
    const slides = element.querySelectorAll('.slide');

    if (!track || slides.length === 0) {
      this.logger?.error('Carousel requires .carousel-track and .slide elements');
      return false;
    }

    return true;
  }

  // ... rest of implementation
}
```

### Step 3: Implement Event Handling

```javascript
_setupEventListeners(element, state) {
    const { elements, controller } = state;

    // Navigation controls
    if (elements.prevBtn) {
        elements.prevBtn.addEventListener('click', () => {
            this._goToPrevious(element, state);
        }, { signal: controller.signal });
    }

    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', () => {
            this._goToNext(element, state);
        }, { signal: controller.signal });
    }

    // Indicator clicks
    elements.indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            this._goToSlide(element, state, index);
        }, { signal: controller.signal });
    });

    // Keyboard navigation
    element.addEventListener('keydown', (event) => {
        this._handleKeyboard(event, element, state);
    }, { signal: controller.signal });

    // Touch/swipe support
    this._setupTouchEvents(element, state);

    // Intersection observer for autoplay pause
    this._setupVisibilityDetection(element, state);

    // Global events
    this.eventBus.on('page:visibility-changed', (visible) => {
        this._handleVisibilityChange(element, state, visible);
    });

    // Resize handling
    window.addEventListener('resize',
        this._debounce(() => this._handleResize(element, state), 250),
        { signal: controller.signal }
    );
}
```

### Step 4: State Management

```javascript
_goToSlide(element, state, index, direction = 'forward') {
    // Validate index
    if (index < 0 || index >= state.totalSlides) {
        return;
    }

    // Prevent rapid transitions
    if (state.isTransitioning) {
        return;
    }

    const previousIndex = state.currentIndex;

    // Emit before event (cancelable)
    const beforeEvent = this._dispatchEvent(element, 'carousel:before-change', {
        from: previousIndex,
        to: index,
        direction
    });

    if (beforeEvent.defaultPrevented) {
        return;
    }

    // Update state
    state.isTransitioning = true;
    state.currentIndex = index;

    // Perform transition
    this._performTransition(element, state, previousIndex, index, direction)
        .then(() => {
            // Transition complete
            state.isTransitioning = false;

            // Update indicators
            this._updateIndicators(state);

            // Update accessibility
            this._updateAccessibility(element, state);

            // Emit after event
            this._dispatchEvent(element, 'carousel:changed', {
                from: previousIndex,
                to: index,
                direction
            });
        })
        .catch(error => {
            state.isTransitioning = false;
            this.logger?.error('Carousel transition failed:', error);

            this._dispatchEvent(element, 'carousel:error', {
                error,
                action: 'transition'
            });
        });
}

async _performTransition(element, state, fromIndex, toIndex, direction) {
    const { elements, config } = state;
    const { slides, track } = elements;

    // Calculate transform
    const translateX = -toIndex * 100;

    // Apply transition
    track.style.transition = `transform ${config.transitionDuration}ms ease`;
    track.style.transform = `translateX(${translateX}%)`;

    // Wait for transition to complete
    return new Promise((resolve, reject) => {
        const onTransitionEnd = (event) => {
            if (event.target === track && event.propertyName === 'transform') {
                track.removeEventListener('transitionend', onTransitionEnd);
                resolve();
            }
        };

        track.addEventListener('transitionend', onTransitionEnd);

        // Fallback timeout
        setTimeout(() => {
            track.removeEventListener('transitionend', onTransitionEnd);
            resolve();
        }, config.transitionDuration + 100);
    });
}
```

### Step 5: Accessibility Implementation

```javascript
_setupAccessibility(element, state) {
    const { elements } = state;

    // Set ARIA roles
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', 'Image carousel');

    elements.track.setAttribute('role', 'group');
    elements.track.setAttribute('aria-live', 'polite');

    // Set up slides
    elements.slides.forEach((slide, index) => {
        slide.setAttribute('role', 'tabpanel');
        slide.setAttribute('aria-roledescription', 'slide');
        slide.setAttribute('aria-label', `Slide ${index + 1} of ${state.totalSlides}`);
        slide.setAttribute('tabindex', index === state.currentIndex ? '0' : '-1');
    });

    // Set up controls
    if (elements.prevBtn) {
        elements.prevBtn.setAttribute('aria-label', 'Previous slide');
    }

    if (elements.nextBtn) {
        elements.nextBtn.setAttribute('aria-label', 'Next slide');
    }

    // Set up indicators
    elements.indicators.forEach((indicator, index) => {
        indicator.setAttribute('role', 'tab');
        indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
        indicator.setAttribute('tabindex', '0');
    });

    this._updateAccessibility(element, state);
}

_updateAccessibility(element, state) {
    const { elements, currentIndex } = state;

    // Update slide focus management
    elements.slides.forEach((slide, index) => {
        const isActive = index === currentIndex;
        slide.setAttribute('tabindex', isActive ? '0' : '-1');
        slide.setAttribute('aria-hidden', !isActive);
    });

    // Update indicators
    elements.indicators.forEach((indicator, index) => {
        const isActive = index === currentIndex;
        indicator.setAttribute('aria-selected', isActive);
        indicator.classList.toggle('active', isActive);
    });

    // Update live region
    elements.track.setAttribute('aria-label',
        `Slide ${currentIndex + 1} of ${state.totalSlides}`);
}
```

## Advanced Patterns

### 1. Component Composition

```javascript
// Base behavior component
class InteractiveElement extends BaseComponent {
  _setupInteractivity(element, state) {
    // Common interactive patterns
    this._setupFocusManagement(element, state);
    this._setupKeyboardNavigation(element, state);
    this._setupTouchGestures(element, state);
  }
}

// Specific component extends base
class Carousel extends InteractiveElement {
  _init(element) {
    const state = super._init(element);

    // Add carousel-specific behavior
    this._setupSlideTransitions(element, state);
    this._setupAutoplay(element, state);

    return state;
  }
}
```

### 2. Plugin System

```javascript
class Carousel extends BaseComponent {
  _init(element) {
    const state = {
      /* ... */
    };

    // Load plugins based on configuration
    this._loadPlugins(element, state);

    return state;
  }

  _loadPlugins(element, state) {
    const { config } = state;

    if (config.thumbnails) {
      this.thumbnailPlugin = new ThumbnailPlugin(element, state, this);
    }

    if (config.zoom) {
      this.zoomPlugin = new ZoomPlugin(element, state, this);
    }

    if (config.lazyLoad) {
      this.lazyLoadPlugin = new LazyLoadPlugin(element, state, this);
    }
  }
}

// Plugin example
class ThumbnailPlugin {
  constructor(element, state, carousel) {
    this.element = element;
    this.state = state;
    this.carousel = carousel;

    this._createThumbnails();
    this._setupEvents();
  }

  _createThumbnails() {
    // Create thumbnail navigation
  }

  _setupEvents() {
    // Listen to carousel events
    this.carousel.eventBus.on('carousel:changed', data => {
      this._updateThumbnails(data.to);
    });
  }
}
```

### 3. Component Testing

```javascript
// Test helper
class ComponentTester {
  static async createComponent(ComponentClass, html, config = {}) {
    // Create test environment
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const element = container.firstElementChild;

    // Apply configuration
    Object.entries(config).forEach(([key, value]) => {
      element.setAttribute(`data-component-${key}`, value);
    });

    // Create component instance
    const eventBus = new EventManager();
    const logger = new DevLogger({}, false);

    const component = new ComponentClass({ eventBus, logger });

    // Mount component
    component.mount(element);

    return { component, element, container, eventBus, logger };
  }

  static cleanup(testData) {
    const { component, element, container } = testData;

    component.unmount(element);
    document.body.removeChild(container);
  }
}

// Test example
describe('Mycomponent', () => {
  test('should toggle active state on click', async () => {
    const { component, element, container } = await ComponentTester.createComponent(
      Mycomponent,
      '<div data-mycomponent><button>Toggle</button></div>'
    );

    const button = element.querySelector('button');

    // Test initial state
    expect(element.classList.contains('active')).toBe(false);

    // Simulate click
    button.click();

    // Test updated state
    expect(element.classList.contains('active')).toBe(true);

    ComponentTester.cleanup({ component, element, container });
  });
});
```

## Best Practices

### 1. Configuration Management

```javascript
// Use consistent data attribute naming
// data-component-option-name

// Provide sensible defaults
static get defaults() {
    return {
        // Use semantic names
        isEnabled: true,
        animationDuration: 300,
        easing: 'ease-in-out',

        // Include units in names where helpful
        delayMs: 0,
        maxWidth: '100%',

        // Use descriptive boolean names
        enableKeyboardNavigation: true,
        closeOnOutsideClick: false
    };
}
```

### 2. Error Handling

```javascript
_init(element) {
    try {
        return this._safeInit(element);
    } catch (error) {
        this.logger?.error(`Failed to initialize ${this.constructor.name}:`, error);

        // Return minimal safe state
        return {
            error: true,
            controller: new AbortController(),
            cleanup: () => {}
        };
    }
}

_safeInit(element) {
    // Validate prerequisites
    this._validateElement(element);
    this._validateBrowserSupport();

    // Normal initialization
    return this._normalInit(element);
}
```

### 3. Performance Optimization

```javascript
// Debounce expensive operations
_setupEventListeners(element, state) {
    window.addEventListener('resize',
        this._debounce(() => this._handleResize(element, state), 250),
        { signal: state.controller.signal }
    );

    element.addEventListener('scroll',
        this._throttle(() => this._handleScroll(element, state), 16),
        { signal: state.controller.signal }
    );
}

// Cache expensive DOM queries
_init(element) {
    const state = {
        // Cache DOM references
        cachedElements: {
            buttons: [...element.querySelectorAll('button')],
            inputs: [...element.querySelectorAll('input')],
            panels: [...element.querySelectorAll('.panel')]
        }
    };

    return state;
}
```

This guide provides the foundation for creating robust, accessible, and maintainable components in the Parallelogram-JS framework.
