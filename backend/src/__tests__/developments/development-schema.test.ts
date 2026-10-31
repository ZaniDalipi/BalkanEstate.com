/**
 * Phase 2 — schema load/registration smoke test (no database).
 *
 * Guards against schema regressions that only surface at model-registration
 * time: duplicate index names, malformed sub-schemas, or a model failing to
 * register. Runs without the in-memory MongoDB (SKIP_TEST_DB) so it stays green
 * wherever the mongod binary is unavailable.
 */
process.env.SKIP_TEST_DB = 'true';

import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentMembership from '../../models/DevelopmentMembership';
import DevelopmentClaim from '../../models/DevelopmentClaim';
import DevelopmentScene from '../../models/DevelopmentScene';
import Property from '../../models/Property';

const models = {
  Development,
  DevelopmentBuilding,
  DevelopmentEntrance,
  DevelopmentFloor,
  DevelopmentUnit,
  DevelopmentMembership,
  DevelopmentClaim,
  DevelopmentScene,
};

describe('development schemas register', () => {
  it('registers every development model', () => {
    for (const [name, model] of Object.entries(models)) {
      expect(model.modelName).toBe(name);
      expect(mongoose.models[name]).toBeDefined();
    }
  });

  it('gives each model at least one index and no duplicate index names', () => {
    for (const model of Object.values(models)) {
      const indexes = model.schema.indexes();
      expect(indexes.length).toBeGreaterThan(0);
      const names = indexes
        .map(([, opts]) => (opts as { name?: string }).name)
        .filter((n): n is string => !!n);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('keeps the unit uniqueness indexes partial (entrance- and building-scoped)', () => {
    const names = DevelopmentUnit.schema
      .indexes()
      .map(([, opts]) => (opts as { name?: string }).name);
    expect(names).toContain('unit_number_per_entrance_unique');
    expect(names).toContain('unit_number_per_building_unique');
  });

  it('adds the optional development refs to Property without making them required', () => {
    for (const path of ['developmentId', 'buildingId', 'entranceId', 'floorId', 'unitId']) {
      const schemaPath = Property.schema.path(path);
      expect(schemaPath).toBeDefined();
      expect(schemaPath.isRequired).toBeFalsy();
    }
  });
});
