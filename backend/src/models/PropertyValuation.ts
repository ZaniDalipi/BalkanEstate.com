import mongoose, { Document, Schema } from 'mongoose';

export interface IComparableProperty {
  address: string;
  city: string;
  price: number;
  sqft: number;
  pricePerSqm: number;
  beds: number;
  baths: number;
  propertyType: string;
  soldDate?: Date;
  adjustedValue?: number;
  adjustmentReason?: string;
}

export interface IValuationBreakdown {
  baseValue: number;
  locationAdjustment: number;
  conditionAdjustment: number;
  amenitiesAdjustment: number;
  marketTrendAdjustment: number;
  sizeAdjustment: number;
  ageAdjustment: number;
}

export interface IPropertyValuation extends Document {
  // User who requested the valuation (optional for anonymous use)
  userId?: mongoose.Types.ObjectId;

  // Property details
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;

  // Property characteristics
  propertyType: 'house' | 'apartment' | 'villa' | 'land' | 'other';
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt?: number;
  condition?: 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';

  // Optional features
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasPool?: boolean;
  floorNumber?: number;
  totalFloors?: number;
  viewType?: 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
  energyRating?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  furnishing?: 'furnished' | 'semi-furnished' | 'unfurnished';

  // Valuation results
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  pricePerSqm: number;
  confidenceScore: number; // 0-100

  // Breakdown of valuation factors
  breakdown: IValuationBreakdown;

  // Comparable properties used for valuation
  comparables: IComparableProperty[];

  // Market insights
  marketTrend: 'rising' | 'stable' | 'declining';
  avgDaysOnMarket: number;
  demandScore: number; // 0-100

  // AI-generated insights
  aiInsights: string;

  // Metadata
  dataSource: 'ai' | 'calculated' | 'manual';
  createdAt: Date;
  expiresAt: Date;
}

const ComparablePropertySchema = new Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  price: { type: Number, required: true },
  sqft: { type: Number, required: true },
  pricePerSqm: { type: Number, required: true },
  beds: { type: Number },
  baths: { type: Number },
  propertyType: { type: String },
  soldDate: { type: Date },
  adjustedValue: { type: Number },
  adjustmentReason: { type: String },
}, { _id: false });

const ValuationBreakdownSchema = new Schema({
  baseValue: { type: Number, required: true },
  locationAdjustment: { type: Number, default: 0 },
  conditionAdjustment: { type: Number, default: 0 },
  amenitiesAdjustment: { type: Number, default: 0 },
  marketTrendAdjustment: { type: Number, default: 0 },
  sizeAdjustment: { type: Number, default: 0 },
  ageAdjustment: { type: Number, default: 0 },
}, { _id: false });

const PropertyValuationSchema = new Schema<IPropertyValuation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  // Location
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
  lat: {
    type: Number,
  },
  lng: {
    type: Number,
  },

  // Property characteristics
  propertyType: {
    type: String,
    enum: ['house', 'apartment', 'villa', 'land', 'other'],
    required: true,
    index: true,
  },
  sqft: {
    type: Number,
    required: true,
    min: 1,
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
  yearBuilt: {
    type: Number,
  },
  condition: {
    type: String,
    enum: ['new', 'excellent', 'good', 'fair', 'needs-renovation'],
  },

  // Optional features
  hasBalcony: { type: Boolean },
  hasGarden: { type: Boolean },
  hasElevator: { type: Boolean },
  hasParking: { type: Boolean },
  hasPool: { type: Boolean },
  floorNumber: { type: Number },
  totalFloors: { type: Number },
  viewType: {
    type: String,
    enum: ['sea', 'mountain', 'city', 'park', 'garden', 'street'],
  },
  energyRating: {
    type: String,
    enum: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
  },
  furnishing: {
    type: String,
    enum: ['furnished', 'semi-furnished', 'unfurnished'],
  },

  // Valuation results
  estimatedValue: {
    type: Number,
    required: true,
    min: 0,
  },
  valueLow: {
    type: Number,
    required: true,
    min: 0,
  },
  valueHigh: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerSqm: {
    type: Number,
    required: true,
    min: 0,
  },
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },

  // Breakdown
  breakdown: {
    type: ValuationBreakdownSchema,
    required: true,
  },

  // Comparables
  comparables: [ComparablePropertySchema],

  // Market insights
  marketTrend: {
    type: String,
    enum: ['rising', 'stable', 'declining'],
    required: true,
  },
  avgDaysOnMarket: {
    type: Number,
    default: 0,
  },
  demandScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },

  // AI insights
  aiInsights: {
    type: String,
    required: true,
  },

  // Metadata
  dataSource: {
    type: String,
    enum: ['ai', 'calculated', 'manual'],
    default: 'ai',
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
PropertyValuationSchema.index({ city: 1, country: 1, propertyType: 1 });
PropertyValuationSchema.index({ createdAt: -1 });
PropertyValuationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const PropertyValuation = mongoose.model<IPropertyValuation>('PropertyValuation', PropertyValuationSchema);

export default PropertyValuation;
