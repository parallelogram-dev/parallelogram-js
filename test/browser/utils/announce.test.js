import { afterEach, describe, expect, it, vi } from 'vitest';
import { announce } from '../../../src/utils/announce.js';
import '../../../src/components/PModal.js';

const liveRegion = () => document.querySelector('[data-parallelogram-announcer][role="status"]');

const openDialog = () => {
  const dialog = document.createElement('dialog');
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
};

describe('announce', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('announces in the body when no modal is open', async () => {
    announce('Copied');

    await vi.waitFor(() =>
      expect([liveRegion()?.parentNode === document.body, liveRegion()?.textContent]).toEqual([
        true,
        'Copied',
      ])
    );
  });

  it('announces inside a modal dialog while it is open', async () => {
    const dialog = openDialog();

    announce('Copied');

    await vi.waitFor(() =>
      expect([liveRegion()?.parentNode === dialog, liveRegion()?.textContent]).toEqual([
        true,
        'Copied',
      ])
    );
  });

  it('announces in the body again once the modal dialog closes', async () => {
    const dialog = openDialog();
    announce('Copied');
    dialog.close();

    announce('Saved');

    await vi.waitFor(() =>
      expect([liveRegion()?.parentNode === document.body, liveRegion()?.textContent]).toEqual([
        true,
        'Saved',
      ])
    );
  });

  it('announces inside the dialog of an open p-modal', async () => {
    const modal = document.createElement('p-modal');
    modal.innerHTML = '<h2 slot="title">Share</h2><p>Link</p>';
    document.body.append(modal);
    modal.open();

    announce('Copied');

    const dialog = modal.shadowRoot.querySelector('dialog');
    await vi.waitFor(() =>
      expect([
        liveRegion()?.assignedSlot?.closest('dialog') === dialog,
        liveRegion()?.textContent,
      ]).toEqual([true, 'Copied'])
    );
  });
});
