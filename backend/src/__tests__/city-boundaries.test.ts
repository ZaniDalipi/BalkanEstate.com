/**
 * City boundary extraction and selection
 *
 * Two things went wrong here, and both showed up the same way: a city drew a
 * handful of scattered shapes instead of all of its neighbourhoods.
 *
 *  1. `relationToFeature` accepted only member ways tagged `role=outer`. In
 *     OSM an empty role is the common case — `outer` is only needed to
 *     disambiguate a multipolygon with holes — so whole districts were parsed
 *     to nothing and silently dropped.
 *  2. `selectBoundarySet` chose one set of shapes and discarded the other, on
 *     the reasoning that two partitions cannot be overlaid. True of rival
 *     partitions; false of a hierarchy. Tirana's named neighbourhoods sit
 *     inside its administrative units, so one of the two groups was always
 *     invisible.
 */

// Pure functions over GeoJSON — no collection is touched (see setup.ts).
process.env.SKIP_TEST_DB = 'true';

import {
  selectBoundarySet,
  overpassToGeoJSON,
  GeoJSONFeatureCollection,
} from '../services/geoDataService';

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

const names = (result: ReturnType<typeof selectBoundarySet>, layer: string): string[] =>
  result.geojson.features
    .filter(f => f.properties.layer === layer)
    .map(f => f.properties.name as string);

// ── Overpass → GeoJSON ───────────────────────────────────────────────────────

/** A closed square as Overpass returns member geometry. */
const ring = (offset: number) => [
  { lat: 41.3, lon: 19.8 + offset },
  { lat: 41.3, lon: 19.81 + offset },
  { lat: 41.31, lon: 19.81 + offset },
  { lat: 41.31, lon: 19.8 + offset },
  { lat: 41.3, lon: 19.8 + offset },
];

const relationEl = (name: string, role: string, offset = 0) => ({
  type: 'relation' as const,
  id: 1000 + offset,
  tags: { name, boundary: 'administrative', admin_level: '9' },
  members: [{ type: 'way', ref: 1, role, geometry: ring(offset) }],
});

describe('overpassToGeoJSON', () => {
  it('keeps a boundary whose member ways carry no role', () => {
    // The bug: OSM leaves the role empty on most simple boundaries, and every
    // one of those relations used to parse to nothing.
    const result = overpassToGeoJSON([relationEl('Njësia Bashkiake Nr. 5', '')] as never);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.name).toBe('Njësia Bashkiake Nr. 5');
  });

  it('still keeps one tagged the explicit way', () => {
    const result = overpassToGeoJSON([relationEl('Njësia Bashkiake Nr. 6', 'outer')] as never);

    expect(result.features).toHaveLength(1);
  });

  it('ignores a member whose role is not part of the ring', () => {
    // `subarea` and `label` members describe the relation, not its outline.
    const result = overpassToGeoJSON([relationEl('Bogus', 'subarea')] as never);

    expect(result.features).toHaveLength(0);
  });

  it('drops an unnamed area, which has nothing to label', () => {
    const unnamed = {
      type: 'relation' as const,
      id: 7,
      tags: { boundary: 'administrative', admin_level: '9' },
      members: [{ type: 'way', ref: 1, role: '', geometry: ring(0) }],
    };

    expect(overpassToGeoJSON([unnamed] as never).features).toHaveLength(0);
  });

  it('converts a neighbourhood mapped as one closed way', () => {
    const way = {
      type: 'way' as const,
      id: 42,
      tags: { name: 'Blloku', place: 'neighbourhood' },
      geometry: ring(0),
    };

    const result = overpassToGeoJSON([way] as never);

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.place).toBe('neighbourhood');
  });

  it('refuses an unclosed way rather than inventing the closing edge', () => {
    const line = {
      type: 'way' as const,
      id: 43,
      tags: { name: 'Some street', place: 'neighbourhood' },
      geometry: ring(0).slice(0, 4),
    };

    expect(overpassToGeoJSON([line] as never).features).toHaveLength(0);
  });
});

// ── Layer selection ─────────────────────────────────────────────────────────

describe('selectBoundarySet', () => {
  it('returns nothing to draw for an empty response', () => {
    const result = selectBoundarySet(collection([]));

    expect(result.geojson.features).toEqual([]);
    expect(result.districtCount).toBe(0);
    expect(result.neighbourhoodCount).toBe(0);
  });

  it('draws the districts AND the neighbourhoods inside them', () => {
    // The whole point: before, the three places here were thrown away.
    const result = selectBoundarySet(collection([
      adminFeature('Njësia 1', 9, 0),
      adminFeature('Njësia 2', 9, 1),
      adminFeature('Njësia 3', 9, 2),
      placeFeature('Blloku', 3),
      placeFeature('Kombinat', 4),
      placeFeature('Don Bosko', 5),
    ]));

    expect(result.source).toBe('mixed');
    expect(result.adminLevel).toBe(9);
    expect(names(result, 'district')).toEqual(['Njësia 1', 'Njësia 2', 'Njësia 3']);
    expect(names(result, 'neighbourhood')).toEqual(['Blloku', 'Kombinat', 'Don Bosko']);
    expect(result.geojson.features).toHaveLength(6);
  });

  it('tags every feature with its layer, so the map can style two of them', () => {
    const result = selectBoundarySet(collection([
      adminFeature('A', 9, 0), adminFeature('B', 9, 1), adminFeature('C', 9, 2),
      placeFeature('Blloku', 3),
    ]));

    for (const f of result.geojson.features) {
      expect(['district', 'neighbourhood']).toContain(f.properties.layer);
    }
  });

  it('uses the coarser admin level as the base and nests the finer one', () => {
    // Level 10 blocks used to be discarded outright for losing to level 9.
    const result = selectBoundarySet(collection([
      adminFeature('District A', 9, 0),
      adminFeature('District B', 9, 1),
      adminFeature('District C', 9, 2),
      adminFeature('Block 1', 10, 3),
      adminFeature('Block 2', 10, 4),
    ]));

    expect(result.adminLevel).toBe(9);
    expect(names(result, 'district')).toEqual(['District A', 'District B', 'District C']);
    expect(names(result, 'neighbourhood')).toEqual(['Block 1', 'Block 2']);
  });

  it('drops a level coarser than the base — the city drawn over itself', () => {
    const result = selectBoundarySet(collection([
      adminFeature('Tirana County', 6, 0),
      adminFeature('Njësia 1', 9, 1),
      adminFeature('Njësia 2', 9, 2),
      adminFeature('Njësia 3', 9, 3),
    ]));

    expect(result.geojson.features.map(f => f.properties.name)).not.toContain('Tirana County');
  });

  it('makes the neighbourhoods the base when there is no subdivision', () => {
    // One admin boundary is the city itself — nothing to partition.
    const result = selectBoundarySet(collection([
      adminFeature('Tirana', 8, 0),
      placeFeature('Blloku', 1),
      placeFeature('Kombinat', 2),
      placeFeature('Don Bosko', 3),
      placeFeature('Fresku', 4),
    ]));

    expect(result.source).toBe('place');
    expect(names(result, 'district'))
      .toEqual(['Blloku', 'Kombinat', 'Don Bosko', 'Fresku']);
  });

  it('nests a level with too many members to be a readable base', () => {
    const many = Array.from({ length: 120 }, (_, i) => adminFeature(`Block ${i}`, 10, i));

    const result = selectBoundarySet(collection([
      adminFeature('Njësia 1', 9, 200),
      adminFeature('Njësia 2', 9, 201),
      adminFeature('Njësia 3', 9, 202),
      ...many,
    ]));

    expect(result.districtCount).toBe(3);
    // Kept rather than discarded — 120 blocks are exactly the detail that was
    // missing from the map.
    expect(result.neighbourhoodCount).toBe(120);
  });

  it('treats an area named as both an admin unit and a place as one area', () => {
    const result = selectBoundarySet(collection([
      adminFeature('Njësia Bashkiake Nr. 5', 9, 0),
      adminFeature('Njësia 2', 9, 1),
      adminFeature('Njësia 3', 9, 2),
      // Same ground, spelled differently and tagged as a place.
      placeFeature('njesia bashkiake nr 5', 3),
      placeFeature('Blloku', 4),
    ]));

    expect(names(result, 'neighbourhood')).toEqual(['Blloku']);
  });

  it('deduplicates two nested shapes with the same name', () => {
    const result = selectBoundarySet(collection([
      adminFeature('A', 9, 0), adminFeature('B', 9, 1), adminFeature('C', 9, 2),
      placeFeature('Blloku', 3),
      placeFeature('Blloku', 4),
    ]));

    expect(names(result, 'neighbourhood')).toEqual(['Blloku']);
  });

  it('falls back to a coarse partition when there is nothing else at all', () => {
    // Two halves and no named places: coarse, but it is the only partition
    // there is, and drawing it beats an empty map.
    const result = selectBoundarySet(collection([
      adminFeature('Half A', 8, 0),
      adminFeature('Half B', 8, 1),
    ]));

    expect(result.source).toBe('admin');
    expect(result.districtCount).toBe(2);
  });

  it('draws a couple of neighbourhoods rather than nothing', () => {
    const result = selectBoundarySet(collection([
      placeFeature('Blloku', 0),
      placeFeature('Kombinat', 1),
    ]));

    expect(result.source).toBe('place');
    expect(result.districtCount).toBe(2);
  });

  it('keeps hundreds of neighbourhoods — that is what "all of them" means', () => {
    const result = selectBoundarySet(collection([
      adminFeature('A', 9, 0), adminFeature('B', 9, 1), adminFeature('C', 9, 2),
      ...Array.from({ length: 300 }, (_, i) => placeFeature(`Area ${i}`, i + 10)),
    ]));

    expect(result.neighbourhoodCount).toBe(300);
    expect(result.droppedCount).toBe(0);
  });

  it('caps a runaway response and reports what it dropped', () => {
    const result = selectBoundarySet(collection([
      adminFeature('A', 9, 0), adminFeature('B', 9, 1), adminFeature('C', 9, 2),
      ...Array.from({ length: 500 }, (_, i) => placeFeature(`Area ${i}`, i + 10)),
    ]));

    // Bounded so a phone is never sent megabytes of geometry — but the cap is
    // reported rather than applied silently.
    expect(result.neighbourhoodCount).toBe(400);
    expect(result.droppedCount).toBe(100);
  });
});
