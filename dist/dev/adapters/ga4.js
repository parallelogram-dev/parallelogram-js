/**
 * Shared gtag/dataLayer plumbing for the Google family of adapters (GA4, Google
 * Ads, and any other `gtag('config', …)` consumer). Injecting `gtag.js` more
 * than once is wasteful and re-runs the bootstrap, so the loader is keyed by the
 * first id it sees and reused thereafter.
 *
 * Each adapter is built as its own bundle, so this module is inlined into every
 * adapter that imports it rather than shared at runtime — that is fine, the
 * idempotency guards below dedupe against the real `window` globals.
 *
 * @module @parallelogram-js/core/adapters/_gtag
 */

/**
 * Ensure `window.dataLayer` and `window.gtag` exist and that `gtag.js` is loaded
 * once. Returns the `gtag` function.
 *
 * @param {string} loaderId id used for the loader query string (any valid gtag id)
 * @returns {(...args: unknown[]) => void}
 */
function ensureGtag(loaderId) {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
  }

  if (loaderId && !window.__gtagLoaderInjected) {
    window.__gtagLoaderInjected = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`;
    document.head.appendChild(script);
  }

  return window.gtag;
}

/**
 * Google Analytics 4 via gtag.js.
 *
 * config: `{ id: "G-XXXXXXX", config?: object }`
 *
 * Note: prefer Cloudflare Zaraz for GA4 where available — it loads at the edge
 * and ships no gtag.js to the client. This adapter is the in-page fallback.
 *
 * @param {{ id?: string, config?: object }} config
 * @param {{ logger?: object }} [ctx]
 */
function ga4Adapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('ga4: no id in config');
    return;
  }

  const gtag = ensureGtag(config.id);
  gtag('config', config.id, config.config || {});
}

export { ga4Adapter as default };
