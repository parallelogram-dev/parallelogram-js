/**
 * Dispatch a web component's event so that it bubbles out of shadow roots to the page
 *
 * @param {HTMLElement} target
 * @param {string} type - `<tag>:<verb>`, such as `p-modal:open`
 * @param {Object} [detail]
 * @param {{ cancelable?: boolean }} [options]
 * @returns {boolean} false when a listener called preventDefault()
 */
export function dispatchComponentEvent(target, type, detail, { cancelable = false } = {}) {
  return target.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable })
  );
}
