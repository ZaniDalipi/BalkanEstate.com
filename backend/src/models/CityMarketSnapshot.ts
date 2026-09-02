import mongoose, { Document, Schema } from 'mongoose';

/**
 * A point-in-time copy of one city's market data as shown on /explore-cities.
 *
 * `CityMarketData` holds only the *current* values, so it cannot answer
 * "what changed since last month?". Snapshots are the history that the
 * Explore-Cities digest email diffs against.
 *
 * A snapshot is written only when the upstream market figures actually differ
 * from the previous snapshot (see `fingerprint`), which is what makes
 * "whenever those sources publish an update" observable rather than assumed.
 */
export interface ICityMarketSnapshot extends Document {
  city: string;
  country: string;
  countryCode: string;

  // Market figures sourced upstream (BIS / national statistics / research set)
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  priceGrowthMoM: number;
  rentalYield: number;
  demandScore: number;
  investmentScore: number;
  marketTrend: 'rising' | 'stable' | 'declining';

  // Platform-derived context (moves constantly; excluded from the fingerprint)
  averageDaysOnMarket: number;
  listingsCount: number;

  officialSourceName?: string;
  imageUrl?: string;

  /**
   * SHA-256 of the upstream figures above. Two consecutive captures with the
   * same fingerprint mean the sources published nothing new.
   */
  fingerprint: string;
  capturedAt: Date;
}

const CityMarketSnapshotSchema = new Schema<ICityMarketSnapshot>({
  city: { type: String, required: true },
  country: { type: String, required: true },
  countryCode: { type: String, required: true },

  avgPricePerSqm: { type: Number, required: true, min: 0 },
  medianPrice: { type: Number, required: true, min: 0 },
  priceGrowthYoY: { type: Number, required: true },
  priceGrowthMoM: { type: Number, required: true },
  rentalYield: { type: Number, required: true, min: 0 },
  demandScore: { type: Number, required: true, min: 0, max: 100 },
  investmentScore: { type: Number, required: true, min: 0, max: 100 },
  marketTrend: {
    type: String,
    enum: ['rising', 'stable', 'declining'],
    required: true,
  },

  averageDaysOnMarket: { type: Number, required: true, min: 0 },
  listingsCount: { type: Number, required: true, min: 0 },

  officialSourceName: { type: String },
  imageUrl: { type: String },

  fingerprint: { type: String, required: true },
  capturedAt: { type: Date, required: true, default: Date.now },
}, {
  timestamps: true,
});

// "latest snapshot for this city" and "newest snapshot at or before X" — the two
// reads the change computation performs — are both served by this index.
CityMarketSnapshotSchema.index({ city: 1, country: 1, capturedAt: -1 });
// Pruning old history scans by date alone.
CityMarketSnapshotSchema.index({ capturedAt: 1 });

const CityMarketSnapshot = mongoose.model<ICityMarketSnapshot>(
  'CityMarketSnapshot',
  CityMarketSnapshotSchema,
);

export default CityMarketSnapshot;
