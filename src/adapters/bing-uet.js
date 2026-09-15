import { injectScript } from './_script.js';

const BAT_URL = 'https://bat.bing.com/bat.js';

/**
 * Microsoft Advertising (Bing) Universal Event Tracking
 *
 * config: `{ id: "1234567", consentDefault?: object }` — the UET tag id
 *
 * Calls already queued on `window.uetq`, such as the consent default Microsoft's consent mode
 * instructions put at the top of `<head>`, are kept and handed to UET when it starts.
 * `consentDefault` queues one itself, for example `{ "ad_storage": "denied" }`. UET's SPA tracking
 * records page views after router navigation.
 *
 * @param {{ id?: string|number, consentDefault?: object }} config
 * @param {{ logger?: object, nonce?: string }} [ctx]
 * @returns {Promise<unknown>|undefined} settles when bat.js loads and UET has started
 */
export default function bingUetAdapter(config, { logger, nonce } = {}) {
  if (!config.id) {
    throw new Error('bing-uet: no id in config');
  }

  window.uetq = window.uetq || [];
  if (config.consentDefault) {
    window.uetq.push('consent', 'default', config.consentDefault);
  }

  if (
    typeof window.UET === 'function' ||
    document.querySelector(`script[src$="//bat.bing.com/bat.js"]`)
  ) {
    logger?.info('bing-uet: UET is already on the page');
    return;
  }

  return injectScript(BAT_URL, { nonce }).then(() => {
    const queue = window.uetq;
    window.uetq = new window.UET({ ti: String(config.id), enableAutoSpaTracking: true, q: queue });
    window.uetq.push('pageLoad');
  });
}
