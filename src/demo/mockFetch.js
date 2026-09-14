const json = body =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const ENDPOINTS = [
  {
    match: '/update',
    failure: ['Update failed: Server error', 400],
    success: () => json({ success: true }),
  },
  {
    match: '/delete',
    failure: ['Delete not allowed', 403],
    success: () => json({ success: true }),
  },
  {
    match: '/sequence',
    failure: ['Sequence update failed', 500],
    success: () => json({ success: true }),
  },
  {
    match: '/upload',
    failure: ['Upload failed: Invalid file', 400],
    success: () =>
      json({
        id: `file_${Date.now()}`,
        preview: `https://picsum.photos/200/200?random=${Date.now()}`,
        success: true,
      }),
  },
];

/**
 * Simulate the uploader demo's server with fetch
 *
 * Requests to `/mock/<endpoint>` succeed and requests to `/mock-fail/<endpoint>` fail after a short
 * delay; every other request goes to the real fetch. Installing it more than once has no effect, so
 * it survives client-side navigation between demo pages.
 */
export function installMockFetch() {
  if (window.fetch.isDemoMock) {
    return;
  }

  const realFetch = window.fetch.bind(window);

  const mockFetch = async (resource, options) => {
    const url = String(resource instanceof Request ? resource.url : resource);
    const endpoint = ENDPOINTS.find(({ match }) => url.includes(match));

    if (!endpoint || !/\/mock(-fail)?\//.test(url)) {
      return realFetch(resource, options);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (url.includes('/mock-fail/')) {
      const [message, status] = endpoint.failure;
      return new Response(message, { status });
    }

    return endpoint.success();
  };

  mockFetch.isDemoMock = true;
  window.fetch = mockFetch;
}
