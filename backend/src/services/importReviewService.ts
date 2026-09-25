import { Types } from 'mongoose';
import ImportedListingDraft, {
  type IImportedListingDraft,
  type ImportedListingDraftKind,
  type ImportedListingDraftStatus,
} from '../models/ImportedListingDraft';
import ListingSource, { type IListingSource } from '../models/ListingSource';
import Property, { type IProperty } from '../models/Property';
import User from '../models/User';
import listingLimitService from './listingLimitService';
import { geocodeAddress } from './geocodingService';
import {
  BLOCKING_ISSUES,
  REVIEW_FIELDS,
  detectIssues,
  diffReviewFields,
  hashReviewFields,
  sanitizeDraftPatch,
} from './importReviewFields';
import { emitPropertyCreated, emitPropertyUpdated } from '../sockets/propertySocket';
import { invalidateCache } from '../middleware/cache';
import { encodeId } from '../utils/idObfuscation';
import { cronLogger } from '../utils/logger';

/**
 * Review queue for listings fetched from user-owned external feeds.
 *
 * A sync never publishes or changes a live listing for a user's feed: new
 * listings and changes to published ones are parked here as drafts, and only
 * go live when the owner accepts them (optionally after editing). The monthly
 * listing limit is charged at accept time, since that's when a listing is
 * actually created.
 */

const log = cronLogger;

export type QueueOutcome = 'queuedNew' | 'queuedUpdate' | 'refreshed' | 'unchanged' | 'skipped';

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

type Doc = Record<string, unknown>;

const asObject = (value: unknown): Doc =>
  value && typeof value === 'object' ? (value as Doc) : {};

/**
 * Decide what a freshly fetched (and normalized) feed item means for the
 * owner's review queue. Called by the ingest run for user-owned sources in
 * place of writing to `Property` directly.
 */
export const queueForReview = async (
  source: IListingSource,
  sourceListingId: string,
  normalized: Partial<IProperty>
): Promise<QueueOutcome> => {
  if (!source.userId) throw new Error('Review queue requires a user-owned source');

  const incoming = normalized as unknown as Doc;
  const incomingHash = hashReviewFields(incoming);
  const now = new Date();

  const [live, draft] = await Promise.all([
    Property.findOne({ source: source.slug, sourceListingId }).lean(),
    ImportedListingDraft.findOne({ source: source._id, sourceListingId }),
  ]);

  if (live) {
    const changedFields = diffReviewFields(incoming, live as unknown as Doc);
    if (changedFields.length === 0) {
      await Property.updateOne({ _id: live._id }, { $set: { sourceFetchedAt: now } });
      // The feed caught up with the live listing — a pending update is moot.
      if (draft && draft.status === 'pending' && draft.kind === 'update') {
        await draft.deleteOne();
      }
      return 'unchanged';
    }
    // Already decided on exactly these values (accepted with edits, or
    // rejected) — don't ask the owner again until the feed changes.
    if (draft && draft.incomingHash === incomingHash) {
      if (draft.status === 'pending') {
        draft.fetchedAt = now;
        await draft.save();
        return 'refreshed';
      }
      return 'skipped';
    }
    await ImportedListingDraft.findOneAndUpdate(
      { source: source._id, sourceListingId },
      {
        $set: {
          sourceSlug: source.slug,
          userId: source.userId,
          sourceUrl: normalized.sourceUrl,
          kind: 'update',
          status: 'pending',
          data: incoming,
          original: incoming,
          incomingHash,
          changedFields,
          fetchedAt: now,
          propertyId: live._id,
        },
        $unset: { editedAt: 1, reviewedAt: 1 },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return 'queuedUpdate';
  }

  if (draft) {
    // Rejected stays rejected; accepted-then-deleted stays deleted.
    if (draft.status !== 'pending') return 'skipped';
    draft.fetchedAt = now;
    draft.sourceUrl = normalized.sourceUrl;
    if (draft.incomingHash !== incomingHash) {
      draft.original = incoming;
      draft.incomingHash = incomingHash;
      // Keep the owner's edits; only refresh a draft they haven't touched.
      if (!draft.editedAt) draft.data = incoming;
      draft.markModified('original');
      draft.markModified('data');
    }
    await draft.save();
    return 'refreshed';
  }

  await ImportedListingDraft.create({
    source: source._id,
    sourceSlug: source.slug,
    userId: source.userId,
    sourceListingId,
    sourceUrl: normalized.sourceUrl,
    kind: 'new',
    status: 'pending',
    data: incoming,
    original: incoming,
    incomingHash,
    changedFields: [],
    fetchedAt: now,
  });
  return 'queuedNew';
};

// ── Read ─────────────────────────────────────────────────────────────────────

const pickReview = (doc: Doc): Doc => {
  const out: Doc = {};
  for (const f of REVIEW_FIELDS) {
    if (f === 'images') {
      const images = Array.isArray(doc.images) ? doc.images : [];
      out.images = images
        .map((img) => asObject(img).url)
        .filter((u): u is string => typeof u === 'string');
    } else {
      out[f] = doc[f] ?? null;
    }
  }
  out.currency = asObject(doc.sourceMetadata).currency ?? null;
  return out;
};

export interface DraftDto {
  id: string;
  sourceId: string;
  sourceName?: string;
  sourceUrl?: string;
  kind: ImportedListingDraftKind;
  status: ImportedListingDraftStatus;
  data: Doc;
  original: Doc;
  current?: Doc;
  changedFields: string[];
  issues: string[];
  blockingIssues: string[];
  edited: boolean;
  fetchedAt: Date;
  reviewedAt?: Date;
  propertyId?: string;
}

const toDto = (draft: IImportedListingDraft, sourceName?: string, current?: Doc): DraftDto => {
  const data = asObject(draft.data);
  const issues = detectIssues(data);
  return {
    id: encodeId(String(draft._id)),
    sourceId: encodeId(String(draft.source)),
    sourceName,
    sourceUrl: draft.sourceUrl,
    kind: draft.kind,
    status: draft.status,
    data: pickReview(data),
    original: pickReview(asObject(draft.original)),
    current: current ? pickReview(current) : undefined,
    changedFields: draft.changedFields ?? [],
    issues,
    blockingIssues: issues.filter((i) => BLOCKING_ISSUES.includes(i)),
    edited: Boolean(draft.editedAt),
    fetchedAt: draft.fetchedAt,
    reviewedAt: draft.reviewedAt,
    propertyId: draft.propertyId ? encodeId(String(draft.propertyId)) : undefined,
  };
};

export interface ListDraftsOptions {
  status?: ImportedListingDraftStatus;
  sourceId?: string;
  kind?: ImportedListingDraftKind;
  page?: number;
  limit?: number;
}

export const listDrafts = async (
  userId: Types.ObjectId,
  opts: ListDraftsOptions = {}
): Promise<{ drafts: DraftDto[]; total: number; page: number; limit: number }> => {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.max(1, Math.min(100, opts.limit ?? 20));
  const filter: Doc = { userId, status: opts.status ?? 'pending' };
  if (opts.sourceId) filter.source = opts.sourceId;
  if (opts.kind) filter.kind = opts.kind;

  const [drafts, total] = await Promise.all([
    ImportedListingDraft.find(filter)
      .sort({ fetchedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ImportedListingDraft.countDocuments(filter),
  ]);

  const sourceIds = Array.from(new Set(drafts.map((d) => String(d.source))));
  const propertyIds = drafts.filter((d) => d.kind === 'update' && d.propertyId).map((d) => d.propertyId);
  const [sources, properties] = await Promise.all([
    ListingSource.find({ _id: { $in: sourceIds } }).select('name').lean(),
    propertyIds.length
      ? Property.find({ _id: { $in: propertyIds } }).lean()
      : Promise.resolve([]),
  ]);
  const sourceNames = new Map(sources.map((s) => [String(s._id), s.name]));
  const live = new Map(properties.map((p) => [String(p._id), p as unknown as Doc]));

  return {
    drafts: drafts.map((d) =>
      toDto(d, sourceNames.get(String(d.source)), d.propertyId ? live.get(String(d.propertyId)) : undefined)
    ),
    total,
    page,
    limit,
  };
};

export const countPending = async (
  userId: Types.ObjectId
): Promise<{ total: number; new: number; update: number }> => {
  const rows = await ImportedListingDraft.aggregate<{ _id: string; n: number }>([
    { $match: { userId: new Types.ObjectId(String(userId)), status: 'pending' } },
    { $group: { _id: '$kind', n: { $sum: 1 } } },
  ]);
  const byKind = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const added = byKind.new ?? 0;
  const updates = byKind.update ?? 0;
  return { total: added + updates, new: added, update: updates };
};

// ── Write ────────────────────────────────────────────────────────────────────

const loadOwnDraft = async (userId: Types.ObjectId, draftId: string): Promise<IImportedListingDraft> => {
  const draft = await ImportedListingDraft.findOne({ _id: draftId, userId });
  if (!draft) throw new ReviewError('Draft not found', 404, 'DRAFT_NOT_FOUND');
  return draft;
};

const requirePending = (draft: IImportedListingDraft): void => {
  if (draft.status !== 'pending') {
    throw new ReviewError(`This listing was already ${draft.status}`, 409, 'DRAFT_NOT_PENDING');
  }
};

export const updateDraft = async (
  userId: Types.ObjectId,
  draftId: string,
  patch: unknown
): Promise<DraftDto> => {
  const draft = await loadOwnDraft(userId, draftId);
  requirePending(draft);
  const data = asObject(draft.data);
  const result = sanitizeDraftPatch(patch, data);
  if (!result.ok) throw new ReviewError(result.error, 400, 'INVALID_PATCH');

  draft.data = { ...data, ...result.set };
  draft.editedAt = new Date();
  draft.markModified('data');
  await draft.save();

  const [source, live] = await Promise.all([
    ListingSource.findById(draft.source).select('name').lean(),
    draft.kind === 'update' && draft.propertyId ? Property.findById(draft.propertyId).lean() : null,
  ]);
  return toDto(draft, source?.name, live ? (live as unknown as Doc) : undefined);
};

/** Mirror the counters a native listing create bumps (see propertyController). */
const incrementUserCountersForPublish = async (userId: Types.ObjectId): Promise<void> => {
  const user = await User.findById(userId).select('role').lean();
  const role = (user as { role?: string } | null)?.role;
  const roleCountField = role === 'agent' ? 'subscription.agentCount' : 'subscription.privateSellerCount';
  await User.updateOne(
    { _id: userId },
    {
      $inc: {
        'subscription.listingsCreatedThisMonth': 1,
        'subscription.activeListingsCount': 1,
        [roleCountField]: 1,
        listingsCount: 1,
        totalListingsCreated: 1,
      },
    }
  );
};

const remainingCapacity = async (userId: Types.ObjectId): Promise<number> => {
  try {
    return (await listingLimitService.getMonthlyUsage(String(userId))).remaining;
  } catch {
    // No subscription / plan — the user can't create listings.
    return 0;
  }
};

/** Re-geocode when the owner corrected the location the feed sent. */
const refreshCoordinates = async (data: Doc, original: Doc): Promise<void> => {
  const moved = ['address', 'city', 'country'].some((f) => (data[f] ?? null) !== (original[f] ?? null));
  if (!moved && data.lat && data.lng) return;
  const city = typeof data.city === 'string' ? data.city : undefined;
  const country = typeof data.country === 'string' ? data.country : undefined;
  if (!city || !country) return;
  const address = typeof data.address === 'string' ? data.address : undefined;
  try {
    const geo = await geocodeAddress(address ?? `${city}, ${country}`, city, country);
    if (geo) {
      data.lat = geo.lat;
      data.lng = geo.lng;
    }
  } catch (err) {
    log.info(`[import-review] geocode failed: ${(err as Error).message}`);
  }
};

export const acceptDraft = async (
  userId: Types.ObjectId,
  draftId: string
): Promise<{ propertyId: string; kind: ImportedListingDraftKind }> => {
  const draft = await loadOwnDraft(userId, draftId);
  requirePending(draft);

  const source = await ListingSource.findOne({ _id: draft.source, userId }).select('slug');
  if (!source) throw new ReviewError('The feed for this listing was deleted', 410, 'SOURCE_GONE');

  const data = { ...asObject(draft.data) };
  const blocking = detectIssues(data).filter((i) => BLOCKING_ISSUES.includes(i));
  if (blocking.length > 0) {
    throw new ReviewError('Fill in the missing details before publishing', 422, 'DRAFT_INCOMPLETE', {
      issues: blocking,
    });
  }
  await refreshCoordinates(data, asObject(draft.original));
  const now = new Date();

  if (draft.kind === 'update') {
    const live = draft.propertyId
      ? await Property.findOne({ _id: draft.propertyId, sellerId: userId })
      : null;
    if (!live) throw new ReviewError('The published listing no longer exists', 410, 'PROPERTY_GONE');

    const set: Doc = { sourceFetchedAt: now, sourceUrl: draft.sourceUrl, sourceMetadata: data.sourceMetadata };
    for (const f of REVIEW_FIELDS) set[f] = data[f];
    set.imageUrl = data.imageUrl;
    set.lat = data.lat;
    set.lng = data.lng;
    const updated = await Property.findByIdAndUpdate(live._id, { $set: set }, { new: true });

    draft.status = 'accepted';
    draft.reviewedAt = now;
    await draft.save();
    if (updated) emitPropertyUpdated(String(updated._id), updated.toObject());
    void invalidateCache('/api/properties');
    return { propertyId: encodeId(String(live._id)), kind: 'update' };
  }

  if ((await remainingCapacity(userId)) <= 0) {
    throw new ReviewError(
      'You have reached your monthly listing limit. Upgrade your plan or publish next month.',
      403,
      'LISTING_LIMIT_REACHED'
    );
  }

  const property = await Property.findOneAndUpdate(
    { source: source.slug, sourceListingId: draft.sourceListingId },
    {
      $set: { ...data, status: 'active', lastRenewed: now, sourceFetchedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await incrementUserCountersForPublish(userId).catch((err) =>
    log.info(`[import-review] counter update failed for ${String(userId)}: ${(err as Error).message}`)
  );
  await ListingSource.updateOne({ _id: draft.source }, { $inc: { listingsImported: 1 } });

  draft.status = 'accepted';
  draft.reviewedAt = now;
  draft.propertyId = property._id as Types.ObjectId;
  await draft.save();

  emitPropertyCreated(property.toObject());
  void invalidateCache('/api/properties');
  return { propertyId: encodeId(String(property._id)), kind: 'new' };
};

export const rejectDraft = async (userId: Types.ObjectId, draftId: string): Promise<void> => {
  const draft = await loadOwnDraft(userId, draftId);
  requirePending(draft);
  draft.status = 'rejected';
  draft.reviewedAt = new Date();
  await draft.save();
};

/** Put a rejected listing back in the queue. */
export const restoreDraft = async (userId: Types.ObjectId, draftId: string): Promise<void> => {
  const draft = await loadOwnDraft(userId, draftId);
  if (draft.status !== 'rejected') {
    throw new ReviewError('Only rejected listings can be restored', 409, 'DRAFT_NOT_REJECTED');
  }
  draft.status = 'pending';
  draft.reviewedAt = undefined;
  await draft.save();
};

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; code: string; message: string }[];
}

/**
 * Accept or reject several drafts. Runs sequentially so the monthly limit is
 * checked per listing; once the limit is hit the remaining accepts fail with
 * the same code instead of each re-querying.
 */
export const bulkReview = async (
  userId: Types.ObjectId,
  entries: { id: string; draftId: string }[],
  action: 'accept' | 'reject'
): Promise<BulkResult> => {
  const result: BulkResult = { succeeded: [], failed: [] };
  let limitHit: ReviewError | null = null;
  for (const { id, draftId } of entries) {
    try {
      if (action === 'reject') {
        await rejectDraft(userId, draftId);
      } else {
        if (limitHit) throw limitHit;
        await acceptDraft(userId, draftId);
      }
      result.succeeded.push(id);
    } catch (err) {
      const e = err instanceof ReviewError ? err : new ReviewError((err as Error).message, 500, 'FAILED');
      if (e.code === 'LISTING_LIMIT_REACHED') limitHit = e;
      result.failed.push({ id, code: e.code, message: e.message });
    }
  }
  return result;
};

/** Drop every draft for these sources (used when a feed or its imports are cleared). */
export const deleteDraftsForSources = async (sourceIds: unknown[]): Promise<void> => {
  if (sourceIds.length === 0) return;
  await ImportedListingDraft.deleteMany({ source: { $in: sourceIds } });
};
