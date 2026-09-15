const STATUSES = ['pending', 'awaiting-consent', 'loading', 'booted', 'duplicate', 'error'];

/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'DeferTracker',
  kind: 'enhancement',
  selector: 'data-defer-tracker',
  module: 'components/DeferTracker',
  summary: 'Load third-party trackers after the first interaction, described by inert JSON',
  description: `Each tracker is a \`<script type="application/json">\` block that is never executed. DeferTracker boots the named adapter on the first click, key press, touch or scroll, or once the page has loaded and been idle for five seconds, which keeps tracker cost out of page load and lab tests such as Lighthouse.

Register the adapters a site uses with \`registerTrackerAdapter(name, adapter)\` from the same module specifier the component loads from; adapters for GA4, Google Ads, Tag Manager, Meta, TikTok, Pinterest, LinkedIn, Bing, HubSpot, Hotjar, Clarity, Plausible and Fathom are in \`adapters/\`. A second block for a tracker already on the page, such as a Google Ads conversion beside its remarketing tag, reaches adapters that handle one, and is otherwise marked duplicate. \`setTrackerConsent()\` holds back trackers whose block names a consent category until it is granted, and \`configureDeferTracker({ nonce })\` passes a CSP nonce to the scripts adapters add. Blocks must sit inside the element the framework observes, not in \`<head>\`.`,
  states: STATUSES,
  attributes: [
    {
      name: 'data-defer-tracker',
      type: 'string',
      required: true,
      on: 'a <script type="application/json"> block',
      description: 'The registered adapter name, such as ga4',
    },
    {
      name: 'data-defer-tracker-status',
      type: 'enum',
      options: STATUSES,
      readonly: true,
      description: 'Where the tracker is in loading',
    },
  ],
  events: [
    {
      name: 'defer-tracker:booted',
      channel: 'both',
      detail: '{ name: string }',
      description: "The adapter's script loaded",
    },
    {
      name: 'defer-tracker:error',
      channel: 'both',
      detail: '{ name: string; error: unknown }',
      description: 'The adapter failed or its script could not load',
    },
  ],
  examples: [
    {
      id: 'block',
      title: 'Tracker block',
      description:
        'This site registers a demonstration adapter named example that loads nothing. Click anywhere and the State panel shows the status move from pending to booted.',
      markup: `<script type="application/json" data-defer-tracker="example">
  { "id": "docs-site" }
</script>`,
    },
  ],
};
