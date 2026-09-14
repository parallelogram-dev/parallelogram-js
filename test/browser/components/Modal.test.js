import { afterEach, describe, expect, it } from 'vitest';
import Modal from '../../../src/components/Modal.js';
import PModal from '../../../src/components/PModal.js';

const mountTrigger = (modalAttributes = {}, triggerAttributes = {}) => {
  const modal = document.createElement('p-modal');
  modal.className = 'confirm-dialog';
  for (const [name, value] of Object.entries(modalAttributes)) modal.setAttribute(name, value);

  const trigger = document.createElement('button');
  trigger.setAttribute('data-modal', '');
  trigger.setAttribute('data-modal-target', '.confirm-dialog');
  for (const [name, value] of Object.entries(triggerAttributes)) trigger.setAttribute(name, value);

  document.body.append(modal, trigger);
  new Modal().mount(trigger);
  return { modal, trigger };
};

describe('Modal', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('keeps the settings authored on p-modal when a plain trigger mounts', () => {
    const { modal } = mountTrigger({
      'data-modal-size': 'xs',
      'data-modal-closable': 'false',
      'data-modal-backdrop-close': 'false',
    });

    expect(modal.getAttribute('data-modal-size')).toBe('xs');
    expect(modal.getAttribute('data-modal-closable')).toBe('false');
    expect(modal.getAttribute('data-modal-backdrop-close')).toBe('false');
  });

  it('applies settings that the trigger sets explicitly', () => {
    const { modal } = mountTrigger({}, { 'data-modal-size': 'lg', 'data-modal-keyboard': 'false' });

    expect(modal.getAttribute('data-modal-size')).toBe('lg');
    expect(modal.getAttribute('data-modal-keyboard')).toBe('false');
  });

  it('points aria-controls at the modal even when targeted by class', () => {
    const { modal, trigger } = mountTrigger();

    expect(modal.id).not.toBe('');
    expect(trigger.getAttribute('aria-controls')).toBe(modal.id);
  });

  it('creates a working modal programmatically', async () => {
    const modal = await Modal.create({
      title: 'Discard changes?',
      content: 'Your edits will be lost.',
      actions: [
        { label: 'Discard', type: 'primary' },
        { label: 'Keep editing', close: false },
      ],
    });

    expect(modal).toBeInstanceOf(PModal);
    expect(modal.isConnected).toBe(true);
    expect(modal.getAttribute('data-modal-size')).toBe('md');
    const [discard, keep] = modal.querySelectorAll('[slot="actions"] button');
    expect(discard.hasAttribute('data-modal-close')).toBe(true);
    expect(keep.hasAttribute('data-modal-close')).toBe(false);
  });
});
