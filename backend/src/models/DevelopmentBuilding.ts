import mongoose, { Document, Schema } from 'mongoose';
import {
  DEVELOPMENT_CONSTRUCTION_STATUSES,
  type DevelopmentConstructionStatus,
} from '../config/developments';

/**
 * A building within a development. A development may have exactly one building
 * (a single apartment block) or many (towers in a complex) — nothing forces a
 * development to be multi-building.
 */
export interface IDevelopmentBuilding extends Document {
  developmentId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  slug: string;
  description?: string;
  phase?: DevelopmentConstructionStatus;
  totalFloors?: number;
  basementLevels?: number;
  lat?: number;
  lng?: number;
  coverMediaId?: mongoose.Types.ObjectId;
  facadeMediaId?: mongoose.Types.ObjectId;
  /** Display order within the development. */
  order: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentBuildingSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, trim: true, maxlength: 50 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, maxlength: 5000 },
    phase: { type: String, enum: DEVELOPMENT_CONSTRUCTION_STATUSES },
    totalFloors: { type: Number, min: 0 },
    basementLevels: { type: Number, min: 0, default: 0 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    coverMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    facadeMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    order: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

DevelopmentBuildingSchema.index({ developmentId: 1, order: 1 });
// A building slug is unique within its development (among live buildings).
DevelopmentBuildingSchema.index(
  { developmentId: 1, slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: { $exists: false } },
    name: 'building_slug_per_development_unique',
  }
);

export default mongoose.model<IDevelopmentBuilding>(
  'DevelopmentBuilding',
  DevelopmentBuildingSchema
);
