import { BaseComponent } from '../core/BaseComponent.js';

export class DemoPerformance extends BaseComponent {
  constructor(element, options = {}) {
    super(element, options);

    this.performanceData = {
      componentMounts: 0,
      navigationCount: 0,
      eventCount: 0,
      mountTimes: [],
      navigationTimes: [],
      streamActive: true,
      recentEvents: new Set(),
    };

    this.lifecycleChart = null;
    this.chartData = [];
  }

  mount() {
    super.mount();
    this.initPerformanceMonitoring();
    this.emit('demo-performance:mounted', { element: this.element });
  }

  unmount() {
    this.cleanup();
    super.unmount();
  }

  cleanup() {
    // Clear intervals and event listeners
    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
    }
    if (this.healthUpdateInterval) {
      clearInterval(this.healthUpdateInterval);
    }
  }

  initPerformanceMonitoring() {
    this.setupEventListeners();
    this.setupChart();
    this.startPerformanceUpdates();
    this.updateHealthStatus();
  }

  setupEventListeners() {
    // Listen for framework events
    if (window.eventBus) {
      this.addEventListeners();
    }

    // Listen for component lifecycle events
    this.addEventListener(document, 'component:mount', this.handleComponentEvent.bind(this));
    this.addEventListener(document, 'component:unmount', this.handleComponentEvent.bind(this));
    this.addEventListener(document, 'router:navigate', this.handleRouterEvent.bind(this));
    this.addEventListener(document, 'performance:metric', this.handlePerformanceEvent.bind(this));

    // Monitor page visibility for performance tracking
    this.addEventListener(document, 'visibilitychange', () => {
      if (document.hidden) {
        this.logEvent('performance', 'page:hidden', { timestamp: performance.now() });
      } else {
        this.logEvent('performance', 'page:visible', { timestamp: performance.now() });
      }
    });

    // Add click handlers for buttons
    this.setupButtonHandlers();
  }

  addEventListeners() {
    // Use a wrapper function to properly handle the framework events
    this.frameworkEventHandler = (eventType, data) => {
      this.handleFrameworkEvent(eventType, data);
    };
    window.eventBus.on('*', this.frameworkEventHandler);
  }

  setupButtonHandlers() {
    // Bind all the button handlers to methods on this class
    const buttonHandlers = {
      '[data-btn-action="refreshRegistry"]': () => this.refreshRegistry(),
      '[data-btn-action="exportRegistry"]': () => this.exportRegistry(),
      '[data-btn-action="testNavigation"]': () => this.testNavigation(),
      '[data-btn-action="toggleEventStream"]': () => this.toggleEventStream(),
      '[data-btn-action="clearEventStream"]': () => this.clearEventStream(),
      '[data-btn-action="exportEventStream"]': () => this.exportEventStream(),
      '[data-btn-action="clearTimeline"]': () => this.clearTimeline(),
      '[data-btn-action="exportTimeline"]': () => this.exportTimeline(),
    };

    Object.entries(buttonHandlers).forEach(([selector, handler]) => {
      const button = this.element.querySelector(selector);
      if (button) {
        button.removeAttribute('onclick');
        this.addEventListener(button, 'click', handler);
      }
    });

    // Handle performance test buttons
    const testButtons = this.element.querySelectorAll('[onclick^="runPerformanceTest"]');
    testButtons.forEach(button => {
      const match = button.getAttribute('onclick').match(/runPerformanceTest\('([^']+)'\)/);
      if (match) {
        const testType = match[1];
        button.removeAttribute('onclick');
        this.addEventListener(button, 'click', () => this.runPerformanceTest(testType));
      }
    });

    // Handle event filter
    const eventFilter = this.element.querySelector('#event-filter');
    if (eventFilter) {
      eventFilter.removeAttribute('onchange');
      this.addEventListener(eventFilter, 'change', () => this.filterEvents());
    }
  }

  setupChart() {
    const canvas = this.element.querySelector('#lifecycle-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    this.lifecycleChart = {
      canvas: canvas,
      ctx: ctx,
      data: this.chartData,
      render: () => {
        this.renderChart();
      },
    };
  }

  renderChart() {
    if (!this.lifecycleChart) return;

    const { canvas, ctx, data } = this.lifecycleChart;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const y = (canvas.height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw timeline data
    if (data.length > 1) {
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, i) => {
        const x = (canvas.width / Math.max(data.length - 1, 1)) * i;
        const y = canvas.height - (point.value / 100) * canvas.height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }
  }

  handleFrameworkEvent(eventType, data) {
    this.performanceData.eventCount++;
    this.performanceData.recentEvents.add(eventType);

    // Keep only last 10 event types
    if (this.performanceData.recentEvents.size > 10) {
      const arr = Array.from(this.performanceData.recentEvents);
      this.performanceData.recentEvents.clear();
      arr.slice(-10).forEach(e => this.performanceData.recentEvents.add(e));
    }

    this.logEvent('framework', eventType, data);

    // Add to timeline chart
    this.chartData.push({
      timestamp: Date.now(),
      value: Math.random() * 100, // Mock performance value
      event: eventType,
    });

    // Keep only last 50 data points
    if (this.chartData.length > 50) {
      this.chartData.shift();
    }

    if (this.lifecycleChart) {
      this.lifecycleChart.render();
    }
  }

  handleComponentEvent(event) {
    if (event.type === 'component:mount') {
      this.performanceData.componentMounts++;
      const mountTime = event.detail?.mountTime || Math.random() * 50;
      this.performanceData.mountTimes.push(mountTime);
    }

    this.logEvent('component', event.type, event.detail);
  }

  handleRouterEvent(event) {
    this.performanceData.navigationCount++;
    const navTime = event.detail?.loadTime || Math.random() * 200;
    this.performanceData.navigationTimes.push(navTime);

    this.logEvent('router', event.type, event.detail);
  }

  handlePerformanceEvent(event) {
    this.logEvent('performance', event.type, event.detail);
  }

  logEvent(category, type, data) {
    if (!this.performanceData.streamActive) return;

    const container = this.element.querySelector('#event-stream-content');
    if (!container) return;

    const timestamp = new Date().toLocaleTimeString();
    const eventElement = document.createElement('div');
    eventElement.className = `event-stream-item event-${category}`;
    eventElement.innerHTML = `
            <div class="event-time">${timestamp}</div>
            <div class="event-category">${category}</div>
            <div class="event-type">${type}</div>
            <div class="event-data">${JSON.stringify(data || {}, null, 1)}</div>
        `;

    container.insertBefore(eventElement, container.firstChild);

    // Keep only last 100 events
    const items = container.querySelectorAll('.event-stream-item');
    if (items.length > 100) {
      items[items.length - 1].remove();
    }
  }

  startPerformanceUpdates() {
    this.performanceUpdateInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 2000);

    this.healthUpdateInterval = setInterval(() => {
      this.updateHealthStatus();
    }, 5000);
  }

  updatePerformanceMetrics() {
    // Update component registry
    if (window.pageManager && window.pageManager.getComponentRegistry) {
      const registry = window.pageManager.getComponentRegistry();
      const states = window.pageManager.getComponentStates
        ? window.pageManager.getComponentStates()
        : {};

      const totalComponents = this.element.querySelector('#total-components');
      if (totalComponents) {
        totalComponents.textContent = registry.length;
      }

      const mountedCount = Object.values(states).filter(s => s.status === 'loaded').length;
      const mountedComponents = this.element.querySelector('#mounted-components');
      if (mountedComponents) {
        mountedComponents.textContent = mountedCount;
      }

      this.updateRegistryDisplay(registry, states);
    }

    // Update performance metrics
    const avgMountTime =
      this.performanceData.mountTimes.length > 0
        ? Math.round(
            this.performanceData.mountTimes.reduce((a, b) => a + b, 0) /
              this.performanceData.mountTimes.length
          )
        : 0;
    const avgMountEl = this.element.querySelector('#avg-mount-time');
    if (avgMountEl) {
      avgMountEl.textContent = avgMountTime + 'ms';
    }

    // Update memory usage
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      const memoryEl = this.element.querySelector('#memory-usage');
      if (memoryEl) {
        memoryEl.textContent = memoryMB + 'MB';
      }
    }

    // Update router stats
    const currentPageEl = this.element.querySelector('#current-page');
    if (currentPageEl) {
      currentPageEl.textContent = window.location.pathname;
    }

    const navCountEl = this.element.querySelector('#navigation-count');
    if (navCountEl) {
      navCountEl.textContent = this.performanceData.navigationCount;
    }

    const enhancedLinks = document.querySelectorAll('[data-router-enhanced]').length;
    const enhancedLinksEl = this.element.querySelector('#enhanced-links');
    if (enhancedLinksEl) {
      enhancedLinksEl.textContent = enhancedLinks;
    }

    const avgNavTime =
      this.performanceData.navigationTimes.length > 0
        ? Math.round(
            this.performanceData.navigationTimes.reduce((a, b) => a + b, 0) /
              this.performanceData.navigationTimes.length
          )
        : 0;
    const avgNavEl = this.element.querySelector('#avg-navigation-time');
    if (avgNavEl) {
      avgNavEl.textContent = avgNavTime + 'ms';
    }

    // Update event bus stats
    const totalEventsEl = this.element.querySelector('#total-events');
    if (totalEventsEl) {
      totalEventsEl.textContent = this.performanceData.eventCount;
    }

    const activeListenersEl = this.element.querySelector('#active-listeners');
    if (activeListenersEl) {
      activeListenersEl.textContent = window.eventBus?.listenerCount?.() || 0;
    }

    const eventQueueEl = this.element.querySelector('#event-queue');
    if (eventQueueEl) {
      eventQueueEl.textContent = 0; // Mock queue length
    }

    // Update recent events
    const recentEventsContainer = this.element.querySelector('#recent-events');
    if (recentEventsContainer) {
      recentEventsContainer.innerHTML = Array.from(this.performanceData.recentEvents)
        .slice(-5)
        .map(event => `<span class="event-chip">${event}</span>`)
        .join('');
    }
  }

  updateRegistryDisplay(registry, states) {
    const container = this.element.querySelector('#registry-status');
    if (!container) return;

    container.innerHTML = registry
      .map(comp => {
        const state = states[comp.name] || { status: 'not-loaded' };
        return `
                <div class="component__item">
                    <div>
                        <strong>${comp.name}</strong>
                        <small style="margin-left: 0.5rem; color: #666;">(${comp.priority})</small>
                    </div>
                    <span class="component__status ${state.status}">${state.status}</span>
                </div>
            `;
      })
      .join('');
  }

  updateHealthStatus() {
    // Framework health
    const frameworkHealth = window.pageManager && window.router ? 'healthy' : 'error';
    const healthFramework = this.element.querySelector('#health-framework');
    const frameworkStatus = this.element.querySelector('#framework-status');

    if (healthFramework) {
      healthFramework.textContent = frameworkHealth === 'healthy' ? '🟢' : '🔴';
    }
    if (frameworkStatus) {
      frameworkStatus.textContent = frameworkHealth === 'healthy' ? 'Operational' : 'Error';
    }

    // Router health
    const routerHealth = window.router ? 'healthy' : 'error';
    const healthRouter = this.element.querySelector('#health-router');
    const routerStatus = this.element.querySelector('#router-status');

    if (healthRouter) {
      healthRouter.textContent = routerHealth === 'healthy' ? '🟢' : '🔴';
    }
    if (routerStatus) {
      routerStatus.textContent = routerHealth === 'healthy' ? 'Active' : 'Inactive';
    }

    // Components health
    const componentErrors = this.element.querySelectorAll('.component__status.error').length;
    const componentsHealth = componentErrors === 0 ? 'healthy' : 'warning';
    const healthComponents = this.element.querySelector('#health-components');
    const componentsStatus = this.element.querySelector('#components-status');

    if (healthComponents) {
      healthComponents.textContent = componentsHealth === 'healthy' ? '🟢' : '🟡';
    }
    if (componentsStatus) {
      componentsStatus.textContent =
        componentsHealth === 'healthy' ? 'All OK' : `${componentErrors} Errors`;
    }

    // Memory health
    const memoryHealth =
      performance.memory && performance.memory.usedJSHeapSize < 50 * 1024 * 1024
        ? 'healthy'
        : 'warning';
    const healthMemory = this.element.querySelector('#health-memory');
    const memoryStatus = this.element.querySelector('#memory-status');

    if (healthMemory) {
      healthMemory.textContent = memoryHealth === 'healthy' ? '🟢' : '🟡';
    }
    if (memoryStatus) {
      memoryStatus.textContent = memoryHealth === 'healthy' ? 'Normal' : 'High Usage';
    }
  }

  // Utility functions
  refreshRegistry() {
    if (window.pageManager && window.pageManager.scanAndMount) {
      window.pageManager.scanAndMount();
      this.logEvent('performance', 'registry:refresh', { timestamp: performance.now() });
    }
  }

  exportRegistry() {
    const data = {
      timestamp: new Date().toISOString(),
      registry: window.pageManager?.getComponentRegistry() || [],
      states: window.pageManager?.getComponentStates() || {},
      metrics: this.performanceData,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registry-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  testNavigation() {
    const pages = ['/', '/ui-components', '/media', '/interactive'];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];

    const startTime = performance.now();

    if (window.router && window.router.navigate) {
      window.router.navigate(randomPage);
    } else {
      window.location.href = randomPage;
    }

    const endTime = performance.now();
    this.logEvent('performance', 'navigation:test', {
      page: randomPage,
      duration: endTime - startTime,
    });
  }

  runPerformanceTest(testType) {
    const resultsContainer = this.element.querySelector('#test-results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `<div class="test-running">Running ${testType} test...</div>`;

    setTimeout(() => {
      let results;

      switch (testType) {
        case 'component-mount':
          results = this.testComponentMountSpeed();
          break;
        case 'memory-usage':
          results = this.testMemoryUsage();
          break;
        case 'event-throughput':
          results = this.testEventThroughput();
          break;
        case 'navigation-speed':
          results = this.testNavigationSpeed();
          break;
        case 'cleanup-efficiency':
          results = this.testCleanupEfficiency();
          break;
        default:
          results = { error: 'Unknown test type' };
      }

      this.displayTestResults(testType, results);
    }, 1000);
  }

  testComponentMountSpeed() {
    const startTime = performance.now();

    // Simulate component mounting
    for (let i = 0; i < 100; i++) {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-test-component', 'true');
      document.body.appendChild(mockElement);
      document.body.removeChild(mockElement);
    }

    const endTime = performance.now();

    return {
      totalTime: Math.round(endTime - startTime),
      averageTime: Math.round((endTime - startTime) / 100),
      componentsPerSecond: Math.round(100000 / (endTime - startTime)),
    };
  }

  testMemoryUsage() {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Create some objects to test memory
    const testData = [];
    for (let i = 0; i < 1000; i++) {
      testData.push({ id: i, data: new Array(100).fill(Math.random()) });
    }

    const peakMemory = performance.memory?.usedJSHeapSize || 0;

    // Clean up
    testData.length = 0;

    setTimeout(() => {
      if (typeof gc !== 'undefined') gc(); // Force garbage collection if available
    }, 100);

    const finalMemory = performance.memory?.usedJSHeapSize || 0;

    return {
      initialMB: Math.round(initialMemory / 1024 / 1024),
      peakMB: Math.round(peakMemory / 1024 / 1024),
      finalMB: Math.round(finalMemory / 1024 / 1024),
      allocatedMB: Math.round((peakMemory - initialMemory) / 1024 / 1024),
    };
  }

  testEventThroughput() {
    const startTime = performance.now();
    const eventCount = 1000;

    for (let i = 0; i < eventCount; i++) {
      document.dispatchEvent(
        new CustomEvent('test:event', {
          detail: { id: i, timestamp: performance.now() },
        })
      );
    }

    const endTime = performance.now();

    return {
      totalEvents: eventCount,
      totalTime: Math.round(endTime - startTime),
      eventsPerSecond: Math.round((eventCount * 1000) / (endTime - startTime)),
    };
  }

  testNavigationSpeed() {
    // Mock navigation test
    const mockTimes = Array.from({ length: 10 }, () => Math.random() * 100 + 50);

    return {
      averageTime: Math.round(mockTimes.reduce((a, b) => a + b, 0) / mockTimes.length),
      minTime: Math.round(Math.min(...mockTimes)),
      maxTime: Math.round(Math.max(...mockTimes)),
      samples: mockTimes.length,
    };
  }

  testCleanupEfficiency() {
    const startTime = performance.now();

    // Test cleanup patterns
    const cleanup = [];
    for (let i = 0; i < 100; i++) {
      const mockCleanup = () => {};
      cleanup.push(mockCleanup);
    }

    cleanup.forEach(fn => fn());
    cleanup.length = 0;

    const endTime = performance.now();

    return {
      cleanupTime: Math.round(endTime - startTime),
      itemsCleaned: 100,
      efficiency: 'Excellent',
    };
  }

  displayTestResults(testType, results) {
    const container = this.element.querySelector('#test-results');
    if (!container) return;

    if (results.error) {
      container.innerHTML = `<div class="test-error">Error: ${results.error}</div>`;
      return;
    }

    const resultHtml = Object.entries(results)
      .map(
        ([key, value]) =>
          `<div class="test-result-item"><span>${key}:</span> <strong>${value}</strong></div>`
      )
      .join('');

    container.innerHTML = `
            <div class="test-success">
                <h4>${testType} Results</h4>
                ${resultHtml}
            </div>
        `;

    this.logEvent('performance', `test:${testType}`, results);
  }

  toggleEventStream() {
    this.performanceData.streamActive = !this.performanceData.streamActive;
    const button = this.element.querySelector('#stream-toggle');
    if (button) {
      button.textContent = this.performanceData.streamActive ? 'Pause Stream' : 'Resume Stream';
    }
  }

  clearEventStream() {
    const container = this.element.querySelector('#event-stream-content');
    if (container) {
      container.innerHTML =
        '<div class="event-stream-item event-info"><div class="event-type">Stream cleared</div></div>';
    }
  }

  exportEventStream() {
    const events = Array.from(this.element.querySelectorAll('.event-stream-item')).map(item => ({
      time: item.querySelector('.event-time')?.textContent,
      category: item.querySelector('.event-category')?.textContent,
      type: item.querySelector('.event-type')?.textContent,
      data: item.querySelector('.event-data')?.textContent,
    }));

    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-stream-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearTimeline() {
    this.chartData.length = 0;
    if (this.lifecycleChart) {
      this.lifecycleChart.render();
    }
  }

  exportTimeline() {
    const blob = new Blob([JSON.stringify(this.chartData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  filterEvents() {
    const filter = this.element.querySelector('#event-filter')?.value;
    const items = this.element.querySelectorAll('.event-stream-item');

    items.forEach(item => {
      if (!filter || item.classList.contains(`event-${filter}`)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }
}
