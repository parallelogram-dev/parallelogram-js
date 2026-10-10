/**
 * Drive a drag with pointer events, a step at a time
 *
 * userEvent.dragAndDrop() presses, jumps to the target and lets go, so a sortable list never sees
 * the pointer pass the items between and never reorders. These dispatch the same pointer events a
 * mouse or finger would, along the way, waiting a frame after each step as a browser would.
 */

export const nextFrames = async (count = 2) => {
  for (let i = 0; i < count; i++) {
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
  }
};

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const centre = element => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const pointer = (target, type, x, y, pointerType) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType,
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
    })
  );

/**
 * Press on `from`, move to `to` in steps and let go
 *
 * @param {Element} from
 * @param {Element|{x: number, y: number}} to - An element, whose centre is the target, or a point
 * @param {Object} [options]
 * @param {number} [options.dy=0] - Pixels below the target's centre to end at
 * @param {number} [options.steps=10]
 * @param {'mouse'|'touch'|'pen'} [options.pointerType='mouse']
 * @param {number} [options.hold=0] - Milliseconds to rest before moving, as a finger does
 * @param {() => unknown} [options.during] - Called before letting go
 */
export async function drag(
  from,
  to,
  { dy = 0, steps = 10, pointerType = 'mouse', hold = 0, during } = {}
) {
  const start = centre(from);
  const end = to instanceof Element ? centre(to) : { ...to };
  end.y += dy;

  pointer(from, 'pointerdown', start.x, start.y, pointerType);
  await wait(hold);
  await nextFrames(1);
  for (let i = 1; i <= steps; i++) {
    const x = start.x + ((end.x - start.x) * i) / steps;
    const y = start.y + ((end.y - start.y) * i) / steps;
    pointer(document, 'pointermove', x, y, pointerType);
    await nextFrames(1);
  }
  await during?.();
  await nextFrames();
  pointer(document, 'pointerup', end.x, end.y, pointerType);
  await nextFrames();
}

/** Press and let go without moving */
export async function press(element, { hold = 0, pointerType = 'mouse' } = {}) {
  const { x, y } = centre(element);
  pointer(element, 'pointerdown', x, y, pointerType);
  await wait(hold);
  pointer(document, 'pointerup', x, y, pointerType);
  await nextFrames();
}
