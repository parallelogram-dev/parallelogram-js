import { userEvent } from 'vitest/browser';

/**
 * Move the pointer clear of whatever a test has rendered, before it reads a colour
 *
 * A runner starts with the pointer at the top left, over the first thing a test puts on the
 * page, so an element's hover colours read as its resting ones. A developer's pointer rests
 * wherever the mouse was left, which is why that only fails on CI.
 */
export async function parkPointer() {
  const corner = document.createElement('div');
  corner.style.cssText = 'position:fixed;right:0;bottom:0;width:2rem;height:2rem';
  document.body.append(corner);
  try {
    await userEvent.hover(corner);
  } finally {
    corner.remove();
  }
}
