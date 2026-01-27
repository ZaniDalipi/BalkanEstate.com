import mongoose, { Document, Schema } from 'mongoose';

// Email template variable placeholders
export interface IEmailVariable {
  name: string; // Variable name, e.g., "userName"
  description: string; // Description of what this variable represents
  required: boolean; // Whether this variable must be provided
  example: string; // Example value
}

// Email template configuration
export interface IEmailConfig extends Document {
  key: string; // Unique identifier, e.g., "welcome-email", "password-reset"
  name: string; // Display name, e.g., "Welcome Email"
  description: string; // Description of when this email is sent
  category: 'transactional' | 'marketing' | 'alerts' | 'notifications' | 'reports';
  fromCategory: 'noreply' | 'alerts' | 'support' | 'inquiries'; // Which "from" address to use

  // Email content
  subject: string; // Email subject (can contain variables like {{userName}})
  preheaderText?: string; // Preview text shown in email clients

  // Template configuration
  headerTitle: string; // Title shown in email header
  headerSubtitle?: string; // Subtitle shown below header title
  headerGradient?: string; // CSS gradient for header, e.g., "linear-gradient(135deg, #0252CD 0%, #0369a1 100%)"
  headerEmoji?: string; // Emoji for header, e.g., "📊"

  // Body content - can use HTML with variables
  bodyTemplate: string; // Main email body template with HTML and {{variables}}

  // Footer configuration
  showUnsubscribe: boolean; // Whether to show unsubscribe link
  unsubscribeType?: string; // Type for unsubscribe, e.g., "weeklyStats", "propertyAlerts"
  footerReason?: string; // Reason shown in footer, e.g., "You're receiving this because..."

  // CTA button
  ctaEnabled: boolean; // Whether to show call-to-action button
  ctaText?: string; // Button text
  ctaUrl?: string; // Button URL (can contain variables)

  // Available variables
  variables: IEmailVariable[];

  // Status
  isActive: boolean; // Whether this email is enabled
  lastModified: Date;
  modifiedBy?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const emailVariableSchema = new Schema<IEmailVariable>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    required: { type: Boolean, default: true },
    example: { type: String, required: true },
  },
  { _id: false }
);

const emailConfigSchema = new Schema<IEmailConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['transactional', 'marketing', 'alerts', 'notifications', 'reports'],
      required: true,
    },
    fromCategory: {
      type: String,
      enum: ['noreply', 'alerts', 'support', 'inquiries'],
      default: 'noreply',
    },
    subject: {
      type: String,
      required: true,
    },
    preheaderText: {
      type: String,
    },
    headerTitle: {
      type: String,
      required: true,
    },
    headerSubtitle: {
      type: String,
    },
    headerGradient: {
      type: String,
      default: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    },
    headerEmoji: {
      type: String,
    },
    bodyTemplate: {
      type: String,
      required: true,
    },
    showUnsubscribe: {
      type: Boolean,
      default: true,
    },
    unsubscribeType: {
      type: String,
    },
    footerReason: {
      type: String,
    },
    ctaEnabled: {
      type: Boolean,
      default: false,
    },
    ctaText: {
      type: String,
    },
    ctaUrl: {
      type: String,
    },
    variables: [emailVariableSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
emailConfigSchema.index({ category: 1, isActive: 1 });
emailConfigSchema.index({ key: 1 });

export default mongoose.model<IEmailConfig>('EmailConfig', emailConfigSchema);
