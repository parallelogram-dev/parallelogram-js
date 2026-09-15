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
const press = key =>
  (overlay() ?? document).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );

const imageOf = width =>
  `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="8"%3E%3C/svg%3E`;

const mountGallery = (hrefs = [IMAGE, IMAGE, IMAGE], options = {}, attributes = {}) => {
  const lightbox = new Lightbox(options);
  const links = hrefs.map((href, index) => {
    const link = document.createElement('a');
    link.href = href;
    link.dataset.lightbox = 'holiday';
    for (const [name, value] of Object.entries(attributes)) {
      link.setAttribute(name, value);
    }
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

  it('opens as a modal dialog named Image viewer with focus on its close button', async () => {
    const { links } = mountGallery();

    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    expect({
      element: overlay().localName,
      modal: overlay().matches(':modal'),
      name: overlay().getAttribute('aria-label'),
      focus: document.activeElement?.dataset.lightboxAction,
    }).toEqual({ element: 'dialog', modal: true, name: 'Image viewer', focus: 'close' });
  });

  it('returns focus to the link that opened it', async () => {
    const { links } = mountGallery();
    links[1].focus();
    links[1].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    press('Escape');
    await vi.waitFor(() => expect(overlay()).toBeNull(), WAIT);

    expect(document.activeElement).toBe(links[1]);
  });

  it('shows visible icons on its buttons and announces the position', async () => {
    const { links } = mountGallery();

    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    const icons = ['close', 'prev', 'next'].map(
      action =>
        overlay().querySelector(`[data-lightbox-action="${action}"] svg[aria-hidden="true"]`) !==
        null
    );
    expect([
      icons,
      overlay().querySelector('.lightbox__counter').getAttribute('aria-live'),
    ]).toEqual([[true, true, true], 'polite']);
  });

  it('preloads the images beside the one shown after each move', async () => {
    const hrefs = [imageOf(8), imageOf(9), imageOf(10), imageOf(11)];
    const { lightbox, links } = mountGallery(hrefs);
    const preload = vi.spyOn(lightbox, '_preloadImage');
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    lightbox.next(links[0]);
    await vi.waitFor(() => expect(counter()).toBe('2 / 4'), WAIT);

    expect(preload.mock.calls.map(([data]) => data.src)).toContain(hrefs[2]);
  });

  it('closes when its link is unmounted', async () => {
    const { lightbox, links } = mountGallery();
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    lightbox.unmount(links[0]);

    expect([overlay(), document.body.classList.contains('overflow--hidden')]).toEqual([
      null,
      false,
    ]);
  });

  it('puts the configured class for each state on the viewer in place of the previous one', async () => {
    const seen = [];
    const eventBus = new EventManager();
    eventBus.on('lightbox:stateChange', ({ newState }) => {
      if (overlay()) {
        const classes = [...overlay().classList].filter(
          name => name !== 'lightbox__overlay' && name !== 'show'
        );
        seen.push([newState, classes]);
      }
    });
    const { lightbox, links } = mountGallery(
      [IMAGE, IMAGE, IMAGE],
      { eventBus },
      {
        'data-lightbox-state-opening-class': 'viewer-opening',
        'data-lightbox-state-open-class': 'viewer-open',
      }
    );
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);
    lightbox.next(links[0]);
    await vi.waitFor(() => expect([counter(), lightboxState()]).toEqual(['2 / 3', 'open']), WAIT);

    lightbox.close(links[0]);
    await vi.waitFor(() => expect(overlay()).toBeNull(), WAIT);

    expect(seen).toEqual([
      ['opening', ['viewer-opening']],
      ['open', ['viewer-open']],
      ['transitioning', ['is-transitioning']],
      ['open', ['viewer-open']],
      ['closing', ['is-closing']],
    ]);
  });

  it('changes images without sliding when the user prefers reduced motion', async () => {
    vi.stubGlobal('matchMedia', query => ({ matches: query.includes('reduce'), media: query }));
    const states = [];
    const eventBus = new EventManager();
    eventBus.on('lightbox:stateChange', ({ newState }) => states.push(newState));
    const { lightbox, links } = mountGallery([IMAGE, IMAGE, IMAGE], { eventBus });
    links[0].click();
    await vi.waitFor(() => expect(lightboxState()).toBe('open'), WAIT);

    lightbox.next(links[0]);
    await vi.waitFor(() => expect(counter()).toBe('2 / 3'), WAIT);

    expect(states).not.toContain('transitioning');
  });
});
