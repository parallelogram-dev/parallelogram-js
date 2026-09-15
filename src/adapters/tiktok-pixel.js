import { injectScript } from './_script.js';

/**
 * TikTok Pixel
 *
 * config: `{ id: "XXXXXXXXXXXXXXXXXXXX", events?: Array<string|[string, object]>,
 * consentDefault?: "hold"|"revoke"|"grant" }`
 *
 * The queue matches TikTok's current base code, including its consent methods, and several pixels
 * can share a page. `consentDefault` calls `ttq.holdConsent()`, `revokeConsent()` or
 * `grantConsent()` before the first page view. The pixel records page views after router navigation
 * itself, so on later pages a block only sends its events, once, when it mounts.
 *
 * @param {{ id?: string, events?: Array<string|Array>, consentDefault?: string }} config
 * @param {{ nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when events.js loads
 */
export default function tiktokPixelAdapter(config, { nonce } = {}) {
  if (!config.id) {
    throw new Error('tiktok-pixel: no id in config');
  }

  const id = String(config.id);
  const ttq = typeof window.ttq?.load === 'function' ? window.ttq : createQueue(nonce);
  const loaded = ttq.load(id);

  const consent = CONSENT_METHODS[config.consentDefault];
  if (consent) {
    ttq[consent]();
  }

  const pixel = ttq.instance(id);
  pixel.page();
  sendEvents(pixel, config.events);

  return loaded;
}

tiktokPixelAdapter.page = (config, ctx, { mounted } = {}) => {
  if (mounted && window.ttq?.instance) {
    sendEvents(window.ttq.instance(String(config.id)), config.events);
  }
};

const EVENTS_URL = 'https://analytics.tiktok.com/i18n/pixel/events.js';

const METHODS = [
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
  'holdConsent',
  'revokeConsent',
  'grantConsent',
];

const CONSENT_METHODS = { hold: 'holdConsent', revoke: 'revokeConsent', grant: 'grantConsent' };

/**
 * Set up `window.ttq` as TikTok's base code does, keeping any calls already queued
 */
function createQueue(nonce) {
  window.TiktokAnalyticsObject = 'ttq';
  const ttq = (window.ttq = window.ttq || []);

  ttq.methods = METHODS;
  ttq.setAndDefer = (target, method) => {
    target[method] = function () {
      target.push([method, ...arguments]);
    };
  };
  METHODS.forEach(method => ttq.setAndDefer(ttq, method));

  ttq.instance = pixelId => {
    const pixel = ttq._i[pixelId] || [];
    METHODS.forEach(method => ttq.setAndDefer(pixel, method));
    return pixel;
  };

  ttq.load = (pixelId, options) => {
    ttq._i = ttq._i || {};
    ttq._i[pixelId] = [];
    ttq._i[pixelId]._u = EVENTS_URL;
    ttq._t = ttq._t || {};
    ttq._t[pixelId] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[pixelId] = options || {};
    return injectScript(`${EVENTS_URL}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`, { nonce });
  };

  return ttq;
}

function sendEvents(pixel, events = []) {
  for (const event of events) {
    const [name, params] = Array.isArray(event) ? event : [event];
    pixel.track(name, ...(params ? [params] : []));
  }
}
