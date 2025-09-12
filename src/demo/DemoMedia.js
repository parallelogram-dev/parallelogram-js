import { BaseComponent } from '../core/BaseComponent.js';

export class DemoMedia extends BaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        this.mediaMetrics = {
            imagesLoaded: 0,
            totalLoadTime: 0,
            activeComponents: 0,
            componentsCleaned: 0
        };
        
        this.metricsInterval = null;
    }
    
    mount() {
        super.mount();
        this.setupEventListeners();
        this.setupButtonHandlers();
        this.initializeMetricsTracking();
        this.notifyPageLoaded();
        this.emit('demo-media:mounted', { element: this.element });
    }
    
    unmount() {
        this.cleanup();
        super.unmount();
    }
    
    cleanup() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
    }
    
    setupEventListeners() {
        // Gallery functionality
        this.addEventListener(document, 'click', (e) => {
            this.handleGalleryClick(e);
        });
        
        // Listen for lazy image events
        this.addEventListener(document, 'lazy-image:loaded', (e) => {
            this.mediaMetrics.imagesLoaded++;
            this.updateMetricsDisplay();
            
            if (window.Toast && window.Toast.show) {
                window.Toast.show('Image loaded successfully', 'success');
            }
        });
        
        this.addEventListener(document, 'lazy-image:detached', (e) => {
            this.mediaMetrics.componentsCleaned++;
            this.updateMetricsDisplay();
        });
        
        // Listen for carousel events
        this.addEventListener(document, 'carousel:slide-change', (e) => {
            console.log('Carousel slide changed:', e.detail);
        });
    }
    
    setupButtonHandlers() {
        // Handle all buttons with onclick handlers
        const onclickButtons = this.element.querySelectorAll('[onclick]');
        
        onclickButtons.forEach(button => {
            const onclickValue = button.getAttribute('onclick');
            button.removeAttribute('onclick');
            
            if (onclickValue.includes('downloadCurrentImage')) {
                this.addEventListener(button, 'click', () => this.downloadCurrentImage());
            }
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
            avgLoadTimeEl.textContent = this.mediaMetrics.imagesLoaded > 0
                ? Math.round(this.mediaMetrics.totalLoadTime / this.mediaMetrics.imagesLoaded) + 'ms'
                : '0ms';
        }
        
        const activeComponentsEl = document.getElementById('active-components');
        if (activeComponentsEl) {
            activeComponentsEl.textContent = document.querySelectorAll('[data-lazysrc]:not([data-lazysrc-complete])').length;
        }
        
        const memorySavedEl = document.getElementById('memory-saved');
        if (memorySavedEl) {
            memorySavedEl.textContent = this.mediaMetrics.componentsCleaned;
        }
    }
    
    initializeMetricsTracking() {
        // Update metrics periodically
        this.metricsInterval = setInterval(() => {
            this.updateMetricsDisplay();
        }, 1000);
        
        // Initial update
        this.updateMetricsDisplay();
    }
    
    notifyPageLoaded() {
        // Page-specific component mounting notification
        if (window.eventBus) {
            window.eventBus.emit('page:loaded', {
                page: '/media',
                components: ['lazysrc', 'carousel', 'modal'],
                timestamp: performance.now()
            });
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
            componentsCleaned: 0
        };
        this.updateMetricsDisplay();
    }
}