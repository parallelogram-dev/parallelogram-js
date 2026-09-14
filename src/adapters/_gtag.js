import { injectScript } from './_script.js';

/**
 * gtag.js set-up shared by the Google adapters (GA4 and Google Ads)
 *
 * Consent-management platforms and Google's consent mode instructions often define `gtag` inline
 * before any tag loads, so the `js` command and the loader are looked for in the data layer and on
 * the page rather than inferred from `gtag` existing.
 *
 * @module @parallelogram-js/core/adapters/_gtag
 */

const LOADER = 'https://www.googletagmanager.com/gtag/js';

/**
 * Make sure `dataLayer` and `gtag` exist, consent defaults and the `js` command are queued, and
 * gtag.js is on the page
 *
 * @param {string} loaderId - any gtag id, used in the loader's address
 * @param {{ nonce?: string, consentDefault?: object }} [options]
 * @returns {{ gtag: (...args: unknown[]) => void, loaded: Promise<unknown> }}
 */
export function ensureGtag(loaderId, { nonce, consentDefault } = {}) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  const { gtag } = window;
  if (consentDefault) {
    gtag('consent', 'default', consentDefault);
  }
  if (!window.dataLayer.some(entry => entry?.[0] === 'js')) {
    gtag('js', new Date());
  }

  const existing = document.querySelector(`script[src^="${LOADER}"]`);
  const src = existing?.src ?? `${LOADER}?id=${encodeURIComponent(loaderId)}`;

  return { gtag, loaded: injectScript(src, { nonce }) };
}
