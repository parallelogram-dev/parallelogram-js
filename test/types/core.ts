import Parallelogram, {
  BaseComponent,
  DevLogger,
  EventManager,
  RouterManager,
} from '@parallelogram-js/core';
import type { ComponentState } from '@parallelogram-js/core/core/BaseComponent';
import Lightbox from '@parallelogram-js/core/components/Lightbox';
import { AlertManager } from '@parallelogram-js/core/managers/AlertManager';
import Toggle from '@parallelogram-js/core/components/Toggle';

export function configure(): Parallelogram {
  const app = Parallelogram.create({
    router: { timeout: 5000, loadingClass: 'is-loading' },
    pageManager: {
      containerSelector: 'main',
      focusTarget: false,
      targetGroups: { main: ['main', 'navbar'] },
      targetGroupTransitions: { main: { out: 'fade-out', in: 'fade-in', duration: 200 } },
    },
  });

  app.components
    .add('p-modal', () => import('@parallelogram-js/core/components/PModal'))
    .add('[data-toggle]', {
      loader: () => import('@parallelogram-js/core/components/Toggle'),
      priority: 'critical',
    })
    .add('[data-tabs]', () => import('@parallelogram-js/core/components/Tabs'), {
      dependsOn: ['[data-toggle]'],
    });

  /* @ts-expect-error silent is a boolean */
  Parallelogram.create({ silent: 'yes' });

  app.components.add('[data-lazysrc]', {
    loader: () => import('@parallelogram-js/core/components/Lazysrc'),
    /* @ts-expect-error priority is critical or normal */
    priority: 'urgent',
  });

  return app;
}

export function eventBus(bus: EventManager, controller: AbortController): number {
  const off = bus.on(
    'toggle:show',
    (payload: { element: HTMLElement }) => payload.element.focus(),
    { signal: controller.signal }
  );
  bus.emit('toggle:show', { element: document.body });
  off();
  return bus.listenerCount('toggle:show');
}

class Counter extends BaseComponent {
  static selector = 'data-counter';

  protected _init(element: HTMLElement): ComponentState {
    const state = super._init(element);
    const step: number | null = this.getNumberAttr(element, 'step', 1);
    const label: string | null = this.getAttr(element, 'label');
    const fallback: string = this.getAttr(element, 'label', 'Count');
    state.count = 0;
    element.addEventListener(
      'click',
      () => this._dispatch(element, 'counter:change', { step, label, fallback }),
      { signal: state.controller.signal }
    );
    return state;
  }
}

export function components(counter: Counter, element: HTMLElement, router: RouterManager): number {
  counter.mount(element);

  /* @ts-expect-error _init is protected */
  counter._init(element);

  /* @ts-expect-error _runCleanup is internal and left out of the declarations */
  counter._runCleanup(counter.getState(element));

  /* @ts-expect-error _navigation is an internal property, which tsc alone would declare */
  router._navigation = null;

  return new Toggle({ router }).trackedElements().length;
}

export function retryComponent(app: Parallelogram): boolean {
  return app.pageManager?.host.retry('[data-tabs]') ?? false;
}

export function alerts(manager: AlertManager): void {
  const close = manager.success('Saved', { timeout: 3000 });
  close();
  AlertManager.notify('Could not save', 'error');

  /* @ts-expect-error notify takes a toast type */
  AlertManager.notify('Could not save', 'fatal');
}

export function logging(logger: DevLogger): void {
  logger.debug('Mounted', { count: 2 });
  logger.warn('Missing target');

  /* @ts-expect-error setEnabled takes a boolean */
  logger.setEnabled('yes');
}

export function lightbox(viewer: Lightbox, link: HTMLElement): number {
  viewer.goTo(link, 2);

  /* @ts-expect-error goTo takes the image's position as a number */
  viewer.goTo(link, '2');

  const status = viewer.getStatus(link);
  return status?.lightboxState === 'open' ? status.gallerySize : 0;
}
