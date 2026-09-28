import mongoose, { Document, Schema } from 'mongoose';

/**
 * A new listing waiting to be shared on the site's social accounts.
 *
 * One document per property. It is created as `pending` when a listing goes
 * live, and nothing leaves the site until an admin approves it — the admin can
 * edit the caption first. Approval publishes to the channels that are
 * configured (Facebook Page, Instagram); the Facebook group has no API, so the
 * admin copies the caption into it by hand and the post records when.
 */

export type SocialPostStatus = 'pending' | 'approved' | 'rejected';
export type SocialChannel = 'facebookPage' | 'instagram';
export type SocialChannelState = 'not_sent' | 'posted' | 'failed';

export interface ISocialChannelResult {
  state: SocialChannelState;
  postId?: string;
  postUrl?: string;
  error?: string;
  postedAt?: Date;
}

export interface ISocialPost extends Document {
  propertyId: mongoose.Types.ObjectId;
  status: SocialPostStatus;
  caption: string;
  listingUrl: string;
  imageUrls: string[];
  // Snapshot for the admin list, so a card still reads right if the listing
  // is later edited or deleted.
  title: string;
  city?: string;
  price?: number;
  listingType?: 'sale' | 'rent';
  channels: {
    facebookPage: ISocialChannelResult;
    instagram: ISocialChannelResult;
  };
  groupSharedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const channelResultSchema = new Schema<ISocialChannelResult>(
  {
    state: { type: String, enum: ['not_sent', 'posted', 'failed'], default: 'not_sent' },
    postId: String,
    postUrl: String,
    error: String,
    postedAt: Date,
  },
  { _id: false }
);

const SocialPostSchema = new Schema<ISocialPost>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, unique: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    caption: { type: String, required: true, maxlength: 2200 },
    listingUrl: { type: String, required: true },
    imageUrls: { type: [String], default: [] },
    title: { type: String, default: '' },
    city: String,
    price: Number,
    listingType: { type: String, enum: ['sale', 'rent'] },
    channels: {
      facebookPage: { type: channelResultSchema, default: () => ({}) },
      instagram: { type: channelResultSchema, default: () => ({}) },
    },
    groupSharedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

SocialPostSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);
