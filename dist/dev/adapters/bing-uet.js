/**
 * Microsoft Advertising (Bing) Universal Event Tracking.
 *
 * config: `{ id: "1234567" }` — the UET tag id.
 *
 * @param {{ id?: string|number }} config
 * @param {{ logger?: object }} [ctx]
 */
function bingUetAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('bing-uet: no id in config');
    return;
  }
  if (window.uetq) return;

  /* eslint-disable */
  (function (w, d, t, r, u) {
    var f, n, i;
    ((w[u] = w[u] || []),
      (f = function () {
        var o = { ti: config.id, enableAutoSpaTracking: true };
        ((o.q = w[u]), (w[u] = new UET(o)), w[u].push('pageLoad'));
      }),
      (n = d.createElement(t)),
      (n.src = r),
      (n.async = 1),
      (n.onload = n.onreadystatechange =
        function () {
          var s = this.readyState;
          (s && s !== 'loaded' && s !== 'complete') ||
            (f(), (n.onload = n.onreadystatechange = null));
        }),
      (i = d.getElementsByTagName(t)[0]),
      i && i.parentNode ? i.parentNode.insertBefore(n, i) : d.head.appendChild(n));
  })(window, document, 'script', 'https://bat.bing.com/bat.js', 'uetq');
  /* eslint-enable */
}

export { bingUetAdapter as default };
