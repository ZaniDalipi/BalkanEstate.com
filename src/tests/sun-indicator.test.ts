import { describe, it, expect } from 'vitest';
import { screenFraction } from '../features/map/components/SunIndicator';

// 0 = left edge of the sun's track, 1 = right edge
describe('SunIndicator screenFraction', () => {
  it('puts the morning sun on the right when the camera faces north', () => {
    // Tirana, 23 Jan 08:03 — sun at 126° (SE), shadows fall NW (up-left)
    expect(screenFraction(126, 0)).toBeGreaterThan(0.85);
  });

  it('puts the evening sun on the left when the camera faces north', () => {
    expect(screenFraction(240, 0)).toBeLessThan(0.1);
  });

  it('centres a sun directly ahead of or behind the camera', () => {
    expect(screenFraction(180, 0)).toBeCloseTo(0.5, 5);
    expect(screenFraction(180, 180)).toBeCloseTo(0.5, 5);
  });

  it('flips sides when the camera turns to face south', () => {
    expect(screenFraction(126, 180)).toBeLessThan(0.5);
    expect(screenFraction(240, 180)).toBeGreaterThan(0.5);
  });

  it('always sits opposite the side shadows fall towards', () => {
    for (let bearing = 0; bearing < 360; bearing += 30) {
      for (let az = 60; az <= 300; az += 20) {
        // Shadow points to az + 180; its sideways screen component has the
        // opposite sign to the sun's
        const sunSide = screenFraction(az, bearing) - 0.5;
        const shadowSide = screenFraction(az + 180, bearing) - 0.5;
        if (Math.abs(sunSide) > 1e-9) expect(Math.sign(sunSide)).toBe(-Math.sign(shadowSide));
      }
    }
  });
});
