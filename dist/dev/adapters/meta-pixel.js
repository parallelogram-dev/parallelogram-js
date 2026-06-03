/**
 * Meta (Facebook) Pixel.
 *
 * config: `{ id: "1234567890", events?: string[] }`
 *
 * @param {{ id?: string, events?: string[] }} config
 * @param {{ logger?: object }} [ctx]
 */
function metaPixelAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('meta-pixel: no id in config');
    return;
  }
  if (window.fbq) return;

  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    if (s && s.parentNode) s.parentNode.insertBefore(t, s);
    else b.head.appendChild(t);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', config.id);
  (config.events || ['PageView']).forEach(evt => window.fbq('track', evt));
}

export { metaPixelAdapter as default };
