import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Lightbox from '../../../src/components/Lightbox.js';
import { ComponentHost } from '../../../src/core/ComponentHost.js';
import { EventManager } from '../../../src/managers/EventManager.js';
import lightboxStyles from '../../../src/styles/framework/components/lightbox.scss';

const IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="8"%3E%3C/svg%3E';
const WAIT = { timeout: 2500 };

const overlay = () => document.querySelector('.lightbox__overlay');
const lightboxState = () => overlay()?.getAttribute('data-lightbox-state');
const counter = () => overlay()?.querySelector('.lightbox__counter')?.textContent;
const press = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

const mountGallery = (hrefs = [IMAGE, IMAGE, IMAGE]) => {
  const lightbox = new Lightbox();
  const links = hrefs.map((href, index) => {
    const link = document.createElement('a');
    link.href = href;
    link.dataset.lightbox = 'holiday';
    const thumbnail = document.createElement('img');
    thumbnail.alt = `Photo ${index + 1}`;
    link.append(thumbnail);
    document.body.append(link);
    lightbox.mount(link);
    return link;
  });
  return { lightbox, links };
};

describe('Lightbox', () => {
  let style;

  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = lightboxStyles;
    document.head.append(style);
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.body.classList.remove('overflow--hidden');
    style.remove();
  });

  it('becomes interactive after opening without any pointer movement', async () => {
    const { links } = mountGallery();

    links[0].click();

    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);
  });

  it('closes when Escape is pressed', async () => {
    const { links } = mountGallery();
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    press('Escape');

    await vi.waitFor(() => expect(overlay()).toBeNull(), WAIT);
  });

  it('moves between images with the arrow keys', async () => {
    const { links } = mountGallery();
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    press('ArrowRight');
    await vi.waitFor(() => expect([counter(), lightboxState()]).toEqual(['2 / 3', 'open']), WAIT);

    press('ArrowLeft');
    await vi.waitFor(() => expect([counter(), lightboxState()]).toEqual(['1 / 3', 'open']), WAIT);
  });

  it('keeps navigating after an image fails to load', async () => {
    const { lightbox, links } = mountGallery([IMAGE, '/missing-lightbox-image.png', IMAGE]);
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    lightbox.next(links[0]);
    await vi.waitFor(() => expect([counter(), lightboxState()]).toEqual(['2 / 3', 'open']), WAIT);

    lightbox.next(links[0]);
    await vi.waitFor(() => expect([counter(), lightboxState()]).toEqual(['3 / 3', 'open']), WAIT);
    expect(overlay().querySelector('.lightbox__image').className).toBe('lightbox__image');
  });

  it('does not mount on its own overlay when a page observer mounts components', async () => {
    const link = document.createElement('a');
    link.href = IMAGE;
    link.dataset.lightbox = 'holiday';
    document.body.append(link);
    const host = new ComponentHost({
      eventBus: new EventManager(),
      registry: [
        { name: 'lightbox', selector: '[data-lightbox]', loader: () => ({ default: Lightbox }) },
      ],
    });
    host.start(document.body);

    try {
      link.click();
      await vi.waitFor(() => expect(overlay()).not.toBeNull(), WAIT);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(host.getInstance('lightbox').trackedElements()).toEqual([link]);
    } finally {
      host.stop();
    }
  });
});
