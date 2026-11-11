import { describe, it, expect } from 'vitest';
import { nextMarkerArea, padArea, isInArea, isValidArea, type Area } from './markerArea';

const view: Area = { south: 41, west: 20, north: 42, east: 21 };

describe('markerArea', () => {
  it('pads the viewport by a viewport on every side', () => {
    expect(padArea(view, 1)).toEqual({ south: 40, west: 19, north: 43, east: 22 });
  });

  it('starts from the padded viewport', () => {
    expect(nextMarkerArea(null, view)).toEqual(padArea(view));
  });

  it('keeps the same area (same object) for a pan that stays inside it', () => {
    const area = nextMarkerArea(null, view)!;
    const panned: Area = { south: 41.5, west: 20.5, north: 42.5, east: 21.5 };
    expect(nextMarkerArea(area, panned)).toBe(area);
  });

  it('moves the area when the view leaves it', () => {
    const area = nextMarkerArea(null, view)!;
    const far: Area = { south: 44, west: 25, north: 45, east: 26 };
    expect(nextMarkerArea(area, far)).toEqual(padArea(far));
  });

  it('grows with a zoom out and shrinks back after zooming in, so memory is let go', () => {
    const wide: Area = { south: 35, west: 13, north: 48, east: 30 };
    const big = nextMarkerArea(nextMarkerArea(null, view), wide)!;
    expect(big).toEqual(padArea(wide));
    const close: Area = { south: 41.5, west: 20.5, north: 41.6, east: 20.6 };
    expect(nextMarkerArea(big, close)).toEqual(padArea(close));
  });

  it('ignores a broken viewport', () => {
    const area = nextMarkerArea(null, view);
    expect(nextMarkerArea(area, { south: NaN, west: 0, north: 1, east: 1 })).toBe(area);
    expect(isValidArea({ south: 2, west: 0, north: 1, east: 1 })).toBe(false);
  });

  it('says which listings are in the area', () => {
    const area = padArea(view);
    expect(isInArea(area, 41.5, 20.5)).toBe(true);
    expect(isInArea(area, 50, 20.5)).toBe(false);
  });
});
