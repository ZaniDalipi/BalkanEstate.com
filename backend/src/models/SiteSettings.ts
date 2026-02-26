import mongoose, { Document, Schema, Model } from 'mongoose';

// Social media links
export interface ISocialLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
}

// Email brand color palette
export interface IEmailBrandColors {
  primary: string;
  primaryDark: string;
  accent: string;
  text: string;
  textMuted: string;
  background: string;
  backgroundAlt: string;
}

// Email footer link
export interface IEmailFooterLink {
  label: string;
  url: string;
}

export interface ISiteSettings extends Document {
  // Branding
  companyName: string;
  companyNameFormatted: string;
  logoUrl: string;
  faviconUrl: string;

  // Contact Information
  supportEmail: string;
  noReplyEmail: string;
  alertsEmail: string;
  inquiriesEmail: string;
  contactPhone: string;

  // URLs
  frontendUrl: string;
  backendUrl: string;

  // Social Media Links
  socialLinks: ISocialLinks;

  // Email Branding
  emailLogoUrl: string;
  emailBrandColors: IEmailBrandColors;

  // Email Footer
  emailFooterText: string;
  emailFooterLinks: IEmailFooterLink[];

  // SEO / Meta
  siteTitle: string;
  siteDescription: string;

  // Timestamps
  lastModified: Date;
  modifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ISiteSettingsModel extends Model<ISiteSettings> {
  getSettings(): Promise<ISiteSettings>;
}

const emailFooterLinkSchema = new Schema<IEmailFooterLink>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<ISiteSettings, ISiteSettingsModel>(
  {
    // Branding
    companyName: {
      type: String,
      default: 'BalkanEstate',
      trim: true,
    },
    companyNameFormatted: {
      type: String,
      default: 'BalkanEstate<sup>AI</sup>',
    },
    logoUrl: {
      type: String,
      default: 'https://balkanestateai.com/logo.png',
    },
    faviconUrl: {
      type: String,
      default: '/icons/favicon-32x32.png',
    },

    // Contact Information
    supportEmail: {
      type: String,
      default: 'support@balkanestateai.com',
      trim: true,
    },
    noReplyEmail: {
      type: String,
      default: 'noreply@balkanestateai.com',
      trim: true,
    },
    alertsEmail: {
      type: String,
      default: 'alerts@balkanestateai.com',
      trim: true,
    },
    inquiriesEmail: {
      type: String,
      default: 'inquiries@balkanestateai.com',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '+389 71 967 915',
      trim: true,
    },

    // URLs
    frontendUrl: {
      type: String,
      default: 'https://balkanestate.com',
      trim: true,
    },
    backendUrl: {
      type: String,
      default: 'https://api.balkanestate.com',
      trim: true,
    },

    // Social Media Links
    socialLinks: {
      facebook: {
        type: String,
        default: 'https://facebook.com/balkanestateai',
      },
      instagram: {
        type: String,
        default: 'https://www.instagram.com/balkanestateai/',
      },
      twitter: {
        type: String,
        default: 'https://twitter.com/balkanestate',
      },
      linkedin: {
        type: String,
        default: '',
      },
      youtube: {
        type: String,
        default: '',
      },
    },

    // Email Branding
    emailLogoUrl: {
      type: String,
      default: 'https://balkanestateai.com/logo.png',
    },
    emailBrandColors: {
      primary: {
        type: String,
        default: '#0252CD',
      },
      primaryDark: {
        type: String,
        default: '#0142a8',
      },
      accent: {
        type: String,
        default: '#10b981',
      },
      text: {
        type: String,
        default: '#1f2937',
      },
      textMuted: {
        type: String,
        default: '#6b7280',
      },
      background: {
        type: String,
        default: '#ffffff',
      },
      backgroundAlt: {
        type: String,
        default: '#f9fafb',
      },
    },

    // Email Footer
    emailFooterText: {
      type: String,
      default: 'All rights reserved.',
    },
    emailFooterLinks: {
      type: [emailFooterLinkSchema],
      default: [
        { label: 'Website', url: 'https://balkanestate.com' },
        { label: 'Contact Support', url: 'mailto:support@balkanestateai.com' },
      ],
    },

    // SEO / Meta
    siteTitle: {
      type: String,
      default: 'BalkanEstateAI - Property for Sale in the Balkans | Houses, Apartments & Villas',
      trim: true,
    },
    siteDescription: {
      type: String,
      default:
        'Find your dream property in the Balkans with AI. Browse houses, apartments, and villas for sale across Serbia, Montenegro, Croatia, Bosnia, North Macedonia, and Albania.',
      trim: true,
    },

    // Timestamps
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

/**
 * Returns the singleton SiteSettings document.
 * Creates one with defaults if none exists.
 */
siteSettingsSchema.statics.getSettings = async function (): Promise<ISiteSettings> {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<ISiteSettings, ISiteSettingsModel>(
  'SiteSettings',
  siteSettingsSchema
);
