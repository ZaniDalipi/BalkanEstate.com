import mongoose, { Document, Schema } from 'mongoose';

export interface IPropertyImage {
  url: string;
  publicId?: string; // Cloudinary public_id for image management and deletion (optional for backwards compatibility)
  tag: 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
}

export interface IProperty extends Document {
  sellerId: mongoose.Types.ObjectId;
  createdByName: string; // Name of the user who created this listing
  createdByEmail: string; // Email of the user who created this listing
  createdAsRole: 'private_seller' | 'agent'; // Which role context was used to create this listing
  createdByAgencyName?: string; // If created as agent, store agency name
  createdByLicenseNumber?: string; // If created as agent, store license number
  title?: string; // Optional title/headline for the property listing
  status: 'active' | 'pending' | 'sold' | 'draft';
  soldAt?: Date;
  price: number;
  address: string;
  city: string;
  country: string;
  beds: number;
  baths: number;
  livingRooms: number;
  sqft: number;
  yearBuilt: number;
  parking: number;
  description: string;
  specialFeatures: string[];
  materials: string[];
  tourUrl?: string;
  virtualTour360Url?: string; // URL for 360 virtual tour (e.g., Matterport, Kuula, etc.)
  hasVirtualTour360: boolean; // Flag indicating if 360 virtual tour is available
  imageUrl: string;
  imagePublicId?: string; // Cloudinary public_id for main image
  images: IPropertyImage[];
  lat: number;
  lng: number;
  propertyType: 'house' | 'apartment' | 'villa' | 'other';
  floorNumber?: number;
  totalFloors?: number;
  floorplanUrl?: string;
  floorplanPublicId?: string; // Cloudinary public_id for floorplan
  lastRenewed: Date;
  views: number;
  saves: number;
  inquiries: number;
  // Promotion fields
  isPromoted: boolean;
  promotionTier?: 'standard' | 'featured' | 'highlight' | 'premium';
  promotionStartDate?: Date;
  promotionEndDate?: Date;
  hasUrgentBadge?: boolean;
  // Amenities fields
  amenities: string[];
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasAirConditioning?: boolean;
  hasPool?: boolean;
  petsAllowed?: boolean;
  // Distance fields (in km)
  distanceToCenter?: number;
  distanceToSea?: number;
  distanceToSchool?: number;
  distanceToHospital?: number;
  // Advanced property features
  furnishing?: 'furnished' | 'semi-furnished' | 'unfurnished';
  heatingType?: 'central' | 'electric' | 'gas' | 'oil' | 'heat-pump' | 'solar' | 'wood' | 'none';
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
  viewType?: 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
  energyRating?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema: Schema = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdByName: {
      type: String,
      required: true,
      index: true,
    },
    createdByEmail: {
      type: String,
      required: true,
      index: true,
    },
    createdAsRole: {
      type: String,
      enum: ['private_seller', 'agent'],
      required: true,
      default: 'private_seller',
      index: true, // Index for filtering by role
    },
    createdByAgencyName: {
      type: String,
      required: false,
      index: true, // Index for agency listings
    },
    createdByLicenseNumber: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'draft'],
      default: 'active',
      index: true,
    },
    soldAt: {
      type: Date,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
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
    beds: {
      type: Number,
      required: true,
      min: 0,
    },
    baths: {
      type: Number,
      required: true,
      min: 0,
    },
    livingRooms: {
      type: Number,
      required: true,
      min: 0,
    },
    sqft: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    yearBuilt: {
      type: Number,
      required: true,
    },
    parking: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      required: true,
    },
    specialFeatures: {
      type: [String],
      default: [],
    },
    materials: {
      type: [String],
      default: [],
    },
    tourUrl: {
      type: String,
    },
    virtualTour360Url: {
      type: String,
    },
    hasVirtualTour360: {
      type: Boolean,
      default: false,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String }, // Optional for backwards compatibility
        tag: {
          type: String,
          enum: ['exterior', 'living_room', 'kitchen', 'bedroom', 'bathroom', 'other'],
          default: 'other',
        },
      },
    ],
    lat: {
      type: Number,
      required: true,
      index: true,
    },
    lng: {
      type: Number,
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      enum: ['house', 'apartment', 'villa', 'other'],
      required: true,
      index: true,
    },
    floorNumber: {
      type: Number,
    },
    totalFloors: {
      type: Number,
    },
    floorplanUrl: {
      type: String,
    },
    floorplanPublicId: {
      type: String,
    },
    lastRenewed: {
      type: Date,
      default: Date.now,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
    inquiries: {
      type: Number,
      default: 0,
    },
    // Promotion fields
    isPromoted: {
      type: Boolean,
      default: false,
      index: true,
    },
    promotionTier: {
      type: String,
      enum: ['standard', 'featured', 'highlight', 'premium'],
      index: true,
    },
    promotionStartDate: {
      type: Date,
    },
    promotionEndDate: {
      type: Date,
    },
    hasUrgentBadge: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Amenities fields
    amenities: {
      type: [String],
      default: [],
      index: true,
    },
    hasBalcony: {
      type: Boolean,
    },
    hasGarden: {
      type: Boolean,
    },
    hasElevator: {
      type: Boolean,
    },
    hasSecurity: {
      type: Boolean,
    },
    hasAirConditioning: {
      type: Boolean,
    },
    hasPool: {
      type: Boolean,
    },
    petsAllowed: {
      type: Boolean,
    },
    // Distance fields (in km)
    distanceToCenter: {
      type: Number,
      min: 0,
    },
    distanceToSea: {
      type: Number,
      min: 0,
    },
    distanceToSchool: {
      type: Number,
      min: 0,
    },
    distanceToHospital: {
      type: Number,
      min: 0,
    },
    // Advanced property features
    furnishing: {
      type: String,
      enum: ['furnished', 'semi-furnished', 'unfurnished'],
      index: true,
    },
    heatingType: {
      type: String,
      enum: ['central', 'electric', 'gas', 'oil', 'heat-pump', 'solar', 'wood', 'none'],
      index: true,
    },
    condition: {
      type: String,
      enum: ['new', 'excellent', 'good', 'fair', 'needs-renovation'],
      index: true,
    },
    viewType: {
      type: String,
      enum: ['sea', 'mountain', 'city', 'park', 'garden', 'street'],
      index: true,
    },
    energyRating: {
      type: String,
      enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for location-based queries
PropertySchema.index({ lat: 1, lng: 1 });
// Index for price range queries
PropertySchema.index({ price: 1, status: 1 });
// Index for property type and city queries
PropertySchema.index({ propertyType: 1, city: 1, status: 1 });
// Index for promoted properties
PropertySchema.index({ isPromoted: 1, status: 1 });
// Index for promoted properties by tier (for sorting)
PropertySchema.index({ promotionTier: 1, isPromoted: 1, promotionEndDate: 1 });
// Index for urgent properties
PropertySchema.index({ hasUrgentBadge: 1, isPromoted: 1 });

export default mongoose.model<IProperty>('Property', PropertySchema);
