import { BaseComponent } from '../core/BaseComponent.js';

/**
 * DemoHome - Home page demo functionality
 * Handles performance panel and component registry display
 */
export class DemoHome extends BaseComponent {
  constructor(dependencies) {
    super(dependencies);
    this.performancePanelVisible = false;
  }

  _init(element) {
    const state = super._init(element);

    // Bind methods to maintain context
    this.togglePerformancePanel = this.togglePerformancePanel.bind(this);
    this.updatePerformancePanel = this.updatePerformancePanel.bind(this);
    this.updateComponentRegistry = this.updateComponentRegistry.bind(this);

    // Set up event listeners
    this._setupEventListeners(element, state.controller.signal);

    // Initial component registry update
    this.updateComponentRegistry();

    return state;
  }

  _setupEventListeners(element, signal) {
    // Performance panel toggle button
    const toggleButton = element.querySelector('[data-demo-performance-toggle]');
    if (toggleButton) {
      toggleButton.addEventListener('click', this.togglePerformancePanel, { signal });
    }

    // Update performance panel periodically when visible
    this.performanceInterval = setInterval(() => {
      if (this.performancePanelVisible) {
        this.updatePerformancePanel();
      }
    }, 1000);

    // Clean up interval on unmount
    const originalCleanup = this.getState(element)?.cleanup;
    if (originalCleanup) {
      this.elements.get(element).cleanup = () => {
        clearInterval(this.performanceInterval);
        originalCleanup();
      };
    }
  }

  togglePerformancePanel() {
    const panel = document.getElementById('performance-panel');
    if (!panel) return;

    this.performancePanelVisible = !this.performancePanelVisible;
    panel.classList.toggle('active', this.performancePanelVisible);

    if (this.performancePanelVisible) {
      this.updatePerformancePanel();
    }

    // Dispatch custom event
    this._dispatch(panel, 'demo:performance-panel-toggled', {
      visible: this.performancePanelVisible,
    });
  }

  updatePerformancePanel() {
    const metricsContainer = document.getElementById('performance-metrics');
    if (!metricsContainer) return;

    const metrics = this._getPerformanceMetrics();

    metricsContainer.innerHTML = `
      <div class="performance__metric">
        <span>Current Page:</span>
        <strong>${window.location.pathname}</strong>
      </div>
      <div class="performance__metric">
        <span>Components Mounted:</span>
        <strong>${metrics.pageManager?.componentMounts || 0}</strong>
      </div>
      <div class="performance__metric">
        <span>Router Navigations:</span>
        <strong>${metrics.router?.navigationCount || 0}</strong>
      </div>
      <div class="performance__metric">
        <span>Memory Usage:</span>
        <strong>${metrics.memory?.usedMB || 'N/A'} MB</strong>
      </div>
    `;
  }

  updateComponentRegistry() {
    const display = document.getElementById('component-registry-display');
    if (!display) return;

    if (window.pageManager) {
      const registry = window.pageManager.getComponentRegistry
        ? window.pageManager.getComponentRegistry()
        : [];
      const componentStates = window.pageManager.getComponentStates
        ? window.pageManager.getComponentStates()
        : {};

      if (registry.length > 0) {
        display.innerHTML = registry
          .map(comp => {
            const state = componentStates[comp.name] || { status: 'not-loaded' };
            const statusClass = `component-status--${state.status}`;

            return `
            <div class="component-registry__item ${statusClass}">
              <div class="component-registry__name">${comp.name}</div>
              <div class="component-registry__status">${state.status}</div>
              <div class="component-registry__selector">${comp.selector}</div>
            </div>
          `;
          })
          .join('');
      } else {
        display.innerHTML = '<p class="component-registry__empty">No components registered</p>';
      }
    } else {
      display.innerHTML =
        '<p class="component-registry__loading">Loading component registry...</p>';
    }
  }

  _getPerformanceMetrics() {
    // Get metrics from global performance tracking if available
    const metrics = window.getPerformanceMetrics ? window.getPerformanceMetrics() : {};

    // Add memory information if available
    if (window.performance && window.performance.memory) {
      metrics.memory = {
        usedMB: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
      };
    }

    return metrics;
  }

  // Public methods for external access
  getPerformancePanelState() {
    return this.performancePanelVisible;
  }

  showPerformancePanel() {
    if (!this.performancePanelVisible) {
      this.togglePerformancePanel();
    }
  }

  hidePerformancePanel() {
    if (this.performancePanelVisible) {
      this.togglePerformancePanel();
    }
  }
}
