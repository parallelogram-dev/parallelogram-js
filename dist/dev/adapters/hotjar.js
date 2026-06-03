/**
 * Hotjar (heatmaps + session recordings).
 *
 * config: `{ id: 1234567, sv?: number }` — `sv` is the Hotjar snippet version
 * (defaults to 6).
 *
 * @param {{ id?: number|string, sv?: number }} config
 * @param {{ logger?: object }} [ctx]
 */
function hotjarAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('hotjar: no id in config');
    return;
  }
  if (window.hj) return;

  /* eslint-disable */
  (function (h, o, t, j, a, r) {
    h.hj =
      h.hj ||
      function () {
        (h.hj.q = h.hj.q || []).push(arguments);
      };
    h._hjSettings = { hjid: config.id, hjsv: config.sv || 6 };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script');
    r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  /* eslint-enable */
}

export { hotjarAdapter as default };
