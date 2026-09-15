import { injectScript } from './_script.js';

/**
 * LinkedIn Insight Tag
 *
 * config: `{ id: "1234567" }` — the LinkedIn partner id
 *
 * @param {{ id?: string|number }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when the tag loads
 */
export default function linkedinInsightAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('linkedin-insight: no id in config');
  }

  const id = String(config.id);
  window._linkedin_partner_id = id;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  if (!window._linkedin_data_partner_ids.includes(id)) {
    window._linkedin_data_partner_ids.push(id);
  }

  if (!window.lintrk) {
    window.lintrk = function (action, data) {
      window.lintrk.q.push([action, data]);
    };
    window.lintrk.q = [];
  }

  return injectScript('https://snap.licdn.com/li.lms-analytics/insight.min.js', { nonce });
}
