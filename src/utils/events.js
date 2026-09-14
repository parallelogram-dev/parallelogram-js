/**
 * Dispatch a web component's event so that it bubbles out of shadow roots to the page
 *
 * `legacy` names the event this one replaced before 0.5.0. It is dispatched straight after, with
 * the same detail, until 0.6.0.
 *
 * @param {HTMLElement} target
 * @param {string} type - `<tag>:<verb>`, such as `p-modal:open`
 * @param {Object} [detail]
 * @param {{ legacy?: string, cancelable?: boolean }} [options]
 * @returns {boolean} false when a listener called preventDefault()
 */
export function dispatchComponentEvent(target, type, detail, { legacy, cancelable = false } = {}) {
  const allowed = target.dispatchEvent(
    new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable })
  );
  if (legacy) {
    target.dispatchEvent(new CustomEvent(legacy, { detail, bubbles: true }));
  }
  return allowed;
}
