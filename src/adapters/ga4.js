import { ensureGtag } from './_gtag.js';

/**
 * Google Analytics 4 via gtag.js
 *
 * config: `{ id: "G-XXXXXXX", config?: object, consentDefault?: object }`
 *
 * `consentDefault` is sent as `gtag('consent', 'default', …)` before the config, for example
 * `{ "analytics_storage": "denied" }`. Enhanced measurement records page views after router
 * navigation, so there is no page step. Prefer Cloudflare Zaraz for GA4 where it is available: it
 * loads at the edge and sends no gtag.js to the browser.
 *
 * @param {{ id?: string, config?: object, consentDefault?: object }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when gtag.js loads
 */
export default function ga4Adapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('ga4: no id in config');
  }

  const { gtag, loaded } = ensureGtag(config.id, { nonce, consentDefault: config.consentDefault });
  gtag('config', config.id, config.config || {});
  return loaded;
}
