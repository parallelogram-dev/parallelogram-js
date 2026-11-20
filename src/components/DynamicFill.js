import { BaseComponent } from '../core/BaseComponent.js';
import { trustedHTML } from '../utils/trusted.js';

const SELECTOR = 'data-dynamic-fill';
const CSRF = 'csrf';
const DEFAULT_ENDPOINT = '/p-cache/dynamic';
const FLAG = 'parallelogram';

/**
 * Fill per-visitor placeholders on a cached page: a form's CSRF token, and named fragments such as
 * an enquiry count
 *
 * A server-side page cache, such as Parallelogram Cache for Craft CMS, writes each placeholder with
 * `data-dynamic-fill` naming the fragment (or `csrf`), `data-dynamic-fill-endpoint` naming where to
 * ask, and `data-dynamic-fill-status="pending"`. Every placeholder mounted in the same pass is
 * gathered into one request per endpoint, `?fragments=a,b&csrf=1`, sent with the page's cookies.
 * The JSON answer fills each one: a CSRF `<input>`'s value or `<meta>`'s content, a fragment's HTML
 * when the server marked it `html`, or its text when it sent a `value`. Placeholders added later,
 * such as on a page the router swaps in, are gathered into a request of their own.
 *
 * `data-dynamic-fill-status` moves from pending to filled or error; a placeholder that can't be
 * filled keeps its fallback. A CSRF `<meta>` in `<head>`, which the framework doesn't mount, is
 * filled with the first request that asks for a token.
 *
 * The component sets `window.pCacheDynamic`, the same flag the cache's fallback script sets, so the
 * two never both fill a page; if the fallback script has already claimed the page, the component
 * leaves the placeholders to it.
 *
 * @fires dynamic-fill:filled
 * @fires dynamic-fill:error
 * @example
 * <input type="hidden" name="CRAFT_CSRF_TOKEN" value=""
 *   data-dynamic-fill="csrf" data-dynamic-fill-endpoint="/p-cache/dynamic"
 *   data-dynamic-fill-status="pending">
 * <span data-dynamic-fill="enquiryCount" data-dynamic-fill-status="pending">0</span>
 */
export default class DynamicFill extends BaseComponent {
  static selector = SELECTOR;

  static defaults = {
    endpoint: DEFAULT_ENDPOINT,
  };

  constructor(context) {
    super(context);
    /** @type {Set<HTMLElement>} Placeholders waiting for the next request */
    this._queue = new Set();
    this._scheduled = false;
  }

  /**
   * @param {HTMLElement} element
   */
  _init(element) {
    const state = super._init(element);

    if (!this._claim()) return state;

    if (this.getAttr(element, 'status') !== 'pending') this.setAttr(element, 'status', 'pending');
    this._queue.add(element);
    this._schedule();

    const baseCleanup = state.cleanup;
    state.cleanup = () => {
      this._queue.delete(element);
      baseCleanup();
    };
    return state;
  }

  /**
   * Whether this component fills the page, claiming it from the fallback script if no one has
   *
   * @private
   * @returns {boolean}
   */
  _claim() {
    if (window.pCacheDynamic === FLAG) return true;
    if (window.pCacheDynamic) return false;
    window.pCacheDynamic = FLAG;
    return true;
  }

  /** @private */
  _schedule() {
    if (this._scheduled) return;
    this._scheduled = true;
    queueMicrotask(() => {
      this._scheduled = false;
      this._flush();
    });
  }

  /**
   * Send one request per endpoint for the queued placeholders
   *
   * @private
   */
  _flush() {
    const groups = new Map();
    for (const element of this._queue) {
      const endpoint = this.getAttr(element, 'endpoint', DynamicFill.defaults.endpoint);
      if (!groups.has(endpoint)) groups.set(endpoint, []);
      groups.get(endpoint).push(element);
    }
    this._queue.clear();

    for (const [endpoint, elements] of groups) {
      this._request(endpoint, elements);
    }
  }

  /**
   * @private
   * @param {string} endpoint
   * @param {HTMLElement[]} elements
   */
  async _request(endpoint, elements) {
    const names = [];
    let csrf = false;
    for (const element of elements) {
      const name = element.getAttribute(SELECTOR);
      if (name === CSRF) {
        csrf = true;
      } else if (name && !names.includes(name)) {
        names.push(name);
      }
    }

    if (csrf) elements.push(...this._headMeta(elements));

    const query = [];
    if (names.length) query.push(`fragments=${encodeURIComponent(names.join(','))}`);
    if (csrf) query.push('csrf=1');

    let data;
    try {
      const response = await fetch(endpoint + (query.length ? `?${query.join('&')}` : ''), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (error) {
      this.logger?.warn('DynamicFill: request failed', { endpoint, error });
      for (const element of elements) this._fail(element, error);
      document.dispatchEvent(new CustomEvent('p-cache:dynamic-error', { detail: { error } }));
      return;
    }

    for (const element of elements) this._fill(element, data);
    document.dispatchEvent(new CustomEvent('p-cache:dynamic', { detail: data }));
  }

  /**
   * CSRF meta tags in `<head>` that no one has filled, which the framework never mounts
   *
   * @private
   * @param {HTMLElement[]} elements
   * @returns {HTMLElement[]}
   */
  _headMeta(elements) {
    return [
      ...document.head.querySelectorAll(
        `meta[${SELECTOR}="${CSRF}"][${SELECTOR}-status="pending"]`
      ),
    ].filter(element => !elements.includes(element));
  }

  /**
   * @private
   * @param {HTMLElement} element
   * @param {{ fragments?: Record<string, { html?: string; value?: unknown }>, csrf?: { value: string } | null }} data
   */
  _fill(element, data) {
    if (!element.isConnected) return;
    const name = element.getAttribute(SELECTOR);

    if (name === CSRF) {
      const token = data?.csrf?.value;
      if (typeof token !== 'string') {
        this._fail(element, new Error('No CSRF token in the response'));
        return;
      }
      if (element.tagName === 'META') {
        element.setAttribute('content', token);
      } else if (element.tagName === 'INPUT') {
        element.value = token;
      } else {
        this._fail(element, new Error('A CSRF placeholder must be an <input> or <meta>'));
        return;
      }
      this._done(element, name);
      return;
    }

    const fragment = data?.fragments?.[name];
    if (!fragment || typeof fragment !== 'object') {
      this._fail(element, new Error(`No fragment named ${name} in the response`));
      return;
    }

    if (typeof fragment.html === 'string') {
      element.innerHTML = trustedHTML(fragment.html);
    } else if ('value' in fragment) {
      element.textContent = fragment.value === null ? '' : String(fragment.value);
    } else {
      this._fail(element, new Error(`Fragment ${name} has neither html nor a value`));
      return;
    }
    this._done(element, name);
  }

  /**
   * @private
   * @param {HTMLElement} element
   * @param {string} name
   */
  _done(element, name) {
    this.setAttr(element, 'status', 'filled');
    this._dispatch(element, 'dynamic-fill:filled', { name });
  }

  /**
   * @private
   * @param {HTMLElement} element
   * @param {unknown} error
   */
  _fail(element, error) {
    if (!element.isConnected) return;
    this.setAttr(element, 'status', 'error');
    this._dispatch(element, 'dynamic-fill:error', {
      name: element.getAttribute(SELECTOR),
      error,
    });
  }
}
