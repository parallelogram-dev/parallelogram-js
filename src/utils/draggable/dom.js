/**
 * DOM helpers shared by the drag engine
 */

/**
 * Walk up from `element`, inclusive, to the first ancestor matching `value`, crossing out of
 * shadow roots. `value` is a selector, an element, an array or NodeList of elements, or a
 * predicate, the shapes Shopify Draggable accepts.
 *
 * @param {Node|null} element
 * @param {string|Element|Element[]|NodeList|((node: Element) => boolean)} value
 * @returns {Element|null}
 */
export function closest(element, value) {
  if (!element || !value) return null;

  let match;
  if (typeof value === 'string') {
    match = node => node.matches(value);
  } else if (typeof value === 'function') {
    match = value;
  } else if (value instanceof NodeList || Array.isArray(value)) {
    const set = new Set(value);
    match = node => set.has(node);
  } else {
    match = node => node === value;
  }

  let node = element.nodeType === Node.ELEMENT_NODE ? element : element.parentElement;
  while (node && node !== document) {
    if (node.nodeType === Node.ELEMENT_NODE && match(node)) return node;
    node = node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode;
  }
  return null;
}

/**
 * The element at a point, looking inside open shadow roots where `document.elementFromPoint`
 * stops at the outermost host, so an item kept in a component's shadow root is found under the
 * pointer as one in the page is
 *
 * @param {number} x
 * @param {number} y
 * @returns {Element|null}
 */
export function elementFromPoint(x, y) {
  let element = document.elementFromPoint(x, y);
  while (element?.shadowRoot) {
    const inner = element.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === element) break;
    element = inner;
  }
  return element;
}

/** Distance between two points */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Set `user-select` on an element, with the prefix WebKit still needs */
export function applyUserSelect(element, value) {
  element.style.webkitUserSelect = value;
  element.style.userSelect = value;
}

export function getDocumentScrollingElement() {
  return document.scrollingElement || document.documentElement;
}
