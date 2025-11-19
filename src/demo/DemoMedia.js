import { BaseComponent } from '../core/BaseComponent.js';

export class DemoMedia extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.mediaMetrics = {
      imagesLoaded: 0,
      totalLoadTime: 0,
      activeComponents: 0,
      componentsCleaned: 0,
    };
  }

  _init(element) {
    const state = super._init(element);
    
    console.log('DemoMedia component initializing for element:', element);
    
    this.element = element;
    this.setupEventListeners(state);
    this.setupButtonHandlers(state);
    this.initializeMetricsDisplay();
    this.notifyPageLoaded();
    
    if (this.eventBus) {
      this.eventBus.emit('demo-media:mounted', { element });
    }
    
    return state;
  }

  setupEventListeners(state) {
    const { controller } = state;
    
    // Gallery functionality
    document.addEventListener('click', e => {
      this.handleGalleryClick(e);
    }, { signal: controller.signal });

    // Listen for lazy image events
    document.addEventListener('lazysrc:loaded', e => {
      console.log('lazysrc:loaded event received', e.detail);
      this.mediaMetrics.imagesLoaded++;
      if (e.detail && e.detail.loadTime) {
        this.mediaMetrics.totalLoadTime += e.detail.loadTime;
      }
      this.updateMetricsDisplay();

      if (window.Toast && window.Toast.show) {
        window.Toast.show('Image loaded successfully', 'success');
      }
    }, { signal: controller.signal });
    
    document.addEventListener('lazysrc:loading-start', e => {
      this.updateMetricsDisplay();
    }, { signal: controller.signal });

    document.addEventListener('lazysrc:detached', e => {
      this.mediaMetrics.componentsCleaned++;
      this.updateMetricsDisplay();
    }, { signal: controller.signal });

    // Listen for carousel events
    document.addEventListener('carousel:slide-change', e => {
      console.log('Carousel slide changed:', e.detail);
    }, { signal: controller.signal });
  }

  setupButtonHandlers(state) {
    const { controller } = state;
    
    // Handle download button
    const downloadButtons = this.element.querySelectorAll('[data-btn-action="downloadCurrentImage"]');
    downloadButtons.forEach(button => {
      button.addEventListener('click', () => this.downloadCurrentImage(), { signal: controller.signal });
    });
  }

  handleGalleryClick(e) {
    const galleryItem = e.target.closest('[data-gallery-item]');
    if (galleryItem) {
      const img = galleryItem.querySelector('img');
      const fullSrc = img.getAttribute('data-gallery-full');
      const alt = img.getAttribute('alt');

      const previewImg = document.getElementById('gallery-preview-image');
      previewImg.src = fullSrc;
      previewImg.alt = alt;
    }
  }

  downloadCurrentImage() {
    const previewImg = document.getElementById('gallery-preview-image');
    if (previewImg.src) {
      const a = document.createElement('a');
      a.href = previewImg.src;
      a.download = 'gallery-image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  updateMetricsDisplay() {
    const imagesLoadedEl = document.getElementById('images-loaded');
    if (imagesLoadedEl) {
      imagesLoadedEl.textContent = this.mediaMetrics.imagesLoaded;
    }

    const avgLoadTimeEl = document.getElementById('avg-load-time');
    if (avgLoadTimeEl) {
      avgLoadTimeEl.textContent =
        this.mediaMetrics.imagesLoaded > 0
          ? Math.round(this.mediaMetrics.totalLoadTime / this.mediaMetrics.imagesLoaded) + 'ms'
          : '0ms';
    }

    const activeComponentsEl = document.getElementById('active-components');
    if (activeComponentsEl) {
      const activeCount = document.querySelectorAll('[data-lazysrc]:not([data-lazysrc-complete])').length;
      activeComponentsEl.textContent = activeCount;
    }

    const memorySavedEl = document.getElementById('memory-saved');
    if (memorySavedEl) {
      memorySavedEl.textContent = this.mediaMetrics.componentsCleaned;
    }
  }

  initializeMetricsDisplay() {
    console.log('Initializing metrics display');
    // Just do initial display update
    this.updateMetricsDisplay();
  }

  notifyPageLoaded() {
    // Page-specific component mounting notification
    if (window.eventBus) {
      window.eventBus.emit('page:loaded', {
        page: '/media',
        components: ['lazysrc', 'carousel', 'modal'],
        timestamp: performance.now(),
      });
    }
  }

  // Emit helper for backward compatibility
  emit(eventType, detail) {
    if (this.eventBus) {
      this.eventBus.emit(eventType, detail);
    }
  }

  // Public API methods
  getMediaMetrics() {
    return { ...this.mediaMetrics };
  }

  resetMetrics() {
    this.mediaMetrics = {
      imagesLoaded: 0,
      totalLoadTime: 0,
      activeComponents: 1, // Keep current component
      componentsCleaned: 0,
    };
    this.updateMetricsDisplay();
  }
}
export default DemoMedia;
