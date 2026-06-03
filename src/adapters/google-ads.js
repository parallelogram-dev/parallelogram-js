import { ensureGtag } from './_gtag.js';

/**
 * Google Ads (gtag `AW-` id) for remarketing and conversion tracking.
 *
 * config: `{ id: "AW-XXXXXXXXX", conversion?: { send_to: string, value?: number, currency?: string } }`
 *
 * @param {{ id?: string, conversion?: object }} config
 * @param {{ logger?: object }} [ctx]
 */
export default function googleAdsAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('google-ads: no id in config');
    return;
  }

  const gtag = ensureGtag(config.id);
  gtag('config', config.id);

  if (config.conversion) {
    gtag('event', 'conversion', config.conversion);
  }
}
