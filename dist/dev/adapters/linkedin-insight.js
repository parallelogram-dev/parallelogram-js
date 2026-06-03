/**
 * LinkedIn Insight Tag.
 *
 * config: `{ id: "1234567" }` — the LinkedIn partner id.
 *
 * @param {{ id?: string|number }} config
 * @param {{ logger?: object }} [ctx]
 */
function linkedinInsightAdapter(config, { logger } = {}) {
  if (!config.id) {
    logger?.warn('linkedin-insight: no id in config');
    return;
  }

  window._linkedin_partner_id = String(config.id);
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

  if (window.lintrk) return;

  /* eslint-disable */
  (function (l) {
    if (!l) {
      window.lintrk = function (a, b) {
        window.lintrk.q.push([a, b]);
      };
      window.lintrk.q = [];
    }
    var s = document.getElementsByTagName('script')[0];
    var b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    if (s && s.parentNode) s.parentNode.insertBefore(b, s);
    else document.head.appendChild(b);
  })(window.lintrk);
  /* eslint-enable */
}

export { linkedinInsightAdapter as default };
