async function initFramework() {
    try {
        // Import core framework modules first
        const {ComponentRegistry} = await import('./dist/esm/core/ComponentRegistry.min.js');
        const {EventManager} = await import('./dist/esm/core/EventManager.min.js');
        const {DevLogger} = await import('./dist/esm/core/DevLogger.min.js');
        const {RouterManager} = await import('./dist/esm/managers/RouterManager.min.js');
        const {PageManager} = await import('./dist/esm/managers/PageManager.min.js');
        const {PModal} = await import('./dist/esm/components/PModal.min.js');
        const {PToasts} = await import('./dist/esm/components/PToasts.min.js');
        const {PSelect} = await import('./dist/esm/components/PSelect.min.js');

        // Initialize logger first for proper logging throughout
        const logger = new DevLogger({level: 'debug', prefix: 'Demo'}, true);
        logger.info('Initializing Enhancement Framework Demo');

        // Create registry with logger available
        logger.debug('Building component registry');
        const registry = ComponentRegistry.create('production');

        const componentRegistry = registry
            .component('lazyimage', '[data-lazyimage]:not([data-lazyimage-complete])')
            .component('toggle', '[data-toggle]')
            .component('carousel', '[data-carousel]', {
                dependsOn: ['lazyimage']
            })
            .component('modal', '[data-modal][data-modal-target]')
            .component('toast', '[data-toast-trigger][data-toast-message]', {
                exportName: 'Toast'
            })
            .component('scrollhide', '[data-scrollhide]')
            .component('scrollreveal', '[data-scrollreveal]')
            .component('tabs', '[data-tabs]')
            .component('videoplay', '[data-videoplay]')
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
                loadingClass: 'router-loading'
            }
        });

        const pageManager = new PageManager({
            containerSelector: '[data-view="main"]',
            registry: componentRegistry,
            eventBus,
            logger,
            router,
            options: {
                targetGroups: {
                    'main': ['main', 'navbar'], // When 'main' is requested, also update nav and breadcrumbs
                },
                targetGroupTransitions: {
                    'main': {
                        out: 'fade-slide-left',
                        in: 'fade-slide-right',
                        duration: 300,
                        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
                    },
                    'navbar': {
                        out: 'fade-scale-down',
                        in: 'fade-scale-up',
                        duration: 250
                    },
                    'sidebar': {
                        out: 'slide-left',
                        in: 'slide-right',
                        duration: 200
                    }
                },
                enableComponentPooling: true,
                enableHealthMonitoring: true,
                trackPerformance: true
            }
        });

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
        'lazy-image:loaded',
        'lazy-image:error',
        'toast:show',
        'tabs:change',
        'modal:open',
        'modal:close'
    ];

    eventsToLog.forEach(eventType => {
        window.eventBus.on(eventType, (data) => {
            const timestamp = new Date().toLocaleTimeString();
            const eventElement = document.createElement('div');
            eventElement.className = 'event__log-item';
            eventElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong>${eventType}</strong>
                        <pre style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #666;">${JSON.stringify(data, null, 2)}</pre>
                    </div>
                    <small style="color: #999; margin-left: 1rem;">${timestamp}</small>
                </div>
            `;

            eventLogContent.insertBefore(eventElement, eventLogContent.firstChild);

            // Keep only last 10 events
            const items = eventLogContent.querySelectorAll('.event__log-item');
            if (items.length > 10) {
                items[items.length - 1].remove();
            }
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initFramework();
    setupEventLogging();
});

// Basic performance metrics function (only using what actually exists)
window.getPerformanceMetrics = function () {
    if (!window.pageManager) {
        return {
            pageManager: {componentMounts: 0, componentUnmounts: 0, averageMountTime: 0},
            components: {loading: [], retries: {}},
            router: {href: window.location.href}
        };
    }

    // Only call methods that actually exist on your PageManager
    return {
        pageManager: window.pageManager.getMetrics ? window.pageManager.getMetrics() : {},
        router: window.router?.getMetrics ? window.router.getMetrics() : {},
        memory: performance.memory ? {
            usedMB: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)
        } : {}
    };
};