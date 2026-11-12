import { describe, it, expect } from 'vitest';
import { isDrawnArea } from './drawTip';

describe('isDrawnArea', () => {
  it('accepts a real rectangle', () => {
    expect(isDrawnArea({ north: 42.1, south: 41.9, east: 21.4, west: 21.0 })).toBe(true);
  });
  it('rejects a tap, a hairline and bad numbers', () => {
    expect(isDrawnArea(null)).toBe(false);
    expect(isDrawnArea({ north: 42, south: 42, east: 21.4, west: 21 })).toBe(false);
    expect(isDrawnArea({ north: 42.1, south: 41.9, east: 21, west: 21 })).toBe(false);
    expect(isDrawnArea({ north: NaN, south: 41.9, east: 21.4, west: 21 })).toBe(false);
  });
});
