import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';
import {
  DEVELOPMENT_CATEGORIES,
  DEVELOPMENT_CONSTRUCTION_STATUSES,
  DEVELOPMENT_STATUSES,
  type DevelopmentCategory,
  type DevelopmentConstructionStatus,
  type DevelopmentStatus,
} from '../config/developments';

/**
 * A development / residence: the root of the
 * Development → Building → Entrance → Floor → Unit → Listing hierarchy.
 *
 * Inventory (units) is NEVER embedded here — units live in their own
 * collection so a project can scale to thousands of units without an
 * unbounded document. `stats` is a denormalised cache kept by the inventory
 * services, not a source of truth.
 */
export interface IDevelopmentContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface IDevelopmentStats {
  buildings: number;
  units: number;
  available: number;
}

/**
 * What the residence's public visibility rests on (Residence Pass). Recomputed
 * from the ResidencePurchase ledger and the owner's plan by
 * residenceBillingService — never edited directly.
 */
export interface IDevelopmentBilling {
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  /** End of the paid (pass/admin) period, stacked across renewals. */
  paidUntil?: Date;
  /** Covered by the owner's premium plan until this date. */
  includedUntil?: Date;
  /** Extra buildings bought for the current period, on top of the included ones. */
  extraBuildings: number;
  /** Reminder emails already sent, e.g. 'day10', 'day14', 'expired'. */
  remindersSent: string[];
}

export interface IDevelopment extends Document {
  /** The account that owns the project — a user or an agency. */
  ownerId: mongoose.Types.ObjectId;
  ownerType: 'user' | 'agency';
  /** Set when ownerType === 'agency'. */
  agencyId?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  country: string;
  city: string;
  municipality?: string;
  address?: string;
  lat?: number;
  lng?: number;
  category: DevelopmentCategory;
  constructionStatus: DevelopmentConstructionStatus;
  expectedCompletionDate?: Date;
  /** Year a completed residence was built. */
  yearBuilt?: number;
  amenities: string[];
  website?: string;
  contact?: IDevelopmentContact;
  coverMediaId?: mongoose.Types.ObjectId;
  /** Cover image URL + storage key (mirrors the Agency cover pattern). */
  coverImage?: string;
  coverImagePublicId?: string;
  status: DevelopmentStatus;
  billing: IDevelopmentBilling;
  /**
   * Public until this moment (trial, pass or premium). Denormalised from
   * `billing` so every public query is a single indexed comparison.
   */
  visibleUntil?: Date;
  publishedAt?: Date;
  stats: IDevelopmentStats;
  /**
   * Whether buyers may send an inquiry about a specific unit from the public
   * explorer (useful for units with no published listing). Defaults to on.
   */
  allowUnitInquiries: boolean;
  /** Soft delete — set instead of removing so links/audit stay resolvable. */
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentSchema: Schema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['user', 'agency'],
      required: true,
      default: 'user',
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: 10000,
    },
    country: {
      type: String,
      required: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    municipality: { type: String, trim: true },
    address: { type: String, trim: true },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    category: {
      type: String,
      enum: DEVELOPMENT_CATEGORIES,
      required: true,
      index: true,
    },
    constructionStatus: {
      type: String,
      enum: DEVELOPMENT_CONSTRUCTION_STATUSES,
      required: true,
      default: 'planned',
      index: true,
    },
    expectedCompletionDate: { type: Date },
    yearBuilt: { type: Number, min: 1800 },
    amenities: {
      type: [String],
      default: [],
    },
    website: { type: String, trim: true },
    contact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    coverMediaId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset',
    },
    coverImage: { type: String },
    coverImagePublicId: { type: String },
    status: {
      type: String,
      enum: DEVELOPMENT_STATUSES,
      required: true,
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    billing: {
      trialStartedAt: { type: Date },
      trialEndsAt: { type: Date },
      paidUntil: { type: Date },
      includedUntil: { type: Date },
      extraBuildings: { type: Number, default: 0, min: 0 },
      remindersSent: { type: [String], default: [] },
    },
    visibleUntil: { type: Date },
    stats: {
      buildings: { type: Number, default: 0, min: 0 },
      units: { type: Number, default: 0, min: 0 },
      available: { type: Number, default: 0, min: 0 },
    },
    allowUnitInquiries: { type: Boolean, default: true },
    deletedAt: { type: Date, index: true },
  },
  {
    timestamps: true,
  }
);

// Slug is unique only among live (non-deleted) developments, so a deleted
// project does not keep its slug hostage forever. `deletedAt: null` matches a
// missing field; MongoDB rejects `$exists: false` in partial index filters.
DevelopmentSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'development_slug_unique',
  }
);
DevelopmentSchema.index({ ownerId: 1, status: 1 });
DevelopmentSchema.index({ agencyId: 1, status: 1 });
DevelopmentSchema.index({ country: 1, city: 1, status: 1 });
// Public discovery default sort
DevelopmentSchema.index({ status: 1, publishedAt: -1 });
// Public queries: published and still within its trial / pass / plan.
DevelopmentSchema.index({ status: 1, visibleUntil: 1 });
// Trial abuse guard counts an owner's trials (deleted residences included).
DevelopmentSchema.index({ ownerId: 1, 'billing.trialStartedAt': 1 });

// Encode every reference in JSON so the client compares like with like.
encodeRefsOnJSON(DevelopmentSchema, ['ownerId', 'agencyId', 'coverMediaId']);

export default mongoose.model<IDevelopment>('Development', DevelopmentSchema);
