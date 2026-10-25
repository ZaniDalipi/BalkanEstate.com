import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';

/**
 * One subscription year of an agency's free residences: how many it has used
 * and how many extra ones an admin added. A residence claims a slot with a
 * single conditional update, so two publishes at once can't both get the last
 * one.
 */
export interface IAgencyResidenceYear extends Document {
  agencyId: mongoose.Types.ObjectId;
  yearStart: Date;
  used: number;
  /** Extra free residences an admin added for this year. */
  extra: number;
  notes: { at: Date; by?: mongoose.Types.ObjectId; extra: number; note?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const AgencyResidenceYearSchema = new Schema<IAgencyResidenceYear>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    yearStart: { type: Date, required: true },
    used: { type: Number, default: 0, min: 0 },
    extra: { type: Number, default: 0, min: 0, max: 100 },
    notes: {
      type: [
        {
          at: { type: Date, required: true },
          by: { type: Schema.Types.ObjectId, ref: 'User' },
          extra: { type: Number, required: true },
          note: { type: String, maxlength: 500 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

AgencyResidenceYearSchema.index({ agencyId: 1, yearStart: 1 }, { unique: true });

encodeRefsOnJSON(AgencyResidenceYearSchema, ['agencyId']);

export default mongoose.model<IAgencyResidenceYear>('AgencyResidenceYear', AgencyResidenceYearSchema);
