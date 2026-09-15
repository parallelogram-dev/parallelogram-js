import { injectScript } from './_script.js';

/**
 * HubSpot tracking code (analytics and the `_hsq` queue)
 *
 * config: `{ id: "1234567", events?: Array<unknown[]> }` — `id` is the HubSpot hub id
 *
 * The tracking code records the first page view when it loads. `events` are other `_hsq` calls for
 * the page, queued before its page view, for example `[["setContentType", "blog-post"]]`; don't
 * include `trackPageView`. When the router shows a new page the adapter sets the path and records a
 * page view, as HubSpot requires for single-page sites.
 *
 * @param {{ id?: string|number, events?: Array<unknown[]> }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when the tracking code loads
 */
export default function hubspotAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('hubspot: no id in config');
  }

  window._hsq = window._hsq || [];
  (config.events || []).forEach(event => window._hsq.push(event));

  return injectScript(`https://js.hs-scripts.com/${encodeURIComponent(config.id)}.js`, {
    nonce,
    id: 'hs-script-loader',
  });
}

hubspotAdapter.page = (config, ctx, { url = location.href, mounted } = {}) => {
  const { pathname, search, hash } = new URL(url, location.href);
  window._hsq = window._hsq || [];
  window._hsq.push(['setPath', pathname + search + hash]);
  if (mounted) {
    (config.events || []).forEach(event => window._hsq.push(event));
  }
  window._hsq.push(['trackPageView']);
};
