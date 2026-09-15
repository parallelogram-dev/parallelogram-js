import { injectScript } from './_script.js';

/**
 * Plausible Analytics (privacy-friendly, no cookies)
 *
 * config: `{ scriptId: "pa-XXXXXXXX", src?: string, options?: object }` for the site script from
 * Plausible's dashboard, or `{ domain: "example.com", src?: string, api?: string }` for the older
 * shared script
 *
 * `scriptId` is the part of the snippet's address after `/js/`, without `.js`, and `options` are
 * passed to `plausible.init()`. `src` points at a proxied or self-hosted copy of either script, and
 * `api` sets the older script's events endpoint. Plausible records page views after router
 * navigation itself. DeferTracker loads a `src` only from Plausible's origin, the page's own, or an
 * origin passed to `registerTrackerAdapter()`'s `origins`.
 *
 * @param {{ scriptId?: string, domain?: string, src?: string, api?: string, options?: object }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when the script loads
 */
export default function plausibleAdapter(config, { nonce } = {}) {
  const { scriptId, domain } = config;
  if (!scriptId && !domain) {
    throw new Error('plausible: no scriptId or domain in config');
  }

  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };

  if (scriptId) {
    window.plausible.init =
      window.plausible.init ||
      function (options) {
        window.plausible.o = options || {};
      };
    window.plausible.init(config.options);

    return injectScript(
      config.src || `https://plausible.io/js/${encodeURIComponent(scriptId)}.js`,
      {
        nonce,
      }
    );
  }

  const attrs = { 'data-domain': domain };
  if (config.api) {
    attrs['data-api'] = config.api;
  }
  return injectScript(config.src || 'https://plausible.io/js/script.js', { nonce, attrs });
}

/** Origins DeferTracker lets a block's `src` load from */
plausibleAdapter.origins = ['https://plausible.io'];
