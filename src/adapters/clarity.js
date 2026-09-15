import { injectScript } from './_script.js';

/**
 * Microsoft Clarity (heatmaps and session replay)
 *
 * config: `{ id: "xxxxxxxxxx" }`
 *
 * @param {{ id?: string }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when the tag loads
 */
export default function clarityAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('clarity: no id in config');
  }

  window.clarity =
    window.clarity ||
    function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

  return injectScript(`https://www.clarity.ms/tag/${encodeURIComponent(config.id)}`, { nonce });
}
