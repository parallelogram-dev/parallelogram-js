import { afterEach, describe, expect, it, vi } from 'vitest';
import Modal from '../../../src/components/Modal.js';
import PModal from '../../../src/components/PModal.js';
import { EventManager } from '../../../src/managers/EventManager.js';

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

  it('reports each open and close to the event bus once', async () => {
    document.body.innerHTML = `
      <button id="open-terms" data-modal data-modal-target="#terms">Terms</button>
      <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const eventBus = new EventManager();
    const events = [];
    eventBus.on('modal:opened', () => events.push('opened'));
    eventBus.on('modal:closed', () => events.push('closed'));
    new Modal({ eventBus }).mount(document.querySelector('#open-terms'));
    const terms = document.querySelector('#terms');

    document.querySelector('#open-terms').click();
    await vi.waitFor(() => expect(events).toContain('opened'), { timeout: 2000 });
    terms.close();
    await vi.waitFor(() => expect(events).toContain('closed'), { timeout: 2000 });

    expect(events).toEqual(['opened', 'closed']);
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

  it('leaves focus in the new modal when a modal opens another', async () => {
    document.body.innerHTML = `
      <button id="open-details" data-modal data-modal-target="#details">Details</button>
      <p-modal id="details"><h2 slot="title">Details</h2>
        <button id="open-fullscreen" data-modal data-modal-target="#fullscreen">Fullscreen</button>
      </p-modal>
      <p-modal id="fullscreen"><h2 slot="title">Fullscreen</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#open-details'));
    modals.mount(document.querySelector('#open-fullscreen'));
    const details = document.querySelector('#details');
    const fullscreen = document.querySelector('#fullscreen');

    document.querySelector('#open-details').focus();
    document.querySelector('#open-details').click();
    document.querySelector('#open-fullscreen').focus();
    document.querySelector('#open-fullscreen').click();
    await vi.waitFor(() => expect(details.hasAttribute('open')).toBe(false), { timeout: 2000 });
    await new Promise(resolve => requestAnimationFrame(resolve));

    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    expect([
      fullscreen.hasAttribute('open'),
      fullscreen.contains(active) || fullscreen.shadowRoot.contains(active),
      document.body.style.overflow,
    ]).toEqual([true, true, 'hidden']);
    fullscreen.close();
  });

  it('returns focus to the page trigger after closing a modal opened from another modal', async () => {
    document.body.innerHTML = `
      <button id="open-details" data-modal data-modal-target="#details">Details</button>
      <p-modal id="details"><h2 slot="title">Details</h2>
        <button id="open-fullscreen" data-modal data-modal-target="#fullscreen">Fullscreen</button>
      </p-modal>
      <p-modal id="fullscreen"><h2 slot="title">Fullscreen</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#open-details'));
    modals.mount(document.querySelector('#open-fullscreen'));
    const details = document.querySelector('#details');
    const fullscreen = document.querySelector('#fullscreen');

    document.querySelector('#open-details').click();
    document.querySelector('#open-fullscreen').click();
    await vi.waitFor(() => expect(details.hasAttribute('open')).toBe(false), { timeout: 2000 });
    fullscreen.close();
    await vi.waitFor(() => expect(fullscreen.hasAttribute('open')).toBe(false), { timeout: 2000 });

    expect(document.activeElement?.id).toBe('open-details');
  });
});
