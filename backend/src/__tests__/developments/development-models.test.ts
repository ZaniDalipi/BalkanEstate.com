import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';
import Property from '../../models/Property';

/**
 * Phase 2 — data foundation. These tests pin the invariants the rest of the
 * feature relies on: development slug uniqueness (reusable after soft-delete),
 * entrance- vs building-scoped unit-number uniqueness, scene hotspot coordinate
 * validation, and — crucially — that Property stays backward compatible while
 * refusing a half-linked development reference.
 */

const oid = () => new mongoose.Types.ObjectId();

const baseDevelopment = (overrides: Record<string, unknown> = {}) => ({
  ownerId: oid(),
  ownerType: 'user' as const,
  name: 'Seaside Residences',
  slug: 'seaside-residences',
  country: 'Montenegro',
  city: 'Budva',
  category: 'residential_towers' as const,
  ...overrides,
});

const baseUnit = (overrides: Record<string, unknown> = {}) => ({
  developmentId: oid(),
  buildingId: oid(),
  floorId: oid(),
  unitNumber: 'A1',
  unitType: 'apartment',
  ...overrides,
});

// Minimal valid standalone property (mirrors the Property schema's required set).
const baseProperty = (overrides: Record<string, unknown> = {}) => ({
  sellerId: oid(),
  createdByName: 'Jane Agent',
  createdByEmail: 'jane@example.com',
  createdAsRole: 'private_seller' as const,
  listingType: 'sale' as const,
  price: 120000,
  address: '1 Main St',
  city: 'Budva',
  country: 'Montenegro',
  beds: 2,
  baths: 1,
  livingRooms: 1,
  sqft: 75,
  yearBuilt: 2015,
  description: 'A pleasant apartment near the sea.',
  imageUrl: 'https://example.com/img.jpg',
  lat: 42.28,
  lng: 18.84,
  propertyType: 'apartment' as const,
  ...overrides,
});

beforeAll(async () => {
  // Build indexes (incl. partial-unique) before uniqueness assertions.
  await Promise.all([
    Development.init(),
    DevelopmentUnit.init(),
    DevelopmentScene.init(),
    Property.init(),
  ]);
});

describe('Development model', () => {
  it('creates a development with defaults', async () => {
    const dev = await Development.create(baseDevelopment());
    expect(dev.status).toBe('draft');
    expect(dev.constructionStatus).toBe('planned');
    expect(dev.stats.units).toBe(0);
  });

  it('rejects a duplicate slug among live developments', async () => {
    await Development.create(baseDevelopment());
    await expect(Development.create(baseDevelopment())).rejects.toThrow();
  });

  it('frees a slug once the previous development is soft-deleted', async () => {
    const first = await Development.create(baseDevelopment());
    first.deletedAt = new Date();
    await first.save();
    // Same slug is allowed again because the unique index is partial on live docs.
    const second = await Development.create(baseDevelopment());
    expect(second.slug).toBe('seaside-residences');
  });

  it('rejects an unknown category', async () => {
    await expect(
      Development.create(baseDevelopment({ category: 'spaceship' }))
    ).rejects.toThrow();
  });
});

describe('DevelopmentUnit uniqueness', () => {
  it('rejects duplicate unit numbers within the same building (no entrance)', async () => {
    const buildingId = oid();
    await DevelopmentUnit.create(baseUnit({ buildingId, unitNumber: '12' }));
    await expect(
      DevelopmentUnit.create(baseUnit({ buildingId, unitNumber: '12' }))
    ).rejects.toThrow();
  });

  it('allows the same unit number in two different entrances of one building', async () => {
    const buildingId = oid();
    const entranceA = oid();
    const entranceB = oid();
    await DevelopmentUnit.create(
      baseUnit({ buildingId, entranceId: entranceA, unitNumber: '1' })
    );
    const second = await DevelopmentUnit.create(
      baseUnit({ buildingId, entranceId: entranceB, unitNumber: '1' })
    );
    expect(second.unitNumber).toBe('1');
  });

  it('rejects duplicate unit numbers within the same entrance', async () => {
    const buildingId = oid();
    const entranceId = oid();
    await DevelopmentUnit.create(
      baseUnit({ buildingId, entranceId, unitNumber: '1' })
    );
    await expect(
      DevelopmentUnit.create(baseUnit({ buildingId, entranceId, unitNumber: '1' }))
    ).rejects.toThrow();
  });

  it('defaults availability to not_released', async () => {
    const unit = await DevelopmentUnit.create(baseUnit());
    expect(unit.availability).toBe('not_released');
  });
});

describe('DevelopmentScene hotspot coordinates', () => {
  it('accepts normalised 0–1 polygon points', async () => {
    const scene = await DevelopmentScene.create({
      developmentId: oid(),
      targetType: 'floor',
      targetId: oid(),
      imageUrl: 'https://cdn.example.com/floor.jpg',
      imageWidth: 1600,
      imageHeight: 900,
      draft: {
        version: 0,
        hotspots: [
          {
            id: 'h1',
            shape: 'polygon',
            points: [
              [0.1, 0.1],
              [0.4, 0.1],
              [0.4, 0.5],
            ],
            linkType: 'unit',
            linkId: String(oid()),
            z: 0,
          },
        ],
      },
    });
    expect(scene.draft.hotspots).toHaveLength(1);
  });

  it('rejects out-of-range (non-normalised) points', async () => {
    // Every other field is valid, so a rejection can only come from the points.
    await expect(
      DevelopmentScene.create({
        developmentId: oid(),
        targetType: 'building',
        targetId: oid(),
        imageUrl: 'https://cdn.example.com/facade.jpg',
        imageWidth: 800,
        imageHeight: 600,
        draft: {
          version: 0,
          hotspots: [
            {
              id: 'h1',
              shape: 'rect',
              points: [
                [120, 40],
                [300, 500],
              ],
              linkType: 'floor',
              linkId: String(oid()),
              z: 0,
            },
          ],
        },
      })
    ).rejects.toThrow(/points/i);
  });
});

describe('Property development linkage (backward compatible)', () => {
  it('stores a standalone listing with no development refs', async () => {
    const prop = await Property.create(baseProperty());
    expect(prop.developmentId).toBeUndefined();
    expect(prop.unitId).toBeUndefined();
  });

  it('accepts a fully linked listing', async () => {
    const developmentId = oid();
    const prop = await Property.create(
      baseProperty({
        developmentId,
        buildingId: oid(),
        floorId: oid(),
        unitId: oid(),
      })
    );
    expect(String(prop.developmentId)).toBe(String(developmentId));
  });

  it('refuses a half-linked listing (deeper ref without a development)', async () => {
    await expect(
      Property.create(baseProperty({ unitId: oid() }))
    ).rejects.toThrow(/developmentId is required/);
  });
});
