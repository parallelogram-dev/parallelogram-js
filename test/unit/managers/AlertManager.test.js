import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertManager } from '../../../src/managers/AlertManager.js';
import { EventManager } from '../../../src/managers/EventManager.js';

describe('AlertManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('stops forwarding toast events to the event bus once destroyed', () => {
    const bus = new EventManager();
    const shown = vi.fn();
    bus.on('alerts:show', shown);
    const alerts = new AlertManager({ eventBus: bus });

    alerts.destroy();
    document
      .querySelector('p-toasts')
      .dispatchEvent(new CustomEvent('p-toasts:show', { detail: { message: 'Saved' } }));

    expect(shown).not.toHaveBeenCalled();
  });
});
