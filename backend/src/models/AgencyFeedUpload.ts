import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * An XML file an agency uploaded (or pasted) instead of giving a feed URL.
 *
 * Stored as-is so the worker can read it exactly as the API received it, and
 * so a preview and the import that follows its activation process the same
 * bytes. Capped below MongoDB's 16 MB document limit (see
 * UPLOAD_MAX_BYTES) and expired after 30 days.
 */
export interface IAgencyFeedUpload extends Document {
  feedId: Types.ObjectId;
  agencyId: Types.ObjectId;
  filename: string;
  bytes: number;
  sha256: string;
  content: Buffer;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const AgencyFeedUploadSchema = new Schema<IAgencyFeedUpload>({
  feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true, index: true },
  agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
  filename: { type: String, required: true, maxlength: 200 },
  bytes: { type: Number, required: true },
  sha256: { type: String, required: true },
  content: { type: Buffer, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: () => new Date() },
});

AgencyFeedUploadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IAgencyFeedUpload>('AgencyFeedUpload', AgencyFeedUploadSchema);
