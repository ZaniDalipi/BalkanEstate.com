import mongoose, { Document, Schema } from 'mongoose';

/**
 * A neighborhood insight a user generated for one listing.
 *
 * It belongs to the user who generated it and to nobody else: every read and
 * write is keyed on `userId`, and the unique index allows one insight per user
 * per listing. It is kept permanently, so reopening the listing never spends
 * the user's monthly quota again.
 */
export interface ISavedNeighborhoodInsight extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: string;
  insights: string;
  /** Language the report was written in (informational). */
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavedNeighborhoodInsightSchema = new Schema<ISavedNeighborhoodInsight>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: String, required: true, trim: true, maxlength: 64 },
    insights: { type: String, required: true },
    language: { type: String, default: 'English' },
  },
  { timestamps: true },
);

// One insight per user per listing; also serves the "my insight for this listing" lookup.
SavedNeighborhoodInsightSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export default mongoose.model<ISavedNeighborhoodInsight>(
  'SavedNeighborhoodInsight',
  SavedNeighborhoodInsightSchema,
);
