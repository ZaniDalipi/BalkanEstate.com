import mongoose, { Document, Schema } from 'mongoose';

/**
 * Worked-out area data for one spot (air quality, noise and traffic), kept so
 * each place asks the outside services once, not on every visit or after
 * every restart. MongoDB deletes the document itself at `expiresAt` (TTL).
 */
export interface IAreaInsightCache extends Document {
  /** What and where, e.g. "surroundings:v3:40.61800,20.78000". */
  key: string;
  value: unknown;
  expiresAt: Date;
}

const AreaInsightCacheSchema = new Schema<IAreaInsightCache>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

AreaInsightCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAreaInsightCache>('AreaInsightCache', AreaInsightCacheSchema);
