import mongoose, { Document, Schema } from 'mongoose';

export interface ICityMarketData extends Document {
  city: string;
  country: string;
  countryCode: string;

  // Market metrics
  avgPricePerSqm: number; // Average price per square meter in EUR (from Gemini market data)
  listingAvgPricePerSqm?: number; // Average price per square meter from active platform listings
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

  // Official data source attribution
  officialSourceName?: string;
  officialSourceUrl?: string;

  // City image (stored on our CDN, fetched from Wikipedia once)
  imageUrl?: string; // CDN URL for the city thumbnail
  imageUpdatedAt?: Date; // When the image was last fetched/updated
  /**
   * Who chose this photo. `manual` means an admin set it, which makes it
   * untouchable by the Wikipedia auto-seeder and higher priority than a photo
   * inherited from the City Gallery or a Villa Destination.
   */
  imageSource?: 'manual' | 'auto';
  /** Storage path, kept so a replaced upload can be cleaned up. */
  imagePublicId?: string;
  /** Attribution line, e.g. "Photo by Jane Doe on Unsplash". */
  imageCredit?: string;

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
  listingAvgPricePerSqm: {
    type: Number,
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
  officialSourceName: { type: String },
  officialSourceUrl: { type: String },
  imageUrl: {
    type: String,
  },
  imageUpdatedAt: {
    type: Date,
  },
  imageSource: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'auto',
  },
  imagePublicId: {
    type: String,
  },
  imageCredit: {
    type: String,
    trim: true,
    // Same cap as CityShowcase.imageCredit and the admin route's own check —
    // a credit line, not a description.
    maxlength: 200,
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
