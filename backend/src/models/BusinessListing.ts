import mongoose, { Document, Schema } from 'mongoose';

// Business categories relevant to the real estate sector
export const BUSINESS_CATEGORIES = [
  'construction',
  'renovation',
  'cleaning',
  'moving',
  'interior_design',
  'architecture',
  'plumbing',
  'electrical',
  'landscaping',
  'security',
  'real_estate_law',
  'insurance',
  'home_inspection',
  'pest_control',
  'painting',
  'roofing',
  'hvac',
  'furniture',
  'appliances',
  'other',
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

export const LISTING_TYPES = ['business', 'individual'] as const;
export type ListingType = typeof LISTING_TYPES[number];

export interface IBusinessListing extends Document {
  owner: mongoose.Types.ObjectId;
  listingType: ListingType;
  name: string;
  slug: string;
  description?: string;
  category: BusinessCategory;
  customCategory?: string;
  services: string[];
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  logoPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  whatsapp?: string;
  viber?: string;
  languages?: string[];
  yearEstablished?: number;
  licenseNumber?: string;
  serviceAreas?: string[];
  priceRange?: string;
  paymentMethods?: string[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  isActive: boolean;
  isVerified: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessListingSchema: Schema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
      index: true,
    },
    slug: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    listingType: {
      type: String,
      enum: {
        values: LISTING_TYPES,
        message: 'Invalid listing type: {VALUE}',
      },
      default: 'business',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: BUSINESS_CATEGORIES,
        message: 'Invalid category: {VALUE}',
      },
      index: true,
    },
    customCategory: {
      type: String,
      trim: true,
      maxlength: [100, 'Custom category cannot exceed 100 characters'],
    },
    services: [{
      type: String,
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    }],
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      index: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    bannerUrl: { type: String },
    bannerPublicId: { type: String },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: [30, 'WhatsApp number cannot exceed 30 characters'],
    },
    viber: {
      type: String,
      trim: true,
      maxlength: [30, 'Viber number cannot exceed 30 characters'],
    },
    languages: [{
      type: String,
      trim: true,
      maxlength: [50, 'Language name cannot exceed 50 characters'],
    }],
    yearEstablished: {
      type: Number,
      min: [1900, 'Year must be 1900 or later'],
      max: [new Date().getFullYear(), 'Year cannot be in the future'],
    },
    licenseNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'License number cannot exceed 100 characters'],
    },
    serviceAreas: [{
      type: String,
      trim: true,
      maxlength: [100, 'Service area name cannot exceed 100 characters'],
    }],
    priceRange: {
      type: String,
      enum: {
        values: ['$', '$$', '$$$'],
        message: 'Invalid price range: {VALUE}',
      },
    },
    paymentMethods: [{
      type: String,
      enum: {
        values: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'crypto', 'invoice'],
        message: 'Invalid payment method: {VALUE}',
      },
    }],
    socialMedia: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      tiktok: { type: String, trim: true },
    },
    businessHours: {
      monday: { type: String, trim: true },
      tuesday: { type: String, trim: true },
      wednesday: { type: String, trim: true },
      thursday: { type: String, trim: true },
      friday: { type: String, trim: true },
      saturday: { type: String, trim: true },
      sunday: { type: String, trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.logoPublicId;
        delete ret.bannerPublicId;
        return ret;
      },
    },
    toObject: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Text index for search
BusinessListingSchema.index({ name: 'text', description: 'text', services: 'text' });

// Compound index for common queries
BusinessListingSchema.index({ category: 1, city: 1, isActive: 1 });
BusinessListingSchema.index({ country: 1, city: 1, isActive: 1 });

// Generate slug before saving
BusinessListingSchema.pre<IBusinessListing>('save', async function (next) {
  if (!this.slug || this.isModified('name') || this.isModified('country')) {
    const baseSlug = `${this.country}-${this.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const BusinessListingModel = this.constructor as any;
    let slug = baseSlug;
    let attempts = 0;
    while (await BusinessListingModel.findOne({ slug, _id: { $ne: this._id } }).lean()) {
      attempts++;
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${baseSlug}-${suffix}`;
      if (attempts > 10) break;
    }
    this.slug = slug;
  }
  next();
});

const BusinessListing = mongoose.model<IBusinessListing>('BusinessListing', BusinessListingSchema);

export default BusinessListing;
