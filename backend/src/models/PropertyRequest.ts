import mongoose, { Document, Schema } from 'mongoose';

export interface IPropertyRequest extends Document {
  // Requester info
  userId?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  source: 'website' | 'telegram';

  // Property preferences
  listingType: 'sale' | 'rent';
  propertyType: 'any' | 'house' | 'apartment' | 'villa' | 'land' | 'other';
  country?: string;
  city?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  amenities?: string[];
  additionalNotes?: string;

  // Status tracking
  status: 'active' | 'matched' | 'closed' | 'expired';
  matchedProperties?: mongoose.Types.ObjectId[];
  responseCount: number;

  // Timestamps
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyRequestSchema: Schema = new Schema(
  {
    // Requester info
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    telegramUsername: {
      type: String,
      trim: true,
    },
    telegramChatId: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['website', 'telegram'],
      default: 'website',
    },

    // Property preferences
    listingType: {
      type: String,
      enum: ['sale', 'rent'],
      required: true,
    },
    propertyType: {
      type: String,
      enum: ['any', 'house', 'apartment', 'villa', 'land', 'other'],
      default: 'any',
    },
    country: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    minPrice: {
      type: Number,
    },
    maxPrice: {
      type: Number,
    },
    minBeds: {
      type: Number,
    },
    minBaths: {
      type: Number,
    },
    minSqft: {
      type: Number,
    },
    maxSqft: {
      type: Number,
    },
    amenities: {
      type: [String],
      default: [],
    },
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'matched', 'closed', 'expired'],
      default: 'active',
    },
    matchedProperties: [{
      type: Schema.Types.ObjectId,
      ref: 'Property',
    }],
    responseCount: {
      type: Number,
      default: 0,
    },

    // Expiration (30 days default)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PropertyRequestSchema.index({ status: 1, createdAt: -1 });
PropertyRequestSchema.index({ userId: 1, status: 1 });
PropertyRequestSchema.index({ listingType: 1, propertyType: 1, status: 1 });
PropertyRequestSchema.index({ country: 1, city: 1, status: 1 });
PropertyRequestSchema.index({ source: 1, status: 1 });

export default mongoose.model<IPropertyRequest>('PropertyRequest', PropertyRequestSchema);
