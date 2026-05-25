import mongoose, { Document, Schema } from 'mongoose';

export interface ISuburbStats {
  avgPricePerSqm: number;
  priceVsCityAvg: number;
  priceGrowthYoY: number;
  medianPrice: number;
  rentalYield: number;
  demandScore: number;
  listingsCount: number;
  daysOnMarket: number;
  propertyMix: { apartments: number; houses: number; commercial: number };
  highlights: string[];
}

export interface ISuburbEntry {
  name: string;
  nameLocal?: string;
  center: { lat: number; lng: number };
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  stats: ISuburbStats;
  rank: number;
}

export interface ISuburbData extends Document {
  city: string;
  country: string;
  countryCode: string;
  suburbs: ISuburbEntry[];
  cityAvgPricePerSqm: number;
  lastUpdated: Date;
  dataSource: 'gemini' | 'fallback';
}

const SuburbStatsSchema = new Schema<ISuburbStats>(
  {
    avgPricePerSqm: { type: Number, required: true },
    priceVsCityAvg: { type: Number, required: true },
    priceGrowthYoY: { type: Number, required: true },
    medianPrice: { type: Number, required: true },
    rentalYield: { type: Number, required: true },
    demandScore: { type: Number, required: true, min: 0, max: 100 },
    listingsCount: { type: Number, required: true },
    daysOnMarket: { type: Number, required: true },
    propertyMix: {
      apartments: { type: Number, required: true },
      houses: { type: Number, required: true },
      commercial: { type: Number, required: true },
    },
    highlights: [{ type: String }],
  },
  { _id: false }
);

const SuburbEntrySchema = new Schema<ISuburbEntry>(
  {
    name: { type: String, required: true },
    nameLocal: { type: String },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    polygon: {
      type: { type: String, enum: ['Polygon'], required: true },
      coordinates: { type: [[[Number]]], required: true },
    },
    stats: { type: SuburbStatsSchema, required: true },
    rank: { type: Number, required: true },
  },
  { _id: false }
);

const SuburbDataSchema = new Schema<ISuburbData>(
  {
    city: { type: String, required: true, index: true },
    country: { type: String, required: true, index: true },
    countryCode: { type: String, required: true },
    suburbs: [SuburbEntrySchema],
    cityAvgPricePerSqm: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now, index: true },
    dataSource: {
      type: String,
      enum: ['gemini', 'fallback'],
      default: 'gemini',
    },
  },
  { timestamps: true }
);

SuburbDataSchema.index({ city: 1, country: 1 }, { unique: true });

const SuburbData = mongoose.model<ISuburbData>('SuburbData', SuburbDataSchema);

export default SuburbData;
