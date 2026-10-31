import { describe, it, expect } from 'vitest';
import { placeCard } from './placeCard';

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
