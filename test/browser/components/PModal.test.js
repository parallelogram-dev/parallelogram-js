import { afterEach, describe, expect, it, vi } from 'vitest';
import PModal from '../../../src/components/PModal.js';

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

    expect(modal.getAttribute('data-modal-state')).toBe('closed');
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

  describe('as a dialog', () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const deepActiveElement = () => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active;
    };
    const renderModal = (attributes = {}, title = 'Delete project?') => {
      const modal = document.createElement('p-modal');
      for (const [name, value] of Object.entries(attributes)) modal.setAttribute(name, value);
      modal.innerHTML = `<h2 slot="title">${title}</h2><p>This cannot be undone.</p>`;
      document.body.append(modal);
      return modal;
    };
    const dialogOf = modal => modal.shadowRoot.querySelector('dialog');

    afterEach(() => {
      document.body.style.overflow = '';
    });

    it('opens as a modal dialog named by its title', () => {
      const modal = renderModal();

      modal.open();

      const dialog = dialogOf(modal);
      expect([dialog?.open, dialog?.matches(':modal'), dialog?.getAttribute('aria-label')]).toEqual(
        [true, true, 'Delete project?']
      );
    });

    it('keeps focus out of the page behind it', () => {
      const outside = document.createElement('button');
      outside.textContent = 'Behind';
      document.body.append(outside);
      const modal = renderModal();

      modal.open();
      outside.focus();

      expect(document.activeElement).not.toBe(outside);
    });

    it('closes on Escape and returns focus to the element that opened it', async () => {
      const opener = document.createElement('button');
      document.body.append(opener);
      const modal = renderModal();
      opener.focus();

      modal.open();
      dialogOf(modal)?.dispatchEvent(new Event('cancel', { cancelable: true }));
      await vi.waitFor(() => expect(modal.hasAttribute('open')).toBe(false), { timeout: 2000 });

      expect(deepActiveElement()).toBe(opener);
    });

    it('stays open on Escape when it cannot be closed', async () => {
      const modal = renderModal({ 'data-modal-closable': 'false' });

      modal.open();
      dialogOf(modal)?.dispatchEvent(new Event('cancel', { cancelable: true }));
      await wait(400);

      expect([modal.hasAttribute('open'), dialogOf(modal)?.open]).toEqual([true, true]);
    });

    it('opens again when the browser closes it without a cancel event and it cannot be closed', async () => {
      const modal = renderModal({ 'data-modal-closable': 'false' });
      const dialog = dialogOf(modal);
      modal.open();

      dialog.close();
      await wait(100);

      expect([modal.hasAttribute('open'), dialog.open, dialog.matches(':modal')]).toEqual([
        true,
        true,
        true,
      ]);
    });

    it('records a close the browser makes itself when Escape can close it', async () => {
      const modal = renderModal();
      const dialog = dialogOf(modal);
      modal.open();

      dialog.close();

      await vi.waitFor(() => expect(modal.hasAttribute('open')).toBe(false), { timeout: 2000 });
    });

    it('closes from its own close buttons when Escape and the backdrop cannot close it', async () => {
      const modal = renderModal({ 'data-modal-closable': 'false' });
      const keep = document.createElement('button');
      keep.slot = 'actions';
      keep.setAttribute('data-modal-close', '');
      keep.textContent = 'Keep booking';
      modal.append(keep);

      modal.open();
      keep.click();

      await vi.waitFor(() => expect(modal.hasAttribute('open')).toBe(false), { timeout: 2000 });
    });

    it('keeps page scroll locked until the last open modal closes', async () => {
      const first = renderModal({}, 'First');
      const second = renderModal({}, 'Second');

      first.open();
      second.open();
      first.close();
      await vi.waitFor(() => expect(first.hasAttribute('open')).toBe(false), { timeout: 2000 });
      const whileSecondOpen = document.body.style.overflow;
      second.close();
      await vi.waitFor(() => expect(second.hasAttribute('open')).toBe(false), { timeout: 2000 });

      expect([whileSecondOpen, document.body.style.overflow]).toEqual(['hidden', '']);
    });

    it('finishes closing when its animation duration is given in milliseconds', async () => {
      const modal = renderModal({ style: '--modal-animation-duration: 150ms' });

      modal.open();
      modal.close();
      await wait(800);

      expect(modal.hasAttribute('open')).toBe(false);
    });

    it('stays open when it is reopened while closing', async () => {
      const modal = renderModal();

      modal.open();
      modal.close();
      modal.open();
      await wait(800);

      expect([modal.hasAttribute('open'), dialogOf(modal)?.open]).toEqual([true, true]);
    });
  });
});

describe('p-modal with a part left out', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const render = markup => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = markup;
    document.body.append(modal);
    return modal;
  };

  it('leaves out the footer when nothing is slotted into actions', () => {
    const modal = render('<h2 slot="title">Booking confirmed</h2><p>Table 12 is held.</p>');

    expect(modal.shadowRoot.querySelector('[data-modal-footer]').hidden).toBe(true);
  });

  it('keeps the footer for slotted actions', () => {
    const modal = render(
      '<h2 slot="title">Release table?</h2><p>It goes to the waitlist.</p><div slot="actions"><button type="button" data-modal-close>Keep it</button></div>'
    );

    expect(modal.shadowRoot.querySelector('[data-modal-footer]').hidden).toBe(false);
  });

  it('shows no placeholder where a title was left out, but still names the dialog', () => {
    const modal = render('<p>Table 12 is held.</p>');

    expect([
      modal.shadowRoot.querySelector('[part="title"]').textContent.trim(),
      modal.shadowRoot.querySelector('dialog').getAttribute('aria-label'),
    ]).toEqual(['', 'Dialog']);
  });
});
