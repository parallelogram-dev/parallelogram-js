/**
 * HubSpot tracking code (analytics + the `_hsq` event queue).
 *
 * config: `{ id: "1234567", events?: Array<unknown[]> }` — `id` is the HubSpot
 * portal/hub id. `events` are pushed onto `_hsq` after load, e.g.
 * `[["setPath", "/home"], ["trackPageView"]]`.
 *
 * @param {{ id?: string|number, events?: Array<unknown[]> }} config
 * @param {{ logger?: object }} [ctx]
 */
function hubspotAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('hubspot: no id in config');
    return;
  }
  if (document.getElementById('hs-script-loader')) return;

  window._hsq = window._hsq || [];

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.id = 'hs-script-loader';
  script.async = true;
  script.defer = true;
  script.src = `https://js.hs-scripts.com/${encodeURIComponent(config.id)}.js`;
  document.head.appendChild(script);

  (config.events || []).forEach(evt => window._hsq.push(evt));
}

export { hubspotAdapter as default };
