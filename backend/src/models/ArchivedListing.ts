import mongoose, { Document, Schema } from 'mongoose';

export interface IArchivedListing extends Document {
  // Original property reference
  originalPropertyId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  sellerEmail: string;
  createdAsRole: 'private_seller' | 'agent';
  createdByAgencyName?: string;
  createdByAgencyId?: mongoose.Types.ObjectId;

  // Archive reason
  archiveReason: 'deleted' | 'sold' | 'rented';
  archivedAt: Date;

  // Property details (snapshot at time of archival)
  title?: string;
  listingType: 'sale' | 'rent';
  status: 'deleted' | 'sold' | 'rented';
  price: number;
  address: string;
  city: string;
  country: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  livingRooms?: number;
  sqft?: number;
  yearBuilt?: number;
  description?: string;

  // Single thumbnail image (archived with reduced storage)
  thumbnailUrl?: string;
  thumbnailPublicId?: string;

  // Sale/rental details
  soldAt?: Date;
  rentedAt?: Date;
  salePrice?: number;

  // Metrics at time of archival
  totalViews: number;
  totalSaves: number;
  daysOnMarket: number;

  // Original dates
  originalCreatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ArchivedListingSchema: Schema = new Schema(
  {
    originalPropertyId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
    },
    createdAsRole: {
      type: String,
      enum: ['private_seller', 'agent'],
      required: true,
    },
    createdByAgencyName: String,
    createdByAgencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
    },

    archiveReason: {
      type: String,
      enum: ['deleted', 'sold', 'rented'],
      required: true,
    },
    archivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    title: String,
    listingType: {
      type: String,
      enum: ['sale', 'rent'],
      required: true,
    },
    status: {
      type: String,
      enum: ['deleted', 'sold', 'rented'],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      required: true,
    },
    beds: Number,
    baths: Number,
    livingRooms: Number,
    sqft: Number,
    yearBuilt: Number,
    description: String,

    thumbnailUrl: String,
    thumbnailPublicId: String,

    soldAt: Date,
    rentedAt: Date,
    salePrice: Number,

    totalViews: {
      type: Number,
      default: 0,
    },
    totalSaves: {
      type: Number,
      default: 0,
    },
    daysOnMarket: {
      type: Number,
      default: 0,
    },

    originalCreatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ArchivedListingSchema.index({ sellerId: 1, archivedAt: -1 });
ArchivedListingSchema.index({ archiveReason: 1, archivedAt: -1 });
ArchivedListingSchema.index({ city: 1, country: 1 });

export default mongoose.model<IArchivedListing>('ArchivedListing', ArchivedListingSchema);
