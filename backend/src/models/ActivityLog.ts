import mongoose, { Document, Schema } from 'mongoose';

/**
 * Activity Log Model
 *
 * Stores important operational events for admin monitoring and daily reports.
 * This replaces console.log statements with persistent, queryable data.
 */

export type ActivityCategory =
  | 'auth'           // Login, logout, signup, password reset
  | 'subscription'   // Payment, subscription changes, cancellations
  | 'security'       // Failed logins, suspicious activity, rate limiting
  | 'chat'           // Connection events, unauthorized access attempts
  | 'system'         // Server events, errors, maintenance
  | 'admin';         // Admin actions

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface IActivityLog extends Document {
  category: ActivityCategory;
  action: string;
  severity: ActivitySeverity;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    category: {
      type: String,
      enum: ['auth', 'subscription', 'security', 'chat', 'system', 'admin'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ActivityLogSchema.index({ category: 1, createdAt: -1 });
ActivityLogSchema.index({ severity: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
