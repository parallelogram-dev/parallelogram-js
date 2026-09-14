/** @type {import('../contract.js').ComponentContract} */
export default {
  name: 'Videoplay',
  kind: 'enhancement',
  selector: 'data-videoplay',
  module: 'components/Videoplay',
  summary: 'Play videos as they scroll into view and pause them as they leave',
  description: `Only videos with the \`autoplay\` attribute are managed. They play once enough of the video is visible and pause when it scrolls away or the page is hidden. A video the user pauses stays paused until the user plays it again. Managed videos play inline, so iPhone Safari doesn't open them full screen, and are muted for autoplay unless automute says otherwise.

When the user prefers reduced motion, autoplay is left off and the video's controls are shown instead.`,
  attributes: [
    {
      name: 'data-videoplay',
      type: 'flag',
      description: 'Marks a video, or an element containing one',
    },
    {
      name: 'data-videoplay-target',
      type: 'selector',
      description: "The video, when the element isn't one or doesn't contain one",
    },
    {
      name: 'data-videoplay-threshold',
      type: 'number',
      default: 0.3,
      option: 'playThreshold',
      description: 'Visible fraction that starts playback',
    },
    {
      name: 'data-videoplay-pause-threshold',
      type: 'number',
      default: 0.1,
      option: 'pauseThreshold',
      description: 'Visible fraction below which playback pauses',
    },
    {
      name: 'data-videoplay-autopause',
      type: 'boolean',
      default: true,
      option: 'pauseOnExit',
      description: 'Pause when the video leaves the viewport',
    },
    {
      name: 'data-videoplay-automute',
      type: 'boolean',
      default: null,
      option: 'muteWhenPlaying',
      description:
        'true mutes and false unmutes when playing; unset mutes only when autoplay needs it',
    },
    {
      name: 'data-videoplay-restore-volume',
      type: 'boolean',
      default: false,
      option: 'restoreVolumeOnPause',
      description: 'Restore the original volume when pausing',
    },
    {
      name: 'data-videoplay-background',
      type: 'boolean',
      default: false,
      option: 'enableInBackground',
      description: 'Keep playing while the page is hidden',
    },
    {
      name: 'data-videoplay-preload',
      type: 'boolean',
      default: true,
      option: 'preloadOnMount',
      description: 'Set preload="metadata" when mounting',
    },
    {
      name: 'data-videoplay-require-interaction',
      type: 'boolean',
      default: false,
      option: 'requireUserInteraction',
      description:
        'Manage playback only after the user has clicked, tapped or used a key on the video',
    },
    {
      name: 'data-videoplay-playsinline',
      type: 'boolean',
      default: true,
      option: 'playsInline',
      description: 'Play inline; false lets iPhone Safari play full screen',
    },
    {
      name: 'data-videoplay-enhanced',
      type: 'flag',
      readonly: true,
      description: 'Set once the video is managed',
    },
  ],
  events: [
    {
      name: 'videoplay:play',
      channel: 'both',
      on: 'video',
      detail: '{ reason: string }',
      description: 'Playback started',
    },
    {
      name: 'videoplay:pause',
      channel: 'both',
      on: 'video',
      detail: '{ reason: string }',
      description: 'Playback paused',
    },
    {
      name: 'videoplay:play-error',
      channel: 'both',
      on: 'video',
      detail: '{ reason: string; error: string }',
      description: 'The browser refused to start playback',
    },
    {
      name: 'videoplay:error',
      channel: 'both',
      on: 'video',
      detail: '{ error: Event }',
      description: 'The video failed to load',
    },
    {
      name: 'videoplay:mount',
      channel: 'bus',
      detail:
        '{ element: HTMLElement; video: HTMLVideoElement; hasAutoplay: boolean; playThreshold: number; timestamp: number }',
      description: 'A video was set up',
    },
  ],
  examples: [
    {
      id: 'autoplay',
      title: 'Autoplaying video',
      description: 'Scroll it out of view to pause it; pause it yourself and it stays paused.',
      markup: `<video data-videoplay autoplay muted loop playsinline width="640" height="360"
       src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"></video>`,
      controls: [
        { attribute: 'data-videoplay-threshold' },
        { attribute: 'data-videoplay-autopause' },
        { attribute: 'data-videoplay-require-interaction' },
      ],
    },
  ],
};
