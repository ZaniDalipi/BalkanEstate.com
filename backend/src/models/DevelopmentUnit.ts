import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';
import {
  UNIT_AVAILABILITY_STATES,
  UNIT_VISIBILITIES,
  PRICE_VISIBILITIES,
  type UnitAvailability,
  type UnitVisibility,
  type PriceVisibility,
} from '../config/developments';

/** An image stored directly on a unit (floorplan or gallery entry). */
export interface IUnitImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
}

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
  livingRooms?: number;
  /** Outdoor area that is not a terrace (garden, yard), m². */
  externalArea?: number;
  /** Terrace area, m². `netArea` is the internal area; `totalArea` the sum. */
  terraceArea?: number;
  balconies?: number;
  terraces?: number;
  orientation?: string;
  viewType?: string;
  /** Apartment feature flags (big_terrace, duplex, …) — see UNIT_FEATURES. */
  features: string[];
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability: UnitAvailability;
  /** `hidden` = the spec's hidden/draft: absent from every public endpoint. */
  visibility: UnitVisibility;
  /** `on_request` keeps the unit public but strips its price from public responses. */
  priceVisibility: PriceVisibility;
  description?: string;
  floorplan?: IUnitImage;
  gallery: IUnitImage[];
  floorplanMediaId?: mongoose.Types.ObjectId;
  mediaIds: mongoose.Types.ObjectId[];
  tour360Url?: string;
  parkingRefs: string[];
  storageRefs: string[];
  /** Parking spots / storage rooms (units of their own) this unit is sold with. */
  linkedUnitIds: mongoose.Types.ObjectId[];
  /** Every authorized marketing listing that references this physical unit. */
  listingIds: mongoose.Types.ObjectId[];
  /** The authoritative listing for availability/price, if any. */
  primaryListingId?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UnitImageSchema = new Schema<IUnitImage>(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, trim: true },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
  },
  { _id: false }
);

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
    livingRooms: { type: Number, min: 0 },
    externalArea: { type: Number, min: 0 },
    terraceArea: { type: Number, min: 0 },
    balconies: { type: Number, min: 0 },
    terraces: { type: Number, min: 0 },
    orientation: { type: String, trim: true },
    viewType: { type: String, trim: true },
    features: { type: [String], default: [] },
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
    visibility: { type: String, enum: UNIT_VISIBILITIES, default: 'public' },
    priceVisibility: { type: String, enum: PRICE_VISIBILITIES, default: 'public' },
    description: { type: String, trim: true, maxlength: 4000 },
    floorplan: { type: UnitImageSchema, default: undefined },
    gallery: {
      type: [UnitImageSchema],
      default: [],
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length <= 30,
        message: 'A unit gallery holds at most 30 images',
      },
    },
    floorplanMediaId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    mediaIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    tour360Url: { type: String, trim: true },
    parkingRefs: { type: [String], default: [] },
    storageRefs: { type: [String], default: [] },
    linkedUnitIds: [{ type: Schema.Types.ObjectId, ref: 'DevelopmentUnit' }],
    listingIds: [{ type: Schema.Types.ObjectId, ref: 'Property', index: true }],
    primaryListingId: { type: Schema.Types.ObjectId, ref: 'Property' },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

DevelopmentUnitSchema.index({ developmentId: 1, availability: 1 });
// The public explorer reads "every visible unit of a development" on each page load.
DevelopmentUnitSchema.index({ developmentId: 1, visibility: 1 });
// (floorId is already indexed via `index: true` on the field above.)

// Unit number uniqueness is entrance-scoped when an entrance is present, and
// building-scoped otherwise. Two partial unique indexes keep these apart so a
// building that reuses "1" across two staircases is valid, while a duplicate
// within the same scope is rejected. Both ignore soft-deleted units.
//
// MongoDB rejects `$exists: false` in a partial filter ("Expression not
// supported in partial index: $not"), so the filters use `null` — which
// matches a missing field or an explicit null — and `$type: 'objectId'` for
// "an entrance is set". The two filters are exact complements.
DevelopmentUnitSchema.index(
  { entranceId: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      entranceId: { $type: 'objectId' },
      deletedAt: null,
    },
    name: 'unit_number_per_entrance_unique',
  }
);
DevelopmentUnitSchema.index(
  { buildingId: 1, unitNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      entranceId: null,
      deletedAt: null,
    },
    name: 'unit_number_per_building_unique',
  }
);

// A parking spot or storage room comes with one live unit at most (unique across
// documents for each array element; empty lists and deleted units are left out).
DevelopmentUnitSchema.index(
  { linkedUnitIds: 1 },
  {
    unique: true,
    partialFilterExpression: { 'linkedUnitIds.0': { $exists: true }, deletedAt: null },
    name: 'linked_unit_once',
  }
);

// Encode every reference in JSON so the client compares like with like.
encodeRefsOnJSON(DevelopmentUnitSchema, ['developmentId', 'buildingId', 'entranceId', 'floorId', 'floorplanMediaId', 'mediaIds', 'listingIds', 'primaryListingId', 'linkedUnitIds']);

export default mongoose.model<IDevelopmentUnit>(
  'DevelopmentUnit',
  DevelopmentUnitSchema
);
