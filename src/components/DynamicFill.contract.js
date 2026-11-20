const STATUSES = ['pending', 'filled', 'error'];

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'DynamicFill',
  kind: 'enhancement',
  selector: 'data-dynamic-fill',
  module: 'components/DynamicFill',
  summary: 'Fill per-visitor placeholders on a cached page, such as CSRF tokens and counts',
  description: `A page cache serves the same HTML to everyone, so anything that differs per visitor is written as a placeholder and filled once the page loads. Parallelogram Cache for Craft CMS writes them with \`pCache.csrfInput()\` and \`pCache.fragment(name, fallback)\`; any server that answers the same endpoint works.

Every placeholder mounted in the same pass is gathered into one request per endpoint: \`GET {endpoint}?fragments=a,b&csrf=1\`, with \`fragments\` listing the names other than \`csrf\` and \`csrf=1\` only when a placeholder asks for the token, sent with the page's cookies and \`Accept: application/json\`. The JSON answer is \`{ fragments: { name: { html } | { value } }, csrf: { name, value } | null }\`. A \`csrf\` placeholder sets an \`<input>\`'s value or a \`<meta>\`'s content; a fragment sets the placeholder's HTML when the server sent \`html\`, or its text when it sent a \`value\` (\`null\` empties it). Placeholders added later, such as on a page the router swaps in, are gathered into a request of their own.

A placeholder that can't be filled, because the request failed, the name is missing from the answer or CSRF protection is off, is marked error and keeps its fallback. A CSRF \`<meta>\` in \`<head>\`, which the framework doesn't observe, is filled with the first request that asks for a token.

The component sets \`window.pCacheDynamic\`, the flag Parallelogram Cache's fallback script (\`pCache.dynamicScript()\`) also sets, so the two never both fill a page. If the fallback script has claimed the page first, the component leaves every placeholder to it.`,
  withoutJs:
    'Placeholders show their fallback, written inside them by the server, and a CSRF field stays empty, so forms on cached pages fail their CSRF check until the token is filled.',
  states: STATUSES,
  attributes: [
    {
      name: 'data-dynamic-fill',
      type: 'string',
      required: true,
      description:
        'The fragment name, or csrf for a CSRF token field (an <input>) or meta tag (a <meta>)',
    },
    {
      name: 'data-dynamic-fill-endpoint',
      type: 'url',
      default: '/p-cache/dynamic',
      option: 'endpoint',
      description: "The endpoint's path for the page's site, written by the server",
    },
    {
      name: 'data-dynamic-fill-status',
      type: 'enum',
      options: STATUSES,
      readonly: true,
      description: 'pending as written, then filled or error',
    },
  ],
  events: [
    {
      name: 'dynamic-fill:filled',
      channel: 'both',
      detail: '{ name: string }',
      description: 'The placeholder was filled',
    },
    {
      name: 'dynamic-fill:error',
      channel: 'both',
      detail: '{ name: string; error: unknown }',
      description: "The placeholder couldn't be filled and keeps its fallback",
    },
    {
      name: 'p-cache:dynamic',
      on: 'document',
      detail:
        '{ fragments?: Record<string, { html: string } | { value: unknown }>; csrf?: { name: string; value: string } | null }',
      description: 'A request answered, with the whole response; once per request',
    },
    {
      name: 'p-cache:dynamic-error',
      on: 'document',
      detail: '{ error: unknown }',
      description: 'A request failed; once per request',
    },
  ],
  examples: [
    {
      id: 'placeholders',
      title: 'Per-visitor placeholders',
      description:
        'This site answers /p-cache/dynamic with a made-up token and enquiry count. The count and the hidden field fill in once the page loads, and the State panel shows each status move from pending to filled.',
      markup: `<form method="post" class="stack">
  <input type="hidden" name="CRAFT_CSRF_TOKEN" value=""
    data-dynamic-fill="csrf" data-dynamic-fill-endpoint="/p-cache/dynamic"
    data-dynamic-fill-status="pending">
  <p>Enquiry list: <span data-dynamic-fill="enquiryCount"
    data-dynamic-fill-endpoint="/p-cache/dynamic" data-dynamic-fill-status="pending">0</span> items</p>
</form>`,
    },
  ],
};
