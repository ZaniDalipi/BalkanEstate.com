import mongoose, { Document, Schema } from 'mongoose';

/**
 * A worked-out noise and traffic report for one spot, kept for 30 days so each
 * home asks OpenStreetMap once, not on every visit or after every restart.
 * MongoDB deletes the document itself at `expiresAt` (TTL index).
 */
export interface ISurroundingsCache extends Document {
  /** Model version + the home's pin rounded to ~1 m, e.g. "v2:40.61800,20.78000". */
  key: string;
  report: unknown;
  expiresAt: Date;
}

const SurroundingsCacheSchema = new Schema<ISurroundingsCache>(
  {
    key: { type: String, required: true, unique: true },
    report: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SurroundingsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISurroundingsCache>('SurroundingsCache', SurroundingsCacheSchema);
