/**
 * DOM Utility Functions
 * Shared utilities for both BaseComponent and Web Components
 */

import { prefersReducedMotion } from './motion.js';

/**
 * Generate unique ID with optional prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'elem') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function - delays execution until after wait milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function - ensures it's only called at most once per time period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between allowed executions
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Delay helper - returns a promise that resolves after specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Apply fade-in effect to element
 * @param {HTMLElement} element - Element to fade in
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
export async function fadeIn(element, duration = 300) {
  const ms = prefersReducedMotion() ? 0 : duration;
  element.style.opacity = '0';
  element.style.transition = `opacity ${ms}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '1';

  return new Promise(resolve => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, ms);
  });
}

/**
 * Apply fade-out effect to element
 * @param {HTMLElement} element - Element to fade out
 * @param {number} duration - Duration in milliseconds
 * @returns {Promise} Promise that resolves when fade completes
 */
export async function fadeOut(element, duration = 300) {
  const ms = prefersReducedMotion() ? 0 : duration;
  element.style.opacity = '1';
  element.style.transition = `opacity ${ms}ms ease-in-out`;
  element.offsetHeight; /* Force reflow */
  element.style.opacity = '0';

  return new Promise(resolve => {
    setTimeout(() => {
      element.style.transition = '';
      resolve();
    }, ms);
  });
}

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container to search within
 * @returns {HTMLElement[]} Array of focusable elements
 */
export function getFocusableElements(container = document) {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ];
  return Array.from(container.querySelectorAll(selectors.join(',')));
}

/**
 * The element that has focus, following open shadow roots down to the focused element inside them
 * @returns {Element|null} Focused element
 */
export function deepActiveElement() {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * The current values of some attributes, null for those that are absent
 *
 * @param {Element} element
 * @param {string[]} names
 * @returns {Map<string, string|null>}
 */
export function rememberAttributes(element, names) {
  return new Map(names.map(name => [name, element.getAttribute(name)]));
}

/**
 * Put attributes back to remembered values, removing those that were absent
 *
 * @param {Element} element
 * @param {Iterable<[string, string|null]>} [attributes]
 */
export function restoreAttributes(element, attributes = []) {
  for (const [name, value] of attributes) {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }
}

/**
 * Trap focus within a container (for modals, dialogs, etc.)
 * @param {HTMLElement} container - Container to trap focus within
 * @param {KeyboardEvent} event - Tab key event
 */
export function trapFocus(container, event) {
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.contains(document.activeElement) ? document.activeElement : null;

  if (event.shiftKey && (active === first || !active)) {
    last.focus();
    event.preventDefault();
  } else if (!event.shiftKey && active === last) {
    first.focus();
    event.preventDefault();
  }
}

/**
 * Restore focus to an element with smooth transition
 * @param {HTMLElement} element - Element to focus
 */
export function restoreFocus(element) {
  if (element && typeof element.focus === 'function') {
    requestAnimationFrame(() => element.focus());
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Text content or child element
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'class') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else if (key === 'htmlFor') {
      element.setAttribute('for', value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }

  return element;
}
