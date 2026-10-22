import { describe, it, expect } from 'vitest';
import { placeTooltip } from './placeTooltip';

const vp = { width: 400, height: 300 };
const size = { width: 120, height: 80 };

describe('placeTooltip', () => {
  it('prefers above-right of the anchor', () => {
    expect(placeTooltip({ x: 100, y: 200 }, size, vp)).toEqual({ left: 114, top: 106, side: 'above' });
  });
  it('flips below when there is no room above', () => {
    const p = placeTooltip({ x: 100, y: 30 }, size, vp);
    expect(p.side).toBe('below');
    expect(p.top).toBe(44);
  });
  it('flips left near the right edge and clamps inside the viewport', () => {
    const p = placeTooltip({ x: 390, y: 290 }, size, vp);
    expect(p.left).toBe(390 - 14 - 120);
    expect(p.top + size.height).toBeLessThanOrEqual(vp.height - 8);
  });
});
