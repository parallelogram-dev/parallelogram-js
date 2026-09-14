import { afterEach, describe, expect, it, vi } from 'vitest';
import PModal from '../../../src/components/PModal.js';
import { ExtendedStates } from '../../../src/core/ComponentStates.js';

describe('p-modal', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('can be created with document.createElement', () => {
    const modal = document.createElement('p-modal');

    expect(modal).toBeInstanceOf(PModal);
    expect(typeof modal.open).toBe('function');
  });

  it('starts closed once it is on the page', () => {
    const modal = document.createElement('p-modal');
    document.body.append(modal);

    expect(modal.getAttribute('data-modal')).toBe(ExtendedStates.CLOSED);
  });

  it('handles its close button once after being moved to another container', () => {
    const modal = document.createElement('p-modal');
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    first.append(modal);
    second.append(modal);
    const close = vi.spyOn(modal, 'close');

    modal.shadowRoot.querySelector('[data-modal-close-btn]').click();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape after it has been removed from the page', () => {
    const modal = document.createElement('p-modal');
    document.body.append(modal);
    modal.setAttribute('open', '');
    modal.remove();
    const close = vi.spyOn(modal, 'close');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(close).not.toHaveBeenCalled();
  });
});
