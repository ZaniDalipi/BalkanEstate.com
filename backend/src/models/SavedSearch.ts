import mongoose, { Document, Schema } from 'mongoose';

export interface IFilters {
  query: string;
  country: string;
  listingType: 'any' | 'sale' | 'rent';
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  livingRooms: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  sortBy: string;
  sellerType: 'any' | 'agent' | 'private';
  propertyType: 'any' | 'house' | 'apartment' | 'villa' | 'luxury-villa' | 'land' | 'other';
  // Advanced filters
  minYearBuilt: number | null;
  maxYearBuilt: number | null;
  minParking: number | null;
  furnishing: string;
  heatingType: string;
  condition: string;
  viewType: string;
  energyRating: string;
  hasBalcony: boolean | null;
  hasGarden: boolean | null;
  hasElevator: boolean | null;
  hasSecurity: boolean | null;
  hasAirConditioning: boolean | null;
  hasPool: boolean | null;
  petsAllowed: boolean | null;
  minFloorNumber: number | null;
  maxFloorNumber: number | null;
  maxDistanceToCenter: number | null;
  maxDistanceToSea: number | null;
  maxDistanceToSchool: number | null;
  maxDistanceToHospital: number | null;
  amenities: string[];
}

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  filters: IFilters;
  drawnBoundsJSON: string | null;
  lastAccessed: Date;
  seenPropertyIds: string[];
  // Alert settings
  alertsEnabled: boolean;
  alertFrequency: 'instant' | 'daily' | 'weekly';
  lastAlertSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    drawnBoundsJSON: {
      type: String,
      default: null,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    seenPropertyIds: {
      type: [String],
      default: [],
    },
    // Alert settings
    alertsEnabled: {
      type: Boolean,
      default: true, // Enable by default for new saved searches
    },
    alertFrequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'instant',
    },
    lastAlertSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISavedSearch>('SavedSearch', SavedSearchSchema);
