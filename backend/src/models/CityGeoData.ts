import mongoose, { Document, Schema } from 'mongoose';

export interface ICityGeoData extends Document {
  city: string;
  country: string;
  /** GeoJSON FeatureCollection — admin boundaries from OpenStreetMap */
  boundaries: Record<string, unknown>;
  adminLevel: number;
  featureCount: number;
  lastUpdated: Date;
}

const CityGeoDataSchema = new Schema<ICityGeoData>({
  city: { type: String, required: true },
  country: { type: String, required: true },
  boundaries: { type: Schema.Types.Mixed, required: true },
  adminLevel: { type: Number, default: 8 },
  featureCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

CityGeoDataSchema.index({ city: 1, country: 1 }, { unique: true });

export default mongoose.model<ICityGeoData>('CityGeoData', CityGeoDataSchema);
