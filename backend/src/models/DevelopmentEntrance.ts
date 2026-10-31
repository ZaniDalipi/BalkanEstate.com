import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';
import { ENTRANCE_KINDS, type EntranceKind } from '../config/developments';

/**
 * An entrance / section within a building. Optional: many buildings have a
 * single entrance and never create one. When present, unit numbering is scoped
 * per entrance (see DevelopmentUnit), which is how buildings that reuse unit
 * numbers across staircases stay conflict-free.
 */
export interface IDevelopmentEntrance extends Document {
  developmentId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  /** Main door, side door, car park or service door. */
  kind: EntranceKind;
  /** Step-free (wheelchair / pram) access. */
  accessible: boolean;
  /** A short note for buyers, e.g. where it is or when it is staffed. */
  note?: string;
  order: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentEntranceSchema: Schema = new Schema(
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
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, maxlength: 50 },
    kind: { type: String, enum: ENTRANCE_KINDS, default: 'main' },
    accessible: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 200 },
    order: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

DevelopmentEntranceSchema.index({ buildingId: 1, order: 1 });

// Encode every reference in JSON so the client compares like with like.
encodeRefsOnJSON(DevelopmentEntranceSchema, ['developmentId', 'buildingId']);

export default mongoose.model<IDevelopmentEntrance>(
  'DevelopmentEntrance',
  DevelopmentEntranceSchema
);
