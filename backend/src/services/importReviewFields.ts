import crypto from 'crypto';
import { isPropertyType } from '../config/propertyTypes';

/**
 * Field-level helpers for the imported-listing review queue: which fields a
 * reviewer sees and can edit, how a feed's values are compared against the
 * live listing, and how an owner's edit is validated.
 *
 * Kept free of database access so it can be unit tested on its own.
 */

type Draft = Record<string, unknown>;

const STRING_FIELDS = ['title', 'description', 'address', 'city', 'country'] as const;

/** Numeric fields with the inclusive range an edit may set. */
const NUMBER_FIELDS: Record<string, { min: number; max: number; integer: boolean }> = {
  price: { min: 0, max: 1_000_000_000, integer: false },
  sqft: { min: 0, max: 1_000_000, integer: false },
  beds: { min: 0, max: 100, integer: true },
  baths: { min: 0, max: 100, integer: true },
  livingRooms: { min: 0, max: 50, integer: true },
  parking: { min: 0, max: 100, integer: true },
  yearBuilt: { min: 0, max: 2100, integer: true },
  floorNumber: { min: 0, max: 200, integer: true },
  totalFloors: { min: 0, max: 200, integer: true },
};

const STRING_MAX: Record<string, number> = {
  title: 200,
  description: 20_000,
  address: 300,
  city: 120,
  country: 120,
};

const LISTING_TYPES = new Set(['sale', 'rent']);

/**
 * Fields compared between the feed and a published listing to decide whether
 * a sync should queue an update for review. `images` is compared by the
 * source's original URLs so re-hosting doesn't register as a change.
 */
export const REVIEW_FIELDS = [
  ...STRING_FIELDS,
  ...Object.keys(NUMBER_FIELDS),
  'listingType',
  'propertyType',
  'isNegotiable',
  'images',
] as const;

export type ReviewField = (typeof REVIEW_FIELDS)[number];

/** Fields an owner may change on a draft (images: remove/reorder only). */
export const EDITABLE_FIELDS: readonly string[] = REVIEW_FIELDS;

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === '' || v === 0 || v === false ||
  (Array.isArray(v) && v.length === 0);

/** Image URLs of a draft or property, preferring the source's original URLs. */
export const imageUrlsOf = (doc: Draft): string[] => {
  const meta = doc.sourceMetadata as Record<string, unknown> | undefined;
  const original = meta?.originalImages;
  if (Array.isArray(original) && original.every((u) => typeof u === 'string')) {
    return original as string[];
  }
  const images = doc.images;
  if (Array.isArray(images)) {
    return images
      .map((img) => (img && typeof img === 'object' ? (img as { url?: unknown }).url : img))
      .filter((u): u is string => typeof u === 'string');
  }
  return [];
};

const comparable = (doc: Draft, field: ReviewField): unknown => {
  if (field === 'images') return imageUrlsOf(doc);
  const v = doc[field];
  if (isEmpty(v)) return null;
  if (typeof v === 'string') return v.trim();
  return v;
};

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    // An empty list and a missing one mean the same thing.
    const arr = (Array.isArray(a) ? a : b) as unknown[];
    const other = Array.isArray(a) ? b : a;
    return arr.length === 0 && other === null;
  }
  return a === b;
};

/** Review fields whose value differs between the feed and the live listing. */
export const diffReviewFields = (incoming: Draft, current: Draft): ReviewField[] =>
  REVIEW_FIELDS.filter((f) => !sameValue(comparable(incoming, f), comparable(current, f)));

/** Stable fingerprint of a feed item's reviewable values. */
export const hashReviewFields = (incoming: Draft): string => {
  const snapshot: Record<string, unknown> = {};
  for (const f of REVIEW_FIELDS) snapshot[f] = comparable(incoming, f);
  return crypto.createHash('sha1').update(JSON.stringify(snapshot)).digest('hex');
};

/**
 * Problems a reviewer should look at before publishing — the fields heuristic
 * parsing most often gets wrong or leaves empty. Only `BLOCKING_ISSUES` stop a
 * draft from being published; the rest are shown as warnings.
 */
export const detectIssues = (data: Draft): string[] => {
  const issues: string[] = [];
  if (!data.title || !String(data.title).trim()) issues.push('missingTitle');
  if (!data.price && !data.isNegotiable) issues.push('missingPrice');
  if (!data.city) issues.push('missingCity');
  if (!data.address) issues.push('missingAddress');
  if (!data.sqft) issues.push('missingArea');
  if (!Array.isArray(data.images) || data.images.length === 0) issues.push('missingImages');
  if (!data.lat || !data.lng) issues.push('missingLocation');
  return issues;
};

export const BLOCKING_ISSUES: readonly string[] = ['missingTitle', 'missingCity'];

export type PatchResult =
  | { ok: true; set: Draft }
  | { ok: false; error: string };

/**
 * Validate an owner's edit to a draft. Only whitelisted fields are accepted;
 * `images` may only drop or reorder URLs the draft already has, so an edit
 * can't smuggle arbitrary URLs into a listing.
 */
export const sanitizeDraftPatch = (patch: unknown, current: Draft): PatchResult => {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'Patch must be an object' };
  }
  const input = patch as Record<string, unknown>;
  const set: Draft = {};

  for (const [key, value] of Object.entries(input)) {
    if (!EDITABLE_FIELDS.includes(key)) {
      return { ok: false, error: `Field "${key}" cannot be edited` };
    }

    if ((STRING_FIELDS as readonly string[]).includes(key)) {
      if (value !== null && typeof value !== 'string') {
        return { ok: false, error: `${key} must be text` };
      }
      const trimmed = (value ?? '').trim();
      if (trimmed.length > STRING_MAX[key]) {
        return { ok: false, error: `${key} is too long (max ${STRING_MAX[key]} characters)` };
      }
      set[key] = trimmed || undefined;
      continue;
    }

    if (key in NUMBER_FIELDS) {
      const { min, max, integer } = NUMBER_FIELDS[key];
      if (value === null || value === '') {
        set[key] = key === 'floorNumber' || key === 'totalFloors' ? undefined : 0;
        continue;
      }
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
        return { ok: false, error: `${key} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}` };
      }
      set[key] = n;
      continue;
    }

    if (key === 'listingType') {
      if (typeof value !== 'string' || !LISTING_TYPES.has(value)) {
        return { ok: false, error: 'listingType must be "sale" or "rent"' };
      }
      set[key] = value;
      continue;
    }

    if (key === 'propertyType') {
      if (!isPropertyType(value)) return { ok: false, error: 'Unknown propertyType' };
      set[key] = value;
      continue;
    }

    if (key === 'isNegotiable') {
      if (typeof value !== 'boolean') return { ok: false, error: 'isNegotiable must be true or false' };
      set[key] = value;
      continue;
    }

    if (key === 'images') {
      if (!Array.isArray(value) || !value.every((u) => typeof u === 'string')) {
        return { ok: false, error: 'images must be a list of URLs' };
      }
      const known = new Map<string, unknown>();
      const currentImages = Array.isArray(current.images) ? current.images : [];
      for (const img of currentImages) {
        const url = img && typeof img === 'object' ? (img as { url?: unknown }).url : undefined;
        if (typeof url === 'string') known.set(url, img);
      }
      const unknownUrl = (value as string[]).find((u) => !known.has(u));
      if (unknownUrl) return { ok: false, error: 'images may only keep or reorder existing photos' };
      const kept = Array.from(new Set(value as string[]));
      set.images = kept.map((u) => known.get(u));
      set.imageUrl = kept[0] ?? '';
      continue;
    }
  }

  return { ok: true, set };
};
