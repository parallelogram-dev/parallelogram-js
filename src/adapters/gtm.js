import { injectScript } from './_script.js';

/**
 * Google Tag Manager container loader
 *
 * config: `{ id: "GTM-XXXXXX" }`
 *
 * Deferring GTM defers every tag it manages, so this is often the only tracker block a site needs.
 * The CSP nonce is set on the container script, as in Google's nonce-aware snippet, so Tag Manager
 * can pass it on to Custom HTML tags.
 *
 * A container's Custom HTML tags run any script with that nonce, so register GTM with the
 * containers the site uses, such as `registerTrackerAdapter('gtm', gtm, { ids: ['GTM-XXXXXX'] })`,
 * and a block injected into the page can't load another. Without `ids`, DeferTracker warns once.
 *
 * @param {{ id?: string }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>|undefined} settles when the container loads
 */
export default function gtmAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('gtm: no id in config');
  }
  if (window.google_tag_manager?.[config.id]) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  return injectScript(
    `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.id)}`,
    {
      nonce,
    }
  );
}
