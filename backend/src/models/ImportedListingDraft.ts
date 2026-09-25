import mongoose, { Document, Schema, Types } from 'mongoose';

export type ImportedListingDraftKind = 'new' | 'update';
export type ImportedListingDraftStatus = 'pending' | 'accepted' | 'rejected';

/**
 * A listing fetched from a user's external feed that is waiting for the owner
 * to review it before anything is published.
 *
 * Feeds are parsed heuristically and regularly get prices, areas or cities
 * wrong, so nothing a user-owned feed fetches goes live on its own:
 *
 *  - `kind: 'new'`    — the listing isn't on the platform yet. Accepting it
 *                       creates the `Property`; rejecting it keeps this record
 *                       so later syncs don't bring it back.
 *  - `kind: 'update'` — the listing is already published and the feed now
 *                       reports different values. Accepting applies them;
 *                       rejecting keeps the live listing as it is.
 *
 * One document per (source, sourceListingId). `data` is what the owner is
 * editing; `original` is what the feed last sent, so the UI can show what was
 * changed and a re-sync can refresh an untouched draft without clobbering the
 * owner's edits. `incomingHash` fingerprints the feed's values so an unchanged
 * listing isn't re-queued after it was already accepted or rejected.
 */
export interface IImportedListingDraft extends Document {
  source: Types.ObjectId;
  sourceSlug: string;
  userId: Types.ObjectId;
  sourceListingId: string;
  sourceUrl?: string;
  kind: ImportedListingDraftKind;
  status: ImportedListingDraftStatus;
  data: Record<string, unknown>;
  original: Record<string, unknown>;
  incomingHash: string;
  /** Review fields whose feed value differs from the live listing (updates only). */
  changedFields: string[];
  /** Set once the owner edits the draft; re-syncs then stop overwriting `data`. */
  editedAt?: Date;
  fetchedAt: Date;
  reviewedAt?: Date;
  propertyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ImportedListingDraftSchema = new Schema<IImportedListingDraft>(
  {
    source: { type: Schema.Types.ObjectId, ref: 'ListingSource', required: true, index: true },
    sourceSlug: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceListingId: { type: String, required: true },
    sourceUrl: { type: String },
    kind: { type: String, enum: ['new', 'update'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    data: { type: Schema.Types.Mixed, required: true },
    original: { type: Schema.Types.Mixed, required: true },
    incomingHash: { type: String, required: true },
    changedFields: { type: [String], default: [] },
    editedAt: { type: Date },
    fetchedAt: { type: Date, default: () => new Date() },
    reviewedAt: { type: Date },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
  },
  { timestamps: true, minimize: false }
);

ImportedListingDraftSchema.index({ source: 1, sourceListingId: 1 }, { unique: true });
ImportedListingDraftSchema.index({ userId: 1, status: 1, fetchedAt: -1 });

export default mongoose.model<IImportedListingDraft>('ImportedListingDraft', ImportedListingDraftSchema);
