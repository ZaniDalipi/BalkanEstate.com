import mongoose, { Document, Schema } from 'mongoose';

export type EntityType = 'property' | 'agent' | 'agency';

export interface IPageView extends Document {
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  viewerId?: mongoose.Types.ObjectId; // User ID if logged in
  sessionId?: string; // Anonymous session ID
  ipHash?: string; // Hashed IP for deduplication (privacy-friendly)
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
  referrerType?: 'direct' | 'search' | 'social' | 'email' | 'other';
  country?: string;
  city?: string;
  duration?: number; // Time spent on page in seconds
  isUnique: boolean; // First view in 24h period
  createdAt: Date;
}

const PageViewSchema: Schema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['property', 'agent', 'agency'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'entityTypeModel',
    },
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    ipHash: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
    },
    referrer: {
      type: String,
    },
    referrerType: {
      type: String,
      enum: ['direct', 'search', 'social', 'email', 'other'],
      default: 'direct',
    },
    country: {
      type: String,
    },
    city: {
      type: String,
    },
    duration: {
      type: Number,
      default: 0,
    },
    isUnique: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to determine ref model for entityId
PageViewSchema.virtual('entityTypeModel').get(function () {
  const modelMap: Record<EntityType, string> = {
    property: 'Property',
    agent: 'Agent',
    agency: 'Agency',
  };
  return modelMap[this.entityType as EntityType];
});

// Compound indexes for efficient queries
PageViewSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
PageViewSchema.index({ entityId: 1, createdAt: -1 });
PageViewSchema.index({ entityType: 1, createdAt: -1 });
PageViewSchema.index({ viewerId: 1, entityId: 1, createdAt: -1 });
PageViewSchema.index({ ipHash: 1, entityId: 1, createdAt: -1 });
PageViewSchema.index({ createdAt: -1 }); // For time-based analytics

// TTL index to automatically delete old views after 90 days (optional, can be adjusted)
// PageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IPageView>('PageView', PageViewSchema);
