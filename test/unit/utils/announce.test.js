import { afterEach, describe, expect, it } from 'vitest';
import { announce } from '../../../src/utils/announce.js';

const liveRegion = () => document.querySelector('[data-parallelogram-announcer][role="status"]');

const openModal = () => {
  const modal = document.createElement('p-modal');
  modal.setAttribute('open', '');
  document.body.append(modal);
  return modal;
};

describe('announce', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('places its live region inside an open p-modal', () => {
    const modal = openModal();

    announce('Copied');

    expect(liveRegion()?.parentNode).toBe(modal);
  });

  it('places its live region back in the body once the p-modal closes', () => {
    const modal = openModal();
    announce('Copied');
    modal.removeAttribute('open');

    announce('Saved');

    expect(liveRegion()?.parentNode).toBe(document.body);
  });
});
