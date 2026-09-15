import { injectScript } from './_script.js';

/**
 * Pinterest Tag
 *
 * config: `{ id: "2612345678901", em?: string }`
 *
 * `em` turns on enhanced match. The config is written into the page, so give it the customer's
 * email already hashed: lowercase, trimmed, then SHA-256 as hex. A plain address still works but
 * logs a warning. The tag records a page visit when it starts and each time the router shows a new
 * page.
 *
 * @param {{ id?: string|number, em?: string, email?: string }} config
 * @param {{ logger?: object, nonce?: string }} [ctx]
 * @returns {Promise<unknown>} settles when core.js loads
 */
export default function pinterestTagAdapter(config, { logger, nonce } = {}) {
  if (!config.id) {
    throw new Error('pinterest-tag: no id in config');
  }

  const em = config.em ?? config.email;
  if (typeof em === 'string' && em.includes('@')) {
    logger?.warn('pinterest-tag: hash the email with SHA-256 before putting it in the page');
  }

  if (!window.pintrk) {
    window.pintrk = function () {
      window.pintrk.queue.push(Array.prototype.slice.call(arguments));
    };
    window.pintrk.queue = [];
    window.pintrk.version = '3.0';
  }

  window.pintrk('load', String(config.id), em ? { em } : undefined);
  window.pintrk('page');

  return injectScript('https://s.pinimg.com/ct/core.js', { nonce });
}

pinterestTagAdapter.page = () => {
  window.pintrk?.('page');
};
