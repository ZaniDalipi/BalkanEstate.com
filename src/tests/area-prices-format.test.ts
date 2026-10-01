import { describe, it, expect } from 'vitest';
import {
  colorFor,
  AREA_COLORS,
  fmtCompactEur,
  fmtDistance,
  fmtQuarter,
} from '@/src/features/property-details/components/area-prices/format';

describe('neighbourhood price formatting', () => {
  it('shortens prices for map pins', () => {
    expect(fmtCompactEur(950)).toBe('€950');
    expect(fmtCompactEur(1_500)).toBe('€1.5k');
    expect(fmtCompactEur(85_000)).toBe('€85k');
    expect(fmtCompactEur(1_250_000)).toBe('€1.3M');
    expect(fmtCompactEur(2_000_000)).toBe('€2M');
    expect(fmtCompactEur(12_000_000)).toBe('€12M');
  });

  it('writes distances in metres up close and kilometres further out', () => {
    expect(fmtDistance(4)).toBe('10 m');
    expect(fmtDistance(347)).toBe('350 m');
    expect(fmtDistance(1840)).toBe('1.8 km');
  });

  it('labels quarters compactly', () => {
    expect(fmtQuarter('2026-Q3')).toBe("Q3 '26");
  });

  it('gives sold and rented homes the same colour, distinct from homes for sale', () => {
    expect(colorFor('active')).toBe(AREA_COLORS.active);
    expect(colorFor('sold')).toBe(AREA_COLORS.closed);
    expect(colorFor('rented')).toBe(AREA_COLORS.closed);
  });
});
