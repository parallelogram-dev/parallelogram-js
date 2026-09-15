import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventManager } from '../../../src/managers/EventManager.js';
import { RouterManager } from '../../../src/managers/RouterManager.js';

const htmlResponse = (
  body,
  { status = 200, url = '', redirected = false, contentType = 'text/html' } = {}
) => {
  const response = new Response(body, { status, headers: { 'content-type': contentType } });
  Object.defineProperties(response, { url: { value: url }, redirected: { value: redirected } });
  return response;
};

const stubServer = () => {
  const requests = [];
  const fetch = vi.fn(
    (url, { signal } = {}) =>
      new Promise((respond, fail) => {
        signal?.addEventListener('abort', () => fail(signal.reason), { once: true });
        requests.push({ url: new URL(url, location.href).pathname, signal, respond, fail });
      })
  );
  vi.stubGlobal('fetch', fetch);
  return { fetch, requests };
};

const deferred = () => {
  let resolve;
  const promise = new Promise(res => {
    resolve = res;
  });
  return { promise, resolve };
};

const absolute = path => new URL(path, location.href).href;

/**
 * Clicks an element and reports whether the router cancelled the browser's default action
 */
const click = (element, init = {}) => {
  let routed = false;
  const observer = new AbortController();
  document.addEventListener(
    'click',
    event => {
      routed = event.defaultPrevented;
    },
    { signal: observer.signal }
  );
  element.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
  );
  observer.abort();
  return routed;
};

describe('RouterManager', () => {
  let bus;
  let router;
  let server;
  let assign;
  let replace;
  let clickGuard;

  beforeEach(() => {
    history.replaceState(null, '', '/start');
    history.scrollRestoration = 'auto';
    window.scrollTo(0, 0);
    bus = new EventManager();
    server = stubServer();
    assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {});
    clickGuard = new AbortController();
    window.addEventListener('click', event => event.preventDefault(), {
      signal: clickGuard.signal,
    });
  });

  afterEach(() => {
    router?.destroy();
    router = null;
    clickGuard.abort();
    vi.useRealTimers();
    document.body.replaceChildren();
    document.body.className = '';
  });

  const start = (options = {}) => {
    router = new RouterManager({ eventBus: bus, options });
    return router;
  };

  const record = event => {
    const listener = vi.fn();
    bus.on(event, listener);
    return listener;
  };

  describe('navigating', () => {
    it('shows the most recent navigation when an earlier one is still loading', async () => {
      start();
      const success = record('router:navigate-success');

      router.navigate('/slow');
      router.navigate('/fast');
      server.requests.find(request => request.url === '/fast')?.respond(htmlResponse('<main>'));

      await vi.waitFor(() => expect(success).toHaveBeenCalledOnce());
      expect([location.pathname, success.mock.calls[0][0].url.pathname]).toEqual([
        '/fast',
        '/fast',
      ]);
    });

    it('cancels every request that a later navigation replaces', () => {
      start();

      router.navigate('/first');
      router.navigate('/second');
      router.navigate('/third');

      expect(server.requests.map(request => [request.url, request.signal.aborted])).toEqual([
        ['/first', true],
        ['/second', true],
        ['/third', false],
      ]);
    });

    it('stays in progress until listeners have finished replacing the page', async () => {
      start();
      const swap = deferred();
      bus.on('router:navigate-success', ({ waitUntil }) => waitUntil(swap.promise));
      const end = record('router:navigate-end');

      const navigation = router.navigate('/next');
      server.requests[0].respond(htmlResponse('<main>'));
      await vi.waitFor(() => expect(location.pathname).toBe('/next'));
      const whileSwapping = [router.isNavigating(), end.mock.calls.length];
      swap.resolve();
      await navigation;

      expect([whileSwapping, router.isNavigating()]).toEqual([[true, 0], false]);
    });

    it('records the address the server redirected to', async () => {
      start();
      const success = record('router:navigate-success');

      const navigation = router.navigate('/account');
      server.requests[0].respond(
        htmlResponse('<main>', { url: absolute('/login'), redirected: true })
      );
      await navigation;

      expect([location.pathname, success.mock.calls[0][0].url.pathname]).toEqual([
        '/login',
        '/login',
      ]);
    });

    it.each([
      [
        'the server responds with an error',
        request => request.respond(htmlResponse('', { status: 404 })),
      ],
      ['the request fails', request => request.fail(new TypeError('Failed to fetch'))],
      [
        'the response is not an HTML page',
        request => request.respond(htmlResponse('%PDF', { contentType: 'application/pdf' })),
      ],
      [
        'the server redirects to another site',
        request =>
          request.respond(
            htmlResponse('<main>', { url: 'https://elsewhere.example/login', redirected: true })
          ),
      ],
    ])('loads the page normally when %s', async (_case, reply) => {
      start();
      const expected = absolute('/missing');

      const navigation = router.navigate('/missing');
      reply(server.requests[0]);
      await navigation.catch(error => error);

      expect(assign).toHaveBeenCalledWith(expected);
    });

    it('can retry an address whose navigation failed', async () => {
      start({ fullLoadOnError: false });

      const first = router.navigate('/flaky');
      server.requests[0].respond(htmlResponse('', { status: 503 }));
      await first.catch(error => error);
      router.navigate('/flaky');

      expect([server.fetch.mock.calls.length, assign.mock.calls.length]).toEqual([2, 0]);
    });

    it('can retry an address whose page failed to swap in after the address changed', async () => {
      start({ fullLoadOnError: false });
      bus.on('router:navigate-success', ({ waitUntil }) =>
        waitUntil(Promise.reject(new Error('swap failed')))
      );

      const first = router.navigate('/flaky');
      server.requests[0].respond(htmlResponse('<main>'));
      await first.catch(error => error);
      router.navigate('/flaky');

      expect([location.pathname, server.fetch.mock.calls.length]).toEqual(['/flaky', 2]);
    });

    it('keeps the error class on the page until the next navigation starts', async () => {
      start({ fullLoadOnError: false });

      const navigation = router.navigate('/broken');
      server.requests[0].respond(htmlResponse('', { status: 500 }));
      await navigation.catch(error => error);
      const afterFailure = document.body.classList.contains('router-error');
      router.navigate('/other');

      expect([afterFailure, document.body.classList.contains('router-error')]).toEqual([
        true,
        false,
      ]);
    });
  });

  describe('fetching', () => {
    it('fetches content without cancelling a navigation in progress', () => {
      start();

      router.navigate('/page');
      router.get('/fragments/price.html').catch(error => error);

      expect(server.requests[0].signal.aborted).toBe(false);
    });

    it('gives up on a slow request with a timeout error, even with its own abort signal', async () => {
      vi.useFakeTimers();
      start({ timeout: 5000 });

      const outcome = router
        .get('/fragments/price.html', { signal: new AbortController().signal })
        .catch(error => error.name);
      await vi.advanceTimersByTimeAsync(5000);

      expect(await outcome).toBe('TimeoutError');
    });

    it('stops a request when its caller aborts it', async () => {
      start();
      const caller = new AbortController();

      const outcome = router
        .get('/fragments/price.html', { signal: caller.signal })
        .catch(error => error.name);
      caller.abort();

      expect(await outcome).toBe('AbortError');
    });
  });

  describe('link clicks', () => {
    it('navigates when a link added after start is clicked', () => {
      start();
      const navigateStart = record('router:navigate-start');
      document.body.innerHTML = '<nav><a href="/about"><span>About</span></a></nav>';

      const routed = click(document.querySelector('span'));

      expect([routed, navigateStart.mock.calls[0]?.[0].url.pathname]).toEqual([true, '/about']);
    });

    it.each([
      ['a modifier key is held', '<a href="/about">About</a>', { metaKey: true }],
      ['another mouse button is used', '<a href="/about">About</a>', { button: 1 }],
      [
        'a parent opts out of routing',
        '<nav data-router-skip><a href="/about">About</a></nav>',
        {},
      ],
      ['the link opens a new tab', '<a href="/about" target="_blank">About</a>', {}],
      ['the link is a download', '<a href="/report" download>Report</a>', {}],
      ['the link points to a file', '<a href="/report.pdf">Report</a>', {}],
      ['the link leaves the site', '<a href="https://example.org/">Elsewhere</a>', {}],
      ['the link is marked external', '<a href="/partners" rel="external">Partners</a>', {}],
      ['the link jumps within the page', '<a href="#details">Details</a><p id="details"></p>', {}],
      [
        'the link jumps within the page by its full address',
        '<a href="/start#details">Details</a><p id="details"></p>',
        {},
      ],
    ])('leaves the click to the browser when %s', (_case, markup, init) => {
      document.body.innerHTML = markup;
      start();

      expect(click(document.querySelector('a'), init)).toBe(false);
    });

    it("leaves a click to the browser when an ancestor outside the link's shadow root opts out", () => {
      document.body.innerHTML = '<nav data-router-skip><div id="menu"></div></nav>';
      const shadow = document.getElementById('menu').attachShadow({ mode: 'open' });
      shadow.innerHTML = '<a href="/about">About</a>';
      start();

      expect(click(shadow.querySelector('a'), { composed: true })).toBe(false);
    });

    it('ignores clicks another handler has already cancelled', () => {
      start();
      const navigateStart = record('router:navigate-start');
      document.body.innerHTML = '<a href="/about">About</a>';
      const link = document.querySelector('a');
      link.addEventListener('click', event => event.preventDefault());

      click(link);

      expect(navigateStart).not.toHaveBeenCalled();
    });

    it('stops handling link clicks once destroyed', () => {
      document.body.innerHTML = '<a href="/about">About</a>';
      start().destroy();

      expect(click(document.querySelector('a'))).toBe(false);
    });
  });

  describe('history', () => {
    it('loads the page for the history entry the user moves to without adding another', async () => {
      start();
      const success = record('router:navigate-success');
      history.pushState(null, '', '/previous');
      const pushState = vi.spyOn(history, 'pushState');

      window.dispatchEvent(new PopStateEvent('popstate'));
      server.requests[0]?.respond(htmlResponse('<main>'));

      await vi.waitFor(() => expect(success).toHaveBeenCalledOnce());
      expect([success.mock.calls[0][0].trigger, pushState.mock.calls.length]).toEqual([
        'popstate',
        0,
      ]);
    });

    it('reloads a history entry normally when loading it fails', async () => {
      start();
      history.pushState(null, '', '/previous');

      window.dispatchEvent(new PopStateEvent('popstate'));
      server.requests[0]?.fail(new TypeError('Failed to fetch'));

      await vi.waitFor(() => expect(replace).toHaveBeenCalledWith(absolute('/previous')));
    });

    it('ignores history moves that only change the hash', () => {
      start();
      const popstate = record('router:popstate');
      history.pushState(null, '', '/start#reviews');

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect([popstate.mock.calls.length, server.fetch.mock.calls.length]).toEqual([0, 0]);
    });

    it('takes over scroll restoration until destroyed', () => {
      start();
      const whileRunning = history.scrollRestoration;

      router.destroy();
      router = null;

      expect([whileRunning, history.scrollRestoration]).toEqual(['manual', 'auto']);
    });

    it('returns to the scroll position a page had when the user left it', async () => {
      start();
      const startState = history.state;
      window.scrollTo(0, 800);
      const navigation = router.navigate('/next');
      server.requests[0].respond(htmlResponse('<main>'));
      await navigation;
      window.scrollTo(0, 0);
      const success = record('router:navigate-success');

      history.pushState(startState, '', '/start');
      window.dispatchEvent(new PopStateEvent('popstate', { state: startState }));
      server.requests[1]?.respond(htmlResponse('<main>'));

      await vi.waitFor(() => expect(success).toHaveBeenCalledOnce());
      expect(success.mock.calls[0][0].scroll).toEqual({ x: 0, y: 800 });
    });

    it('replaces the fragment that the history entry being left or entered changed', async () => {
      start();
      const startState = history.state;
      const navigation = router.navigate('/reviews?page=2', { viewTarget: 'reviews' });
      server.requests[0].respond(htmlResponse('<main>'));
      await navigation;
      const reviewsState = history.state;
      const success = record('router:navigate-success');

      history.pushState(startState, '', '/start');
      window.dispatchEvent(new PopStateEvent('popstate', { state: startState }));
      server.requests[1]?.respond(htmlResponse('<main>'));
      await vi.waitFor(() => expect(success).toHaveBeenCalledTimes(1));
      history.pushState(reviewsState, '', '/reviews?page=2');
      window.dispatchEvent(new PopStateEvent('popstate', { state: reviewsState }));
      server.requests[2]?.respond(htmlResponse('<main>'));
      await vi.waitFor(() => expect(success).toHaveBeenCalledTimes(2));

      expect(success.mock.calls.map(([payload]) => payload.viewTarget)).toEqual([
        'reviews',
        'reviews',
      ]);
    });

    it('restores the scroll position when history moves back from a hash entry', () => {
      start();
      const startState = history.state;
      window.scrollTo(0, 300);
      window.dispatchEvent(new Event('scroll'));
      history.pushState(null, '', '/start#reviews');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
      window.scrollTo(0, 1200);
      window.dispatchEvent(new Event('scroll'));

      history.pushState(startState, '', '/start');
      window.dispatchEvent(new PopStateEvent('popstate', { state: startState }));

      expect(window.scrollY).toBe(300);
    });

    it('restores the scroll position saved before the page was reloaded', async () => {
      history.replaceState({ key: 'saved-entry', scroll: { x: 0, y: 500 } }, '', '/start');

      start();

      await vi.waitFor(() => expect(window.scrollY).toBe(500));
    });

    it('stops reporting history navigation once destroyed', () => {
      const popstate = record('router:popstate');
      start().destroy();
      history.pushState(null, '', '/previous');

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(popstate).not.toHaveBeenCalled();
    });
  });
});
