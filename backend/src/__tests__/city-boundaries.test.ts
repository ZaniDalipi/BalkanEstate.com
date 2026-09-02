/**
 * City boundary selection
 *
 * The map can draw exactly one partition of the ground, so this picks between
 * administrative subdivisions and mapped neighbourhood areas. Cities like
 * Tirana map Blloku as `place=neighbourhood`, not as an admin boundary — before
 * place areas were considered, those cities fell back to drawn circles.
 */

import { selectBoundarySet, GeoJSONFeatureCollection } from '../services/geoDataService';

type Feature = GeoJSONFeatureCollection['features'][number];

const square = (offset: number): Feature['geometry'] => ({
  type: 'Polygon',
  coordinates: [[
    [19.8 + offset, 41.3],
    [19.81 + offset, 41.3],
    [19.81 + offset, 41.31],
    [19.8 + offset, 41.31],
    [19.8 + offset, 41.3],
  ]],
});

const adminFeature = (name: string, level: number, index = 0): Feature => ({
  type: 'Feature',
  id: `admin-${name}`,
  properties: { osm_id: index, name, name_en: name, admin_level: level },
  geometry: square(index * 0.02),
});

const placeFeature = (name: string, index = 0): Feature => ({
  type: 'Feature',
  id: `place-${name}`,
  properties: { osm_id: index, name, name_en: name, admin_level: null, place: 'neighbourhood' },
  geometry: square(index * 0.02),
});

const collection = (features: Feature[]): GeoJSONFeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

describe('selectBoundarySet', () => {
  it('returns nothing to draw for an empty response', () => {
    const result = selectBoundarySet(collection([]));

    expect(result.geojson.features).toEqual([]);
  });

  it('prefers administrative subdivisions at a usable granularity', () => {
    const result = selectBoundarySet(collection([
      adminFeature('Njësia 1', 9, 0),
      adminFeature('Njësia 2', 9, 1),
      adminFeature('Njësia 3', 9, 2),
      placeFeature('Blloku', 3),
      placeFeature('Kombinat', 4),
      placeFeature('Don Bosko', 5),
    ]));

    expect(result.source).toBe('admin');
    expect(result.adminLevel).toBe(9);
    expect(result.geojson.features.map(f => f.properties.name))
      .toEqual(['Njësia 1', 'Njësia 2', 'Njësia 3']);
  });

  it('prefers the coarser admin level when several are usable', () => {
    const result = selectBoundarySet(collection([
      adminFeature('District A', 9, 0),
      adminFeature('District B', 9, 1),
      adminFeature('District C', 9, 2),
      adminFeature('Block 1', 10, 3),
      adminFeature('Block 2', 10, 4),
      adminFeature('Block 3', 10, 5),
    ]));

    expect(result.adminLevel).toBe(9);
  });

  it('falls back to mapped neighbourhoods when admin levels are too coarse', () => {
    // One admin boundary is the city itself — nothing to partition.
    const result = selectBoundarySet(collection([
      adminFeature('Tirana', 8, 0),
      placeFeature('Blloku', 1),
      placeFeature('Kombinat', 2),
      placeFeature('Don Bosko', 3),
      placeFeature('Fresku', 4),
    ]));

    expect(result.source).toBe('place');
    expect(result.geojson.features.map(f => f.properties.name))
      .toEqual(['Blloku', 'Kombinat', 'Don Bosko', 'Fresku']);
  });

  it('uses the most populated admin level when neither set is ideal', () => {
    const result = selectBoundarySet(collection([
      adminFeature('Half A', 8, 0),
      adminFeature('Half B', 8, 1),
      placeFeature('Lonely', 2),
    ]));

    expect(result.source).toBe('admin');
    expect(result.geojson.features).toHaveLength(2);
  });

  it('draws a couple of neighbourhoods rather than nothing', () => {
    const result = selectBoundarySet(collection([
      placeFeature('Blloku', 0),
      placeFeature('Kombinat', 1),
    ]));

    expect(result.source).toBe('place');
    expect(result.geojson.features).toHaveLength(2);
  });

  it('caps a runaway number of areas so the map stays legible', () => {
    const many = Array.from({ length: 200 }, (_, i) => placeFeature(`Area ${i}`, i));

    const result = selectBoundarySet(collection(many));

    expect(result.source).toBe('place');
    expect(result.geojson.features.length).toBeLessThanOrEqual(60);
  });

  it('ignores an admin level with too many features to read', () => {
    const many = Array.from({ length: 120 }, (_, i) => adminFeature(`Block ${i}`, 10, i));

    const result = selectBoundarySet(collection([
      ...many,
      placeFeature('Blloku', 200),
      placeFeature('Kombinat', 201),
      placeFeature('Don Bosko', 202),
    ]));

    // 120 level-10 blocks are outside the readable range, so the named
    // neighbourhoods win instead.
    expect(result.source).toBe('place');
  });
});
