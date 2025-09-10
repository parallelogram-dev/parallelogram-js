import {
  EventManager,
  DevLogger,
  AlertManager,
  LazyImage,
  Modal
} from '../dist/index.esm.js';

// Create core instances
const eventBus = new EventManager();
const logger = new DevLogger('demo', true);
const alerts = new AlertManager({
  eventBus,
  logger: logger.child('alerts'),
  placement: 'top-right'
});

// Initialize components
const lazyImages = new LazyImage({
  eventBus,
  logger: logger.child('lazy-image')
});

const modals = new Modal({
  eventBus,
  logger: logger.child('modal')
});

// Enhance all components
document.querySelectorAll('[data-lazyimage]')
  .forEach(img => lazyImages.mount(img));

document.querySelectorAll('[data-modal][data-modal-target]')
  .forEach(trigger => modals.mount(trigger));

// Demo functions
window.showToast = function(type) {
  const messages = {
    info: 'This is an info message',
    success: 'Operation completed successfully!',
    warn: 'This is a warning message',
    error: 'An error occurred'
  };

  alerts.toast({
    message: messages[type],
    type,
    timeout: 4000
  });
};

// Basic demo button
document.getElementById('demo-toast')?.addEventListener('click', () => {
  showToast('info');
});

// Development helpers
if (window.location.search.includes('debug=1')) {
  window.demo = {
    eventBus,
    logger,
    alerts,
    lazyImages,
    modals,
    showToast
  };
  console.log('Demo debugging enabled. Access framework via window.demo');
}

console.log('🔷 Parallelogram-JS Demo loaded successfully!');