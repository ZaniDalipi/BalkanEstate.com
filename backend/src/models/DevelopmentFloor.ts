import mongoose, { Document, Schema } from 'mongoose';
import { FLOOR_KINDS, type FloorKind } from '../config/developments';

/**
 * A floor within a building (optionally within an entrance).
 *
 * `level` is the numeric ordering key and may be negative (basements) — we do
 * NOT assume floors start at 0 or follow one naming convention. `label` is the
 * human-facing name as the developer writes it ("Ground", "Mezzanine", "P1").
 */
export interface IDevelopmentFloor extends Document {
  developmentId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  entranceId?: mongoose.Types.ObjectId;
  label: string;
  level: number;
  kind: FloorKind;
  floorplanMediaId?: mongoose.Types.ObjectId;
  order: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentFloorSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'DevelopmentBuilding',
      required: true,
      index: true,
    },
    entranceId: {
      type: Schema.Types.ObjectId,
      ref: 'DevelopmentEntrance',
    },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    level: { type: Number, required: true },
    kind: { type: String, enum: FLOOR_KINDS, required: true, default: 'standard' },
    floorplanMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    order: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

DevelopmentFloorSchema.index({ buildingId: 1, entranceId: 1, order: 1 });

export default mongoose.model<IDevelopmentFloor>(
  'DevelopmentFloor',
  DevelopmentFloorSchema
);
