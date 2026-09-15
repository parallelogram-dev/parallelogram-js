import { afterEach, describe, expect, it, vi } from 'vitest';
import Lazysrc from '../../../src/components/Lazysrc.js';
import frameworkStyles from '../../../src/styles/framework/index.scss';

const WAIT = { timeout: 4000 };

let serial = 0;
const fixture = () =>
  new URL(`/test/browser/fixtures/lazysrc.svg?n=${Date.now()}-${serial++}`, location.href).href;
const missing = () =>
  new URL(`/test/browser/fixtures/missing-${Date.now()}-${serial++}.svg`, location.href).href;

const spacer = () => {
  const block = document.createElement('div');
  block.style.height = '12000px';
  document.body.append(block);
};

const image = (attributes = {}, parent = document.body) => {
  const img = document.createElement('img');
  img.alt = '';
  img.width = 40;
  img.height = 30;
  for (const [name, value] of Object.entries(attributes)) {
    img.setAttribute(name, value);
  }
  parent.append(img);
  return img;
};

const record = (element, type) => {
  const seen = [];
  element.addEventListener(type, event => seen.push(event));
  return seen;
};

const stateOf = element => element.getAttribute('data-lazysrc-state');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('Lazysrc', () => {
  let lazysrc;

  afterEach(() => {
    lazysrc?.destroy();
    lazysrc = null;
    document.body.replaceChildren();
    window.scrollTo(0, 0);
  });

  it('hands data sources to the browser as a native lazy image', () => {
    lazysrc = new Lazysrc();
    const url = fixture();
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': url });

    lazysrc.mount(img);

    expect([img.getAttribute('src'), img.loading, img.decoding]).toEqual([url, 'lazy', 'async']);
  });

  it('leaves an image below the fold unloaded until it nears the viewport', async () => {
    lazysrc = new Lazysrc();
    spacer();
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': fixture() });
    lazysrc.mount(img);

    await pause(400);
    expect(lazysrc.isLoaded(img)).toBe(false);

    img.scrollIntoView();
    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);
  });

  it('keeps sources that are already in the markup', async () => {
    lazysrc = new Lazysrc();
    const url = fixture();
    const img = image({ 'data-lazysrc': '', src: url });
    await vi.waitFor(() => expect(img.complete).toBe(true), WAIT);
    const loaded = record(img, 'lazysrc:loaded');

    lazysrc.mount(img);

    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);
    expect([img.getAttribute('src'), loaded.length]).toEqual([url, 1]);
  });

  it('reports a load only once when the image loads again', async () => {
    lazysrc = new Lazysrc();
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': fixture() });
    const loaded = record(img, 'lazysrc:loaded');
    lazysrc.mount(img);
    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);

    img.dispatchEvent(new Event('load'));
    await pause(100);

    expect(loaded).toHaveLength(1);
  });

  it('copies source sets onto the sources in a picture', async () => {
    lazysrc = new Lazysrc();
    const sourceUrl = fixture();
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.type = 'image/svg+xml';
    source.setAttribute('data-lazysrc-srcset', sourceUrl);
    picture.append(source);
    document.body.append(picture);
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': fixture() }, picture);

    lazysrc.mount(img);

    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);
    expect([source.getAttribute('srcset'), img.currentSrc]).toEqual([sourceUrl, sourceUrl]);
  });

  it('passes a fetch priority through to the image', () => {
    lazysrc = new Lazysrc();
    const img = image({
      'data-lazysrc': '',
      'data-lazysrc-src': fixture(),
      'data-lazysrc-fetchpriority': 'high',
    });

    lazysrc.mount(img);

    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('retries a failed image before reporting the error', async () => {
    lazysrc = new Lazysrc();
    const img = image({
      'data-lazysrc': '',
      'data-lazysrc-src': missing(),
      'data-lazysrc-retry-attempts': '1',
      'data-lazysrc-retry-delay': '20',
    });
    const failures = record(img, 'error');
    const reported = record(img, 'lazysrc:error');

    lazysrc.mount(img);

    await vi.waitFor(() => expect(stateOf(img)).toBe('error'), WAIT);
    expect([failures.length, reported.length, img.classList.contains('lazysrc--error')]).toEqual([
      2,
      1,
      true,
    ]);
  });

  it('loads a background image only once it nears the viewport', async () => {
    lazysrc = new Lazysrc();
    spacer();
    const url = fixture();
    const panel = document.createElement('div');
    panel.style.height = '30px';
    panel.setAttribute('data-lazysrc', '');
    panel.setAttribute('data-lazysrc-bg', url);
    document.body.append(panel);
    lazysrc.mount(panel);

    await pause(300);
    expect(panel.style.backgroundImage).toBe('');

    panel.scrollIntoView();
    await vi.waitFor(() => expect(stateOf(panel)).toBe('loaded'), WAIT);
    expect(panel.style.backgroundImage).toContain(url);
  });

  it('stops watching a background image once it is unmounted', async () => {
    lazysrc = new Lazysrc();
    spacer();
    const panel = document.createElement('div');
    panel.style.height = '30px';
    panel.setAttribute('data-lazysrc', '');
    panel.setAttribute('data-lazysrc-bg', fixture());
    document.body.append(panel);
    lazysrc.mount(panel);

    lazysrc.unmount(panel);
    panel.scrollIntoView();
    await pause(400);

    expect(panel.style.backgroundImage).toBe('');
  });

  it('loads a lazy image straight away when asked to force load', async () => {
    lazysrc = new Lazysrc();
    spacer();
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': fixture() });
    lazysrc.mount(img);

    img.dispatchEvent(new CustomEvent('lazysrc:forceLoad'));

    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);
  });

  it('leaves the fade to the stylesheet and uses its class names', async () => {
    lazysrc = new Lazysrc();
    const img = image({ 'data-lazysrc': '', 'data-lazysrc-src': fixture() });

    lazysrc.mount(img);

    await vi.waitFor(() => expect(stateOf(img)).toBe('loaded'), WAIT);
    expect([img.style.opacity, img.style.transition, img.className]).toEqual([
      '',
      '',
      'lazysrc--loaded',
    ]);
  });

  it('takes the placeholder and error colours from the dark roles when data-theme is dark', () => {
    const style = document.createElement('style');
    style.textContent = frameworkStyles;
    document.head.append(style);
    const loading = document.createElement('div');
    const failed = document.createElement('div');
    loading.setAttribute('data-lazysrc-state', 'loading');
    failed.setAttribute('data-lazysrc-state', 'error');
    document.body.append(loading, failed);
    const colours = () => [
      getComputedStyle(loading).backgroundColor,
      getComputedStyle(failed).backgroundColor,
      getComputedStyle(failed).outlineColor,
    ];

    try {
      const light = colours();
      document.documentElement.dataset.theme = 'dark';

      expect([light, colours()]).toEqual([
        ['rgb(245, 245, 245)', 'rgb(254, 226, 226)', 'rgb(220, 38, 38)'],
        ['rgb(32, 39, 51)', 'rgba(248, 113, 113, 0.16)', 'rgb(248, 113, 113)'],
      ]);
    } finally {
      delete document.documentElement.dataset.theme;
      loading.remove();
      failed.remove();
      style.remove();
    }
  });
});
