import { injectScript } from './_script.js';

/**
 * Fathom Analytics (privacy-friendly, no cookies)
 *
 * config: `{ site: "ABCDEFGH", src?: string }`
 *
 * `site` is the Fathom site id; `src` points at a custom domain or self-hosted copy of the script.
 * Fathom records page views after router navigation itself. DeferTracker loads a `src` only from
 * Fathom's origin, the page's own, or an origin passed to `registerTrackerAdapter()`'s `origins`.
 *
 * @param {{ site?: string, src?: string }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>|undefined} settles when the script loads
 */
export default function fathomAdapter(config, { nonce } = {}) {
  if (!config.site) {
    throw new Error('fathom: no site in config');
  }
  if (window.fathom) return;

  return injectScript(config.src || 'https://cdn.usefathom.com/script.js', {
    nonce,
    attrs: { 'data-site': config.site },
  });
}

/** Origins DeferTracker lets a block's `src` load from */
fathomAdapter.origins = ['https://cdn.usefathom.com'];
