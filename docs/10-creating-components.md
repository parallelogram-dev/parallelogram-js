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

### 1. Progressive Enhancement with Fragment Loading

This example shows how to enhance a native `<select>` element to load and replace content fragments using the framework's RouterManager, EventManager, and other built-in managers.

```javascript
// src/components/SelectLoader.js
import { BaseComponent } from '@peptolab/parallelogram';

/**
 * SelectLoader Component
 *
 * Enhances a native <select> element to load HTML fragments using RouterManager
 * and replace content in a target container when the selection changes.
 *
 * @example
 * <!-- HTML -->
 * <select data-selectloader
 *         data-selectloader-target="#content-area">
 *   <option value="">Select an option...</option>
 *   <option value="/fragments/option1">Option 1</option>
 *   <option value="/fragments/option2">Option 2</option>
 * </select>
 *
 * <div id="content-area">
 *   <!-- Content will be loaded here -->
 * </div>
 */
export default class SelectLoader extends BaseComponent {
  static get defaults() {
    return {
      loadingClass: 'loading',
      errorClass: 'error',
      transition: 'fade',        // 'fade', 'slide', 'none'
      transitionDuration: 300,
      retainScroll: false,
      emptyMessage: 'Please select an option',
    };
  }

  /**
   * Initialize the select loader
   * @param {HTMLSelectElement} element - Select element to enhance
   * @returns {Object} Component state
   */
  _init(element) {
    const state = super._init(element);

    // Validate it's a select element
    if (element.tagName !== 'SELECT') {
      this.logger?.error('SelectLoader: Element must be a <select>', { element });
      return state;
    }

    // Get configuration using BaseComponent helper
    const config = this._getConfigFromAttrs(element, {
      target: 'selectloader-target',
      loadingClass: 'selectloader-loading-class',
      errorClass: 'selectloader-error-class',
      transition: 'selectloader-transition',
      transitionDuration: 'selectloader-transition-duration',
      retainScroll: 'selectloader-retain-scroll',
      emptyMessage: 'selectloader-empty-message',
    });

    // Get target container using BaseComponent helper
    const targetElement = this._getTargetElement(element, 'selectloader-target', {
      required: true
    });

    if (!targetElement) {
      return state;
    }

    // Store state
    state.config = { ...SelectLoader.defaults, ...config };
    state.targetElement = targetElement;
    state.isLoading = false;
    state.currentUrl = null;
    state.scrollPosition = 0;

    // Setup event listeners
    this._setupEventListeners(element, state);

    // Initial load if select has a value
    if (element.value) {
      this._loadFragment(element, state, element.value);
    } else {
      this._showEmptyMessage(state);
    }

    this.logger?.info('SelectLoader initialized', {
      element,
      target: config.target,
      options: element.options.length
    });

    return state;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners(element, state) {
    // Listen for select changes
    element.addEventListener('change', (event) => {
      this._handleChange(event, element, state);
    }, { signal: state.controller.signal });

    // Listen for form resets
    const form = element.closest('form');
    if (form) {
      form.addEventListener('reset', async () => {
        await this._delay(10);
        this._showEmptyMessage(state);
      }, { signal: state.controller.signal });
    }

    // Listen for router navigation events via EventManager
    this.eventBus?.on('router:navigate-success', (data) => {
      // Check if target still exists after navigation
      if (state.targetElement && !document.contains(state.targetElement)) {
        this.logger?.warn('SelectLoader: Target removed during navigation');
      }
    });
  }

  /**
   * Handle select change event
   * @private
   */
  async _handleChange(event, element, state) {
    const value = element.value;

    // Emit cancelable event via BaseComponent helper
    const beforeEvent = this._dispatch(element, 'selectloader:before-change', {
      value,
      previousUrl: state.currentUrl,
      targetElement: state.targetElement
    });

    if (beforeEvent.defaultPrevented) {
      this.logger?.debug('SelectLoader: Change prevented by listener');
      return;
    }

    // Handle empty selection
    if (!value || value === '') {
      this._showEmptyMessage(state);
      state.currentUrl = null;

      this._dispatch(element, 'selectloader:cleared', {
        targetElement: state.targetElement
      });
      return;
    }

    // Load the fragment
    await this._loadFragment(element, state, value);
  }

  /**
   * Load HTML fragment using RouterManager
   * @private
   */
  async _loadFragment(element, state, url) {
    // Prevent concurrent loads
    if (state.isLoading) {
      this.logger?.warn('SelectLoader: Load already in progress');
      return;
    }

    state.isLoading = true;
    state.currentUrl = url;

    // Store scroll position if needed
    if (state.config.retainScroll) {
      state.scrollPosition = state.targetElement.scrollTop;
    }

    // Apply loading state
    element.classList.add(state.config.loadingClass);
    element.disabled = true;
    state.targetElement.classList.add(state.config.loadingClass);

    // Emit loading event
    this._dispatch(element, 'selectloader:loading', {
      url,
      targetElement: state.targetElement
    });

    try {
      // Use RouterManager to fetch the fragment
      if (!this.router) {
        throw new Error('RouterManager not available');
      }

      const result = await this.router.get(url);
      const html = result.data;

      // Transition out old content
      if (state.config.transition !== 'none') {
        await this._transitionOut(state);
      }

      // Replace content
      state.targetElement.innerHTML = html;

      // Restore scroll position
      if (state.config.retainScroll) {
        state.targetElement.scrollTop = state.scrollPosition;
      }

      // Transition in new content
      if (state.config.transition !== 'none') {
        await this._transitionIn(state);
      }

      // Emit success via BaseComponent _dispatch and EventManager
      this._dispatch(element, 'selectloader:loaded', {
        url,
        targetElement: state.targetElement,
        html
      });

      // EventManager will propagate this event
      this.eventBus?.emit('selectloader:content-loaded', {
        element,
        url,
        targetElement: state.targetElement
      });

      this.logger?.info('SelectLoader: Fragment loaded', { url });

    } catch (error) {
      this.logger?.error('SelectLoader: Load failed', { url, error });

      // Show error message
      this._showErrorMessage(state, error);

      // Emit error event
      this._dispatch(element, 'selectloader:error', {
        url,
        error,
        targetElement: state.targetElement
      });

      // Could notify via toast/alert if available
      this.eventBus?.emit('app:notification', {
        type: 'error',
        message: `Failed to load content: ${error.message}`,
        duration: 5000
      });

    } finally {
      // Remove loading state
      state.isLoading = false;
      element.classList.remove(state.config.loadingClass);
      element.disabled = false;
      state.targetElement.classList.remove(state.config.loadingClass);

      this._dispatch(element, 'selectloader:complete', {
        url,
        success: !state.targetElement.classList.contains(state.config.errorClass)
      });
    }
  }

  /**
   * Transition out old content using BaseComponent helpers
   * @private
   */
  async _transitionOut(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeOut(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideOut(state.targetElement, transitionDuration);
    }
  }

  /**
   * Transition in new content using BaseComponent helpers
   * @private
   */
  async _transitionIn(state) {
    const { transition, transitionDuration } = state.config;

    if (transition === 'fade') {
      await this._fadeIn(state.targetElement, transitionDuration);
    } else if (transition === 'slide') {
      await this._slideIn(state.targetElement, transitionDuration);
    }
  }

  /**
   * Slide out animation
   * @private
   */
  async _slideOut(element, duration) {
    const height = element.offsetHeight;
    element.style.overflow = 'hidden';
    element.style.height = `${height}px`;
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.height = '0';
    element.style.opacity = '0';

    await this._delay(duration);
  }

  /**
   * Slide in animation
   * @private
   */
  async _slideIn(element, duration) {
    const scrollHeight = element.scrollHeight;
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.offsetHeight; /* Force reflow */

    element.style.transition = `height ${duration}ms ease-in, opacity ${duration}ms ease-in`;
    element.style.height = `${scrollHeight}px`;
    element.style.opacity = '1';

    await this._delay(duration);

    /* Cleanup */
    element.style.height = '';
    element.style.overflow = '';
    element.style.transition = '';
  }

  /**
   * Show empty message
   * @private
   */
  _showEmptyMessage(state) {
    const message = state.config.emptyMessage;
    state.targetElement.innerHTML = `
      <div class="select-loader__empty">
        <p>${message}</p>
      </div>
    `;
    state.targetElement.classList.remove(state.config.errorClass);
  }

  /**
   * Show error message with retry button
   * @private
   */
  _showErrorMessage(state, error) {
    const message = error.message || 'Failed to load content';
    const retryId = this._generateId('retry');

    state.targetElement.innerHTML = `
      <div class="select-loader__error">
        <p>${message}</p>
        <button type="button" id="${retryId}" class="btn btn--sm">Retry</button>
      </div>
    `;
    state.targetElement.classList.add(state.config.errorClass);

    // Setup retry button using BaseComponent event handling
    const retryButton = document.getElementById(retryId);
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        // Find the select element from state
        const element = Array.from(document.querySelectorAll('select')).find(
          el => this.getState(el) === state
        );
        if (element && state.currentUrl) {
          this._loadFragment(element, state, state.currentUrl);
        }
      }, { once: true });
    }
  }

  /**
   * Public API: Reload current fragment
   */
  reload(element) {
    const state = this._requireState(element, 'reload');
    if (!state || !state.currentUrl) return;

    this._loadFragment(element, state, state.currentUrl);
  }

  /**
   * Public API: Load specific URL
   */
  load(element, url) {
    const state = this._requireState(element, 'load');
    if (!state) return;

    element.value = url;
    this._loadFragment(element, state, url);
  }

  /**
   * Public API: Clear selection and content
   */
  clear(element) {
    const state = this._requireState(element, 'clear');
    if (!state) return;

    element.value = '';
    this._showEmptyMessage(state);
    state.currentUrl = null;
  }

  /**
   * Public API: Get current load state
   */
  getLoadState(element) {
    const state = this.getState(element);
    return state ? {
      isLoading: state.isLoading,
      currentUrl: state.currentUrl,
      hasContent: state.targetElement.children.length > 0,
      hasError: state.targetElement.classList.contains(state.config.errorClass)
    } : null;
  }
}
```

#### HTML Usage Examples

```html
<!-- Basic usage with CSS selector -->
<select data-selectloader data-selectloader-target="#content">
  <option value="">Choose a category...</option>
  <option value="/fragments/electronics">Electronics</option>
  <option value="/fragments/clothing">Clothing</option>
  <option value="/fragments/books">Books</option>
</select>

<div id="content">
  <!-- Fragment content loaded here -->
</div>

<!-- Using data-view (RECOMMENDED for consistency with PageManager) -->
<select data-selectloader data-selectloader-target-view="content">
  <option value="">Choose a category...</option>
  <option value="/fragments/electronics">Electronics</option>
  <option value="/fragments/clothing">Clothing</option>
  <option value="/fragments/books">Books</option>
</select>

<div data-view="content">
  <!-- Fragment content loaded here -->
</div>

<!-- Advanced configuration with data-view -->
<select data-selectloader
        data-selectloader-target-view="product-details"
        data-selectloader-transition="slide"
        data-selectloader-transition-duration="400"
        data-selectloader-retain-scroll="true"
        data-selectloader-loading-class="is-loading">
  <option value="">Select product...</option>
  <option value="/products/1/fragment">Product 1</option>
  <option value="/products/2/fragment">Product 2</option>
</select>

<div data-view="product-details" class="product-details">
  <p>Select a product to view details</p>
</div>
```

#### Integration with Framework Managers

```javascript
// Register the component
const registry = ComponentRegistry.create('dev');

registry.component('selectloader', '[data-selectloader]', {
  priority: 'normal',
  loader: () => import('./components/SelectLoader.js')
});

// Initialize app with managers
const app = new App({
  registry: registry.build(),
  router: {
    enabled: true,
    baseUrl: '',
    timeout: 10000
  }
});

await app.initialize();

// Component automatically uses injected RouterManager and EventManager
```

#### Listening to Events via EventManager

```javascript
// Listen for content loaded events
app.eventBus.on('selectloader:content-loaded', (data) => {
  const { url, targetElement } = data;
  console.log(`Content loaded from ${url}`);

  // Re-mount components in loaded content
  app.pageManager.mountDynamicContent(targetElement);
});

// Listen for errors
app.eventBus.on('selectloader:error', (data) => {
  console.error('SelectLoader error:', data.error);
});

// Listen for app notifications (could trigger toast)
app.eventBus.on('app:notification', (notification) => {
  // Toast component could listen for this
  console.log(`${notification.type}: ${notification.message}`);
});
```

#### Preventing Changes with Events

```html
<select id="region-select" data-selectloader data-selectloader-target="#info">
  <option value="">Select region...</option>
  <option value="/regions/north">North</option>
  <option value="/regions/south">South</option>
</select>

<script>
// Prevent certain changes using DOM events
document.getElementById('region-select').addEventListener(
  'selectloader:before-change',
  (event) => {
    if (!confirm('Load new content? Unsaved changes will be lost.')) {
      event.preventDefault(); // Cancels the load
    }
  }
);
</script>
```

#### Server-Side Fragment Endpoint

```php
<?php
// /fragments/electronics - Returns HTML fragment
// RouterManager sends X-Requested-With header automatically

header('Content-Type: text/html; charset=utf-8');
?>

<div class="fragment-content" data-fragment-loaded>
    <h2>Electronics Category</h2>
    <div class="product-grid" data-product-grid>
        <article class="product-card" data-product-id="101">
            <img data-lazysrc="/images/laptop.jpg" alt="Laptop">
            <h3>Professional Laptop</h3>
            <p class="price">$999</p>
            <button data-modal data-modal-target="#add-to-cart">
                Add to Cart
            </button>
        </article>
        <!-- More products -->
    </div>

    <!-- Components in loaded content will be auto-mounted by PageManager -->
    <div data-tabs>
        <button data-tab="specs">Specifications</button>
        <button data-tab="reviews">Reviews</button>
        <div id="specs" data-tab-panel>Spec content</div>
        <div id="reviews" data-tab-panel>Reviews content</div>
    </div>
</div>
```

#### CSS Styling

```css
/* Loading states */
select.loading {
  opacity: 0.6;
  cursor: wait;
}

.select-loader__target.loading {
  position: relative;
  min-height: 100px;
}

.select-loader__target.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color, #3b82f6);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.select-loader__empty {
  padding: 3rem 2rem;
  text-align: center;
  color: var(--text-secondary, #666);
  background: var(--surface-secondary, #f9fafb);
  border-radius: 8px;
}

/* Error state */
.select-loader__error {
  padding: 2rem;
  background: var(--error-bg, #fef2f2);
  border: 1px solid var(--error-border, #fecaca);
  border-radius: 8px;
  text-align: center;
}

.select-loader__error p {
  color: var(--error-text, #991b1b);
  margin: 0 0 1rem;
}
```

#### Key Framework Integrations

This example demonstrates:

1. **RouterManager Integration** - Uses `this.router.get()` for fetching fragments
2. **EventManager Usage** - Emits events via `this.eventBus.emit()` and `this._dispatch()`
3. **BaseComponent Utilities** - Uses:
   - `_getConfigFromAttrs()` - Bulk config parsing
   - `_getTargetElement()` - Target validation
   - `_requireState()` - State validation
   - `_generateId()` - Unique ID generation
   - `_fadeIn()/_fadeOut()` - Transitions
   - `_delay()` - Timing control
   - `_dispatch()` - Event dispatching
4. **Automatic Cleanup** - AbortController via `state.controller.signal`
5. **Logger Integration** - Uses `this.logger` for debugging
6. **PageManager Integration** - Content can be remounted after loading
7. **Toast/Alert Integration** - Emits notifications that toast components can consume

### 2. Component Composition

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

        // Numeric values follow CSS conventions
        // Time values default to milliseconds
        delay: 0,
        // Dimensions can be numeric (pixels) or strings (units)
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
