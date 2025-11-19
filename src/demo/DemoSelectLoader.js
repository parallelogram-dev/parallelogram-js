import { BaseComponent } from '../core/BaseComponent.js';

export class DemoSelectLoader extends BaseComponent {
  constructor(options = {}) {
    super(options);
  }

  _init(element) {
    const state = super._init(element);

    this.logger?.info('DemoSelectLoader component initializing for element:', element);

    this.element = element;
    this.setupAPIDemo(state);
    this.setupEventDemo(state);
    this.setupFormDemo(state);

    if (this.eventBus) {
      this.eventBus.emit('demo-selectloader:mounted', { element });
    }

    return state;
  }

  setupAPIDemo(state) {
    const { controller } = state;

    const apiSelect = document.getElementById('api-select');
    const apiOutput = document.getElementById('api-output');

    if (!apiSelect || !apiOutput) return;

    /* Get the SelectLoader component instance */
    const getInstance = () => {
      /* Get the SelectLoader instance from PageManager */
      if (window.pageManager?.instances) {
        return window.pageManager.instances.get('selectloader');
      }
      return null;
    };

    /* Reload button */
    const btnReload = document.getElementById('btn-reload');
    if (btnReload) {
      btnReload.addEventListener(
        'click',
        () => {
          const instance = getInstance();
          if (instance && typeof instance.reload === 'function') {
            instance.reload(apiSelect);
          } else {
            this.logger?.warn('SelectLoader instance not found for reload');
          }
        },
        { signal: controller.signal }
      );
    }

    /* Load Demo 1 button */
    const btnLoadDemo1 = document.getElementById('btn-load-demo1');
    if (btnLoadDemo1) {
      btnLoadDemo1.addEventListener(
        'click',
        () => {
          const instance = getInstance();
          if (instance && typeof instance.load === 'function') {
            instance.load(apiSelect, 'fragments/api-demo-1.html');
          } else {
            this.logger?.warn('SelectLoader instance not found for load');
          }
        },
        { signal: controller.signal }
      );
    }

    /* Clear button */
    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener(
        'click',
        () => {
          const instance = getInstance();
          if (instance && typeof instance.clear === 'function') {
            instance.clear(apiSelect);
          } else {
            this.logger?.warn('SelectLoader instance not found for clear');
          }
        },
        { signal: controller.signal }
      );
    }

    /* Get State button */
    const btnGetState = document.getElementById('btn-get-state');
    if (btnGetState) {
      btnGetState.addEventListener(
        'click',
        () => {
          const instance = getInstance();
          if (instance && typeof instance.getLoadState === 'function') {
            const loadState = instance.getLoadState(apiSelect);
            apiOutput.textContent = JSON.stringify(loadState, null, 2);
            apiOutput.style.display = 'block';
          } else {
            this.logger?.warn('SelectLoader instance not found for getLoadState');
          }
        },
        { signal: controller.signal }
      );
    }
  }

  setupEventDemo(state) {
    const { controller } = state;

    const eventsSelect = document.getElementById('events-select');
    const eventLogList = document.getElementById('event-log-list');

    if (!eventsSelect || !eventLogList) return;

    const logEvent = (eventName, detail) => {
      const li = document.createElement('li');
      li.className = 'event__log-item';
      const timestamp = new Date().toLocaleTimeString();
      li.innerHTML = `
        <strong>${timestamp}</strong> - ${eventName}
        <pre>${JSON.stringify(detail, null, 2)}</pre>
      `;
      eventLogList.insertBefore(li, eventLogList.firstChild);

      /* Keep only last 5 events */
      if (eventLogList.children.length > 5) {
        eventLogList.removeChild(eventLogList.lastChild);
      }
    };

    /* Listen to SelectLoader events */
    eventsSelect.addEventListener(
      'selectloader:before-change',
      e => {
        logEvent('selectloader:before-change', { value: e.detail.value });
      },
      { signal: controller.signal }
    );

    eventsSelect.addEventListener(
      'selectloader:loading',
      e => {
        logEvent('selectloader:loading', { url: e.detail.url });
      },
      { signal: controller.signal }
    );

    eventsSelect.addEventListener(
      'selectloader:loaded',
      e => {
        logEvent('selectloader:loaded', { url: e.detail.url });
      },
      { signal: controller.signal }
    );

    eventsSelect.addEventListener(
      'selectloader:error',
      e => {
        logEvent('selectloader:error', { error: e.detail.error.message });
      },
      { signal: controller.signal }
    );

    eventsSelect.addEventListener(
      'selectloader:cleared',
      e => {
        logEvent('selectloader:cleared', {});
      },
      { signal: controller.signal }
    );

    /* Clear log button */
    const clearLogBtn = document.getElementById('clear-log');
    if (clearLogBtn) {
      clearLogBtn.addEventListener(
        'click',
        () => {
          eventLogList.innerHTML = '';
        },
        { signal: controller.signal }
      );
    }
  }

  setupFormDemo(state) {
    const { controller } = state;

    const regionForm = document.getElementById('region-form');
    if (regionForm) {
      regionForm.addEventListener(
        'submit',
        e => {
          e.preventDefault();
          alert('Form submitted! (prevented for demo)');
        },
        { signal: controller.signal }
      );
    }
  }
}
export default DemoSelectLoader;
