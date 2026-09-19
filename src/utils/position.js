const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * Where to put a panel beside an anchor, for position: fixed
 *
 * The placement is a side -- top, bottom, left or right -- with an optional alignment along it:
 * `bottom-start` lines the panel's leading edge up with the anchor's, `top-end` its trailing edge,
 * and no alignment centres it. The panel takes the opposite side when the one asked for has no
 * room and the opposite has, and is kept inside the viewport by the margin; `arrow` is where along
 * the panel's edge the anchor's centre falls, so a triangle can keep pointing at it after the
 * panel was moved.
 *
 * @param {{ left: number, top: number, width: number, height: number }} anchor The anchor's rect
 * @param {{ width: number, height: number }} size The panel's size
 * @param {{ placement?: string, offset?: number, margin?: number, viewport?: { width: number, height: number } }} [options]
 * @returns {{ side: 'top'|'bottom'|'left'|'right', align: 'start'|'center'|'end', left: number, top: number, arrow: number }}
 */
export function placeBeside(
  anchor,
  size,
  { placement = 'top', offset = 8, margin = 8, viewport } = {}
) {
  const [asked, align = 'center'] = placement.split('-');
  const view = viewport ?? { width: window.innerWidth, height: window.innerHeight };
  const { width, height } = size;
  const right = anchor.left + anchor.width;
  const bottom = anchor.top + anchor.height;
  const room = {
    top: anchor.top - offset - height >= margin,
    bottom: bottom + offset + height <= view.height - margin,
    left: anchor.left - offset - width >= margin,
    right: right + offset + width <= view.width - margin,
  };
  const side = room[asked] || !room[OPPOSITE[asked]] ? asked : OPPOSITE[asked];
  const vertical = side === 'top' || side === 'bottom';

  /* Along the side: aligned to the anchor's leading edge, trailing edge, or centre */
  const along = (start, length, panel) =>
    align === 'start'
      ? start
      : align === 'end'
        ? start + length - panel
        : start + length / 2 - panel / 2;
  const left = vertical
    ? along(anchor.left, anchor.width, width)
    : side === 'left'
      ? anchor.left - offset - width
      : right + offset;
  const top = vertical
    ? side === 'top'
      ? anchor.top - offset - height
      : bottom + offset
    : along(anchor.top, anchor.height, height);
  const clampedLeft = Math.round(Math.min(Math.max(left, margin), view.width - width - margin));
  const clampedTop = Math.round(Math.min(Math.max(top, margin), view.height - height - margin));
  const arrow = Math.round(
    vertical
      ? anchor.left + anchor.width / 2 - clampedLeft
      : anchor.top + anchor.height / 2 - clampedTop
  );

  return { side, align, left: clampedLeft, top: clampedTop, arrow };
}
