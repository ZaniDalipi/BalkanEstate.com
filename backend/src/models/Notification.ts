import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'listing_milestone'      // View milestones reached
  | 'listing_trending'       // Listing is trending
  | 'promotion_suggestion'   // Suggest promoting a popular listing
  | 'promotion_success'      // Promoted listing doing well
  | 'new_message'           // New conversation message
  | 'new_inquiry'           // New property inquiry
  | 'new_viewing'           // New viewing request received
  | 'viewing_approved'      // Viewing request approved by seller
  | 'viewing_declined'      // Viewing request declined by seller
  | 'subscription_expiring' // Subscription about to expire
  | 'agent_joined_agency'   // Agent joined your agency
  | 'agent_left_agency'     // Agent left your agency
  | 'agency_join_welcome'   // Welcome notification for agent joining agency
  | 'agency_coupon_redeemed' // Agent redeemed a coupon for your agency
  | 'agency_join_request'   // New join request from an agent
  | 'listing_limit_increased' // Listing limit increased by admin
  | 'system';               // System notifications

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  priority: NotificationPriority;
  data?: {
    propertyId?: string;
    propertyTitle?: string;
    viewCount?: number;
    milestone?: number;
    actionUrl?: string;
    actionLabel?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'listing_milestone',
        'listing_trending',
        'promotion_suggestion',
        'promotion_success',
        'new_message',
        'new_inquiry',
        'new_viewing',
        'viewing_approved',
        'viewing_declined',
        'subscription_expiring',
        'agent_joined_agency',
        'agent_left_agency',
        'agency_join_welcome',
        'agency_coupon_redeemed',
        'agency_join_request',
        'listing_limit_increased',
        'system',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'bell',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL index for auto-expiring notifications (optional)
// NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
