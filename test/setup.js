// Jest setup file
import 'jest-environment-jsdom';

// Global test setup
global.requestIdleCallback = global.requestIdleCallback || ((cb) => setTimeout(cb, 1));
global.cancelIdleCallback = global.cancelIdleCallback || ((id) => clearTimeout(id));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    // Immediately trigger for tests
    this.callback([{ isIntersecting: true }]);
  }

  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}
  disconnect() {}
  unobserve() {}
};