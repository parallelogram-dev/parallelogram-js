import { getOpenModal } from './modal.js';

const regions = new Map();

const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

/**
 * Announce a message to assistive technology through a shared, visually hidden live region
 *
 * One region per politeness level is created on first use and reused. Each announcement places the
 * region inside the open `<p-modal>` or modal `<dialog>`, if there is one, since the rest of the page
 * is inert and isn't spoken, and in `document.body` otherwise. The text is cleared and set again on
 * the next frame, once the region is in place, so repeating the same message is announced again.
 *
 * @param {string} message
 * @param {Object} [options]
 * @param {'polite'|'assertive'} [options.politeness='polite']
 */
export function announce(message, { politeness = 'polite' } = {}) {
  let region = regions.get(politeness);

  if (!region) {
    region = document.createElement('div');
    region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-parallelogram-announcer', '');
    Object.assign(region.style, VISUALLY_HIDDEN);
    regions.set(politeness, region);
  }

  const container = getOpenModal() ?? document.body;
  if (region.parentNode !== container) {
    container.append(region);
  }

  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
