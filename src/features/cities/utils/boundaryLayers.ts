/**
 * Splitting OSM boundaries into the two layers the map draws.
 *
 * The backend returns one collection carrying both a base partition of the
 * city (`layer: 'district'`) and the named areas nested inside it
 * (`layer: 'neighbourhood'`) — see `selectBoundarySet` in
 * `backend/src/services/geoDataService.ts`. Drawing them as two Leaflet layers
 * is what lets a city show all of its neighbourhoods at once: the districts
 * tile the ground underneath, the neighbourhoods sit on top.
 *
 * Kept pure and out of the component so the rules are testable without a map:
 * which layer a shape lands in, and how big a shape has to look on screen
 * before its label is worth drawing.
 */

import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type BoundaryLayer = 'district' | 'neighbourhood';

/** The subset of a boundary feature's properties this module reads. */
export interface BoundaryProps {
  name?: unknown;
  name_en?: unknown;
  layer?: unknown;
  place?: unknown;
  admin_level?: unknown;
  [key: string]: unknown;
}

interface RawCollection {
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: BoundaryProps;
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  }>;
}

/**
 * Which layer a feature belongs to.
 *
 * Untagged features are districts. That is not a guess for its own sake: rows
 * cached before the two-layer split carry no `layer` at all, and they held a
 * single partition of the city — exactly what the district layer draws.
 */
export function layerOf(properties: BoundaryProps | undefined): BoundaryLayer {
  return properties?.layer === 'neighbourhood' ? 'neighbourhood' : 'district';
}

export interface SplitBoundaries<P> {
  districts: FeatureCollection<Geometry, P>;
  neighbourhoods: FeatureCollection<Geometry, P>;
  /** Total shapes across both layers — what "all of them" is measured against. */
  total: number;
}

/**
 * Split a boundary collection in two, running `enrich` over each feature to
 * attach whatever the map needs (matched suburb, price, palette index).
 *
 * `enrich` receives the feature's index *within its own layer*, since that is
 * what indexes the colour palette — a district and a neighbourhood are styled
 * from separate scales.
 */
export function splitBoundaryLayers<P>(
  raw: RawCollection | undefined,
  enrich: (
    feature: RawCollection['features'][number],
    layer: BoundaryLayer,
    indexInLayer: number,
  ) => P,
): SplitBoundaries<P> {
  const districts: Array<Feature<Geometry, P>> = [];
  const neighbourhoods: Array<Feature<Geometry, P>> = [];

  for (const f of raw?.features ?? []) {
    const layer = layerOf(f.properties);
    const bucket = layer === 'district' ? districts : neighbourhoods;
    bucket.push({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry as unknown as Geometry,
      properties: enrich(f, layer, bucket.length),
    });
  }

  return {
    districts: { type: 'FeatureCollection', features: districts },
    neighbourhoods: { type: 'FeatureCollection', features: neighbourhoods },
    total: districts.length + neighbourhoods.length,
  };
}

/**
 * Smallest on-screen footprint, in square pixels, that earns a permanent
 * label.
 *
 * A label is roughly 90×26px. Showing one on a shape smaller than that buries
 * the shape and collides with its neighbours — which is what a city drawing
 * every neighbourhood at once would do at low zoom. Below the threshold the
 * shape is still drawn and still clickable; only its label waits for the
 * reader to zoom in.
 */
export const MIN_LABEL_AREA_PX = 5_000;

/** Whether a shape occupying `widthPx` × `heightPx` should carry its label. */
export function shouldShowLabel(widthPx: number, heightPx: number): boolean {
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx)) return false;
  return widthPx * heightPx >= MIN_LABEL_AREA_PX;
}
