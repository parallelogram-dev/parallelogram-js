/**
 * Microsoft Clarity (heatmaps + session replay).
 *
 * config: `{ id: "xxxxxxxxxx" }`
 *
 * @param {{ id?: string }} config
 * @param {{ logger?: object }} [ctx]
 */
function clarityAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('clarity: no id in config');
    return;
  }
  if (window.clarity) return;

  /* eslint-disable */
  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    if (y && y.parentNode) y.parentNode.insertBefore(t, y);
    else l.head.appendChild(t);
  })(window, document, 'clarity', 'script', config.id);
  /* eslint-enable */
}

export { clarityAdapter as default };
