import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scripts = pattern =>
  [...document.querySelectorAll('script')].filter(script => pattern.test(script.src));

const fakeUet = (created = []) =>
  class {
    constructor(options) {
      this.options = options;
      created.push(options.ti);
    }

    push() {}
  };

const laterPage = { url: 'https://shop.example/confirmation', mounted: true };

const GLOBALS = [
  'uetq',
  'uetq_1234567',
  'uetq_7654321',
  'UET',
  'ttq',
  'TiktokAnalyticsObject',
  'gtag',
  'dataLayer',
  'fbq',
  '_fbq',
  'pintrk',
  'plausible',
  '_hsq',
  'google_tag_manager',
];

describe('tracker adapters', () => {
  beforeEach(() => {
    vi.resetModules();
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
  });

  afterEach(() => {
    window.happyDOM.settings.handleDisabledFileLoadingAsSuccess = false;
    for (const name of GLOBALS) {
      delete window[name];
    }
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it('adapters report a block without its id as a failure', async () => {
    const { default: ga4 } = await import('../../../src/adapters/ga4.js');

    expect(() => ga4({})).toThrow('no id');
  });

  it('bing-uet loads UET and hands it a consent default queued before it', async () => {
    window.uetq = [];
    window.uetq.push('consent', 'default', { ad_storage: 'denied' });
    const { default: bingUet } = await import('../../../src/adapters/bing-uet.js');

    const started = bingUet({ id: '1234567' });
    window.UET = class {
      constructor(options) {
        this.options = options;
      }
      push() {}
    };
    await started;

    expect([scripts(/bat\.bing\.com\/bat\.js/).length, window.uetq.options.q]).toEqual([
      1,
      ['consent', 'default', { ad_storage: 'denied' }],
    ]);
  });

  it('bing-uet starts a second tag id with its own UET instance', async () => {
    const { default: bingUet } = await import('../../../src/adapters/bing-uet.js');

    const started = [bingUet({ id: '1234567' }), bingUet({ id: '7654321' })];
    window.UET = fakeUet();
    await Promise.all(started);

    expect([window.uetq.options.ti, window.uetq_7654321.options.ti]).toEqual([
      '1234567',
      '7654321',
    ]);
  });

  it('bing-uet starts a tag id given twice once', async () => {
    const created = [];
    const { default: bingUet } = await import('../../../src/adapters/bing-uet.js');

    const started = [bingUet({ id: '1234567' }), bingUet({ id: '1234567' })];
    window.UET = fakeUet(created);
    await Promise.all(started);

    expect(created).toEqual(['1234567']);
  });

  it('bing-uet starts its tag beside a UET tag the page already has for another id', async () => {
    window.UET = fakeUet();
    window.uetq = new window.UET({ ti: '999' });
    const { default: bingUet } = await import('../../../src/adapters/bing-uet.js');

    await bingUet({ id: '1234567', consentDefault: { ad_storage: 'denied' } });

    expect([window.uetq.options.ti, window.uetq_1234567.options]).toEqual([
      '999',
      {
        ti: '1234567',
        enableAutoSpaTracking: true,
        q: ['consent', 'default', { ad_storage: 'denied' }],
      },
    ]);
  });

  it('tiktok-pixel queues the consent methods from the current base code', async () => {
    const { default: tiktok } = await import('../../../src/adapters/tiktok-pixel.js');

    tiktok({ id: 'TT123' });

    expect(
      ['holdConsent', 'revokeConsent', 'grantConsent'].map(name => typeof window.ttq[name])
    ).toEqual(['function', 'function', 'function']);
  });

  it('tiktok-pixel loads a second pixel on the same page', async () => {
    const { default: tiktok } = await import('../../../src/adapters/tiktok-pixel.js');

    tiktok({ id: 'TT123' });
    tiktok({ id: 'TT456' });

    expect(
      scripts(/events\.js/).map(script => new URL(script.src).searchParams.get('sdkid'))
    ).toEqual(['TT123', 'TT456']);
  });

  it('ga4 sends the gtag js command once and reuses a loader already on the page', async () => {
    window.dataLayer = [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    const existing = document.createElement('script');
    existing.src = 'https://www.googletagmanager.com/gtag/js?id=G-SITE';
    document.head.append(existing);
    const { default: ga4 } = await import('../../../src/adapters/ga4.js');

    ga4({ id: 'G-SHOP' });
    ga4({ id: 'G-AGENCY' });

    const commands = window.dataLayer.map(entry => entry[0]);
    expect([
      commands.filter(command => command === 'js').length,
      scripts(/googletagmanager\.com\/gtag\/js/).length,
    ]).toEqual([1, 1]);
  });

  it('ga4 applies consent defaults before its config', async () => {
    const { default: ga4 } = await import('../../../src/adapters/ga4.js');

    ga4({ id: 'G-SHOP', consentDefault: { analytics_storage: 'denied' } });

    const commands = window.dataLayer.map(
      entry => `${entry[0]} ${typeof entry[1] === 'string' ? entry[1] : ''}`
    );
    expect(commands.slice(0, 1).concat(commands.slice(-1))).toEqual([
      'consent default',
      'config G-SHOP',
    ]);
  });

  it('google-ads sends the conversion of a block that mounts on a later page', async () => {
    const { default: googleAds } = await import('../../../src/adapters/google-ads.js');
    googleAds({ id: 'AW-1' });

    googleAds.page({ id: 'AW-1', conversion: { send_to: 'AW-1/thanks' } }, {}, laterPage);

    expect([...window.dataLayer.at(-1)]).toEqual([
      'event',
      'conversion',
      { send_to: 'AW-1/thanks' },
    ]);
  });

  it('google-ads does not repeat a conversion when the page changes around its block', async () => {
    const { default: googleAds } = await import('../../../src/adapters/google-ads.js');
    const config = { id: 'AW-1', conversion: { send_to: 'AW-1/thanks' } };
    googleAds(config);
    const sent = window.dataLayer.length;

    googleAds.page(config, {}, { ...laterPage, mounted: false });

    expect(window.dataLayer).toHaveLength(sent);
  });

  it('meta-pixel starts a second pixel with its events sent only to that pixel', async () => {
    const { default: metaPixel } = await import('../../../src/adapters/meta-pixel.js');

    metaPixel({ id: '111' });
    metaPixel({ id: '222' });

    expect([window.fbq.queue.map(args => [...args]), scripts(/fbevents\.js/).length]).toEqual([
      [
        ['init', '111'],
        ['trackSingle', '111', 'PageView'],
        ['init', '222'],
        ['trackSingle', '222', 'PageView'],
      ],
      1,
    ]);
  });

  it('meta-pixel sends a later page block its events, leaving page views to fbevents.js', async () => {
    const { default: metaPixel } = await import('../../../src/adapters/meta-pixel.js');
    metaPixel({ id: '111' });

    metaPixel.page(
      { id: '111', events: ['PageView', ['Purchase', { value: 30, currency: 'AUD' }]] },
      {},
      laterPage
    );

    expect([...window.fbq.queue.at(-1)]).toEqual([
      'trackSingle',
      '111',
      'Purchase',
      { value: 30, currency: 'AUD' },
    ]);
  });

  it('meta-pixel queues a consent default before the pixel starts', async () => {
    const { default: metaPixel } = await import('../../../src/adapters/meta-pixel.js');

    metaPixel({ id: '111', consentDefault: 'revoke' });

    expect([...window.fbq.queue[0]]).toEqual(['consent', 'revoke']);
  });

  it('gtm gives its script the CSP nonce and settles once the container loads', async () => {
    const { default: gtm } = await import('../../../src/adapters/gtm.js');

    const loaded = gtm({ id: 'GTM-1' }, { nonce: 'r4nd0m' });
    const [script] = scripts(/gtm\.js/);

    expect(script.getAttribute('nonce')).toBe('r4nd0m');
    await expect(loaded).resolves.toBe(script);
  });

  it('hubspot records later pages with setPath and trackPageView', async () => {
    const { default: hubspot } = await import('../../../src/adapters/hubspot.js');
    hubspot({ id: '999' });

    hubspot.page({ id: '999' }, {}, { url: 'https://shop.example/menu?table=4', mounted: false });

    expect(window._hsq.slice(-2)).toEqual([['setPath', '/menu?table=4'], ['trackPageView']]);
  });

  it('hubspot records a later page once when two hubs share the page', async () => {
    const { default: hubspot } = await import('../../../src/adapters/hubspot.js');
    const later = { url: 'https://shop.example/menu', mounted: false };

    hubspot.page({ id: '999' }, {}, later);
    hubspot.page({ id: '888' }, {}, later);

    expect(window._hsq.filter(([command]) => command === 'trackPageView')).toHaveLength(1);
  });

  it('pinterest-tag records one page visit for two tags, after both have loaded', async () => {
    const { default: pinterest } = await import('../../../src/adapters/pinterest-tag.js');

    pinterest({ id: '26123' });
    pinterest({ id: '26456' });
    await Promise.resolve();

    expect(window.pintrk.queue.map(([command]) => command)).toEqual(['load', 'load', 'page']);
  });

  it('pinterest-tag records a later page once for two tags', async () => {
    const { default: pinterest } = await import('../../../src/adapters/pinterest-tag.js');
    pinterest({ id: '26123' });
    pinterest({ id: '26456' });
    await Promise.resolve();

    pinterest.page({ id: '26123' }, {}, laterPage);
    pinterest.page({ id: '26456' }, {}, laterPage);

    expect(window.pintrk.queue.filter(([command]) => command === 'page')).toHaveLength(2);
  });

  it('pinterest-tag warns when given an email that is not hashed', async () => {
    const { default: pinterest } = await import('../../../src/adapters/pinterest-tag.js');
    const logger = { warn: vi.fn() };

    pinterest({ id: '26123', em: 'ada@example.com' }, { logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('hash'));
  });

  it.each([
    ['fathom', { site: 'ABC' }, /usefathom/],
    ['plausible', { domain: 'shop.example' }, /plausible\.io/],
    ['plausible', { scriptId: 'pa-abc' }, /plausible\.io/],
  ])('%s declares the origin of the script it loads by default', async (name, config, pattern) => {
    const { default: adapter } = await import(`../../../src/adapters/${name}.js`);

    adapter(config);

    expect(adapter.origins).toContain(new URL(scripts(pattern)[0].src).origin);
  });

  it('plausible adds a proxied script once', async () => {
    const { default: plausible } = await import('../../../src/adapters/plausible.js');

    plausible({ domain: 'shop.example', src: '/stats/js/script.js' });
    plausible({ domain: 'shop.example', src: '/stats/js/script.js' });

    expect(scripts(/stats\/js\/script\.js/)).toHaveLength(1);
  });

  it("plausible loads a site's own script and queues its init options", async () => {
    const { default: plausible } = await import('../../../src/adapters/plausible.js');

    plausible({ scriptId: 'pa-abc123', options: { hashBasedRouting: true } });

    expect([scripts(/\/js\/pa-abc123\.js$/).length, window.plausible.o]).toEqual([
      1,
      { hashBasedRouting: true },
    ]);
  });
});
