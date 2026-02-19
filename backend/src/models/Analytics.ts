import mongoose, { Document, Schema } from 'mongoose';

/**
 * Analytics Event Types
 */
export type AnalyticsEventType =
  // User Events
  | 'user_registered'
  | 'user_login'
  | 'user_logout'
  | 'user_profile_updated'
  | 'user_deleted'
  // Subscription Events
  | 'subscription_button_click'
  | 'subscription_modal_opened'
  | 'subscription_plan_selected'
  | 'subscription_checkout_started'
  | 'subscription_completed'
  | 'subscription_cancelled'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  // Property Events
  | 'property_created'
  | 'property_updated'
  | 'property_deleted'
  | 'property_viewed'
  | 'property_favorited'
  | 'property_shared'
  | 'property_promoted'
  // Inquiry Events
  | 'inquiry_sent'
  | 'inquiry_responded'
  // Search Events
  | 'search_performed'
  | 'search_saved'
  | 'filter_applied'
  | 'map_area_drawn'
  // Navigation Events
  | 'page_view'
  | 'button_click'
  | 'modal_opened'
  | 'modal_closed'
  // Agent Events
  | 'agent_profile_viewed'
  | 'agent_contacted'
  | 'agent_verified'
  // Admin Events
  | 'admin_action'
  | 'admin_login'
  | 'settings_changed'
  // System Events
  | 'error_occurred'
  | 'webhook_received'
  | 'email_sent';

export type AnalyticsCategory =
  | 'user'
  | 'subscription'
  | 'property'
  | 'inquiry'
  | 'search'
  | 'navigation'
  | 'agent'
  | 'admin'
  | 'system';

export interface IAnalytics extends Document {
  // Event identification
  eventType: AnalyticsEventType;
  category: AnalyticsCategory;

  // User context (optional for anonymous users)
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;

  // Event details
  action: string; // Human-readable action description
  label?: string; // Additional context (e.g., button name, page name)
  value?: number; // Numeric value (e.g., price, count)

  // Page/Location context
  pagePath?: string;
  pageTitle?: string;
  referrer?: string;

  // Target context (what was acted upon)
  targetType?: 'property' | 'user' | 'agent' | 'subscription' | 'inquiry' | 'button' | 'modal' | 'other';
  targetId?: string;

  // Additional metadata
  metadata?: Record<string, any>;

  // Device/Browser info
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;

  // Geographic info
  country?: string;
  city?: string;
  region?: string;

  // Network info
  ipAddress?: string;

  // Timestamps
  timestamp: Date;
  createdAt: Date;
}

const AnalyticsSchema: Schema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['user', 'subscription', 'property', 'inquiry', 'search', 'navigation', 'agent', 'admin', 'system'],
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },

    action: {
      type: String,
      required: true,
    },
    label: String,
    value: Number,

    pagePath: {
      type: String,
      index: true,
    },
    pageTitle: String,
    referrer: String,

    targetType: {
      type: String,
      enum: ['property', 'user', 'agent', 'subscription', 'inquiry', 'button', 'modal', 'other'],
    },
    targetId: String,

    metadata: {
      type: Schema.Types.Mixed,
    },

    userAgent: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      index: true,
    },
    browser: String,
    os: String,

    country: {
      type: String,
      index: true,
    },
    city: String,
    region: String,

    ipAddress: String,

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
AnalyticsSchema.index({ category: 1, eventType: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });
AnalyticsSchema.index({ pagePath: 1, timestamp: -1 });
AnalyticsSchema.index({ country: 1, timestamp: -1 });
AnalyticsSchema.index({ deviceType: 1, timestamp: -1 });

// TTL index - automatically delete events older than 90 days
AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
