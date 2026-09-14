import { afterEach, describe, expect, it } from 'vitest';
import { AlertManager } from '../../../src/managers/AlertManager.js';

const toasts = () => [...document.querySelector('p-toasts').shadowRoot.querySelectorAll('.toast')];

describe('AlertManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each(['info', 'success', 'warn', 'error'])(
    'shows %s messages on a visible background',
    method => {
      const alerts = new AlertManager();

      alerts[method](`A ${method} message`, { timeout: 0 });

      const [toast] = toasts();
      expect(toast.textContent).toContain(`A ${method} message`);
      expect(getComputedStyle(toast).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  );
});
