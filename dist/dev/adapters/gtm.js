/**
 * Google Tag Manager container loader.
 *
 * config: `{ id: "GTM-XXXXXX" }`
 *
 * Deferring GTM defers every tag it manages, so this is often the only tracker
 * block a site needs. Idempotent: bails if the container script is already present.
 *
 * @param {{ id?: string }} config
 * @param {{ logger?: object }} [ctx]
 */
function gtmAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('gtm: no id in config');
    return;
  }

  if (window.google_tag_manager && window.google_tag_manager[config.id]) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.id)}`;
  document.head.appendChild(script);
}

export { gtmAdapter as default };
