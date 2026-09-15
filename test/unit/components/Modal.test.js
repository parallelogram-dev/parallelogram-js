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
});
