import mongoose, { Document, Schema } from 'mongoose';

/**
 * Pre-computed property statistics
 *
 * Aggregated periodically by a cron job to avoid running expensive
 * aggregation pipelines on every request. Consumers can query this
 * collection instead of scanning the full Property collection.
 */

export interface ICountByCountry {
  country: string;
  count: number;
}

export interface IAvgPriceByCity {
  city: string;
  country: string;
  avgPrice: number;
  count: number;
}

export interface ICountByType {
  propertyType: string;
  count: number;
}

export interface IPropertyStats extends Document {
  key: string; // e.g. "global" — allows sharding later
  totalActive: number;
  totalSold: number;
  totalRented: number;
  totalPromoted: number;
  countByCountry: ICountByCountry[];
  avgPriceByCity: IAvgPriceByCity[];
  countByType: ICountByType[];
  computedAt: Date;
}

const PropertyStatsSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    totalActive: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalRented: { type: Number, default: 0 },
    totalPromoted: { type: Number, default: 0 },
    countByCountry: [
      {
        country: String,
        count: Number,
        _id: false,
      },
    ],
    avgPriceByCity: [
      {
        city: String,
        country: String,
        avgPrice: Number,
        count: Number,
        _id: false,
      },
    ],
    countByType: [
      {
        propertyType: String,
        count: Number,
        _id: false,
      },
    ],
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IPropertyStats>('PropertyStats', PropertyStatsSchema);
