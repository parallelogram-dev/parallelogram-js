import { injectScript } from './_script.js';

/**
 * Meta (Facebook) Pixel
 *
 * config: `{ id: "1234567890", events?: Array<string|[string, object]>, consentDefault?: "revoke"|"grant" }`
 *
 * Several pixels can share a page, and each block's events go only to its own pixel. `events`
 * defaults to `["PageView"]`; an event with parameters is written as a pair, for example
 * `["Purchase", { "value": 30, "currency": "AUD" }]`. fbevents.js records page views after router
 * navigation itself, so on later pages a block only sends its other events, once, when it mounts.
 * `consentDefault` is sent as `fbq('consent', …)` before the pixel starts.
 *
 * @param {{ id?: string|number, events?: Array<string|Array>, consentDefault?: string }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when fbevents.js loads
 */
export default function metaPixelAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('meta-pixel: no id in config');
  }

  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    Object.assign(fbq, { push: fbq, loaded: true, version: '2.0', queue: [] });
    window.fbq = fbq;
    window._fbq = window._fbq || fbq;
  }

  if (config.consentDefault) {
    window.fbq('consent', config.consentDefault);
  }
  window.fbq('init', String(config.id));
  sendEvents(config, config.events || ['PageView']);

  return injectScript('https://connect.facebook.net/en_US/fbevents.js', { nonce });
}

metaPixelAdapter.page = (config, ctx, { mounted } = {}) => {
  if (mounted && window.fbq) {
    sendEvents(
      config,
      (config.events || []).filter(event => event !== 'PageView')
    );
  }
};

function sendEvents(config, events) {
  for (const event of events) {
    const [name, params] = Array.isArray(event) ? event : [event];
    window.fbq('trackSingle', String(config.id), name, ...(params ? [params] : []));
  }
}
