import { injectScript } from './_script.js';

/**
 * Hotjar (heatmaps and session recordings)
 *
 * config: `{ id: 1234567, sv?: number }` — `sv` is the Hotjar snippet version (default 6)
 *
 * @param {{ id?: number|string, sv?: number }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>|undefined} settles when the script loads
 */
export default function hotjarAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('hotjar: no id in config');
  }
  if (window._hjSettings) return;

  window.hj =
    window.hj ||
    function () {
      (window.hj.q = window.hj.q || []).push(arguments);
    };
  window._hjSettings = { hjid: config.id, hjsv: config.sv || 6 };

  const { hjid, hjsv } = window._hjSettings;
  return injectScript(
    `https://static.hotjar.com/c/hotjar-${encodeURIComponent(hjid)}.js?sv=${hjsv}`,
    {
      nonce,
    }
  );
}
