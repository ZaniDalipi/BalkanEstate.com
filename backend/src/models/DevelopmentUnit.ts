import mongoose, { Document, Schema } from 'mongoose';
import {
  UNIT_AVAILABILITY_STATES,
  type UnitAvailability,
} from '../config/developments';

/**
 * The canonical physical unit — the single source of truth for availability.
 *
 * A unit may be marketed by several authorized listings at once (`listingIds`),
 * but there is only ever ONE physical unit record, so the explorer never shows
 * the same apartment as several available flats. `primaryListingId` names the
 * authoritative listing for price/availability display; other listings are
 * alternative offers whose prices are surfaced, never silently overwritten.
 *
 * Unit numbers are unique within their entrance when the building has
 * entrances, otherwise within the building — see the partial indexes below.
 */
export interface IDevelopmentUnit extends Document {
  developmentId: mongoose.Types.ObjectId;
  buildingId: mongoose.Types.ObjectId;
  entranceId?: mongoose.Types.ObjectId;
  floorId: mongoose.Types.ObjectId;
  unitNumber: string;
  unitType: string;
  totalArea?: number;
  netArea?: number;
  grossArea?: number;
  beds?: number;
  baths?: number;
  balconies?: number;
  terraces?: number;
  orientation?: string;
  viewType?: string;
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability: UnitAvailability;
  floorplanMediaId?: mongoose.Types.ObjectId;
  mediaIds: mongoose.Types.ObjectId[];
  tour360Url?: string;
  parkingRefs: string[];
  storageRefs: string[];
  /** Every authorized marketing listing that references this physical unit. */
  listingIds: mongoose.Types.ObjectId[];
  /** The authoritative listing for availability/price, if any. */
  primaryListingId?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentUnitSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'DevelopmentBuilding',
      required: true,
      index: true,
    },
    entranceId: { type: Schema.Types.ObjectId, ref: 'DevelopmentEntrance' },
    floorId: {
      type: Schema.Types.ObjectId,
      ref: 'DevelopmentFloor',
      required: true,
      index: true,
    },
    unitNumber: { type: String, required: true, trim: true, maxlength: 50 },
    unitType: { type: String, required: true, trim: true, maxlength: 60 },
    totalArea: { type: Number, min: 0 },
    netArea: { type: Number, min: 0 },
    grossArea: { type: Number, min: 0 },
    beds: { type: Number, min: 0 },
    baths: { type: Number, min: 0 },
    balconies: { type: Number, min: 0 },
    terraces: { type: Number, min: 0 },
    orientation: { type: String, trim: true },
    viewType: { type: String, trim: true },
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 8 },
    pricePerSqm: { type: Number, min: 0 },
    availability: {
      type: String,
      enum: UNIT_AVAILABILITY_STATES,
      required: true,
      default: 'not_released',
      index: true,
    },
    floorplanMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    mediaIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    tour360Url: { type: String, trim: true },
    parkingRefs: { type: [String], default: [] },
    storageRefs: { type: [String], default: [] },
    listingIds: [{ type: Schema.Types.ObjectId, ref: 'Property', index: true }],
    primaryListingId: { type: Schema.Types.ObjectId, ref: 'Property' },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

DevelopmentUnitSchema.index({ developmentId: 1, availability: 1 });
// (floorId is already indexed via `index: true` on the field above.)

// Unit number uniqueness is entrance-scoped when an entrance is present, and
// building-scoped otherwise. Two partial unique indexes keep these apart so a
// building that reuses "1" across two staircases is valid, while a duplicate
// within the same scope is rejected. Both ignore soft-deleted units.
DevelopmentUnitSchema.index(
  { entranceId: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      entranceId: { $exists: true },
      deletedAt: { $exists: false },
    },
    name: 'unit_number_per_entrance_unique',
  }
);
DevelopmentUnitSchema.index(
  { buildingId: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      entranceId: { $exists: false },
      deletedAt: { $exists: false },
    },
    name: 'unit_number_per_building_unique',
  }
);

export default mongoose.model<IDevelopmentUnit>(
  'DevelopmentUnit',
  DevelopmentUnitSchema
);
