import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISystemSettings extends Document {
  // General
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportEmail: string;
  timezone: string;
  dateFormat: string;
  currency: string;

  // Email
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  emailFromName: string;
  emailFromAddress: string;

  // Security
  requireEmailVerification: boolean;
  requireAgentVerification: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableTwoFactor: boolean;
  adminVPNRequired: boolean;

  // Notifications
  notifyNewUser: boolean;
  notifyNewProperty: boolean;
  notifyNewInquiry: boolean;
  notifyAgentVerification: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;

  // Pricing
  defaultCurrency: string;
  enableDiscounts: boolean;
  enablePromotions: boolean;
  maxDiscountPercent: number;
  minListingPrice: number;

  // Audit
  lastModified: Date;
  modifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ISystemSettingsModel extends Model<ISystemSettings> {
  getSettings(): Promise<ISystemSettings>;
}

const systemSettingsSchema = new Schema<ISystemSettings, ISystemSettingsModel>(
  {
    // General
    siteName: { type: String, default: 'BalkanEstate', trim: true },
    siteDescription: { type: String, default: 'Your trusted real estate platform in the Balkans', trim: true },
    contactEmail: { type: String, default: 'contact@balkanestateai.com', trim: true },
    supportEmail: { type: String, default: 'support@balkanestateai.com', trim: true },
    timezone: { type: String, default: 'Europe/Belgrade' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    currency: { type: String, default: 'EUR' },

    // Email
    smtpHost: { type: String, default: 'smtp.gmail.com', trim: true },
    smtpPort: { type: String, default: '587' },
    smtpSecure: { type: Boolean, default: true },
    emailFromName: { type: String, default: 'BalkanEstate', trim: true },
    emailFromAddress: { type: String, default: 'noreply@balkanestateai.com', trim: true },

    // Security
    requireEmailVerification: { type: Boolean, default: true },
    requireAgentVerification: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 30, min: 5, max: 120 },
    maxLoginAttempts: { type: Number, default: 5, min: 3, max: 10 },
    enableTwoFactor: { type: Boolean, default: false },
    adminVPNRequired: { type: Boolean, default: true },

    // Notifications
    notifyNewUser: { type: Boolean, default: true },
    notifyNewProperty: { type: Boolean, default: true },
    notifyNewInquiry: { type: Boolean, default: true },
    notifyAgentVerification: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false },
    weeklyReport: { type: Boolean, default: true },

    // Pricing
    defaultCurrency: { type: String, default: 'EUR' },
    enableDiscounts: { type: Boolean, default: true },
    enablePromotions: { type: Boolean, default: true },
    maxDiscountPercent: { type: Number, default: 50, min: 0, max: 100 },
    minListingPrice: { type: Number, default: 1000, min: 0 },

    // Audit
    lastModified: { type: Date, default: Date.now },
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getSettings = async function (): Promise<ISystemSettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<ISystemSettings, ISystemSettingsModel>(
  'SystemSettings',
  systemSettingsSchema
);
