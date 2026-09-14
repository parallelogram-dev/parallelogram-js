import { ensureGtag } from './_gtag.js';

/**
 * Google Ads (gtag `AW-` id) for remarketing and conversion tracking
 *
 * config: `{ id: "AW-XXXXXXXXX", conversion?: { send_to: string, value?: number, currency?: string },
 * consentDefault?: object }`
 *
 * A block with `conversion` sends it once, whether it is on the first page or one the router shows
 * later, such as an order confirmation.
 *
 * @param {{ id?: string, conversion?: object, consentDefault?: object }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when gtag.js loads
 */
export default function googleAdsAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('google-ads: no id in config');
  }

  const { gtag, loaded } = ensureGtag(config.id, { nonce, consentDefault: config.consentDefault });
  gtag('config', config.id);
  if (config.conversion) {
    gtag('event', 'conversion', config.conversion);
  }
  return loaded;
}

googleAdsAdapter.page = (config, ctx, { mounted } = {}) => {
  if (mounted && config.conversion) {
    window.gtag?.('event', 'conversion', config.conversion);
  }
};
