import { BaseComponent } from '../core/BaseComponent.js';

export class DemoUIComponents extends BaseComponent {
  constructor(element, options = {}) {
    super(element, options);
  }

  mount() {
    super.mount();
    this.setupEventListeners();
    this.setupButtonHandlers();
    this.notifyPageLoaded();
    this.emit('demo-ui-components:mounted', { element: this.element });
  }

  unmount() {
    super.unmount();
  }

  setupEventListeners() {
    // Listen for UI component events
    this.addEventListener(document, 'p-select:change', e => {
      this.addEventToLog('p-select:change', e.detail);
    });

    this.addEventListener(document, 'modal:open', e => {
      this.addEventToLog('modal:open', { modalId: e.target.id });
    });

    this.addEventListener(document, 'modal:close', e => {
      this.addEventToLog('modal:close', { modalId: e.target.id });
    });

  }

  setupButtonHandlers() {
    // Handle all buttons with onclick handlers
    const onclickButtons = this.element.querySelectorAll('[data-btn-action]');

    onclickButtons.forEach(button => {
      const method = button.getAttribute('data-btn-action');
      button.removeAttribute('onclick');

      if (method.includes('handleFormSubmit')) {
        this.addEventListener(button, 'click', event => this.handleFormSubmit(event));
      } else if (method.includes('clearEventLog')) {
        this.addEventListener(button, 'click', () => this.clearEventLog());
      } else if (method.includes('exportEventLog')) {
        this.addEventListener(button, 'click', () => this.exportEventLog());
      } else if (method.includes('performance')) {
        this.addEventListener(button, 'click', () => {
          window.location.href = '/performance';
        });
      } else {
        // Handle modal action buttons
        this.addEventListener(button, 'click', event => {
          // Only prevent default for actions that shouldn't trigger default behavior
          if (button.type !== 'submit') {
            event.preventDefault();
          }
          this.handleModalAction(method, button);
        });
      }
    });
  }

  handleModalAction(action, button) {
    switch (action) {
      case 'open-form-modal':
        this.handleOpenFormModal();
        break;
      case 'cancel-form':
        this.handleCancelForm();
        break;
      case 'submit-form':
        this.handleSubmitForm(button);
        break;
      case 'close-gallery':
        this.handleCloseGallery();
        break;
      case 'add-to-collection':
        this.handleAddToCollection(button);
        break;
      case 'close-large-modal':
        this.handleCloseLargeModal();
        break;
      case 'view-performance':
        this.handleViewPerformance(button);
        break;
    }
  }

  handleOpenFormModal() {
    this.addEventToLog('modal:action', { action: 'open-form-modal', timestamp: Date.now() });

    // Dispatch custom event for other components to listen to
    this.emit('demo:form-modal-open', { modalType: 'form' });
  }

  handleCancelForm() {
    this.addEventToLog('modal:action', { action: 'cancel-form', timestamp: Date.now() });
  }

  handleSubmitForm(button) {
    // Animated loading sequence
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = 'Sent!';
      button.style.background = 'var(--color-success)';

      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        button.style.background = '';
      }, 2000);
    }, 1500);

    this.addEventToLog('modal:action', { action: 'submit-form', timestamp: Date.now() });
  }

  handleCloseGallery() {
    this.addEventToLog('modal:action', { action: 'close-gallery', timestamp: Date.now() });
  }

  handleAddToCollection(button) {
    const originalText = button.textContent;
    button.textContent = 'Added!';
    button.disabled = true;
    button.style.background = 'var(--color-success)';

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      button.style.background = '';
    }, 2000);

    this.addEventToLog('modal:action', { action: 'add-to-collection', item: 'gallery-item', timestamp: Date.now() });
  }

  handleCloseLargeModal() {
    this.addEventToLog('modal:action', { action: 'close-large-modal', timestamp: Date.now() });
  }

  handleViewPerformance(button) {
    const originalText = button.textContent;
    button.textContent = '📊 Loading...';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = '✅ Report Ready';
      button.style.background = 'var(--color-success)';

      // Mock performance report
      this.addEventToLog('performance:report', {
        loadTime: '1.2s',
        components: 15,
        events: 47,
        timestamp: Date.now()
      });

      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        button.style.background = '';
      }, 3000);
    }, 2000);

    this.addEventToLog('modal:action', { action: 'view-performance', timestamp: Date.now() });
  }

  handleFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData();
    const selects = document.querySelectorAll('p-select[name]');

    selects.forEach(select => {
      if (select.name && select.getValue()) {
        formData.set(select.name, select.getValue());
      }
    });

    const data = Object.fromEntries(formData);
    console.log('Form submitted with data:', data);

    if (window.Toast && window.Toast.show) {
      window.Toast.show(`Form submitted successfully!`, 'success');
    } else {
      alert(`Form submitted! Data: ${JSON.stringify(data)}`);
    }
  }

  clearEventLog() {
    const eventLogContent = this.element.querySelector('.event__log-content');
    if (eventLogContent) {
      eventLogContent.innerHTML =
        '<div class="event__log-item"><div><em>Event log cleared</em></div></div>';
    }
  }

  exportEventLog() {
    const eventLog = this.element.querySelector('.event__log-content');
    if (!eventLog) return;

    const events = Array.from(eventLog.children).map(child => ({
      timestamp: child.querySelector('small')?.textContent,
      event: child.querySelector('strong')?.textContent,
      data: child.querySelector('pre')?.textContent,
    }));

    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ui-events-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  addEventToLog(eventType, data) {
    const eventLogContent = this.element.querySelector('.event__log-content');
    if (!eventLogContent) return;

    const timestamp = new Date().toLocaleTimeString();
    const eventElement = document.createElement('div');
    eventElement.className = 'event__log-item';
    eventElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong>${eventType}</strong>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
                <small style="color: #999; margin-left: 1rem;">${timestamp}</small>
            </div>
        `;

    eventLogContent.insertBefore(eventElement, eventLogContent.firstChild);

    const items = eventLogContent.querySelectorAll('.event__log-item');
    if (items.length > 10) {
      items[items.length - 1].remove();
    }
  }

  notifyPageLoaded() {
    // Page-specific component mounting notification
    if (window.eventBus) {
      window.eventBus.emit('page:loaded', {
        page: '/ui-components',
        components: ['modal', 'toast', 'select'],
        timestamp: performance.now(),
      });
    }
  }
}
