/**
 * Plausible Analytics (privacy-friendly, no cookies).
 *
 * config: `{ domain: "example.com", src?: string, api?: string }`
 *
 * `domain` is required; `src` overrides the default script URL (use for
 * self-hosted instances or extension-bypass variants), `api` sets a custom
 * events endpoint.
 *
 * @param {{ domain?: string, src?: string, api?: string }} config
 * @param {{ logger?: object }} [ctx]
 */
function plausibleAdapter(config, { logger } = {}) {
  if (!config.domain) {
    logger?.warn('plausible: no domain in config');
    return;
  }
  if (document.querySelector('script[data-domain][src*="plausible"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = config.src || 'https://plausible.io/js/script.js';
  script.setAttribute('data-domain', config.domain);
  if (config.api) script.setAttribute('data-api', config.api);
  document.head.appendChild(script);

  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
}

export { plausibleAdapter as default };
