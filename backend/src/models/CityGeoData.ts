import mongoose, { Document, Schema } from 'mongoose';

/**
 * Where the stored shapes came from:
 *  - `admin` — administrative subdivisions only (boundary=administrative)
 *  - `place` — mapped neighbourhood/suburb areas only (place=neighbourhood, …),
 *    for cities whose neighbourhoods are not administrative units
 *  - `mixed` — both: admin districts as the base partition, with the named
 *    neighbourhoods nested inside them. The usual case for a real city, and
 *    the reason a city can show all of its neighbourhoods at once
 */
export type CityBoundarySource = 'admin' | 'place' | 'mixed';

export interface ICityGeoData extends Document {
  city: string;
  country: string;
  /** GeoJSON FeatureCollection — boundaries from OpenStreetMap */
  boundaries: Record<string, unknown>;
  adminLevel: number;
  boundarySource: CityBoundarySource;
  featureCount: number;
  /** Shapes in the base partition — the districts that tile the city. */
  districtCount: number;
  /** Named areas nested inside those districts. */
  neighbourhoodCount: number;
  /**
   * Which version of the extraction produced these shapes.
   *
   * The cache holds for 90 days, so a fix to what we ask OSM for — or to which
   * of its answers we keep — would otherwise be invisible on every city
   * already cached until next quarter. A row stamped with an older version is
   * treated as stale and refetched. See `BOUNDARY_PIPELINE_VERSION`.
   */
  pipelineVersion: number;
  /** When these shapes were last fetched from OpenStreetMap. */
  lastUpdated: Date;
}

const CityGeoDataSchema = new Schema<ICityGeoData>({
  city: { type: String, required: true },
  country: { type: String, required: true },
  boundaries: { type: Schema.Types.Mixed, required: true },
  adminLevel: { type: Number, default: 8 },
  boundarySource: { type: String, enum: ['admin', 'place', 'mixed'], default: 'admin' },
  featureCount: { type: Number, default: 0 },
  districtCount: { type: Number, default: 0 },
  neighbourhoodCount: { type: Number, default: 0 },
  // Defaults to 0, so every row written before versioning existed reads as
  // stale and gets refetched once.
  pipelineVersion: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

CityGeoDataSchema.index({ city: 1, country: 1 }, { unique: true });

export default mongoose.model<ICityGeoData>('CityGeoData', CityGeoDataSchema);
