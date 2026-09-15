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

  it('leaves the settings a trigger overrides off p-modal until the trigger opens it', () => {
    const { modal } = mountTrigger(
      { 'data-modal-size': 'sm' },
      { 'data-modal-size': 'lg', 'data-modal-keyboard': 'false' }
    );

    expect([
      modal.getAttribute('data-modal-size'),
      modal.hasAttribute('data-modal-keyboard'),
    ]).toEqual(['sm', false]);
  });

  it('applies the settings a trigger sets while it has the modal open, then restores them', async () => {
    document.body.innerHTML = `
      <button id="large" data-modal data-modal-target="#terms" data-modal-size="lg">Terms</button>
      <button id="plain" data-modal data-modal-target="#terms">Read the terms</button>
      <p-modal id="terms" data-modal-size="sm"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#large'));
    modals.mount(document.querySelector('#plain'));
    const terms = document.querySelector('#terms');
    const size = () => terms.getAttribute('data-modal-size');

    document.querySelector('#large').click();
    const openedFromLarge = size();
    terms.close();
    await vi.waitFor(() => expect(terms.hasAttribute('open')).toBe(false), { timeout: 2000 });
    const afterClose = size();
    document.querySelector('#plain').click();
    const openedFromPlain = size();
    terms.close();

    expect([openedFromLarge, afterClose, openedFromPlain]).toEqual(['lg', 'sm', 'sm']);
  });

  it('uses the closable setting of the trigger that opened the modal, not the last one mounted', () => {
    document.body.innerHTML = `
      <button id="locked" data-modal data-modal-target="#payment" data-modal-closable="false">Pay</button>
      <button id="review" data-modal data-modal-target="#payment" data-modal-closable="true">Review</button>
      <p-modal id="payment"><h2 slot="title">Payment</h2><button>Confirm</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#locked'));
    modals.mount(document.querySelector('#review'));
    const payment = document.querySelector('#payment');

    document.querySelector('#locked').click();

    expect(payment.shadowRoot.querySelector('[data-modal-close-btn]').hidden).toBe(true);
    payment.removeAttribute('open');
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

  it('reports an open from the second of two triggers once, on that trigger', async () => {
    document.body.innerHTML = `
      <button id="first" data-modal data-modal-target="#terms">Terms</button>
      <button id="second" data-modal data-modal-target="#terms">Read the terms</button>
      <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#first'));
    modals.mount(document.querySelector('#second'));
    const opened = [];
    for (const trigger of document.querySelectorAll('[data-modal]')) {
      trigger.addEventListener('modal:opened', () => opened.push(trigger.id));
    }

    document.querySelector('#second').click();
    await vi.waitFor(() => expect(opened.length).toBeGreaterThan(0), { timeout: 2000 });
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(opened).toEqual(['second']);
    document.querySelector('#terms').close();
  });

  it('reports the close once, on the trigger that opened the modal', async () => {
    document.body.innerHTML = `
      <button id="first" data-modal data-modal-target="#terms">Terms</button>
      <button id="second" data-modal data-modal-target="#terms">Read the terms</button>
      <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    modals.mount(document.querySelector('#first'));
    modals.mount(document.querySelector('#second'));
    const terms = document.querySelector('#terms');
    const closed = [];
    for (const trigger of document.querySelectorAll('[data-modal]')) {
      trigger.addEventListener('modal:closed', () => closed.push(trigger.id));
    }

    document.querySelector('#second').click();
    terms.close();
    await vi.waitFor(() => expect(closed.length).toBeGreaterThan(0), { timeout: 2000 });
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(closed).toEqual(['second']);
  });

  it("keeps every trigger's aria-expanded in step with the modal", async () => {
    document.body.innerHTML = `
      <button id="first" data-modal data-modal-target="#terms">Terms</button>
      <button id="second" data-modal data-modal-target="#terms">Read the terms</button>
      <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const modals = new Modal();
    const first = document.querySelector('#first');
    const second = document.querySelector('#second');
    modals.mount(first);
    modals.mount(second);
    const terms = document.querySelector('#terms');
    const expanded = () => [first, second].map(trigger => trigger.getAttribute('aria-expanded'));

    second.click();
    const whileOpen = expanded();
    terms.close();
    await vi.waitFor(() => expect(terms.hasAttribute('open')).toBe(false), { timeout: 2000 });

    expect([whileOpen, expanded()]).toEqual([
      ['true', 'true'],
      ['false', 'false'],
    ]);
  });

  it('reports a script opening the modal once', async () => {
    document.body.innerHTML = `
      <button id="first" data-modal data-modal-target="#terms">Terms</button>
      <button id="second" data-modal data-modal-target="#terms">Read the terms</button>
      <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    const eventBus = new EventManager();
    const modals = new Modal({ eventBus });
    modals.mount(document.querySelector('#first'));
    modals.mount(document.querySelector('#second'));
    const terms = document.querySelector('#terms');
    const events = [];
    for (const trigger of document.querySelectorAll('[data-modal]')) {
      trigger.addEventListener('modal:opened', () => events.push(`dom:${trigger.id}`));
    }
    eventBus.on('modal:opened', () => events.push('bus'));

    terms.open();
    await vi.waitFor(() => expect(events.length).toBeGreaterThan(0), { timeout: 2000 });
    await new Promise(resolve => requestAnimationFrame(resolve));

    expect(events).toEqual(['dom:first', 'bus']);
    terms.close();
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
