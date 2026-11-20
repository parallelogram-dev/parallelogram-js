import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const placeholder = (name, { tag = 'span', endpoint = '/p-cache/dynamic', fallback = '' } = {}) => {
  const element = document.createElement(tag);
  element.setAttribute('data-dynamic-fill', name);
  if (endpoint !== null) element.setAttribute('data-dynamic-fill-endpoint', endpoint);
  element.setAttribute('data-dynamic-fill-status', 'pending');
  if (tag === 'input') {
    element.type = 'hidden';
  } else if (tag !== 'meta') {
    element.innerHTML = fallback;
  }
  document.body.append(element);
  return element;
};

const answer = body => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

async function mountAll(elements, context) {
  const { default: DynamicFill } = await import('../../../src/components/DynamicFill.js');
  const component = new DynamicFill(context);
  elements.forEach(element => component.mount(element));
  await settle();
  return component;
}

describe('DynamicFill', () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.pCacheDynamic;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.pCacheDynamic;
    document.body.replaceChildren();
    document.head.replaceChildren();
  });

  it('asks once for every placeholder mounted in the same pass', async () => {
    const fetch = answer({
      fragments: { count: { value: 1 }, summary: { value: 2 } },
      csrf: { value: 't' },
    });
    vi.stubGlobal('fetch', fetch);

    await mountAll([
      placeholder('count'),
      placeholder('summary'),
      placeholder('count'),
      placeholder('csrf', { tag: 'input' }),
    ]);

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/p-cache/dynamic?fragments=count%2Csummary&csrf=1',
    ]);
  });

  it('sends the page cookies and asks for JSON', async () => {
    const fetch = answer({ fragments: { count: { value: 1 } } });
    vi.stubGlobal('fetch', fetch);

    await mountAll([placeholder('count')]);

    expect(fetch.mock.calls[0][1]).toEqual({
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  });

  it('leaves csrf out when no placeholder asks for a token', async () => {
    const fetch = answer({ fragments: { count: { value: 1 } } });
    vi.stubGlobal('fetch', fetch);

    await mountAll([placeholder('count')]);

    expect(fetch.mock.calls[0][0]).toBe('/p-cache/dynamic?fragments=count');
  });

  it('asks each endpoint separately', async () => {
    const fetch = answer({ fragments: { count: { value: 1 } } });
    vi.stubGlobal('fetch', fetch);

    await mountAll([
      placeholder('count', { endpoint: '/en/p-cache/dynamic' }),
      placeholder('count', { endpoint: '/fr/p-cache/dynamic' }),
    ]);

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/en/p-cache/dynamic?fragments=count',
      '/fr/p-cache/dynamic?fragments=count',
    ]);
  });

  it('uses the default endpoint when a placeholder names none', async () => {
    const fetch = answer({ fragments: { count: { value: 1 } } });
    vi.stubGlobal('fetch', fetch);

    await mountAll([placeholder('count', { endpoint: null })]);

    expect(fetch.mock.calls[0][0]).toBe('/p-cache/dynamic?fragments=count');
  });

  it('asks again only for placeholders mounted later', async () => {
    const fetch = answer({ fragments: { count: { value: 1 }, later: { value: 2 } } });
    vi.stubGlobal('fetch', fetch);
    const component = await mountAll([placeholder('count')]);

    component.mount(placeholder('later'));
    await settle();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/p-cache/dynamic?fragments=count',
      '/p-cache/dynamic?fragments=later',
    ]);
  });

  it('sets a value fragment as text', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { count: { value: '<b>3</b>' } } }));
    const element = placeholder('count', { fallback: '0' });

    await mountAll([element]);

    expect([element.innerHTML, element.getAttribute('data-dynamic-fill-status')]).toEqual([
      '&lt;b&gt;3&lt;/b&gt;',
      'filled',
    ]);
  });

  it('empties a placeholder whose value is null', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { count: { value: null } } }));
    const element = placeholder('count', { fallback: '0' });

    await mountAll([element]);

    expect(element.textContent).toBe('');
  });

  it('sets an html fragment as markup', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { summary: { html: '<ul><li>Chair</li></ul>' } } }));
    const element = placeholder('summary', { tag: 'div' });

    await mountAll([element]);

    expect(element.querySelector('li')?.textContent).toBe('Chair');
  });

  it('fills a CSRF field with the token', async () => {
    vi.stubGlobal('fetch', answer({ csrf: { name: 'CRAFT_CSRF_TOKEN', value: 'abc' } }));
    const element = placeholder('csrf', { tag: 'input' });

    await mountAll([element]);

    expect([element.value, element.getAttribute('data-dynamic-fill-status')]).toEqual([
      'abc',
      'filled',
    ]);
  });

  it('fills a CSRF meta tag in the head that the framework never mounts', async () => {
    vi.stubGlobal('fetch', answer({ csrf: { name: 'CRAFT_CSRF_TOKEN', value: 'abc' } }));
    const meta = document.createElement('meta');
    meta.setAttribute('data-dynamic-fill', 'csrf');
    meta.setAttribute('data-dynamic-fill-status', 'pending');
    document.head.append(meta);

    await mountAll([placeholder('csrf', { tag: 'input' })]);

    expect(meta.getAttribute('content')).toBe('abc');
  });

  it('fills a mounted CSRF meta tag', async () => {
    vi.stubGlobal('fetch', answer({ csrf: { name: 'CRAFT_CSRF_TOKEN', value: 'abc' } }));
    const meta = placeholder('csrf', { tag: 'meta' });

    await mountAll([meta]);

    expect(meta.getAttribute('content')).toBe('abc');
  });

  it('marks a CSRF placeholder that is not a field or meta tag as an error', async () => {
    vi.stubGlobal('fetch', answer({ csrf: { name: 'CRAFT_CSRF_TOKEN', value: 'abc' } }));
    const element = placeholder('csrf');

    await mountAll([element]);

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('error');
  });

  it('marks CSRF placeholders as errors when CSRF protection is off', async () => {
    vi.stubGlobal('fetch', answer({ csrf: null }));
    const element = placeholder('csrf', { tag: 'input' });

    await mountAll([element]);

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('error');
  });

  it('keeps the fallback of a fragment missing from the answer', async () => {
    vi.stubGlobal('fetch', answer({ fragments: {} }));
    const element = placeholder('count', { fallback: '0' });

    await mountAll([element]);

    expect([element.textContent, element.getAttribute('data-dynamic-fill-status')]).toEqual([
      '0',
      'error',
    ]);
  });

  it('marks a fragment with neither html nor a value as an error', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { count: {} } }));
    const element = placeholder('count', { fallback: '0' });

    await mountAll([element]);

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('error');
  });

  it('marks every placeholder as an error when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 }))
    );
    const elements = [
      placeholder('count', { fallback: '0' }),
      placeholder('csrf', { tag: 'input' }),
    ];

    await mountAll(elements);

    expect(elements.map(element => element.getAttribute('data-dynamic-fill-status'))).toEqual([
      'error',
      'error',
    ]);
  });

  it('marks a placeholder pending when the server left its status out', async () => {
    let release;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(resolve => (release = resolve)))
    );
    const element = placeholder('count');
    element.removeAttribute('data-dynamic-fill-status');

    await mountAll([element]);

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('pending');
    release(new Response('{}'));
  });

  it('announces each filled placeholder by name', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { count: { value: 1 } } }));
    const element = placeholder('count');
    const events = [];
    element.addEventListener('dynamic-fill:filled', event => events.push(event.detail));

    await mountAll([element]);

    expect(events).toEqual([{ name: 'count' }]);
  });

  it('announces a placeholder it could not fill', async () => {
    vi.stubGlobal('fetch', answer({ fragments: {} }));
    const element = placeholder('count');
    const names = [];
    element.addEventListener('dynamic-fill:error', event => names.push(event.detail.name));

    await mountAll([element]);

    expect(names).toEqual(['count']);
  });

  it('emits its events on the event bus too', async () => {
    vi.stubGlobal('fetch', answer({ fragments: { count: { value: 1 } } }));
    const eventBus = { emit: vi.fn() };
    const element = placeholder('count');

    await mountAll([element], { eventBus });

    expect(eventBus.emit).toHaveBeenCalledWith('dynamic-fill:filled', { element, name: 'count' });
  });

  it('dispatches the whole answer on the document', async () => {
    const body = { fragments: { count: { value: 1 } } };
    vi.stubGlobal('fetch', answer(body));
    const answers = [];
    document.addEventListener('p-cache:dynamic', event => answers.push(event.detail), {
      once: true,
    });

    await mountAll([placeholder('count')]);

    expect(answers).toEqual([body]);
  });

  it('dispatches a failed request on the document', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 }))
    );
    const errors = [];
    document.addEventListener(
      'p-cache:dynamic-error',
      event => errors.push(String(event.detail.error)),
      {
        once: true,
      }
    );

    await mountAll([placeholder('count')]);

    expect(errors).toEqual(['Error: HTTP 503']);
  });

  it('claims the page from the cache fallback script', async () => {
    vi.stubGlobal('fetch', answer({ fragments: {} }));

    await mountAll([placeholder('count')]);

    expect(window.pCacheDynamic).toBe('parallelogram');
  });

  it('leaves the page to the fallback script when it ran first', async () => {
    const fetch = answer({ fragments: {} });
    vi.stubGlobal('fetch', fetch);
    window.pCacheDynamic = 1;

    await mountAll([placeholder('count')]);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips placeholders unmounted before the request goes', async () => {
    const fetch = answer({ fragments: {} });
    vi.stubGlobal('fetch', fetch);
    const { default: DynamicFill } = await import('../../../src/components/DynamicFill.js');
    const component = new DynamicFill();
    const element = placeholder('count');

    component.mount(element);
    component.unmount(element);
    await settle();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('leaves placeholders removed from the page before the answer arrives', async () => {
    let release;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(resolve => (release = resolve)))
    );
    const element = placeholder('count', { fallback: '0' });
    await mountAll([element]);

    element.remove();
    release(new Response(JSON.stringify({ fragments: {} })));
    await settle();

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('pending');
  });

  it('leaves placeholders removed from the page before a request fails', async () => {
    let release;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(resolve => (release = resolve)))
    );
    const element = placeholder('count', { fallback: '0' });
    await mountAll([element]);

    element.remove();
    release(new Response('', { status: 500 }));
    await settle();

    expect(element.getAttribute('data-dynamic-fill-status')).toBe('pending');
  });

  it('asks for no fragments when a placeholder names none', async () => {
    const fetch = answer({ fragments: {} });
    vi.stubGlobal('fetch', fetch);
    const element = placeholder('');

    await mountAll([element]);

    expect([fetch.mock.calls[0][0], element.getAttribute('data-dynamic-fill-status')]).toEqual([
      '/p-cache/dynamic',
      'error',
    ]);
  });
});
