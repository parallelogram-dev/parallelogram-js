/**
 * Whether the user has asked the operating system to minimise non-essential motion
 */
export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Resolve once an element's own CSS animations and transitions have finished
 *
 * Resolves straight away when nothing is animating (the class defines no animation, or the element
 * is hidden). Otherwise it resolves when the animations finish or are cancelled, and no later than
 * shortly after the longest one should end, so an animation that never finishes cannot stall the
 * caller.
 *
 * @param {Element} element
 * @param {Object} [options]
 * @param {number} [options.fallback=1000] Longest wait in milliseconds when no running animation
 *   has a finite end time
 * @returns {Promise<void>}
 */
export function whenAnimationsFinish(element, { fallback = 1000 } = {}) {
  const animations = element.getAnimations?.() ?? [];
  if (animations.length === 0) {
    return Promise.resolve();
  }

  const endTimes = animations
    .map(animation => animation.effect?.getComputedTiming().endTime)
    .filter(Number.isFinite);
  const timeout = endTimes.length > 0 ? Math.max(...endTimes) + 250 : fallback;

  let timer;
  return Promise.race([
    Promise.allSettled(animations.map(animation => animation.finished)),
    new Promise(resolve => {
      timer = setTimeout(resolve, timeout);
    }),
  ]).then(() => clearTimeout(timer));
}
