import { injectScript } from './_script.js';

const BAT_URL = 'https://bat.bing.com/bat.js';

/** Tags this module has started, keyed by tag id */
const tags = new Map();

const whenLoaded = script =>
  typeof window.UET === 'function' ||
  new Promise(resolve => script.addEventListener('load', resolve, { once: true }));

/**
 * Microsoft Advertising (Bing) Universal Event Tracking
 *
 * config: `{ id: "1234567", consentDefault?: object }` — the UET tag id
 *
 * The first tag started on a page without UET uses `window.uetq`. Each further tag id, and every
 * tag when the page already has its own UET snippet, gets its own instance at `window.uetq_<id>`,
 * such as `window.uetq_7654321`, so push custom events to the queue for the tag they belong to.
 * A tag id that has already started isn't started again.
 *
 * Calls already queued on a tag's queue, such as the consent default Microsoft's consent mode
 * instructions put at the top of `<head>`, are kept and handed to UET when it starts.
 * `consentDefault` queues one on the tag's own queue, for example `{ "ad_storage": "denied" }`.
 * UET's SPA tracking records page views after router navigation.
 *
 * @param {{ id?: string|number, consentDefault?: object }} config
 * @param {{ logger?: object, nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when bat.js loads and the tag's UET instance has started
 */
export default function bingUetAdapter(config, { logger, nonce } = {}) {
  if (!config.id) {
    throw new Error('bing-uet: no id in config');
  }

  const ti = String(config.id);
  if (tags.has(ti)) {
    logger?.info(`bing-uet: tag ${ti} has already started`);
    return tags.get(ti);
  }

  const name =
    tags.size ||
    typeof window.UET === 'function' ||
    document.querySelector('script[src$="//bat.bing.com/bat.js"]')
      ? `uetq_${ti}`
      : 'uetq';
  const queue = (window[name] = window[name] || []);
  if (config.consentDefault) {
    queue.push('consent', 'default', config.consentDefault);
  }

  const loaded =
    typeof window.UET === 'function'
      ? Promise.resolve()
      : injectScript(BAT_URL, { nonce }).then(whenLoaded);

  const started = loaded.then(() => {
    window[name] = new window.UET({ ti, enableAutoSpaTracking: true, q: queue });
    window[name].push('pageLoad');
  });
  tags.set(ti, started);
  started.catch(() => tags.delete(ti));
  return started;
}
