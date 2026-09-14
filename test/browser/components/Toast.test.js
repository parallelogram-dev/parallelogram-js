import { afterEach, describe, expect, it, vi } from 'vitest';
import Toast from '../../../src/components/Toast.js';
import { AlertManager } from '../../../src/managers/AlertManager.js';
import { EventManager } from '../../../src/managers/EventManager.js';

const WAIT = { timeout: 2000 };

const trigger = attributes => {
  const button = document.createElement('button');
  button.textContent = 'Save';
  for (const [name, value] of Object.entries(attributes)) {
    button.setAttribute(name, value);
  }
  document.body.append(button);
  return button;
};

const shownToasts = () =>
  [...document.querySelectorAll('p-toasts')].flatMap(host => [
    ...host.shadowRoot.querySelectorAll('.toast'),
  ]);

describe('Toast triggers', () => {
  let toast;

  afterEach(() => {
    toast?.destroy();
    toast = null;
    vi.useRealTimers();
    AlertManager._globalInstance = null;
    document.body.replaceChildren();
  });

  it('shows the message, title and type from the trigger without a p-toasts on the page', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    toast = new Toast();
    const button = trigger({
      'data-toast-trigger': 'warn',
      'data-toast-message': 'Two seats left',
      'data-toast-title': 'Hurry',
    });
    toast.mount(button);

    button.click();

    const [shown] = shownToasts();
    expect([
      alertSpy.mock.calls.length,
      shown?.classList.contains('warning'),
      shown?.querySelector('.title')?.textContent,
      shown?.querySelector('.msg')?.textContent,
    ]).toEqual([0, true, 'Hurry', 'Two seats left']);
  });

  it('closes after data-toast-duration and leaves out the dismiss button when not dismissible', async () => {
    toast = new Toast();
    const button = trigger({
      'data-toast-trigger': 'success',
      'data-toast-message': 'Saved',
      'data-toast-duration': '100',
      'data-toast-dismissible': 'false',
    });
    toast.mount(button);

    button.click();
    const hasClose = Boolean(shownToasts()[0]?.querySelector('.close'));

    await vi.waitFor(() => expect([hasClose, shownToasts().length]).toEqual([false, 0]), WAIT);
  });

  it('reports each toast to the event bus once', () => {
    const eventBus = new EventManager();
    const seen = [];
    for (const name of ['toast:show', 'toast:shown']) {
      eventBus.on(name, () => seen.push(name));
    }
    toast = new Toast({ eventBus });
    const button = trigger({ 'data-toast-trigger': 'info', 'data-toast-message': 'Saved' });
    toast.mount(button);

    button.click();

    expect(seen).toEqual(['toast:shown']);
  });

  it('stops showing toasts once the trigger is unmounted', () => {
    toast = new Toast();
    const button = trigger({ 'data-toast-trigger': 'info', 'data-toast-message': 'Saved' });
    toast.mount(button);

    toast.unmount(button);
    button.click();

    expect(shownToasts()).toHaveLength(0);
  });

  it('shows toasts from Toast.show without a trigger', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    Toast.show('Seat released', 'danger');

    expect([alertSpy.mock.calls.length, shownToasts()[0]?.classList.contains('error')]).toEqual([
      0,
      true,
    ]);
  });
});

describe('AlertManager', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('keeps error toasts until they are dismissed', () => {
    vi.useFakeTimers();
    const alerts = new AlertManager();

    alerts.error('Payment failed');
    vi.advanceTimersByTime(60_000);

    expect(shownToasts().filter(shown => shown.dataset.state !== 'leaving')).toHaveLength(1);
  });
});
