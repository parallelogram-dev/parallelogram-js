/**
 * Fathom Analytics (privacy-friendly, no cookies).
 *
 * config: `{ site: "ABCDEFGH", src?: string }`
 *
 * `site` is the Fathom site id; `src` overrides the default script URL (use for
 * custom/self-hosted domains).
 *
 * @param {{ site?: string, src?: string }} config
 * @param {{ logger?: object }} [ctx]
 */
export default function fathomAdapter(config, { logger } = {}) {
  if (!config.site) {
    logger?.warn('fathom: no site in config');
    return;
  }
  if (window.fathom) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = config.src || 'https://cdn.usefathom.com/script.js';
  script.setAttribute('data-site', config.site);
  document.head.appendChild(script);
}
