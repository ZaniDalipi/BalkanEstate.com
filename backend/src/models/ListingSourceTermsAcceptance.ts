import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IListingSourceTermsAcceptance extends Document {
  userId: Types.ObjectId;
  /** Semantic version of the ToS document the user accepted. */
  version: string;
  acceptedAt: Date;
  /** Client IP at time of acceptance (stored for legal audit trail). */
  ip?: string;
  userAgent?: string;
}

const ListingSourceTermsAcceptanceSchema = new Schema<IListingSourceTermsAcceptance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    version: { type: String, required: true, default: '1.0' },
    acceptedAt: { type: Date, required: true, default: () => new Date() },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: false }
);

// One record per user per version — upsert-safe unique index.
ListingSourceTermsAcceptanceSchema.index({ userId: 1, version: 1 }, { unique: true });

export default mongoose.model<IListingSourceTermsAcceptance>(
  'ListingSourceTermsAcceptance',
  ListingSourceTermsAcceptanceSchema
);
