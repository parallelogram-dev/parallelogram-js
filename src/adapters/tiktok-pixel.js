/**
 * TikTok Pixel.
 *
 * config: `{ id: "XXXXXXXXXXXXXXXXXXXX", events?: string[] }`
 *
 * @param {{ id?: string, events?: string[] }} config
 * @param {{ logger?: object }} [ctx]
 */
export default function tiktokPixelAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('tiktok-pixel: no id in config');
    return;
  }
  if (window.ttq) return;

  /* eslint-disable */
  (function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = [
      'page',
      'track',
      'identify',
      'instances',
      'debug',
      'on',
      'off',
      'once',
      'ready',
      'alias',
      'group',
      'enableCookie',
      'disableCookie',
    ];
    ttq.setAndDefer = function (obj, method) {
      obj[method] = function () {
        obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id) {
      var inst = ttq._i[id] || [];
      for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(inst, ttq.methods[n]);
      return inst;
    };
    ttq.load = function (id, opts) {
      var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = url;
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = opts || {};
      var script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = url + '?sdkid=' + id + '&lib=' + t;
      var first = d.getElementsByTagName('script')[0];
      if (first && first.parentNode) first.parentNode.insertBefore(script, first);
      else d.head.appendChild(script);
    };
  })(window, document, 'ttq');
  /* eslint-enable */

  window.ttq.load(config.id);
  window.ttq.page();
  (config.events || []).forEach(evt => window.ttq.track(evt));
}
