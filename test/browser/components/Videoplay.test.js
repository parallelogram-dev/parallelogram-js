import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Videoplay from '../../../src/components/Videoplay.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const WAIT = { timeout: 2000 };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Videoplay', () => {
  let videoplay;
  let play;

  const mountVideo = (attributes = 'autoplay muted loop', options = {}) => {
    document.body.innerHTML = `
      <video data-videoplay ${attributes} style="display: block; width: 320px; height: 180px"></video>
      <div style="height: 4000px"></div>`;
    const video = document.querySelector('video');
    videoplay = new Videoplay(options);
    videoplay.mount(video);
    return video;
  };

  beforeEach(() => {
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
      this.dispatchEvent(new Event('pause'));
    });
  });

  afterEach(() => {
    videoplay?.destroy();
    videoplay = null;
    document.body.replaceChildren();
    window.scrollTo(0, 0);
  });

  it('does not restart a video the user paused when it scrolls back into view', async () => {
    const video = mountVideo();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1), WAIT);

    video.dispatchEvent(new Event('pause'));
    window.scrollTo(0, 3000);
    await pause(250);
    window.scrollTo(0, 0);
    await pause(400);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('treats a play interrupted by a pause as expected, without a warning or play-error', async () => {
    play.mockImplementation(() =>
      Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    );
    const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const errors = [];
    const listening = new AbortController();
    document.addEventListener('videoplay:play-error', event => errors.push(event), {
      signal: listening.signal,
    });

    mountVideo('autoplay muted loop', { logger });
    await vi.waitFor(() => expect(play).toHaveBeenCalled(), WAIT);
    await pause(50);
    listening.abort();

    expect([logger.warn.mock.calls.length, errors.length]).toEqual([0, 0]);
  });

  it('does not count the autoplay start as a user interaction', () => {
    const video = mountVideo('autoplay muted loop data-videoplay-require-interaction');

    video.dispatchEvent(new Event('play'));
    const afterAutoplay = videoplay.getState(video).hasUserInteracted;
    video.dispatchEvent(new PointerEvent('pointerdown'));

    expect([afterAutoplay, videoplay.getState(video).hasUserInteracted]).toEqual([false, true]);
  });

  it('plays inline so iPhone Safari does not open it full screen', () => {
    const video = mountVideo();

    expect(video.playsInline).toBe(true);
  });

  it('takes over from the native autoplay attribute so the browser only fetches metadata', () => {
    const video = mountVideo();

    expect([video.hasAttribute('autoplay'), video.preload]).toEqual([false, 'metadata']);
  });

  it('gives the autoplay attribute back when it is unmounted', () => {
    const video = mountVideo();

    videoplay.unmount(video);

    expect(video.hasAttribute('autoplay')).toBe(true);
  });

  it('does not play a video that starts below the fold', async () => {
    document.body.innerHTML = `
      <div style="height: 4000px"></div>
      <video data-videoplay autoplay muted loop style="display: block; width: 320px; height: 180px"></video>`;
    const video = document.querySelector('video');
    videoplay = new Videoplay();
    videoplay.mount(video);
    await pause(400);

    expect(play).not.toHaveBeenCalled();
  });

  it('leaves autoplay off and offers controls when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));

    const video = mountVideo();
    await pause(400);

    expect([play.mock.calls.length, video.controls]).toEqual([0, true]);
  });

  it('reports each play to the event bus once', async () => {
    const eventBus = new EventManager();
    const plays = [];
    eventBus.on('videoplay:play', payload => plays.push(payload));

    mountVideo('autoplay muted loop', { eventBus });

    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1), WAIT);
    await pause(100);
    expect(plays).toHaveLength(1);
  });

  it('watches the thresholds the video is configured with', () => {
    const created = vi.spyOn(window, 'IntersectionObserver');

    mountVideo(
      'autoplay muted loop data-videoplay-threshold="0.4" data-videoplay-pause-threshold="0.15"'
    );

    expect(created.mock.calls[0]?.[1]?.threshold).toEqual(expect.arrayContaining([0.15, 0.4]));
  });
});
