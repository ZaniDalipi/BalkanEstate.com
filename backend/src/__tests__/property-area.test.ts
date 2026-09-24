process.env.SKIP_TEST_DB = 'true';

/**
 * `resolveTotalArea` — the backend's copy of the total-area backfill.
 *
 * Mirrors `src/tests/property-area.test.ts` on the client. The schema
 * requires `sqft`, so a listing whose seller filled an apartment's gross and
 * net area (or a villa's plot and build) and left the separate total-area box
 * empty used to be stored with `sqft: 0` — a real measurement on the record,
 * printed as "0 m²" on every page that read it. `Property.ts`'s pre-validate
 * hook calls this on every write; these tests pin what it should compute.
 */

import { resolveTotalArea } from '../config/propertyArea';

describe('resolveTotalArea', () => {
  it('keeps sqft as-is when it is a real measurement', () => {
    expect(resolveTotalArea('apartment', { sqft: 79, grossArea: 101 })).toBe(79);
  });

  it("backfills an apartment's total area from gross, then net", () => {
    expect(resolveTotalArea('apartment', { sqft: 0, grossArea: 101.5, netArea: 87.25 })).toBe(101.5);
    expect(resolveTotalArea('apartment', { sqft: 0, netArea: 87.25 })).toBe(87.25);
  });

  it("prefers a villa's built area over its plot", () => {
    expect(resolveTotalArea('villa', { sqft: 0, landArea: 5550.5, buildingArea: 220 })).toBe(220);
    expect(resolveTotalArea('luxury-villa', { sqft: 0, landArea: 5550.5 })).toBe(5550.5);
  });

  it('describes a house by the same pair as a villa', () => {
    expect(resolveTotalArea('house', { sqft: 0, landArea: 600, buildingArea: 140 })).toBe(140);
    expect(resolveTotalArea('house', { sqft: 0, landArea: 600 })).toBe(600);
  });

  it("backfills a shop's total area from its open-plan floor", () => {
    expect(resolveTotalArea('commercial', { sqft: 0, openPlanArea: 102.5 })).toBe(102.5);
  });

  it('has nothing to backfill from for a parking space or a plot of land', () => {
    expect(resolveTotalArea('house', { sqft: 0 })).toBe(0);
    expect(resolveTotalArea('parking', { sqft: 0, parking: 2 })).toBe(0);
    expect(resolveTotalArea('land', { sqft: 0, landArea: 400 })).toBe(0);
  });

  it('ignores a negative or non-numeric breakdown value', () => {
    expect(resolveTotalArea('apartment', { sqft: 0, grossArea: -5 })).toBe(0);
    expect(resolveTotalArea('apartment', { sqft: 0, grossArea: 'a lot' })).toBe(0);
  });
});
