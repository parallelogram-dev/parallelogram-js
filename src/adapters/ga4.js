import { ensureGtag } from './_gtag.js';

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
export default function ga4Adapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('ga4: no id in config');
    return;
  }

  const gtag = ensureGtag(config.id);
  gtag('config', config.id, config.config || {});
}
