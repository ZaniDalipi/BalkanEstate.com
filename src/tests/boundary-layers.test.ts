/**
 * The map's two boundary layers
 *
 * The backend now sends a city's administrative districts *and* the named
 * neighbourhoods nested inside them, tagged per feature. Splitting them is
 * what lets both be drawn — and drawing all of them is what makes every label
 * fight for the same space, which is why the size threshold lives here too.
 */

import { describe, it, expect } from 'vitest';
import {
  layerOf,
  splitBoundaryLayers,
  shouldShowLabel,
  MIN_LABEL_AREA_PX,
} from '../features/cities/utils/boundaryLayers';

const feature = (name: string, layer?: string) => ({
  type: 'Feature' as const,
  id: name,
  properties: { name, ...(layer ? { layer } : {}) },
  geometry: { type: 'Polygon' as const, coordinates: [] as unknown },
});

describe('layerOf', () => {
  it('reads the tag the backend set', () => {
    expect(layerOf({ layer: 'neighbourhood' })).toBe('neighbourhood');
    expect(layerOf({ layer: 'district' })).toBe('district');
  });

  it('treats an untagged shape as a district', () => {
    // Rows cached before the split carry no tag and held one partition of the
    // city — which is exactly what the district layer draws. Reading them as
    // neighbourhoods would leave the base layer empty and the map unfilled.
    expect(layerOf({})).toBe('district');
    expect(layerOf(undefined)).toBe('district');
    expect(layerOf({ layer: 'nonsense' })).toBe('district');
  });
});

describe('splitBoundaryLayers', () => {
  it('separates the two layers and counts the whole set', () => {
    const result = splitBoundaryLayers(
      {
        features: [
          feature('Njësia 1', 'district'),
          feature('Blloku', 'neighbourhood'),
          feature('Njësia 2', 'district'),
          feature('Kombinat', 'neighbourhood'),
        ],
      },
      f => ({ name: f.properties.name as string }),
    );

    expect(result.districts.features.map(f => f.properties.name)).toEqual(['Njësia 1', 'Njësia 2']);
    expect(result.neighbourhoods.features.map(f => f.properties.name)).toEqual(['Blloku', 'Kombinat']);
    expect(result.total).toBe(4);
  });

  it('indexes each layer from zero, since they colour from separate scales', () => {
    const result = splitBoundaryLayers(
      {
        features: [
          feature('A', 'district'),
          feature('X', 'neighbourhood'),
          feature('B', 'district'),
          feature('Y', 'neighbourhood'),
        ],
      },
      (f, layer, indexInLayer) => ({ name: f.properties.name as string, layer, indexInLayer }),
    );

    expect(result.districts.features.map(f => f.properties.indexInLayer)).toEqual([0, 1]);
    expect(result.neighbourhoods.features.map(f => f.properties.indexInLayer)).toEqual([0, 1]);
  });

  it('passes the layer to the enricher', () => {
    const result = splitBoundaryLayers(
      { features: [feature('Blloku', 'neighbourhood')] },
      (_f, layer) => ({ layer }),
    );

    expect(result.neighbourhoods.features[0].properties.layer).toBe('neighbourhood');
  });

  it('handles a city with no shapes, and no response at all', () => {
    for (const raw of [undefined, { features: [] }]) {
      const result = splitBoundaryLayers(raw, () => ({}));
      expect(result.total).toBe(0);
      expect(result.districts.features).toEqual([]);
      expect(result.neighbourhoods.features).toEqual([]);
    }
  });

  it('produces valid FeatureCollections Leaflet can take directly', () => {
    const result = splitBoundaryLayers(
      { features: [feature('A', 'district')] },
      () => ({}),
    );

    expect(result.districts.type).toBe('FeatureCollection');
    expect(result.neighbourhoods.type).toBe('FeatureCollection');
  });
});

describe('shouldShowLabel', () => {
  it('labels a shape with room for the label', () => {
    expect(shouldShowLabel(120, 80)).toBe(true);
  });

  it('withholds a label from a shape smaller than its own name', () => {
    // Not hidden data: the shape is still drawn and still clickable, and the
    // label returns as the reader zooms in. Showing it here is what turned a
    // city of 90 neighbourhoods into a pile of overlapping boxes.
    expect(shouldShowLabel(20, 14)).toBe(false);
  });

  it('is decided on area, so a long thin shape does not qualify on width', () => {
    expect(shouldShowLabel(400, 2)).toBe(false);
  });

  it('treats the threshold as inclusive', () => {
    expect(shouldShowLabel(MIN_LABEL_AREA_PX, 1)).toBe(true);
    expect(shouldShowLabel(MIN_LABEL_AREA_PX - 1, 1)).toBe(false);
  });

  it('says no to a degenerate projection rather than throwing', () => {
    expect(shouldShowLabel(Number.NaN, 100)).toBe(false);
    expect(shouldShowLabel(Number.POSITIVE_INFINITY, Number.NaN)).toBe(false);
    expect(shouldShowLabel(0, 0)).toBe(false);
  });
});
