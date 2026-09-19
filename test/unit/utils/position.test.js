import { describe, expect, it } from 'vitest';
import { placeBeside } from '../../../src/utils/position.js';

const anchor = { left: 300, top: 200, width: 100, height: 40, right: 400, bottom: 240 };
const size = { width: 160, height: 60 };
const viewport = { width: 1000, height: 800 };

describe('placing a panel beside an anchor', () => {
  it('centres a top placement over the anchor and points the arrow at its middle', () => {
    expect(placeBeside(anchor, size, { placement: 'top', offset: 8, viewport })).toEqual({
      side: 'top',
      align: 'center',
      left: 270,
      top: 132,
      arrow: 80,
    });
  });

  it('aligns a bottom-start placement to the anchor’s left edge, and bottom-end to its right', () => {
    expect([
      placeBeside(anchor, size, { placement: 'bottom-start', offset: 4, viewport }),
      placeBeside(anchor, size, { placement: 'bottom-end', offset: 4, viewport }),
    ]).toEqual([
      { side: 'bottom', align: 'start', left: 300, top: 244, arrow: 50 },
      { side: 'bottom', align: 'end', left: 240, top: 244, arrow: 110 },
    ]);
  });

  it('flips to the opposite side when the asked side has no room, and stays put when neither has', () => {
    const nearTop = { ...anchor, top: 10, bottom: 50 };
    const tall = { width: 160, height: 780 };

    expect([
      placeBeside(nearTop, size, { placement: 'top', offset: 8, viewport }).side,
      placeBeside(anchor, tall, { placement: 'top', offset: 8, viewport }).side,
    ]).toEqual(['bottom', 'top']);
  });

  it('keeps the panel inside the viewport margin and moves the arrow so it still points at the anchor', () => {
    const atEdge = { ...anchor, left: 980, right: 1080 };

    expect(placeBeside(atEdge, size, { placement: 'top', offset: 8, margin: 8, viewport })).toEqual(
      {
        side: 'top',
        align: 'center',
        left: 832,
        top: 132,
        arrow: 198,
      }
    );
  });

  it('places left and right beside the anchor, centred on it', () => {
    expect([
      placeBeside(anchor, size, { placement: 'left', offset: 8, viewport }),
      placeBeside(anchor, size, { placement: 'right-start', offset: 8, viewport }),
    ]).toEqual([
      { side: 'left', align: 'center', left: 132, top: 190, arrow: 30 },
      { side: 'right', align: 'start', left: 408, top: 200, arrow: 20 },
    ]);
  });
});
