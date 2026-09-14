/**
 * A stand-in server for the documentation site's examples, so uploads and saves work on a static host
 */

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Answer the uploader's JSON requests to `/api/update`, `/api/delete` and `/api/sequence`; every
 * other request goes to the network
 */
export function installMockApi() {
  if (window.fetch.isMockApi) return;

  const networkFetch = window.fetch.bind(window);
  const mockFetch = async (resource, options) => {
    const url = new URL(
      resource instanceof Request ? resource.url : String(resource),
      location.href
    );
    if (!/\/api\/(update|delete|sequence)$/.test(url.pathname)) {
      return networkFetch(resource, options);
    }

    await delay(400);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  mockFetch.isMockApi = true;
  window.fetch = mockFetch;
}

/**
 * An XMLHttpRequest stand-in that reports upload progress and answers with the file's preview
 *
 * Files with "fail" in their name are refused, to show how the uploader reports errors.
 */
export class MockUpload {
  upload = new EventTarget();
  #events = new EventTarget();
  status = 0;
  responseText = '';
  aborted = false;

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  addEventListener(type, listener) {
    this.#events.addEventListener(type, listener);
  }

  abort() {
    this.aborted = true;
    this.#events.dispatchEvent(new Event('abort'));
  }

  async send(body) {
    const file =
      body instanceof FormData ? [...body.values()].find(value => value instanceof File) : null;

    for (let step = 1; step <= 10; step++) {
      await delay(120);
      if (this.aborted) return;
      this.upload.dispatchEvent(
        new ProgressEvent('progress', { lengthComputable: true, loaded: step, total: 10 })
      );
    }

    if (!file || /fail/i.test(file.name)) {
      this.status = 422;
      this.responseText = JSON.stringify({ message: 'The server refused this file' });
    } else {
      this.status = 200;
      this.responseText = JSON.stringify({
        id: `upload-${crypto.randomUUID()}`,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    this.#events.dispatchEvent(new Event('load'));
  }
}
