import mongoose, { Document, Schema } from 'mongoose';

/**
 * One stored photo — the MongoDB index of everything in the R2 buckets.
 *
 * R2 has no tags, metadata search or "list by owner", so this collection is
 * how media is found, managed and cleaned up:
 *   - every photo a user has:          { ownerId }
 *   - every photo of one listing:      { propertyId }            (in display order: sort by key)
 *   - abandoned listing-form uploads:  { status: 'draft', createdAt: { $lt } }
 *   - an agency's / business's media:  { agencyId } / { businessListingId }
 *   - what came from Cloudinary:       { 'source.cloudinaryPublicId': { $exists: true } }
 *
 * `key` is the photo's folder in the bucket and is also what the rest of the
 * app stores as `publicId`. The folder layout (see services/media/mediaKeys.ts):
 *
 *   users/{userId}/
 *   ├── avatar/{photoId}/
 *   ├── documents/license/{photoId}/                 (private bucket)
 *   ├── documents/credentials/{credentialId}/{photoId}/ (private bucket)
 *   └── listings/
 *       ├── drafts/{photos|floorplans}/{photoId}/    (before the listing exists)
 *       └── {propertyId}/{photos|floorplans}/{photoId}/
 *   agencies/{agencyId}/{logo|cover}/{photoId}/
 *   businesses/{businessId}/{logo|banner}/{photoId}/
 *   messages/{conversationId}/{photoId}/
 *   cities/{country}/{city}/{photoId}/
 *   site/{logo|email-logo|ad-banners|content}/{photoId}/
 *   news/{photoId}/
 *   external/{source}/{listingId}/{photoId}/
 *   legacy/{cloudinary public id}/                   (migrated, owner unknown)
 *
 * and inside each photo folder the files listed in config/mediaVariants.ts.
 */

export const MEDIA_ASSET_KINDS = [
  'property',
  'floorplan',
  'avatar',
  'license',
  'credential',
  'agency-logo',
  'agency-cover',
  'business-logo',
  'business-banner',
  'site-logo',
  'site-email-logo',
  'ad-banner',
  'site-content',
  'message',
  'city',
  'news',
  'external',
  'legacy',
] as const;

export type MediaAssetKind = (typeof MEDIA_ASSET_KINDS)[number];

export interface IMediaAsset extends Document {
  /** Photo folder in the bucket, e.g. users/{u}/listings/{p}/photos/{photoId}. Stored as `publicId` elsewhere. */
  key: string;
  bucket: 'public' | 'private';
  kind: MediaAssetKind;
  /** draft = uploaded from the listing form before the listing existed; swept after 48h if never attached. */
  status: 'draft' | 'active';

  ownerId?: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId;
  agencyId?: mongoose.Types.ObjectId;
  businessListingId?: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  credentialId?: string;

  /** File names inside the folder (original.jpg, w640.webp, …). */
  files: string[];
  width: number;
  height: number;
  /** Size of original.jpg. */
  bytes: number;
  /** Size of every file of the photo together. */
  totalBytes: number;
  /** sha1 of original.jpg — spots duplicates. */
  contentHash: string;

  source?: {
    /** Set on photos migrated from Cloudinary. */
    cloudinaryPublicId?: string;
    /** Set on photos re-hosted from an external feed. */
    url?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    key: { type: String, required: true, unique: true },
    bucket: { type: String, enum: ['public', 'private'], required: true, default: 'public' },
    kind: { type: String, enum: MEDIA_ASSET_KINDS, required: true },
    status: { type: String, enum: ['draft', 'active'], required: true, default: 'active' },

    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },
    businessListingId: { type: Schema.Types.ObjectId, ref: 'BusinessListing' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    credentialId: { type: String },

    files: { type: [String], default: [] },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    totalBytes: { type: Number, default: 0 },
    contentHash: { type: String, default: '' },

    source: {
      cloudinaryPublicId: { type: String },
      url: { type: String },
    },
  },
  { timestamps: true }
);

MediaAssetSchema.index({ ownerId: 1, kind: 1, createdAt: -1 });
MediaAssetSchema.index({ propertyId: 1, kind: 1 });
MediaAssetSchema.index({ agencyId: 1 }, { sparse: true });
MediaAssetSchema.index({ businessListingId: 1 }, { sparse: true });
MediaAssetSchema.index({ conversationId: 1 }, { sparse: true });
MediaAssetSchema.index({ status: 1, createdAt: 1 });
MediaAssetSchema.index({ 'source.cloudinaryPublicId': 1 }, { unique: true, sparse: true });
MediaAssetSchema.index({ 'source.url': 1 }, { sparse: true });

export default mongoose.model<IMediaAsset>('MediaAsset', MediaAssetSchema);
