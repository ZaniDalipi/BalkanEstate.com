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
import {
  resolveDisplayArea,
  resolveTotalArea,
  typeHasMeasuredBreakdown,
} from '@/shared/property/area';
import { resolveTotalArea as resolveTotalAreaBackend } from '@/backend/src/config/propertyArea';

describe('resolveDisplayArea', () => {
  it('uses sqft when the type has no breakdown to prefer', () => {
    expect(resolveDisplayArea({ propertyType: 'parking', sqft: 18 }))
      .toEqual({ value: 18, source: 'sqft' });
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 79 }))
      .toEqual({ value: 79, source: 'sqft' });
  });

  it("falls back to an apartment's gross area, then net, when sqft is 0", () => {
    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, grossArea: 79, netArea: 70 }))
      .toEqual({ value: 79, source: 'grossArea' });

    expect(resolveDisplayArea({ propertyType: 'apartment', sqft: 0, netArea: 70 }))
      .toEqual({ value: 70, source: 'netArea' });
  });

  it("falls back to a villa's land area before its building area", () => {
    expect(resolveDisplayArea({ propertyType: 'villa', sqft: 0, landArea: 5550.5, buildingArea: 220 }))
      .toEqual({ value: 5550.5, source: 'landArea' });

    expect(resolveDisplayArea({ propertyType: 'luxury-villa', sqft: undefined, buildingArea: 516 }))
      .toEqual({ value: 516, source: 'buildingArea' });
  });

  it("falls back to a shop's open-plan area", () => {
    expect(resolveDisplayArea({ propertyType: 'commercial', sqft: 0, openPlanArea: 102.5 }))
      .toEqual({ value: 102.5, source: 'openPlanArea' });
  });

  it("falls back to a house's whole plot before its building area", () => {
    expect(resolveDisplayArea({ propertyType: 'house', sqft: 0, landArea: 600, buildingArea: 140 }))
      .toEqual({ value: 600, source: 'landArea' });
  });

  it('has nothing to fall back to for a parking space or a plot of land', () => {
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

describe('one precedence, reading and writing alike', () => {
  it('prefers the breakdown a seller can see over the total they cannot', () => {
    // The stored total loses on both sides now: for a type with a breakdown
    // the form never showed that box, so it cannot outrank the fields it did.
    const record = { propertyType: 'apartment', sqft: 79, grossArea: 85 };
    expect(resolveTotalArea(record)).toBe(85);
    expect(resolveDisplayArea(record)).toEqual({ value: 85, source: 'grossArea' });
  });

  it('shows a villa its plot even when an older total says otherwise', () => {
    // The listing from the screenshot: 1500 m² of land, a 500 m² house on it,
    // and a stored total of 500 written when the priority ran the other way.
    const villa = { propertyType: 'luxury-villa', sqft: 500, landArea: 1500, buildingArea: 500 };
    expect(resolveDisplayArea(villa)).toEqual({ value: 1500, source: 'landArea' });
  });

  it('keeps the total when the breakdown was never filled in', () => {
    expect(resolveTotalArea({ propertyType: 'apartment', sqft: 79 })).toBe(79);
    expect(resolveTotalArea({ propertyType: 'house', sqft: 150 })).toBe(150);
  });

  it('is just the total for a type with no breakdown at all', () => {
    expect(resolveTotalArea({ propertyType: 'parking', sqft: 18 })).toBe(18);
    expect(resolveTotalArea({ propertyType: 'parking' })).toBe(0);
  });
});

describe('typeHasMeasuredBreakdown', () => {
  it('is true for the types the form asks for their own measurements', () => {
    expect(typeHasMeasuredBreakdown('apartment')).toBe(true);
    // A house stands on a plot and is built over part of it, same as a villa.
    expect(typeHasMeasuredBreakdown('house')).toBe(true);
    expect(typeHasMeasuredBreakdown('villa')).toBe(true);
    expect(typeHasMeasuredBreakdown('luxury-villa')).toBe(true);
    expect(typeHasMeasuredBreakdown('commercial')).toBe(true);
    expect(typeHasMeasuredBreakdown('other')).toBe(true);
  });

  it('is false only for the types with nothing but a plain area box', () => {
    expect(typeHasMeasuredBreakdown('parking')).toBe(false);
    expect(typeHasMeasuredBreakdown('land')).toBe(false);
    expect(typeHasMeasuredBreakdown('nonsense')).toBe(true); // unknown reads as 'other'
  });

  it('agrees with the types that have a fallback to resolve from', () => {
    // The form hides the generic box exactly where the resolver has
    // something to fall back to; a type where those two disagreed would
    // either be asked nothing, or asked twice.
    for (const propertyType of ['apartment', 'house', 'villa', 'luxury-villa', 'commercial']) {
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
    ['house', { sqft: 0, landArea: 600, buildingArea: 140 }],
    ['villa', { sqft: 0, buildingArea: 516 }],
  ];

  for (const [propertyType, input] of cases) {
    it(`for ${propertyType} (${JSON.stringify(input)})`, () => {
      expect(resolveTotalArea({ propertyType, ...input }))
        .toBe(resolveTotalAreaBackend(propertyType, input));
    });
  }
});
