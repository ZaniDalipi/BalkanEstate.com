import mongoose from 'mongoose';
import SavedNeighborhoodInsight from '../models/SavedNeighborhoodInsight';

/** The insight THIS user saved for this listing, or null. Never reads other users' rows. */
export const findSavedInsight = async (
  userId: mongoose.Types.ObjectId | string,
  listingId: string,
): Promise<string | null> => {
  const saved = await SavedNeighborhoodInsight.findOne({ userId, listingId })
    .select('insights')
    .lean();
  return saved?.insights ?? null;
};

/**
 * Keep the insight for this user + listing. The first saved report wins
 * (`$setOnInsert`), so a concurrent duplicate request cannot overwrite it.
 */
export const saveInsight = async (
  userId: mongoose.Types.ObjectId | string,
  listingId: string,
  insights: string,
  language: string,
): Promise<void> => {
  await SavedNeighborhoodInsight.updateOne(
    { userId, listingId },
    { $setOnInsert: { insights, language } },
    { upsert: true },
  );
};
