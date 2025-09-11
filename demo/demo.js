import {AlertManager, DevLogger, EventManager, PageManager, RouterManager} from '../dist/esm/index.min.js';

/**
 * Enhanced Demo Application with RouterManager and PageManager
 * Showcases progressive enhancement, component lifecycle, and routing
 */
class DemoApplication {
    constructor() {
        this.initializeCoreServices();
        this.setupComponentRegistry();
        this.initializeManagers();
        this.setupDemoFunctions();
        this.setupEventLogging();
        this.startApplication();
    }

    /**
     * Initialize core framework services
     */
    initializeCoreServices() {
        // Create event bus for component communication
        this.eventBus = new EventManager();

        // Setup hierarchical logging
        this.logger = new DevLogger('demo', true);
        this.routerLogger = this.logger.child('router');
        this.pageLogger = this.logger.child('page-manager');

        // Initialize alert system
        this.alerts = new AlertManager({
            eventBus: this.eventBus,
            logger: this.logger.child('alerts'),
            placement: 'top-right'
        });

        this.logger.info('Core services initialized');
    }

    /**
     * Setup component registry for PageManager
     */
    setupComponentRegistry() {
        this.componentRegistry = [
            // Modal components
            {
                name: 'lazyimage',
                selector: '[data-lazyimage]',
                priority: 'normal',
                dependsOn: [],
                loader: async () => {
                    this.logger?.info('Loading LazyImage component from distribution...');
                    const module = await import('./dist/esm/components/LazyImage.min.js');
                    this.logger?.info('LazyImage module loaded', {
                        exports: Object.keys(module),
                        hasDefault: 'default' in module,
                        defaultType: typeof module.default,
                    });

                    // Return the named export as default for PageManager
                    return {
                        default: module.LazyImage
                    };
                }
            },

            // Modal components
            {
                name: 'modal',
                selector: '[data-modal]',
                priority: 'normal',
                dependsOn: [],
                loader: async () => {
                    this.logger?.info('Loading Modal component from distribution...');
                    const module = await import('./dist/esm/components/Modal.min.js');
                    this.logger?.info('Modal module loaded', {
                        exports: Object.keys(module),
                        hasDefault: 'default' in module,
                        defaultType: typeof module.default,
                    });

                    // Return the named export as default for PageManager
                    return {
                        default: module.Modal
                    };
                }
            },

            // Carousel component (from distribution)
            {
                name: 'carousel',
                selector: '[data-carousel]',
                priority: 'normal',
                dependsOn: [],
                loader: async () => {
                    this.logger?.info('Loading Carousel component from distribution...');
                    const module = await import('./dist/esm/components/Carousel.min.js');
                    this.logger?.info('Carousel module loaded', {
                        exports: Object.keys(module),
                        hasDefault: 'default' in module,
                        defaultType: typeof module.default,
                        hasCarousel: 'Carousel' in module,
                        carouselType: typeof module.Carousel
                    });

                    // Return the named export as default for PageManager
                    return {
                        default: module.Carousel
                    };
                }
            },

            // Toast notification triggers
            {
                name: 'toast',
                selector: '[data-toast-trigger]',
                priority: 'normal',
                dependsOn: [],
                loader: async () => {
                    this.logger?.info('Loading Toast component from distribution...');
                    const module = await import('./dist/esm/components/Toast.min.js');
                    this.logger?.info('Toast module loaded', {
                        exports: Object.keys(module),
                        hasDefault: 'default' in module,
                        defaultType: typeof module.default
                    });

                    // Return the named export as default for PageManager
                    return {
                        default: module.Toast
                    };
                }
            }
        ];

        this.logger.info('Component registry configured', {
            components: this.componentRegistry.length
        });
    }

    /**
     * Initialize RouterManager and PageManager
     */
    initializeManagers() {
        // Initialize RouterManager with enhanced options
        this.router = new RouterManager({
            eventBus: this.eventBus,
            logger: this.routerLogger,
            options: {
                timeout: 10000,
                loadingClass: 'router-loading',
                errorClass: 'router-error'
            }
        });

        // Initialize PageManager with the component registry
        this.pageManager = new PageManager({
            containerSelector: '#app',
            registry: this.componentRegistry,
            eventBus: this.eventBus,
            logger: this.pageLogger,
            router: this.router,
            options: {
                mountDelay: 800,
                scrollPosition: 'top',
                retryFailedLoads: true,
                maxRetryAttempts: 3,
                trackPerformance: true,
                enableComponentPooling: true,
                enableCircuitBreaker: true,
                enableHealthMonitoring: true
            }
        });

        window.pageManager = this.pageManager;

        this.logger.info('Managers initialized');
    }

    setupDemoFunctions() {
        // Toast demonstration
        window.showToast = (type) => {
            const messages = {
                info: 'This is an informational message with enhanced routing!',
                success: 'Component mounted successfully with PageManager!',
                warn: 'This is a warning about component performance',
                error: 'An error occurred in the component lifecycle'
            };

            this.alerts.toast({
                message: messages[type] || 'Unknown message type',
                type,
                timeout: 4000
            });

            // Log to event system
            this.eventBus.emit('demo:toast-shown', {type, message: messages[type]});
        };

        // Modal demonstration
        window.openModal = (modalId) => {
            const modal = document.getElementById(`${modalId}-modal`);
            if (modal) {
                const modalComponent = this.pageManager.getInstances().get('modal');
                if (modalComponent) {
                    modalComponent.openModal(modal);
                }
            }
        };

        // Progress demonstration
        window.showProgress = () => {
            this.alerts.toast({
                message: 'Simulating determinate progress...',
                type: 'info',
                timeout: 3000
            });
            this.eventBus.emit('demo:progress-shown', {type: 'determinate'});
        };

        window.showLoadingProgress = () => {
            this.alerts.toast({
                message: 'Simulating loading progress...',
                type: 'info',
                timeout: 3000
            });
            this.eventBus.emit('demo:progress-shown', {type: 'loading'});
        };

        // Event log clearing
        window.clearEventLog = () => {
            const eventLogContent = document.querySelector('.event-log-content');
            if (eventLogContent) {
                eventLogContent.innerHTML = '';
            }
            this.eventBus.emit('demo:event-log-cleared', {});
        };

        // Performance metrics
        window.getPerformanceMetrics = () => {
            return {
                pageManager: this.pageManager.getPerformanceMetrics(),
                components: this.pageManager.getLoadingStatus(),
                router: this.router.getCurrentUrl()
            };
        };

        this.logger.info('Demo functions configured');
    }

    /**
     * Setup comprehensive event logging for demonstration
     */
    setupEventLogging() {
        const eventLogContent = document.querySelector('.event-log-content');
        if (!eventLogContent) return;

        // Log important framework events
        const eventsToLog = [
            'router:navigate-start',
            'router:navigate-success',
            'router:navigate-error',
            'page:fragment-replaced',
            'page:component-mounted',
            'page:component-unmounted',
            'component:mounted',
            'component:unmounted',
            'lazy-image:loaded',
            'modal:opened',
            'modal:closed',
            'toast:show',
            'page:health-check',
            'demo:toast-shown',
            'demo:progress-shown',
            'demo:event-log-cleared'
        ];

        eventsToLog.forEach(eventType => {
            this.eventBus.on(eventType, (data) => {
                this.logEvent(eventType, data, eventLogContent);
            });
        });

        this.logger.info('Event logging configured', {eventsToLog});
    }

    /**
     * Log events to the demo interface
     */
    logEvent(eventType, data, container) {
        const timestamp = new Date().toLocaleTimeString();
        const eventElement = document.createElement('div');

        // Sanitize data for display
        const displayData = {...data};
        if (displayData.element) {
            displayData.element = `<${displayData.element.tagName.toLowerCase()}>`;
        }
        if (displayData.modal) {
            displayData.modal = `Modal#${displayData.modal.id}`;
        }

        eventElement.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
        <small style="color: #666; font-family: monospace;">${timestamp}</small>
        <strong style="color: #007bff; font-size: 0.9rem;">${eventType}</strong>
      </div>
      <pre style="margin: 0; font-size: 0.75em; color: #555; background: #f8f9fa; padding: 0.25rem; border-radius: 3px; overflow-x: auto;">${JSON.stringify(displayData, null, 2)}</pre>
    `;

        eventElement.style.cssText = `
      margin-bottom: 0.75rem;
      padding: 0.5rem;
      background: white;
      border-radius: 6px;
      border-left: 3px solid #007bff;
      font-size: 0.85rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

        container.insertBefore(eventElement, container.firstChild);

        // Keep only last 15 events for performance
        while (container.children.length > 15) {
            container.removeChild(container.lastChild);
        }

        // Scroll to top of log
        container.scrollTop = 0;
    }

    /**
     * Start the application
     */
    startApplication() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
    }

    /**
     * Initialize UI components and event handlers
     */
    initializeUI() {
        // Setup basic demo button handlers
        document.getElementById('demo-toast')?.addEventListener('click', () => {
            showToast('info');
        });

        document.getElementById('demo-progress')?.addEventListener('click', () => {
            showProgress();
        });

        document.getElementById('demo-modal')?.addEventListener('click', () => {
            openModal('info');
        });

        // Add performance monitoring button
        this.addPerformanceMonitor();

        // Add component health display
        this.addHealthMonitor();

        // Setup development helpers
        this.setupDevHelpers();

        this.logger.info('🔷 Enhanced Parallelogram-JS Demo loaded successfully!');
        console.log('🔷 Enhanced Parallelogram-JS Demo loaded successfully!');

        // Emit application ready event
        this.eventBus.emit('demo:application-ready', {
            timestamp: Date.now(),
            components: this.componentRegistry.length,
            features: [
                'RouterManager',
                'PageManager',
                'Component Registry',
                'Performance Monitoring',
                'Health Monitoring',
                'Circuit Breakers',
                'Component Pooling'
            ]
        });
    }

    /**
     * Add performance monitoring to the demo
     */
    addPerformanceMonitor() {
        const heroSection = document.querySelector('.hero');
        if (!heroSection) return;

        const perfButton = document.createElement('button');
        perfButton.className = 'btn btn-outline';
        perfButton.textContent = 'Show Performance Metrics';
        perfButton.style.marginLeft = '10px';

        perfButton.addEventListener('click', () => {
            const metrics = window.getPerformanceMetrics();

            this.alerts.toast({
                message: `Components: ${metrics.pageManager.componentMounts} mounted, ${metrics.pageManager.componentUnmounts} unmounted. Avg mount time: ${metrics.pageManager.averageMountTime.toFixed(2)}ms`,
                type: 'info',
                timeout: 6000
            });

            console.table(metrics);
        });

        heroSection.appendChild(perfButton);
    }

    /**
     * Add health monitoring display
     */
    addHealthMonitor() {
        // Listen for health check events
        this.eventBus.on('page:health-check', ({health}) => {
            this.logger.info('Health Check', health);

            // Update UI with health status if there's a display element
            const healthDisplay = document.querySelector('#health-status');
            if (healthDisplay) {
                healthDisplay.textContent = `${health.loadedComponents}/${health.totalComponents} components loaded`;
            }
        });
    }

    /**
     * Setup development helpers
     */
    setupDevHelpers() {
        if (window.location.search.includes('debug=1')) {
            // Expose everything for debugging
            window.demo = {
                app: this,
                eventBus: this.eventBus,
                logger: this.logger,
                alerts: this.alerts,
                router: this.router,
                pageManager: this.pageManager,
                componentRegistry: this.componentRegistry,
                showToast,
                openModal,
                getPerformanceMetrics: window.getPerformanceMetrics
            };

            // Add debug styles
            document.documentElement.style.setProperty('--debug-mode', '1');

            console.log('🔧 Demo debugging enabled. Access framework via window.demo');
            console.log('📊 Available commands:', {
                'window.demo.pageManager.getPerformanceMetrics()': 'Get performance metrics',
                'window.demo.router.navigate("/path")': 'Navigate programmatically',
                'window.demo.eventBus.emit("custom:event", {})': 'Emit custom events',
                'window.demo.pageManager.getLoadingStatus()': 'Check component loading status'
            });
        }
    }
}

// Initialize the enhanced demo application
new DemoApplication();