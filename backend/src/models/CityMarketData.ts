import mongoose, { Document, Schema } from 'mongoose';

export interface ICityMarketData extends Document {
  city: string;
  country: string;
  countryCode: string;

  // Market metrics
  avgPricePerSqm: number; // Average price per square meter in EUR
  medianPrice: number; // Median property price in EUR
  priceGrowthYoY: number; // Year over year growth percentage
  priceGrowthMoM: number; // Month over month growth percentage

  // Market activity
  averageDaysOnMarket: number;
  listingsCount: number;
  soldLastMonth: number;
  demandScore: number; // 0-100 score indicating market demand

  // Investment metrics
  rentalYield: number; // Average rental yield percentage
  investmentScore: number; // 0-100 score for investment potential

  // Additional insights
  topNeighborhoods: string[]; // Top 3 neighborhoods in the city
  marketTrend: 'rising' | 'stable' | 'declining';
  highlights: string[]; // Key market highlights (max 3)

  // Data freshness
  lastUpdated: Date;
  dataSource: 'gemini' | 'manual' | 'calculated';

  // Display priority
  featured: boolean; // Whether to feature this city prominently
  displayOrder: number; // Sort order for display
}

const CityMarketDataSchema = new Schema<ICityMarketData>({
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
  countryCode: {
    type: String,
    required: true,
  },
  avgPricePerSqm: {
    type: Number,
    required: true,
  },
  medianPrice: {
    type: Number,
    required: true,
  },
  priceGrowthYoY: {
    type: Number,
    required: true,
  },
  priceGrowthMoM: {
    type: Number,
    default: 0,
  },
  averageDaysOnMarket: {
    type: Number,
    required: true,
  },
  listingsCount: {
    type: Number,
    default: 0,
  },
  soldLastMonth: {
    type: Number,
    default: 0,
  },
  demandScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  rentalYield: {
    type: Number,
    required: true,
  },
  investmentScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  topNeighborhoods: [{
    type: String,
  }],
  marketTrend: {
    type: String,
    enum: ['rising', 'stable', 'declining'],
    required: true,
  },
  highlights: [{
    type: String,
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  dataSource: {
    type: String,
    enum: ['gemini', 'manual', 'calculated'],
    default: 'gemini',
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index for efficient querying
CityMarketDataSchema.index({ country: 1, featured: -1, displayOrder: 1 });
CityMarketDataSchema.index({ lastUpdated: -1 });

const CityMarketData = mongoose.model<ICityMarketData>('CityMarketData', CityMarketDataSchema);

export default CityMarketData;
