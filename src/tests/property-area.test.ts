/**
 * A listing's total area, combined from its type-specific breakdown.
 *
 * The bug this pins: an apartment quoted 79 m² gross / 70 m² net, or a villa
 * quoted its plot and its build, whose separate total-area box was left
 * blank, used to have `sqft` stored as a literal 0 and printed everywhere as
 * "0 m²" next to numbers that said otherwise. `resolveDisplayArea` is the one
 * place that decides what to show instead, mirrored server-side by
 * `resolveTotalArea` in `backend/src/config/propertyArea.ts` — these tests
 * cover the client copy and assert the two agree.
 */

import { describe, it, expect } from 'vitest';
import { resolveDisplayArea, resolveTotalArea, typeHasMeasuredBreakdown } from '@/shared/property/area';
import { resolveTotalArea as resolveTotalAreaBackend } from '@/backend/src/config/propertyArea';

describe('resolveDisplayArea', () => {
  it('uses sqft as-is when it is a real measurement', () => {
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 79, grossArea: 101 }))
      .toEqual({ value: 79, source: 'sqft' });
  });

  it("falls back to an apartment's gross area, then net, when sqft is 0", () => {
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, grossArea: 79, netArea: 70 }))
      .toEqual({ value: 79, source: 'grossArea' });

    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, netArea: 70 }))
      .toEqual({ value: 70, source: 'netArea' });
  });

  it("falls back to a villa's building area before its land area", () => {
    expect(resolveDisplayArea({ propertyType: 'villa', sqft: 0, landArea: 5550.5, buildingArea: 220 }))
      .toEqual({ value: 220, source: 'buildingArea' });

    expect(resolveDisplayArea({ propertyType: 'luxury-villa', sqft: undefined, landArea: 5550.5 }))
      .toEqual({ value: 5550.5, source: 'landArea' });
  });

  it("falls back to a shop's open-plan area", () => {
    expect(resolveDisplayArea({ propertyType: 'commercial', sqft: 0, openPlanArea: 102.5 }))
      .toEqual({ value: 102.5, source: 'openPlanArea' });
  });

  it('has nothing to fall back to for a house, a parking space or a plot of land', () => {
    expect(resolveDisplayArea({ propertyType: 'house', sqft: 0 })).toBeNull();
    expect(resolveDisplayArea({ propertyType: 'parking', sqft: 0, parking: 1 })).toBeNull();
    expect(resolveDisplayArea({ propertyType: 'land', sqft: 0, landArea: 400 })).toBeNull();
  });

  it('treats a negative or non-numeric area as no measurement at all', () => {
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, grossArea: -5 })).toBeNull();
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, grossArea: 'a lot' })).toBeNull();
    expect(resolveDisplayArea(null)).toBeNull();
  });
});

describe('resolveTotalArea', () => {
  it('is the plain-number form of resolveDisplayArea, defaulting to 0', () => {
    expect(resolveTotalArea({ propertyType: 'apartment', sqft: 0, grossArea: 79 })).toBe(79);
    expect(resolveTotalArea({ propertyType: 'parking', sqft: 0 })).toBe(0);
  });
});

describe('typeHasMeasuredBreakdown', () => {
  it('is true for the types the form asks for their own measurements', () => {
    expect(typeHasMeasuredBreakdown('apartment')).toBe(true);
    expect(typeHasMeasuredBreakdown('villa')).toBe(true);
    expect(typeHasMeasuredBreakdown('luxury-villa')).toBe(true);
    expect(typeHasMeasuredBreakdown('commercial')).toBe(true);
    expect(typeHasMeasuredBreakdown('other')).toBe(true);
  });

  it('is false for the types shown a single plain area box', () => {
    expect(typeHasMeasuredBreakdown('house')).toBe(false);
    expect(typeHasMeasuredBreakdown('parking')).toBe(false);
    expect(typeHasMeasuredBreakdown('land')).toBe(false);
    expect(typeHasMeasuredBreakdown('nonsense')).toBe(true); // unknown reads as 'other'
  });

  it('agrees with the types that have a fallback to resolve from', () => {
    // The form hides the generic box exactly where the resolver has
    // something to fall back to; a type where those two disagreed would
    // either be asked nothing, or asked twice.
    for (const propertyType of ['apartment', 'villa', 'luxury-villa', 'commercial']) {
      expect(typeHasMeasuredBreakdown(propertyType), propertyType).toBe(true);
      expect(resolveDisplayArea({ propertyType, sqft: 0, grossArea: 50, buildingArea: 50, openPlanArea: 50 }))
        .not.toBeNull();
    }
  });
});

describe('the client and server resolvers agree', () => {
  const cases: Array<[unknown, Record<string, unknown>]> = [
    ['apartment', { sqft: 0, grossArea: 101.5, netArea: 87.25 }],
    ['apartment', { sqft: 0, netArea: 87.25 }],
    ['villa', { sqft: 0, landArea: 5550.5, buildingArea: 516 }],
    ['luxury-villa', { sqft: 0, landArea: 5550.5 }],
    ['commercial', { sqft: 0, openPlanArea: 102.5 }],
    ['parking', { sqft: 0, parking: 2 }],
    ['land', { sqft: 0, landArea: 400 }],
    ['house', { sqft: 120 }],
  ];

  for (const [propertyType, input] of cases) {
    it(`for ${propertyType} (${JSON.stringify(input)})`, () => {
      expect(resolveTotalArea({ propertyType, ...input }))
        .toBe(resolveTotalAreaBackend(propertyType, input));
    });
  }
});
