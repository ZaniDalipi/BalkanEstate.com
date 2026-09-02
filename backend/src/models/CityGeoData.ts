import mongoose, { Document, Schema } from 'mongoose';

/**
 * Where the stored shapes came from:
 *  - `admin` — administrative subdivisions (boundary=administrative)
 *  - `place` — mapped neighbourhood/suburb areas (place=neighbourhood, …), used
 *    for cities whose neighbourhoods are not administrative units
 */
export type CityBoundarySource = 'admin' | 'place';

export interface ICityGeoData extends Document {
  city: string;
  country: string;
  /** GeoJSON FeatureCollection — boundaries from OpenStreetMap */
  boundaries: Record<string, unknown>;
  adminLevel: number;
  boundarySource: CityBoundarySource;
  featureCount: number;
  /** When these shapes were last fetched from OpenStreetMap. */
  lastUpdated: Date;
}

const CityGeoDataSchema = new Schema<ICityGeoData>({
  city: { type: String, required: true },
  country: { type: String, required: true },
  boundaries: { type: Schema.Types.Mixed, required: true },
  adminLevel: { type: Number, default: 8 },
  boundarySource: { type: String, enum: ['admin', 'place'], default: 'admin' },
  featureCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

CityGeoDataSchema.index({ city: 1, country: 1 }, { unique: true });

export default mongoose.model<ICityGeoData>('CityGeoData', CityGeoDataSchema);
