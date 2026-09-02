import mongoose, { Document, Schema } from 'mongoose';

/**
 * A city a user follows from /explore-cities.
 *
 * Saving is a subscription, not a bookmark: it puts the city at the top of the
 * reader's market-update email and lets a move in *their* city reach them
 * without waiting for the monthly regional roundup.
 *
 * `cityKey` is the normalised identity ("tirana|albania") and carries the
 * uniqueness constraint, so "Tirana" and " tirana " cannot both be saved while
 * `city`/`country` keep the display casing the reader picked.
 */
export interface ISavedCity extends Document {
  userId: mongoose.Types.ObjectId;
  city: string;
  country: string;
  countryCode: string;
  cityKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavedCitySchema = new Schema<ISavedCity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    city: { type: String, required: true },
    country: { type: String, required: true },
    countryCode: { type: String, required: true },
    cityKey: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// One save per user per city, case- and whitespace-insensitive.
SavedCitySchema.index({ userId: 1, cityKey: 1 }, { unique: true });
// "who follows this city" — the digest's per-batch lookup.
SavedCitySchema.index({ cityKey: 1 });

export default mongoose.model<ISavedCity>('SavedCity', SavedCitySchema);
