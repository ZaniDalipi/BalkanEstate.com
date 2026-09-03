import mongoose, { Document, Schema } from 'mongoose';
import { PROPERTY_TYPES, type PropertyType } from '../config/propertyTypes';
import {
  CONSTRUCTION_STATUSES,
  ConstructionStatus,
  normalizeConstructionFields,
} from '../utils/constructionStatus';

export interface IPropertyImage {
  url: string;
  publicId?: string; // Cloudinary public_id for image management and deletion (optional for backwards compatibility)
  tag: 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
}

// Price interval for time-based pricing
export interface IPriceInterval {
  price: number;
  startDate: Date;
  endDate?: Date;
  label?: string; // Optional label like "Summer Sale", "Holiday Special"
}

// Rental history entry for tracking past rental periods
export interface IRentalHistoryEntry {
  startDate: Date;
  endDate: Date;
  monthlyRent: number; // Normalized to monthly equivalent
  tenantName?: string;
  notes?: string;
}

// Visit availability - seller-defined time windows for property viewings
export interface IVisitAvailability {
  enabled: boolean;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "18:00"
  slotDurationMinutes: number; // e.g. 30
  notes?: string; // e.g. "Ring bell at gate"
}

export interface IProperty extends Document {
  sellerId: mongoose.Types.ObjectId;
  createdByName: string; // Name of the user who created this listing
  createdByEmail: string; // Email of the user who created this listing
  createdAsRole: 'private_seller' | 'agent' | 'external'; // Which role context was used to create this listing
  createdByAgencyName?: string; // If created as agent, store agency name
  createdByAgencyId?: mongoose.Types.ObjectId; // If created as agent, direct reference to Agency document
  createdByLicenseNumber?: string; // If created as agent, store license number
  propertyId?: string; // Custom property ID assigned by the agency/agent for internal tracking
  listingType: 'sale' | 'rent'; // Whether this property is for sale or rent
  title?: string; // Optional title/headline for the property listing
  status: 'active' | 'pending' | 'sold' | 'rented' | 'draft';
  // Luxury-villa listings are curated: they stay hidden from the public
  // Luxury Villas tab until an admin approves them. Only applicable when
  // propertyType === 'luxury-villa'.
  villaApprovalStatus?: 'pending' | 'approved' | 'rejected';
  villaApprovalReviewedBy?: string;
  villaApprovalReviewedAt?: Date;
  villaApprovalReason?: string;
  soldAt?: Date;
  price: number;
  isNegotiable?: boolean; // When true, price is "By Negotiation" (price field can be 0)
  // Price discount fields
  originalPrice?: number; // Original price before discount
  priceReducedAt?: Date; // When price was reduced
  priceIntervals?: IPriceInterval[]; // Time-based pricing intervals
  address: string;
  city: string;
  country: string;
  beds: number;
  baths: number;
  livingRooms: number;
  kitchens?: number;
  diningRooms?: number;
  toilets?: number;
  storageRooms?: number;
  offices?: number;
  sqft: number;
  /** On an under-construction listing this mirrors `expectedCompletionYear`. */
  yearBuilt: number;
  constructionStatus?: ConstructionStatus;
  expectedCompletionYear?: number | null;
  parking: number;
  description: string;
  specialFeatures: string[];
  materials: string[];
  tourUrl?: string;
  virtualTour360Url?: string; // URL for 360 virtual tour (e.g., Matterport, Kuula, etc.)
  hasVirtualTour360: boolean; // Flag indicating if 360 virtual tour is available
  videoUrl?: string; // URL for embedded video (YouTube, TikTok, Instagram, Vimeo, etc.)
  // Generated video fields (auto-generated property showcase video)
  generatedVideoUrl?: string; // URL for the auto-generated property video
  generatedVideoPublicId?: string; // Cloudinary public_id for the generated video
  generatedVideoFormat?: 'vertical' | 'horizontal' | 'square'; // Video format
  generatedVideoDuration?: number; // Duration in seconds
  hasGeneratedVideo: boolean; // Flag indicating if generated video is available
  imageUrl: string;
  imagePublicId?: string; // Cloudinary public_id for main image
  images: IPropertyImage[];
  lat: number;
  lng: number;
  propertyType: PropertyType;
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
  // Building orientation (compass direction the property faces)
  orientation?: 'north' | 'south' | 'east' | 'west' | 'northEast' | 'northWest' | 'southEast' | 'southWest';
  // Rental-specific fields (only applicable when listingType === 'rent')
  rentPeriod?: 'monthly' | 'weekly' | 'daily'; // How rent is charged
  securityDeposit?: number; // Security deposit amount
  minimumLeaseDuration?: number; // Minimum lease in months
  maximumLeaseDuration?: number; // Maximum lease in months
  availableFrom?: Date; // When the property is available for move-in
  utilitiesIncluded?: boolean; // Whether utilities (water, electricity, etc.) are included in rent
  internetIncluded?: boolean; // Whether internet is included
  tenantRequirements?: string[]; // e.g. ['no_smoking', 'no_pets', 'references_required', 'employed']
  maxOccupants?: number; // Maximum number of occupants allowed
  rentedAt?: Date; // When the property was rented
  rentedUntil?: Date; // When the rental period ends
  currentTenantName?: string; // Name of current tenant (private, owner-only)
  currentRentalNotes?: string; // Private notes about the current rental
  rentalHistory?: IRentalHistoryEntry[]; // Past rental periods for income tracking
  // Daily rental fields (short-stay / luxury villa)
  checkInTime?: string;
  checkOutTime?: string;
  cleaningFee?: number;
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict' | 'non-refundable';
  breakfastIncluded?: boolean;
  towelsIncluded?: boolean;
  parkingIncluded?: boolean;
  // Visit/viewing availability
  visitAvailability?: IVisitAvailability;
  // External-source ingestion fields (set when listing was imported from a third-party site)
  source?: string;
  sourceListingId?: string;
  sourceUrl?: string;
  sourceFetchedAt?: Date;
  sourceMetadata?: Record<string, unknown>;
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
      enum: ['private_seller', 'agent', 'external'],
      required: true,
      default: 'private_seller',
      index: true, // Index for filtering by role
    },
    createdByAgencyName: {
      type: String,
      required: false,
      index: true, // Index for agency listings
    },
    createdByAgencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: false,
      index: true, // Index for querying all properties of an agency
    },
    createdByLicenseNumber: {
      type: String,
      required: false,
    },
    propertyId: {
      type: String,
      required: false,
      trim: true,
      maxlength: 50,
      index: true,
    },
    listingType: {
      type: String,
      enum: ['sale', 'rent'],
      default: 'sale',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'rented', 'draft'],
      default: 'active',
      index: true,
    },
    // Admin curation for luxury villas — see interface for details
    villaApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      index: true,
    },
    villaApprovalReviewedBy: { type: String },
    villaApprovalReviewedAt: { type: Date },
    villaApprovalReason: { type: String, maxlength: 1000 },
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
    isNegotiable: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Price discount fields
    originalPrice: {
      type: Number,
      min: 0,
    },
    priceReducedAt: {
      type: Date,
      index: true,
    },
    priceIntervals: [
      {
        price: { type: Number, required: true, min: 0 },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        label: { type: String },
      },
    ],
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
    kitchens: {
      type: Number,
      min: 0,
      default: 0,
    },
    diningRooms: {
      type: Number,
      min: 0,
      default: 0,
    },
    toilets: {
      type: Number,
      min: 0,
      default: 0,
    },
    storageRooms: {
      type: Number,
      min: 0,
      default: 0,
    },
    offices: {
      type: Number,
      min: 0,
      default: 0,
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
    // Construction state. Legacy documents have neither field; they read as
    // 'ready', which is what they are. The pair is kept consistent by the
    // pre-validate hook below rather than by two independent field validators,
    // because either field alone is always valid — it is the combination that
    // can be wrong.
    constructionStatus: {
      type: String,
      enum: CONSTRUCTION_STATUSES,
      default: 'ready',
      index: true,
    },
    expectedCompletionYear: {
      type: Number,
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
    videoUrl: {
      type: String,
    },
    // Generated video fields
    generatedVideoUrl: {
      type: String,
    },
    generatedVideoPublicId: {
      type: String,
    },
    generatedVideoFormat: {
      type: String,
      enum: ['vertical', 'horizontal', 'square'],
    },
    generatedVideoDuration: {
      type: Number,
      min: 0,
    },
    hasGeneratedVideo: {
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
      enum: [...PROPERTY_TYPES],
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
    // Building orientation (compass direction the property faces)
    orientation: {
      type: String,
      enum: ['north', 'south', 'east', 'west', 'northEast', 'northWest', 'southEast', 'southWest'],
    },
    // Rental-specific fields
    rentPeriod: {
      type: String,
      enum: ['monthly', 'weekly', 'daily'],
      default: 'monthly',
    },
    securityDeposit: {
      type: Number,
      min: 0,
    },
    minimumLeaseDuration: {
      type: Number,
      min: 1,
    },
    maximumLeaseDuration: {
      type: Number,
      min: 1,
    },
    availableFrom: {
      type: Date,
      index: true,
    },
    utilitiesIncluded: {
      type: Boolean,
    },
    internetIncluded: {
      type: Boolean,
    },
    tenantRequirements: {
      type: [String],
      default: [],
    },
    maxOccupants: {
      type: Number,
      min: 1,
    },
    rentedAt: {
      type: Date,
      index: true,
    },
    rentedUntil: {
      type: Date,
    },
    currentTenantName: {
      type: String,
    },
    currentRentalNotes: {
      type: String,
    },
    rentalHistory: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        monthlyRent: { type: Number, required: true, min: 0 },
        tenantName: { type: String },
        notes: { type: String },
      },
    ],
    // Daily rental fields (short-stay / luxury villa)
    checkInTime: { type: String },
    checkOutTime: { type: String },
    cleaningFee: { type: Number, min: 0 },
    cancellationPolicy: {
      type: String,
      enum: ['flexible', 'moderate', 'strict', 'non-refundable'],
    },
    breakfastIncluded: { type: Boolean },
    towelsIncluded: { type: Boolean },
    parkingIncluded: { type: Boolean },
    // Visit/viewing availability
    visitAvailability: {
      enabled: { type: Boolean, default: false },
      days: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      slotDurationMinutes: { type: Number, default: 30 },
      notes: { type: String },
    },
    // External ingestion fields
    source: {
      type: String,
      index: true,
    },
    sourceListingId: {
      type: String,
    },
    sourceUrl: {
      type: String,
    },
    sourceFetchedAt: {
      type: Date,
    },
    sourceMetadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Keep the construction pair consistent on every write path — create, update,
 * import and admin edit alike — instead of at each call site.
 *
 * The completion year is optional, so the only rejection is a value that is
 * not a year. Everything else is coerced: an unknown status becomes 'ready',
 * a stray completion year on a ready listing is cleared, and an explicit
 * `null` (how the client says "no handover date") is unset.
 */
PropertySchema.pre('validate', function (next) {
  const doc = this as unknown as IProperty;

  const result = normalizeConstructionFields({
    constructionStatus: doc.constructionStatus,
    expectedCompletionYear: doc.expectedCompletionYear,
    yearBuilt: doc.yearBuilt,
  });

  if (!result.ok) {
    this.invalidate('expectedCompletionYear', result.error);
    return next();
  }

  doc.constructionStatus = result.fields.constructionStatus;
  doc.expectedCompletionYear = result.fields.expectedCompletionYear;
  if (result.fields.yearBuilt !== undefined) {
    doc.yearBuilt = result.fields.yearBuilt;
  }
  next();
});

// Compound index for location-based queries
PropertySchema.index({ lat: 1, lng: 1 });
// Index for price range queries
PropertySchema.index({ price: 1, status: 1 });
// Index for property type and city queries
PropertySchema.index({ propertyType: 1, city: 1, status: 1 });
// Luxury-villa approval queue + public "approved only" villa listing
PropertySchema.index({ propertyType: 1, villaApprovalStatus: 1, status: 1 });
// Index for promoted properties
PropertySchema.index({ isPromoted: 1, status: 1 });
// Index for promoted properties by tier (for sorting)
PropertySchema.index({ promotionTier: 1, isPromoted: 1, promotionEndDate: 1 });
// Index for urgent properties
PropertySchema.index({ hasUrgentBadge: 1, isPromoted: 1 });
// Index for price-reduced properties
PropertySchema.index({ priceReducedAt: 1, status: 1 });
// Index for listing type filtering (sale vs rent)
PropertySchema.index({ listingType: 1, status: 1 });
// Compound index for rental searches
PropertySchema.index({ listingType: 1, propertyType: 1, city: 1, status: 1 });

// Text index for full-text search on title, description, address, and city
// Weights prioritize title and city matches over description
PropertySchema.index(
  { title: 'text', city: 'text', address: 'text', description: 'text' },
  { weights: { title: 10, city: 5, address: 3, description: 1 }, name: 'text_search_index' }
);

// Compound index for cursor-based pagination (createdAt + _id for tie-breaking)
PropertySchema.index({ status: 1, createdAt: -1, _id: -1 });

// Compound indexes for 100k-scale query patterns
// Price range queries filtered by city (common search pattern)
PropertySchema.index({ city: 1, price: 1, status: 1 });
// Price range queries filtered by country
PropertySchema.index({ country: 1, price: 1, status: 1 });
// Listing type + price sort (sale/rent filtered by price)
PropertySchema.index({ listingType: 1, price: 1, status: 1 });
// Seller's own listings sorted by creation date
PropertySchema.index({ sellerId: 1, status: 1, createdAt: -1 });
// Default sort order (lastRenewed) with status filter — covers the most common query
PropertySchema.index({ status: 1, lastRenewed: -1 });

// Idempotent upsert key for externally ingested listings.
// Partial filter ensures the unique constraint only applies to imported docs (those with `source` set).
PropertySchema.index(
  { source: 1, sourceListingId: 1 },
  {
    unique: true,
    partialFilterExpression: { source: { $exists: true, $type: 'string' } },
    name: 'source_listing_unique',
  }
);

export default mongoose.model<IProperty>('Property', PropertySchema);
