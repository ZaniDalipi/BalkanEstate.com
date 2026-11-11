import { describe, it, expect } from 'vitest';
import { placeCard, placeCardBeside } from './placeCard';

const vp = { width: 1000, height: 800 };
const size = { width: 280, height: 200 };

describe('placeCard', () => {
  it('centres above the region with the arrow on the region centre', () => {
    const p = placeCard({ left: 400, top: 400, width: 200, height: 60 }, size, vp);
    expect(p).toEqual({ left: 360, top: 188, side: 'above', arrowX: 140 });
  });
  it('flips below when there is no room above', () => {
    const p = placeCard({ left: 400, top: 50, width: 200, height: 60 }, size, vp);
    expect(p.side).toBe('below');
    expect(p.top).toBe(122);
  });
  it('clamps at the viewport edge and keeps the arrow pointing at the region', () => {
    const p = placeCard({ left: 960, top: 400, width: 30, height: 30 }, size, vp);
    expect(p.left).toBe(712);
    expect(p.arrowX).toBe(263);
  });
});

describe('placeCardBeside', () => {
  const size = { width: 280, height: 320 };
  const viewport = { width: 1400, height: 900 };

  it('opens on the side with more room, centred on the region, the arrow at its middle', () => {
    const p = placeCardBeside({ left: 900, top: 400, width: 120, height: 60 }, size, viewport);
    expect(p.side).toBe('left');
    expect(p.left).toBe(900 - 14 - 280);
    expect(p.top).toBe(430 - 160);
    expect(p.arrowY).toBe(160);
  });

  it('opens on the right when the region is on the left', () => {
    const p = placeCardBeside({ left: 100, top: 400, width: 120, height: 60 }, size, viewport);
    expect(p.side).toBe('right');
    expect(p.left).toBe(100 + 120 + 14);
  });

  it('stays on screen near the top or bottom, the arrow still on the region', () => {
    const p = placeCardBeside({ left: 900, top: 20, width: 120, height: 40 }, size, viewport);
    expect(p.top).toBe(8);
    expect(p.arrowY).toBe(40 - 8);
  });

  it('falls back to above/below when neither side has room', () => {
    const p = placeCardBeside({ left: 150, top: 500, width: 100, height: 60 }, size, { width: 420, height: 900 });
    expect(['above', 'below']).toContain(p.side);
  });
});
