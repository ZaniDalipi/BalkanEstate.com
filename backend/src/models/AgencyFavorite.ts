import mongoose, { Document, Schema } from 'mongoose';

export interface IAgencyFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  agencyId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AgencyFavoriteSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One favourite per user per agency
AgencyFavoriteSchema.index({ userId: 1, agencyId: 1 }, { unique: true });

export default mongoose.model<IAgencyFavorite>('AgencyFavorite', AgencyFavoriteSchema);
