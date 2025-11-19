import { BaseComponent } from '../core/BaseComponent.js';

export class DemoPerformance extends BaseComponent {
  constructor(dependencies) {
    super(dependencies);

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

  _init(element) {
    const state = super._init(element);
    console.log('DemoPerformance component mounting', element);

    // Store element reference for use in methods
    this.element = element;

    this.initPerformanceMonitoring(element, state.controller.signal);
    this.eventBus?.emit('demo-performance:mounted', { element });

    // Extend cleanup to include our cleanup
    const originalCleanup = state.cleanup;
    state.cleanup = () => {
      this.cleanup();
      originalCleanup();
    };

    return state;
  }

  cleanup() {
    // Clear intervals and event listeners
    if (this.performanceUpdateInterval) {
      clearInterval(this.performanceUpdateInterval);
    }
    if (this.healthUpdateInterval) {
      clearInterval(this.healthUpdateInterval);
    }
    if (this.demoEventInterval) {
      clearInterval(this.demoEventInterval);
    }

    // Clear element reference
    this.element = null;
  }

  initPerformanceMonitoring(element, signal) {
    console.log('Initializing performance monitoring');
    this.setupEventListeners(element, signal);
    this.setupChart();
    this.startPerformanceUpdates();
    this.updateHealthStatus();
    console.log('Performance monitoring initialized');
  }

  setupEventListeners(element, signal) {
    // Listen for framework events
    if (window.eventBus) {
      this.addEventListeners();
    }

    // Listen for component lifecycle events
    document.addEventListener('component:mount', this.handleComponentEvent.bind(this), { signal });
    document.addEventListener('component:unmount', this.handleComponentEvent.bind(this), { signal });
    document.addEventListener('router:navigate', this.handleRouterEvent.bind(this), { signal });
    document.addEventListener('performance:metric', this.handlePerformanceEvent.bind(this), { signal });

    // Monitor page visibility for performance tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logEvent('performance', 'page:hidden', { timestamp: performance.now() });
      } else {
        this.logEvent('performance', 'page:visible', { timestamp: performance.now() });
      }
    }, { signal });

    // Add click handlers for buttons
    this.setupButtonHandlers(element, signal);
  }

  addEventListeners() {
    // Use a wrapper function to properly handle the framework events
    this.frameworkEventHandler = (eventType, data) => {
      this.handleFrameworkEvent(eventType, data);
    };
    window.eventBus.on('*', this.frameworkEventHandler);
  }

  setupButtonHandlers(element, signal) {
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
      const button = element.querySelector(selector);
      if (button) {
        button.removeAttribute('onclick');
        button.addEventListener('click', handler, { signal });
      }
    });

    // Handle performance test buttons
    const testButtons = element.querySelectorAll('[data-btn-action*="runPerformanceTest"]');
    testButtons.forEach(button => {
      const action = button.getAttribute('data-btn-action');
      const match = action.match(/runPerformanceTest\('([^']+)'\)/);
      if (match) {
        const testType = match[1];
        button.addEventListener('click', () => this.runPerformanceTest(testType), { signal });
      }
    });

    // Handle event filter
    const eventFilter = element.querySelector('#event-filter');
    if (eventFilter) {
      eventFilter.removeAttribute('onchange');
      eventFilter.addEventListener('change', () => this.filterEvents(), { signal });
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
    console.log('Starting performance update intervals');
    this.performanceUpdateInterval = setInterval(() => {
      console.log('Performance metrics update tick');
      this.updatePerformanceMetrics();
    }, 2000);

    this.healthUpdateInterval = setInterval(() => {
      console.log('Health status update tick');
      this.updateHealthStatus();
    }, 5000);

    // Generate some demo events for the stream
    this.demoEventInterval = setInterval(() => {
      console.log('Demo event generation tick');
      this.generateDemoEvent();
    }, 3000);

    // Run immediately once
    this.updatePerformanceMetrics();
    this.updateHealthStatus();
    console.log('Performance intervals started');
  }

  generateDemoEvent() {
    const eventTypes = [
      { category: 'component', type: 'mount', data: { component: 'PModal', time: Math.random() * 50 } },
      { category: 'router', type: 'navigate', data: { from: '/', to: '/performance', duration: Math.random() * 100 } },
      { category: 'performance', type: 'metric', data: { memory: Math.round(Math.random() * 50) + 20, fps: Math.round(Math.random() * 60) + 30 } },
      { category: 'framework', type: 'component:update', data: { instances: Math.round(Math.random() * 10) + 5 } },
      { category: 'user', type: 'interaction', data: { event: 'click', target: 'button', timestamp: Date.now() } }
    ];

    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    // Add to performance data for realistic metrics
    if (randomEvent.category === 'component' && randomEvent.type === 'mount') {
      this.performanceData.componentMounts++;
      this.performanceData.mountTimes.push(randomEvent.data.time);
      // Keep only last 50 mount times
      if (this.performanceData.mountTimes.length > 50) {
        this.performanceData.mountTimes.shift();
      }
    }

    this.logEvent(randomEvent.category, randomEvent.type, randomEvent.data);
  }

  updatePerformanceMetrics() {
    // Update component registry with session tracking
    if (window.pageManager) {
      const registry = window.pageManager.getComponentRegistry ? window.pageManager.getComponentRegistry() : [];
      const states = window.pageManager.getComponentStates ? window.pageManager.getComponentStates() : {};
      const sessionTracking = window.pageManager.getSessionTracking ? window.pageManager.getSessionTracking() : {};

      // Update total registered components
      const totalComponents = this.element.querySelector('#total-components');
      if (totalComponents) {
        totalComponents.textContent = registry.length || '0';
      }

      // Update currently mounted components
      const mountedCount = Object.values(states).filter(s => s.status === 'loaded').length;
      const mountedComponents = this.element.querySelector('#mounted-components');
      if (mountedComponents) {
        mountedComponents.textContent = mountedCount || '0';
      }

      // Update session statistics
      const sessionLoadedComponents = this.element.querySelector('#session-loaded-components');
      if (sessionLoadedComponents) {
        sessionLoadedComponents.textContent = sessionTracking.totalComponentsLoaded || '0';
      }

      // Update load history count
      const totalLoads = this.element.querySelector('#total-component-loads');
      if (totalLoads) {
        const totalLoadCount = Object.values(sessionTracking.mountCounts || {}).reduce((sum, count) => sum + count, 0);
        totalLoads.textContent = totalLoadCount || '0';
      }

      this.updateRegistryDisplay(registry, states, sessionTracking);
    } else {
      // Fallback when pageManager is not available yet
      const totalComponents = this.element.querySelector('#total-components');
      if (totalComponents) {
        totalComponents.textContent = '0';
      }

      const mountedComponents = this.element.querySelector('#mounted-components');
      if (mountedComponents) {
        mountedComponents.textContent = '0';
      }
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
    // Update memory usage with fallback
    const memoryEl = this.element.querySelector('#memory-usage');
    if (memoryEl) {
      if (performance.memory) {
        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        memoryEl.textContent = memoryMB + 'MB';
      } else {
        // Fallback: estimate based on DOM size and objects
        const domNodes = document.querySelectorAll('*').length;
        const estimatedMB = Math.round((domNodes * 0.5 + Math.random() * 5 + 10));
        memoryEl.textContent = estimatedMB + 'MB (est)';
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

  updateRegistryDisplay(registry, states, sessionTracking = {}) {
    const container = this.element.querySelector('#registry-status');
    if (!container) return;

    if (!registry || registry.length === 0) {
      // Show mock data when no registry is available
      container.innerHTML = `
        <div class="component__item">
          <div>
            <strong>Framework Core</strong>
            <small style="margin-left: 0.5rem; color: #666;">(1)</small>
          </div>
          <span class="component__status loaded">loaded</span>
        </div>
        <div class="component__item">
          <div>
            <strong>Demo Performance</strong>
            <small style="margin-left: 0.5rem; color: #666;">(2)</small>
          </div>
          <span class="component__status loaded">loaded</span>
        </div>
        <div class="component__item">
          <div>
            <strong>Page Manager</strong>
            <small style="margin-left: 0.5rem; color: #666;">(3)</small>
          </div>
          <span class="component__status loaded">loaded</span>
        </div>
      `;
      return;
    }

    container.innerHTML = registry
      .map(comp => {
        const state = states[comp.name] || { status: 'not-loaded' };
        const loadCount = sessionTracking.mountCounts?.[comp.name] || 0;
        const wasLoadedThisSession = sessionTracking.componentsLoadedThisSession?.includes(comp.name);
        const sessionIndicator = wasLoadedThisSession ? ' 📋' : '';

        let statusDisplay = state.status;
        let statusClass = state.status;

        // Show more detailed status
        if (state.status === 'loaded' && state.hasInstance) {
          statusDisplay = `loaded (${state.instanceType})`;
        } else if (state.status === 'available') {
          statusDisplay = `available (${state.elementsFound} elements)`;
        }

        return `
                <div class="component__item">
                    <div>
                        <strong>${comp.name}${sessionIndicator}</strong>
                        <small style="margin-left: 0.5rem; color: #666;">
                          ${comp.priority}${loadCount > 0 ? ` • loaded ${loadCount}x` : ''}
                        </small>
                    </div>
                    <span class="component__status ${statusClass}" title="${statusDisplay}">${state.status}</span>
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
export default DemoPerformance;
