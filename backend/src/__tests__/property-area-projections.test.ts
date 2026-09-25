process.env.SKIP_TEST_DB = 'true';

/**
 * The hand-built responses, which sanitizeProperty never sees.
 *
 * The agency dashboard, the analytics export, the share card and the alert
 * emails each build their own payload from a `.select()` projection. A
 * projection returns only the fields it names, so one that asked for `sqft`
 * alone had no breakdown left to resolve from and served the stored figure —
 * an agency reading its own villa as 500 m² while the public page said 1500.
 *
 * Two things keep those in line, and both are asserted here: the projection
 * names the area fields (via AREA_SELECT), and the payload resolves the total
 * the same way every other surface does.
 */

import fs from 'fs';
import path from 'path';
import { AREA_FIELDS, AREA_SELECT, resolveTotalArea } from '../config/propertyArea';

const read = (file: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('AREA_SELECT names everything the rule reads', () => {
  it('covers the breakdown, the stored total and the type', () => {
    expect(AREA_FIELDS).toEqual(
      expect.arrayContaining(['propertyType', 'sqft', 'grossArea', 'netArea', 'landArea', 'buildingArea', 'openPlanArea'])
    );
    for (const field of AREA_FIELDS) expect(AREA_SELECT.split(' ')).toContain(field);
  });

  it('resolves a villa from a projection that included those fields', () => {
    // What the agency dashboard now holds for the Resen villa.
    const projected = { propertyType: 'luxury-villa', sqft: 500, landArea: 1500, buildingArea: 500 };
    expect(resolveTotalArea(projected.propertyType, projected)).toBe(1500);
  });
});

describe('every hand-built listing payload resolves its own total', () => {
  const surfaces: Array<[string, string]> = [
    ['the agency dashboard and its export', 'controllers/agencyDashboardController.ts'],
    ['the share card', 'controllers/ogController.ts'],
    ['the generated video', 'controllers/videoController.ts'],
    ['the alert emails', 'jobs/propertyAlertsJob.ts'],
  ];

  for (const [name, file] of surfaces) {
    it(`${name} states a resolved size, never a raw field`, () => {
      const source = read(file);

      expect(source).toContain('resolveTotalArea');
      // No payload may assign the stored field straight through.
      expect(source).not.toMatch(/sqft:\s*(property|p|row)\.sqft\b/);
    });
  }

  it('projections that narrow the fields still ask for the area ones', () => {
    for (const [, file] of surfaces) {
      const source = read(file);
      if (/\.select\(|\.populate\(/.test(source)) {
        expect(source.includes('AREA_SELECT')).toBe(true);
      }
    }
  });
});
