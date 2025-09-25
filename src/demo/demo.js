// Static imports for bundling - no dynamic imports needed
import {
  ComponentRegistry,
  EventManager,
  DevLogger,
  RouterManager,
  PageManager,
} from '../../src/index.js';
import { default as PModal } from '../../src/components/PModal.js';
import { default as PToasts } from '../../src/components/PToasts.js';
import { default as PSelect } from '../../src/components/PSelect.js';
import { default as PDatetime } from '../../src/components/PDatetime.js';
import Modal from '../../src/components/Modal.js';
import Toast from '../../src/components/Toast.js';
import Lazysrc from '../../src/components/Lazysrc.js';
import Toggle from '../../src/components/Toggle.js';
import Carousel from '../../src/components/Carousel.js';
import Scrollhide from '../../src/components/Scrollhide.js';
import Scrollreveal from '../../src/components/Scrollreveal.js';
import Tabs from '../../src/components/Tabs.js';
import Videoplay from '../../src/components/Videoplay.js';
import DataTable from '../../src/components/DataTable.js';
import Lightbox from '../../src/components/Lightbox.js';
import FormEnhancer from '../../src/components/FormEnhancer.js';
import CopyToClipboard from '../../src/components/CopyToClipboard.js';
import Uploader from '../../src/components/Uploader.js';

// Demo page classes
import { DemoHome } from './DemoHome.js';
import { DemoMedia } from './DemoMedia.js';
import { DemoPerformance } from './DemoPerformance.js';
import { DemoUIComponents } from './DemoUIComponents.js';
import { DemoFileUploader } from './DemoFileUploader.js';

// Component factory function to replace dynamic loaders
function createComponentLoader(ComponentClass) {
  return () => Promise.resolve({ default: ComponentClass });
}

async function initFramework() {
  try {
    // Initialize logger first for proper logging throughout
    const logger = new DevLogger({ level: 'debug', prefix: 'Demo' }, true);
    logger.info('Initializing Enhancement Framework Demo');

    // Create registry with logger available
    logger.debug('Building component registry');
    const registry = ComponentRegistry.create('production');

    const componentRegistry = registry
      .component('lazysrc', '[data-lazysrc]:not([data-lazysrc-complete])', {
        loader: createComponentLoader(Lazysrc),
      })
      .component('toggle', '[data-toggle]', {
        loader: createComponentLoader(Toggle),
      })
      .component('carousel', '[data-carousel]', {
        dependsOn: ['lazysrc'],
        loader: createComponentLoader(Carousel),
      })
      .component('modal', '[data-modal][data-modal-target]', {
        loader: createComponentLoader(Modal),
      })
      .component('toast', '[data-toast-trigger][data-toast-message]', {
        exportName: 'Toast',
        loader: createComponentLoader(Toast),
      })
      .component('scrollhide', '[data-scrollhide]', {
        loader: createComponentLoader(Scrollhide),
      })
      .component('scrollreveal', '[data-scrollreveal]', {
        loader: createComponentLoader(Scrollreveal),
      })
      .component('tabs', '[data-tabs]', {
        loader: createComponentLoader(Tabs),
      })
      .component('videoplay', '[data-videoplay]', {
        loader: createComponentLoader(Videoplay),
      })
      .component('datatable', '[data-datatable]', {
        loader: createComponentLoader(DataTable),
      })
      .component('lightbox', '[data-lightbox]', {
        loader: createComponentLoader(Lightbox),
      })
      .component('form-validator', '[data-form-validator]', {
        loader: createComponentLoader(FormEnhancer),
      })
      .component('copy-to-clipboard', '[data-copy-to-clipboard]', {
        loader: createComponentLoader(CopyToClipboard),
      })
      .component('uploader', '[data-uploader]', {
        loader: createComponentLoader(Uploader),
      })
      .component('demo-home', '[data-demo="home"]', {
        loader: createComponentLoader(DemoHome),
      })
      .component('demo-media', '[data-demo="media"]', {
        loader: createComponentLoader(DemoMedia),
      })
      .component('demo-performance', '[data-demo="performance"]', {
        loader: createComponentLoader(DemoPerformance),
      })
      .component('demo-ui-components', '[data-demo="ui-components"]', {
        loader: createComponentLoader(DemoUIComponents),
      })
      .component('demo-uploader', '[data-demo="uploader"]', {
        loader: createComponentLoader(DemoFileUploader),
      })
      .build();

    // Validate registry with logging
    logger.debug('Validating component registry');
    const validation = registry.validate();
    if (!validation.valid) {
      logger.error('Component registry validation failed:', validation.errors);
      throw new Error('Invalid component registry configuration');
    }
    if (validation.warnings.length > 0) {
      logger.warn('Component registry warnings:', validation.warnings);
    }

    const stats = registry.getStats();
    logger.info('Component registry built successfully', stats);

    // Initialize other core components
    logger.debug('Initializing core framework components');
    const eventBus = new EventManager();

    const router = new RouterManager({
      eventBus,
      logger,
      options: {
        timeout: 10000,
        loadingClass: 'router-loading',
      },
    });

    const pageManager = new PageManager({
      containerSelector: '[data-view="main"]',
      registry: componentRegistry,
      eventBus,
      logger,
      router,
      options: {
        targetGroups: {
          main: ['main', 'navbar'], // When 'main' is requested, also update nav and breadcrumbs
        },
        targetGroupTransitions: {
          main: {
            out: 'fade-slide-left',
            in: 'fade-slide-right',
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          },
          navbar: {
            out: 'fade-scale-down',
            in: 'fade-scale-up',
            duration: 250,
          },
          sidebar: {
            out: 'slide-left',
            in: 'slide-right',
            duration: 200,
          },
        },
        enableComponentPooling: true,
        enableHealthMonitoring: true,
        trackPerformance: true,
      },
    });

    // Ensure web components are available by referencing the imports
    // This prevents tree-shaking and ensures custom elements are registered
    if (PModal && PToasts && PSelect && PDatetime) {
      logger.debug('Web components loaded and registered', {
        PModal: customElements.get('p-modal'),
        PToasts: customElements.get('p-toasts'),
        PSelect: customElements.get('p-select'),
        PDatetime: customElements.get('p-datetime'),
      });

      // Wait for custom elements to be defined and then log diagnostic info
      Promise.all([
        customElements.whenDefined('p-modal'),
        customElements.whenDefined('p-toasts'),
        customElements.whenDefined('p-select'),
        customElements.whenDefined('p-datetime'),
      ])
        .then(() => {
          logger.info('All custom elements ready', {
            modalsInDOM: document.querySelectorAll('p-modal').length,
            toastsInDOM: document.querySelectorAll('p-toasts').length,
            selectsInDOM: document.querySelectorAll('p-select').length,
            datetimesInDOM: document.querySelectorAll('p-datetime').length,
          });
        })
        .catch(err => {
          logger.error('Error waiting for custom elements:', err);
        });
    }

    // Make available globally for demo functions
    window.pageManager = pageManager;
    window.router = router;
    window.eventBus = eventBus;
    window.logger = logger;
    window.componentRegistry = componentRegistry;

    logger.info('Framework initialized successfully');
  } catch (error) {
    console.error('Failed to initialize framework:', error);
    throw error;
  }
}

// Simple event logging for demo
function setupEventLogging() {
  const eventLogContent = document.querySelector('.event__log-content');
  if (!eventLogContent || !window.eventBus) return;

  // Only log events that actually exist in your framework
  const eventsToLog = [
    'lazysrc:loaded',
    'lazysrc:error',
    'lazysrc:loading-start',
    'toast:show',
    'toast:hide',
    'tabs:change',
    'modal:open',
    'modal:close',
    'scrollreveal:reveal-complete',
    'videoplay:play',
    'videoplay:pause',
    'carousel:slide-change',
    'datatable:mounted',
    'datatable:rendered',
    'lightbox:mounted',
    'lightbox:opened',
    'lightbox:closed',
    'form-validator:mounted',
    'form-validator:submit-blocked',
    'form-validator:submit-valid',
    'copy-to-clipboard:mounted',
    'copy-to-clipboard:success',
    'copy-to-clipboard:error',
    'page:fragments-replaced',
    'router:navigate-success',
  ];

  eventsToLog.forEach(eventType => {
    window.eventBus.on(eventType, data => {
      const timestamp = new Date().toLocaleTimeString();
      const eventElement = document.createElement('div');
      eventElement.className = 'event__log-item';

      // Sanitize data for display (remove circular references)
      const sanitizedData = sanitizeEventData(data);

      eventElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: #2563eb;">${eventType}</strong>
                        <pre style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #666; background: #f8f9fa; padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(sanitizedData, null, 2)}</pre>
                    </div>
                    <small style="color: #999; margin-left: 1rem; white-space: nowrap;">${timestamp}</small>
                </div>
            `;

      eventLogContent.insertBefore(eventElement, eventLogContent.firstChild);

      // Keep only last 15 events
      const items = eventLogContent.querySelectorAll('.event__log-item');
      if (items.length > 15) {
        items[items.length - 1].remove();
      }
    });
  });
}

// Sanitize event data to avoid circular references and large objects
function sanitizeEventData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === 'element') {
      // Show basic element info instead of full element
      sanitized[key] = value
        ? {
            tagName: value.tagName,
            id: value.id || undefined,
            className: value.className || undefined,
          }
        : null;
    } else if (key === 'timestamp') {
      // Format timestamp nicely
      sanitized[key] = new Date(value).toLocaleTimeString();
    } else if (key === 'fragment' || key === 'targetFragment') {
      // Show fragment info without full DOM
      sanitized[key] = value
        ? {
            tagName: value.tagName,
            dataView: value.dataset?.view,
            childCount: value.children?.length,
          }
        : null;
    } else if (typeof value === 'object' && value !== null) {
      // Limit object depth
      if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 3); // First 3 items only
      } else {
        sanitized[key] = Object.keys(value).length > 0 ? '[Object]' : value;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Demo utility functions
window.demoUtils = {
  // Test lazy loading
  testLazysrc: function () {
    const lazysrcElements = document.querySelectorAll('[data-lazysrc]');
    window.logger?.info('Found lazysrc elements:', lazysrcElements.length);

    lazysrcElements.forEach((element, index) => {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, index * 1000);
    });
  },

  // Test scroll reveal
  testScrollReveal: function () {
    const scrollElements = document.querySelectorAll('[data-scrollreveal]');
    window.logger?.info('Found scroll reveal elements:', scrollElements.length);

    scrollElements.forEach((element, index) => {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, index * 800);
    });
  },

  // Show component status
  showComponentStatus: function () {
    if (!window.pageManager) {
      console.log('PageManager not available');
      return;
    }

    const status = window.pageManager.getComponentStates?.() || {};
    console.table(status);
    window.logger?.info('Component status:', status);
  },

  // Force load all lazy images
  loadAllImages: function () {
    const lazysrcElements = document.querySelectorAll('[data-lazysrc-enhanced="true"]');
    lazysrcElements.forEach(element => {
      const instance = window.componentRegistry?.getInstance?.(element);
      if (instance && typeof instance.loadElement === 'function') {
        instance.loadElement(element);
      }
    });
    window.logger?.info('Triggered load for all lazy images');
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await initFramework();
  setupEventLogging();

  // Add demo controls to the page if demo container exists
  const demoControls = document.querySelector('.demo-controls');
  if (demoControls) {
    demoControls.innerHTML = `
            <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; margin: 1rem 0;">
                <h4 style="margin: 0 0 1rem 0; color: #495057;">Demo Controls</h4>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button data-btn-action="window.demoUtils.testLazysrc" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Lazy Loading</button>
                    <button data-btn-action="window.demoUtils.testScrollReveal" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Scroll Reveal</button>
                    <button data-btn-action="window.demoUtils.showComponentStatus" style="padding: 0.5rem 1rem; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">Component Status</button>
                    <button data-btn-action="window.demoUtils.loadAllImages" style="padding: 0.5rem 1rem; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">Load All Images</button>
                </div>
            </div>
        `;
  }
});

// Basic performance metrics function
window.getPerformanceMetrics = function () {
  if (!window.pageManager) {
    return {
      pageManager: { componentMounts: 0, componentUnmounts: 0, averageMountTime: 0 },
      components: { loading: [], retries: {} },
      router: { href: window.location.href },
    };
  }

  const metrics = {
    pageManager: window.pageManager.getMetrics ? window.pageManager.getMetrics() : {},
    router: window.router?.getMetrics ? window.router.getMetrics() : { href: window.location.href },
    components: window.pageManager.getComponentStates
      ? window.pageManager.getComponentStates()
      : {},
    memory: performance.memory
      ? {
          usedMB: Math.round((performance.memory.usedJSHeapSize / 1024 / 1024) * 100) / 100,
          totalMB: Math.round((performance.memory.totalJSHeapSize / 1024 / 1024) * 100) / 100,
        }
      : {},
    timestamp: new Date().toISOString(),
  };

  return metrics;
};

// Auto-update performance display if element exists
setInterval(() => {
  const perfElement = document.querySelector('.performance-display');
  if (perfElement) {
    const metrics = window.getPerformanceMetrics();
    perfElement.innerHTML = `
            <h4>Performance Metrics</h4>
            <pre style="font-size: 0.8rem; background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(metrics, null, 2)}</pre>
        `;
  }
}, 5000); // Update every 5 seconds

// Export for global access
window.initFramework = initFramework;
