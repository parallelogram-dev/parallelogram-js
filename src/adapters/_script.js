/**
 * Script loading shared by the tracker adapters
 *
 * @module @parallelogram-js/core/adapters/_script
 */

import { trustedScriptURL } from '../utils/trusted.js';

/** Scripts this module has added, keyed by absolute address */
const loading = new Map();

const findOnPage = (href, id) =>
  [...document.querySelectorAll('script[src]')].find(script => script.src === href) ??
  (id ? document.getElementById(id) : null);

/**
 * Add a script to the page once and settle when it loads or fails to load
 *
 * A script with the same address (or id) that is already on the page, from a vendor snippet or
 * another copy of this module, counts as loaded. A script that fails to load is removed, so a
 * later call can try again.
 *
 * @param {string} src
 * @param {{ nonce?: string, id?: string, attrs?: Record<string, string> }} [options]
 * @returns {Promise<HTMLScriptElement>}
 */
export function injectScript(src, { nonce, id, attrs = {} } = {}) {
  const href = new URL(src, document.baseURI).href;
  if (loading.has(href)) return loading.get(href);

  const existing = findOnPage(href, id);
  if (existing) return Promise.resolve(existing);

  const script = document.createElement('script');
  script.async = true;
  script.src = trustedScriptURL(href);
  if (nonce) script.setAttribute('nonce', nonce);
  if (id) script.id = id;
  for (const [name, value] of Object.entries(attrs)) {
    script.setAttribute(name, value);
  }

  const promise = new Promise((resolve, reject) => {
    script.addEventListener('load', () => resolve(script), { once: true });
    script.addEventListener(
      'error',
      () => {
        loading.delete(href);
        script.remove();
        reject(new Error(`Could not load ${href}`));
      },
      { once: true }
    );
  });

  loading.set(href, promise);
  document.head.append(script);
  return promise;
}
