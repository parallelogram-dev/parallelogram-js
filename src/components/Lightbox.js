import { BaseComponent } from '@peptolab/parallelogram';

/**
 * Lightbox Component - Image/media gallery viewer
 *
 * @example
 * <a data-lightbox="gallery" href="large1.jpg">
 *   <img src="thumb1.jpg" alt="Image 1">
 * </a>
 * <a data-lightbox="gallery" href="large2.jpg">
 *   <img src="thumb2.jpg" alt="Image 2">
 * </a>
 */
export class Lightbox extends BaseComponent {
    static get defaults() {
        return {
            closeOnEscape: true,
            closeOnBackdrop: true,
            showCounter: true,
            showNavigation: true,
            keyNavigation: true,
            animationDuration: 300
        };
    }

    constructor(options = {}) {
        super(options);
        this.lightboxElement = null;
        this.currentGallery = [];
        this.currentIndex = 0;
        this.isOpen = false;
    }

    _init(element) {
        const state = super._init(element);

        const config = this._getConfiguration(element);
        const gallery = element.dataset.lightbox;

        state.config = config;
        state.gallery = gallery;

        element.addEventListener('click', (e) => {
            e.preventDefault();
            this._openLightbox(element, state);
        });

        this.eventBus?.emit('lightbox:mounted', { element, gallery });
        return state;
    }

    _getConfiguration(element) {
        return {
            closeOnEscape: this._getDataAttr(element, 'lightbox-close-escape', Lightbox.defaults.closeOnEscape),
            closeOnBackdrop: this._getDataAttr(element, 'lightbox-close-backdrop', Lightbox.defaults.closeOnBackdrop),
            showCounter: this._getDataAttr(element, 'lightbox-show-counter', Lightbox.defaults.showCounter),
            showNavigation: this._getDataAttr(element, 'lightbox-show-nav', Lightbox.defaults.showNavigation),
            keyNavigation: this._getDataAttr(element, 'lightbox-key-nav', Lightbox.defaults.keyNavigation),
            animationDuration: parseInt(this._getDataAttr(element, 'lightbox-animation-duration', Lightbox.defaults.animationDuration))
        };
    }

    _openLightbox(triggerElement, state) {
        if (this.isOpen) return;

        // Build gallery from all elements with same gallery name
        this.currentGallery = Array.from(
            document.querySelectorAll(`[data-lightbox="${state.gallery}"]`)
        );

        this.currentIndex = this.currentGallery.indexOf(triggerElement);

        this._createLightboxElement(state.config);
        this._showImage(this.currentIndex, state.config);
        this._setupEventListeners(state.config);

        this.isOpen = true;
        document.body.style.overflow = 'hidden';

        this.eventBus?.emit('lightbox:opened', {
            gallery: state.gallery,
            index: this.currentIndex,
            total: this.currentGallery.length
        });
    }

    _createLightboxElement(config) {
        this.lightboxElement = document.createElement('div');
        this.lightboxElement.className = 'lightbox-overlay';
        this.lightboxElement.innerHTML = `
            <div class="lightbox-container">
                <button class="lightbox-close" aria-label="Close">&times;</button>
                ${config.showNavigation ? `
                    <button class="lightbox-prev" aria-label="Previous">&larr;</button>
                    <button class="lightbox-next" aria-label="Next">&rarr;</button>
                ` : ''}
                <div class="lightbox-content">
                    <img class="lightbox-image" alt="">
                </div>
                ${config.showCounter ? '<div class="lightbox-counter"></div>' : ''}
            </div>
        `;

        document.body.appendChild(this.lightboxElement);

        // Setup button handlers
        this.lightboxElement.querySelector('.lightbox-close').addEventListener('click', () => {
            this._closeLightbox();
        });

        if (config.showNavigation) {
            this.lightboxElement.querySelector('.lightbox-prev').addEventListener('click', () => {
                this._previousImage(config);
            });

            this.lightboxElement.querySelector('.lightbox-next').addEventListener('click', () => {
                this._nextImage(config);
            });
        }

        if (config.closeOnBackdrop) {
            this.lightboxElement.addEventListener('click', (e) => {
                if (e.target === this.lightboxElement) {
                    this._closeLightbox();
                }
            });
        }
    }

    _showImage(index, config) {
        const element = this.currentGallery[index];
        const imageUrl = element.href;
        const imageAlt = element.querySelector('img')?.alt || '';

        const img = this.lightboxElement.querySelector('.lightbox-image');
        img.src = imageUrl;
        img.alt = imageAlt;

        // Update counter
        if (config.showCounter) {
            const counter = this.lightboxElement.querySelector('.lightbox-counter');
            counter.textContent = `${index + 1} / ${this.currentGallery.length}`;
        }

        // Update navigation buttons
        if (config.showNavigation) {
            const prevBtn = this.lightboxElement.querySelector('.lightbox-prev');
            const nextBtn = this.lightboxElement.querySelector('.lightbox-next');

            prevBtn.style.display = index > 0 ? 'block' : 'none';
            nextBtn.style.display = index < this.currentGallery.length - 1 ? 'block' : 'none';
        }
    }

    _previousImage(config) {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this._showImage(this.currentIndex, config);
        }
    }

    _nextImage(config) {
        if (this.currentIndex < this.currentGallery.length - 1) {
            this.currentIndex++;
            this._showImage(this.currentIndex, config);
        }
    }

    _setupEventListeners(config) {
        if (config.closeOnEscape || config.keyNavigation) {
            this.keyHandler = (e) => {
                switch (e.key) {
                    case 'Escape':
                        if (config.closeOnEscape) this._closeLightbox();
                        break;
                    case 'ArrowLeft':
                        if (config.keyNavigation) this._previousImage(config);
                        break;
                    case 'ArrowRight':
                        if (config.keyNavigation) this._nextImage(config);
                        break;
                }
                e.preventDefault();
            };

            document.addEventListener('keydown', this.keyHandler);
        }
    }

    _closeLightbox() {
        if (!this.isOpen) return;

        // Remove event listeners
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }

        // Remove lightbox element
        if (this.lightboxElement) {
            this.lightboxElement.remove();
            this.lightboxElement = null;
        }

        // Restore body scroll
        document.body.style.overflow = '';

        this.isOpen = false;
        this.currentGallery = [];
        this.currentIndex = 0;

        this.eventBus?.emit('lightbox:closed', {});
    }

    // Public API
    open(triggerElement) {
        const state = this.getState(triggerElement);
        if (state) {
            this._openLightbox(triggerElement, state);
        }
    }

    close() {
        this._closeLightbox();
    }

    next() {
        if (this.isOpen && this.lightboxElement) {
            const config = { showNavigation: true, keyNavigation: true }; // Use current config
            this._nextImage(config);
        }
    }

    previous() {
        if (this.isOpen && this.lightboxElement) {
            const config = { showNavigation: true, keyNavigation: true }; // Use current config
            this._previousImage(config);
        }
    }

    goTo(index) {
        if (this.isOpen && index >= 0 && index < this.currentGallery.length) {
            this.currentIndex = index;
            const config = { showCounter: true, showNavigation: true }; // Use current config
            this._showImage(this.currentIndex, config);
        }
    }

    getStatus() {
        return {
            isOpen: this.isOpen,
            currentIndex: this.currentIndex,
            gallerySize: this.currentGallery.length
        };
    }

    static enhanceAll(selector = '[data-lightbox]', options) {
        const instance = new Lightbox(options);
        document.querySelectorAll(selector).forEach(el => instance.mount(el));
        return instance;
    }
}

export default Lightbox;