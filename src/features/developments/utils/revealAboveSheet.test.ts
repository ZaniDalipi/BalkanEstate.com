import { describe, it, expect } from 'vitest';
import { revealDelta } from './revealAboveSheet';

describe('revealDelta', () => {
  it('puts the apartment’s middle in the space above the sheet', () => {
    // 800px screen: middle at 22% = 176px. A 40px tile at 500 has its middle at 520 → scroll 344 down.
    expect(revealDelta({ top: 500, height: 40 }, 800, 360)).toBe(344);
    // Already above: scrolls up to the same spot.
    expect(revealDelta({ top: 50, height: 40 }, 800, 360)).toBe(-106);
  });

  it('lines up something taller than the free space by its top', () => {
    expect(revealDelta({ top: 300, height: 500 }, 800, 360)).toBe(292);
  });
});
