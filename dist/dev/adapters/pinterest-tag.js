/**
 * Pinterest Tag.
 *
 * config: `{ id: "2612345678901", email?: string }` — `email` enables enhanced
 * match when available.
 *
 * @param {{ id?: string, email?: string }} config
 * @param {{ logger?: object }} [ctx]
 */
function pinterestTagAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('pinterest-tag: no id in config');
    return;
  }
  if (window.pintrk) return;

  /* eslint-disable */
  !(function (e) {
    if (!window.pintrk) {
      window.pintrk = function () {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments));
      };
      var n = window.pintrk;
      n.queue = [];
      n.version = '3.0';
      var t = document.createElement('script');
      t.async = true;
      t.src = e;
      var r = document.getElementsByTagName('script')[0];
      if (r && r.parentNode) r.parentNode.insertBefore(t, r);
      else document.head.appendChild(t);
    }
  })('https://s.pinimg.com/ct/core.js');
  /* eslint-enable */

  window.pintrk('load', config.id, config.email ? { em: config.email } : undefined);
  window.pintrk('page');
}

export { pinterestTagAdapter as default };
