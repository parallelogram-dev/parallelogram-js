import { afterEach, describe, expect, it, vi } from 'vitest';
import Modal from '../../../src/components/Modal.js';

const mountTwoTriggers = type => {
  document.body.innerHTML = `
    <button id="first" data-modal data-modal-target="#terms">Terms</button>
    <button id="second" data-modal data-modal-target="#terms">Read the terms</button>
    <p-modal id="terms"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
  `;
  const modals = new Modal();
  const received = [];
  for (const trigger of document.querySelectorAll('[data-modal]')) {
    modals.mount(trigger);
    trigger.addEventListener(type, () => received.push(trigger.id));
  }
  return { modal: document.querySelector('#terms'), received };
};

describe('Modal', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('dispatches modal:opened once, on the trigger that opened the modal', () => {
    const { received } = mountTwoTriggers('modal:opened');

    document.querySelector('#second').click();

    expect(received).toEqual(['second']);
  });

  it('dispatches modal:closed once, on the trigger that opened the modal', async () => {
    const { modal, received } = mountTwoTriggers('modal:closed');

    document.querySelector('#second').click();
    modal.close();
    await vi.waitFor(() => expect(modal.hasAttribute('open')).toBe(false));

    expect(received).toEqual(['second']);
  });

  it('dispatches modal:opened once, on the first trigger, when a script opens the modal', () => {
    const { modal, received } = mountTwoTriggers('modal:opened');

    modal.open();

    expect(received).toEqual(['first']);
  });

  it('hides the close button when opened from an unclosable trigger that mounted before a closable one', () => {
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
  });

  it("puts the modal's own size back once the trigger that overrode it closes the modal", async () => {
    document.body.innerHTML = `
      <button id="large" data-modal data-modal-target="#terms" data-modal-size="lg">Terms</button>
      <p-modal id="terms" data-modal-size="sm"><h2 slot="title">Terms</h2><button>Done</button></p-modal>
    `;
    new Modal().mount(document.querySelector('#large'));
    const terms = document.querySelector('#terms');

    document.querySelector('#large').click();
    const whileOpen = terms.getAttribute('data-modal-size');
    terms.close();
    await vi.waitFor(() => expect(terms.hasAttribute('open')).toBe(false));

    expect([whileOpen, terms.getAttribute('data-modal-size')]).toEqual(['lg', 'sm']);
  });
});
