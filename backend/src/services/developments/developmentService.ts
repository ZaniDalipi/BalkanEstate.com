import mongoose from 'mongoose';
import Development, { IDevelopment } from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentMembership from '../../models/DevelopmentMembership';
import { IUser } from '../../models/User';
import Agency from '../../models/Agency';
import { resolveId } from '../../utils/idObfuscation';
import { slugify } from '../media/mediaNaming';
import { createLogger } from '../../utils/logger';
import {
  DEVELOPMENT_CATEGORIES,
  DEVELOPMENT_CONSTRUCTION_STATUSES,
  type DevelopmentCategory,
  type DevelopmentConstructionStatus,
} from '../../config/developments';

/** A trimmed string, or '' for anything that isn't a string (so bad input is a 400, not a crash). */
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');


const log = createLogger('DevelopmentService');

export interface CreateDevelopmentInput {
  name: string;
  description?: string;
  country: string;
  city: string;
  municipality?: string;
  address?: string;
  lat?: number;
  lng?: number;
  category: DevelopmentCategory;
  constructionStatus?: DevelopmentConstructionStatus;
  expectedCompletionDate?: Date | string;
  amenities?: string[];
  website?: string;
  contact?: { name?: string; email?: string; phone?: string };
  /** Accept buyer inquiries about individual units (default true). */
  allowUnitInquiries?: boolean;
  /** When creating on behalf of an agency the caller owns/admins. */
  agencyId?: string;
}

/**
 * Turn a name into a slug that is unique among live developments. Appends a
 * numeric suffix on collision rather than failing, so two "Seaside Residences"
 * projects can both exist.
 */
export const generateUniqueDevelopmentSlug = async (name: string): Promise<string> => {
  const base = slugify(name, 80) || 'development';
  let slug = base;
  let suffix = 1;
  // Only live developments hold a slug (the unique index is partial), so a
  // soft-deleted project never blocks reuse.
  // eslint-disable-next-line no-await-in-loop
  while (await Development.exists({ slug, deletedAt: { $exists: false } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
};

const isValidCategory = (v: unknown): v is DevelopmentCategory =>
  typeof v === 'string' && (DEVELOPMENT_CATEGORIES as readonly string[]).includes(v);

const isValidConstructionStatus = (v: unknown): v is DevelopmentConstructionStatus =>
  typeof v === 'string' &&
  (DEVELOPMENT_CONSTRUCTION_STATUSES as readonly string[]).includes(v);

/**
 * Create a development and bootstrap the creator as its `owner` member.
 *
 * The owner membership is what makes resource-scoped permission checks work for
 * the creator from the first request; ownership on the document alone already
 * grants owner access, but writing the membership keeps the team list complete
 * and lets ownership be transferred later without a special case.
 */
export const createDevelopment = async (
  input: CreateDevelopmentInput,
  user: IUser
): Promise<IDevelopment> => {
  if (!isValidCategory(input.category)) {
    throw new ValidationError(`category must be one of: ${DEVELOPMENT_CATEGORIES.join(', ')}`);
  }
  if (
    input.constructionStatus !== undefined &&
    !isValidConstructionStatus(input.constructionStatus)
  ) {
    throw new ValidationError(
      `constructionStatus must be one of: ${DEVELOPMENT_CONSTRUCTION_STATUSES.join(', ')}`
    );
  }
  assertWebsite(input.website);
  if (!text(input.name)) throw new ValidationError('name is required');
  if (!text(input.country)) throw new ValidationError('country is required');
  if (!text(input.city)) throw new ValidationError('city is required');

  // Agency ownership grants the agency's owner/admins full rights, so only
  // they may create a development under that agency.
  let agencyId: mongoose.Types.ObjectId | undefined;
  if (input.agencyId) {
    const raw = typeof input.agencyId === 'string' ? resolveId(input.agencyId) : null;
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) throw new ValidationError('agencyId is invalid');
    const agency = await Agency.findById(raw).select('ownerId admins').lean();
    const uid = String(user._id);
    const canUseAgency =
      !!agency && (String(agency.ownerId) === uid || (agency.admins ?? []).some((a) => String(a) === uid));
    if (!canUseAgency) throw new ForbiddenError('You can only create developments for an agency you own or administer');
    agencyId = new mongoose.Types.ObjectId(raw);
  }
  const ownerType: 'user' | 'agency' = agencyId ? 'agency' : 'user';
  const slug = await generateUniqueDevelopmentSlug(input.name);

  const development = await Development.create({
    ownerId: user._id,
    ownerType,
    agencyId,
    name: text(input.name),
    slug,
    description: input.description,
    country: text(input.country),
    city: text(input.city),
    municipality: input.municipality,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    constructionStatus: input.constructionStatus ?? 'planned',
    expectedCompletionDate: input.expectedCompletionDate
      ? new Date(input.expectedCompletionDate)
      : undefined,
    amenities: normalizeAmenities(input.amenities),
    website: input.website,
    contact: normalizeContact(input.contact),
    allowUnitInquiries: typeof input.allowUnitInquiries === 'boolean' ? input.allowUnitInquiries : true,
    status: 'draft',
    stats: { buildings: 0, units: 0, available: 0 },
  });

  // Idempotent: an owner membership may already be implied, but recording it
  // explicitly keeps the team complete. upsert avoids a duplicate-key throw.
  await DevelopmentMembership.updateOne(
    { developmentId: development._id, userId: user._id },
    {
      $setOnInsert: {
        developmentId: development._id,
        userId: user._id,
        role: 'owner',
        status: 'active',
      },
    },
    { upsert: true }
  );

  log.info(`Development ${development._id} created by user ${String(user._id)}`);
  return development;
};

/** Developments the user owns or is an active member of. */
export const listDevelopmentsForUser = async (
  user: IUser,
  opts: { status?: string; limit?: number; skip?: number } = {}
): Promise<{ items: IDevelopment[]; total: number }> => {
  const memberships = await DevelopmentMembership.find({
    userId: user._id,
    status: 'active',
  })
    .select('developmentId')
    .lean();
  const ids = memberships.map((m) => m.developmentId);

  const query: Record<string, unknown> = {
    deletedAt: { $exists: false },
    $or: [{ ownerId: user._id }, { _id: { $in: ids } }],
  };
  if (opts.status) query.status = opts.status;

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const skip = Math.max(opts.skip ?? 0, 0);

  const [items, total] = await Promise.all([
    Development.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Development.countDocuments(query),
  ]);

  return { items, total };
};

export const getDevelopmentById = async (
  id: string
): Promise<IDevelopment | null> =>
  Development.findOne({ _id: id, deletedAt: { $exists: false } });

/** Fields an authorized editor may change via the generic update path. */
const EDITABLE_FIELDS: (keyof CreateDevelopmentInput)[] = [
  'name',
  'description',
  'country',
  'city',
  'municipality',
  'address',
  'lat',
  'lng',
  'category',
  'constructionStatus',
  'expectedCompletionDate',
  'amenities',
  'website',
  'contact',
  'allowUnitInquiries',
];

export const updateDevelopment = async (
  development: IDevelopment,
  updates: Partial<CreateDevelopmentInput>
): Promise<IDevelopment> => {
  for (const key of EDITABLE_FIELDS) {
    if (!(key in updates)) continue;
    const value = updates[key];
    if (key === 'website') assertWebsite(value);
    if (key === 'category' && !isValidCategory(value)) {
      throw new ValidationError(`category must be one of: ${DEVELOPMENT_CATEGORIES.join(', ')}`);
    }
    if (key === 'constructionStatus' && value !== undefined && !isValidConstructionStatus(value)) {
      throw new ValidationError(
        `constructionStatus must be one of: ${DEVELOPMENT_CONSTRUCTION_STATUSES.join(', ')}`
      );
    }
    if (key === 'allowUnitInquiries') {
      if (typeof value !== 'boolean') throw new ValidationError('allowUnitInquiries must be a boolean');
      development.allowUnitInquiries = value;
      continue;
    }
    if (key === 'expectedCompletionDate') {
      const date = value ? new Date(value as string) : undefined;
      if (date && Number.isNaN(date.getTime())) throw new ValidationError('expectedCompletionDate is not a valid date');
      development.expectedCompletionDate = date;
      continue;
    }
    if ((key === 'name' || key === 'country' || key === 'city') && !text(value)) {
      throw new ValidationError(`${key} is required`);
    }
    if (key === 'amenities') {
      development.amenities = normalizeAmenities(value);
      continue;
    }
    if (key === 'contact') {
      (development as unknown as Record<string, unknown>).contact = normalizeContact(value);
      continue;
    }
    if (key === 'lat' || key === 'lng') {
      const n = value === null || value === '' || value === undefined ? undefined : Number(value);
      const max = key === 'lat' ? 90 : 180;
      if (n !== undefined && (!Number.isFinite(n) || Math.abs(n) > max)) throw new ValidationError(`${key} is out of range`);
      (development as unknown as Record<string, unknown>)[key] = n;
      continue;
    }
    (development as unknown as Record<string, unknown>)[key] = typeof value === 'string' ? value.trim() : value;
  }
  await development.save();
  return development;
};

/** Publish / unpublish, with the publishedAt timestamp kept consistent. */
export const setDevelopmentStatus = async (
  development: IDevelopment,
  status: 'draft' | 'published' | 'archived'
): Promise<IDevelopment> => {
  development.status = status;
  if (status === 'published' && !development.publishedAt) {
    development.publishedAt = new Date();
  }
  await development.save();
  return development;
};

/**
 * Soft-delete a development. The record stays so audit entries and any links
 * remain resolvable, but it drops out of every live query and frees its slug.
 */
export const softDeleteDevelopment = async (
  development: IDevelopment
): Promise<void> => {
  development.deletedAt = new Date();
  await development.save();
};

/**
 * Recompute the denormalised stats cache from the authoritative collections.
 * Cheap counts, safe to call after any inventory change.
 */
export const recomputeDevelopmentStats = async (
  developmentId: mongoose.Types.ObjectId | string
): Promise<IDevelopmentStats> => {
  const [buildings, units, available] = await Promise.all([
    DevelopmentBuilding.countDocuments({ developmentId, deletedAt: { $exists: false } }),
    // Hidden units are never counted: these stats are shown to buyers.
    DevelopmentUnit.countDocuments({ developmentId, deletedAt: { $exists: false }, visibility: { $ne: 'hidden' } }),
    DevelopmentUnit.countDocuments({
      developmentId,
      deletedAt: { $exists: false },
      visibility: { $ne: 'hidden' },
      availability: 'available',
    }),
  ]);
  const stats = { buildings, units, available };
  await Development.updateOne({ _id: developmentId }, { $set: { stats } });
  return stats;
};

interface IDevelopmentStats {
  buildings: number;
  units: number;
  available: number;
}

/** A client-input error that controllers map to HTTP 400. */
export const MAX_AMENITIES = 40;
const AMENITY_MAX_LENGTH = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, de-duplicated amenity labels (≤ 40, each ≤ 60 chars). */
export function normalizeAmenities(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError('amenities must be a list');
  const out: string[] = [];
  for (const v of value) {
    const a = text(v);
    if (!a) continue;
    if (a.length > AMENITY_MAX_LENGTH) throw new ValidationError(`An amenity can be at most ${AMENITY_MAX_LENGTH} characters`);
    if (!out.some((x) => x.toLowerCase() === a.toLowerCase())) out.push(a);
  }
  if (out.length > MAX_AMENITIES) throw new ValidationError(`At most ${MAX_AMENITIES} amenities`);
  return out;
}

/** Sales contact shown to buyers: optional name, valid email, phone. */
export function normalizeContact(value: unknown): { name?: string; email?: string; phone?: string } | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('contact must be an object');
  const raw = value as Record<string, unknown>;
  const name = text(raw.name).slice(0, 120) || undefined;
  const email = text(raw.email) || undefined;
  const phone = text(raw.phone).slice(0, 40) || undefined;
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) throw new ValidationError('contact.email is not a valid email address');
  if (!name && !email && !phone) return undefined;
  return { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
}

/** The website is rendered as a link: only http(s) URLs are accepted. */
function assertWebsite(value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !/^https?:\/\/[^\s]+$/i.test(value.trim())) {
    throw new ValidationError('website must be an http(s) URL');
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
