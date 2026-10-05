import { Types } from 'mongoose';
import AgencyFeed, { type IAgencyFeed } from '../../models/AgencyFeed';
import AgencyFeedRun, { emptyRunCounts, type IAgencyFeedRun } from '../../models/AgencyFeedRun';
import AgencyFeedUpload from '../../models/AgencyFeedUpload';
import AgencyFeedStagedRecord, { type IAgencyFeedStagedRecord, type StagedResult } from '../../models/AgencyFeedStagedRecord';
import Agency, { type IAgency } from '../../models/Agency';
import Agent from '../../models/Agent';
import Property, { type IProperty } from '../../models/Property';
import User from '../../models/User';
import activityLogger from '../activityLogger';
import { geocodeAddressWithRateLimit } from '../geocodingService';
import { captureMessage } from '../../lib/sentry';
import { CANONICAL_MAPPING } from './canonicalFormat';
import { auditFeedAction, feedLogger } from './feedAudit';
import { decryptCredentials, redactUrl } from './feedCredentials';
import { fetchFeed, FeedFetchError, readUploadedFeed, type FetchFeedOptions, type FetchedFeed } from './feedFetcher';
import { mapRecord, selectFirst } from './fieldMapper';
import type { FeedIssue, FeedMapping } from './feedTypes';
import {
  defaultImageStore,
  guardedImageDownload,
  mapWithConcurrency,
  sweepUnreferencedAssets,
  type ImageDownloader,
  type ImageStore,
} from './imageImporter';
import { getCreationAllowance, releaseListingSlot, reserveListingSlot } from './listingAllowance';
import { normalizeRecord } from './listingNormalizer';
import { createListing, deactivateListing, deactivateMissing, updateListing, type Geocoder, type WriterContext } from './listingWriter';
import { listingHash } from './managedFields';
import { findDuplicateIds, planSync } from './syncPlanner';
import { detectStructure } from './structureDetector';

/**
 * Runs one agency-feed import from start to finish:
 *
 *   1. fetch + stage   download, parse, map and validate every record, and
 *                      store them all before touching a single listing
 *   2. plan            decide create / update / unchanged / remove / reject,
 *                      check the listing allowance, decide deactivations
 *                      (a preview stops here)
 *   3. apply           write each record, marking it applied as it goes
 *   4. finalize        deactivate missing listings if allowed, tally the run,
 *                      update the feed, sweep unreferenced images
 *
 * Each phase is recorded on the run, so a run interrupted by a crash or
 * deploy resumes from the phase it reached; already-applied records are
 * skipped and nothing is charged or created twice.
 */

export class RetryLaterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryLaterError';
  }
}

export interface SyncDeps {
  fetchDocument: (url: string, options: FetchFeedOptions) => Promise<FetchedFeed>;
  geocode: Geocoder;
  imageStore: ImageStore;
  download: ImageDownloader;
  now: () => Date;
  heartbeat?: () => Promise<void>;
}

export const defaultSyncDeps = (): SyncDeps => ({
  fetchDocument: fetchFeed,
  geocode: async ({ address, city, country }) => {
    const point = await geocodeAddressWithRateLimit(address, city, country);
    return point ? { lat: point.lat, lng: point.lng } : null;
  },
  imageStore: defaultImageStore(),
  download: guardedImageDownload,
  now: () => new Date(),
});

const MAX_RUN_ISSUES = 500;
const MAX_SAMPLES = 5;
const STAGE_BATCH = 500;

const intEnv = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const fetchLimitsFromEnv = () => ({
  maxBytes: intEnv('AGENCY_FEED_MAX_MB', 50) * 1024 * 1024,
  maxRecords: intEnv('AGENCY_FEED_MAX_LISTINGS', 10_000),
  timeoutMs: intEnv('AGENCY_FEED_FETCH_TIMEOUT_MS', 120_000),
  maxPages: intEnv('AGENCY_FEED_MAX_PAGES', 50),
});

/** Uploaded files are stored as one MongoDB document, so they stay under its 16 MB limit. */
export const UPLOAD_MAX_BYTES = Math.min(intEnv('AGENCY_FEED_UPLOAD_MAX_MB', 15), 15) * 1024 * 1024;

export const mappingFor = (feed: Pick<IAgencyFeed, 'format' | 'mapping'>): FeedMapping =>
  feed.format === 'canonical' || !feed.mapping ? CANONICAL_MAPPING : feed.mapping;

const isMember = (agency: IAgency, userId: Types.ObjectId): boolean => {
  const id = String(userId);
  return (
    String(agency.ownerId) === id ||
    (agency.agents ?? []).some((a) => String(a) === id) ||
    (agency.admins ?? []).some((a) => String(a) === id)
  );
};

const checkPreconditions = (feed: IAgencyFeed, agency: IAgency | null, run: IAgencyFeedRun): { code: string; message: string } | null => {
  if (!agency) return { code: 'agency_missing', message: 'The agency no longer exists' };
  const status = agency.subscription?.status;
  if (status !== 'active' && status !== 'trial') {
    return { code: 'subscription_inactive', message: 'The agency subscription is not active; imports are paused until it is renewed' };
  }
  if (!isMember(agency, feed.assignedAgentId)) {
    return { code: 'agent_not_member', message: 'The agent listings are published under is no longer a member of the agency' };
  }
  if (!run.dryRun && feed.state === 'draft') {
    return { code: 'feed_not_active', message: 'The feed must be activated before it can sync' };
  }
  if (!run.dryRun && run.configVersion !== feed.configVersion) {
    return { code: 'config_changed', message: 'The feed settings changed after this sync was queued' };
  }
  return null;
};

const capIssues = (run: IAgencyFeedRun, issues: FeedIssue[]): void => {
  run.issuesTruncated = issues.length > MAX_RUN_ISSUES;
  // Errors first: those are what the agency has to fix.
  const sorted = [...issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  run.issues = sorted.slice(0, MAX_RUN_ISSUES);
};

// ── Phase 1 ────────────────────────────────────────────────────────────────

/** The run's XML: the uploaded file when there is one, otherwise the feed URL. */
const loadDocument = async (run: IAgencyFeedRun, feed: IAgencyFeed, mapping: FeedMapping, deps: SyncDeps): Promise<FetchedFeed> => {
  if (run.uploadId) {
    const upload = await AgencyFeedUpload.findOne({ _id: run.uploadId, feedId: feed._id }).select('content');
    if (!upload) throw new FeedFetchError('upload_missing', 'The uploaded file is no longer available; upload it again.', false);
    const { maxRecords } = fetchLimitsFromEnv();
    return readUploadedFeed(upload.content, mapping, { maxRecords, maxBytes: UPLOAD_MAX_BYTES });
  }
  if (feed.sourceType === 'upload' || !feed.url) {
    throw new FeedFetchError('upload_required', 'This feed imports uploaded files; upload an XML file to import it.', false);
  }
  return deps.fetchDocument(feed.url, {
    mapping,
    credentials: decryptCredentials(feed),
    limits: fetchLimitsFromEnv(),
  });
};

const fetchAndStage = async (run: IAgencyFeedRun, feed: IAgencyFeed, deps: SyncDeps): Promise<void> => {
  await AgencyFeedStagedRecord.deleteMany({ runId: run._id });
  run.status = 'fetching';
  run.startedAt = run.startedAt ?? deps.now();
  await run.save();

  const mapping = mappingFor(feed);
  const fetched = await loadDocument(run, feed, mapping, deps);

  const mapped = fetched.records.map((record) => mapRecord(record, mapping));
  const normalized = mapped.map((m) => normalizeRecord(m, mapping));
  const ids = normalized.map((n, i) => {
    const raw = mapped[i].externalId;
    return n.listing?.externalId ?? (Array.isArray(raw) ? raw[0] : raw)?.trim();
  });
  const duplicates = findDuplicateIds(ids);

  const allIssues: FeedIssue[] = [];
  const docs = normalized.map((n, ordinal) => {
    const issues = [...n.issues];
    let valid = Boolean(n.listing);
    if (ids[ordinal] && duplicates.has(ids[ordinal] as string)) {
      valid = false;
      issues.push({
        severity: 'error',
        code: 'duplicate_external_id',
        message: `Listing ID ${ids[ordinal]} appears more than once in the feed; none of its copies were imported`,
        externalId: ids[ordinal],
        field: 'externalId',
      });
    }
    if (!n.listing && !issues.some((i) => i.severity === 'error')) {
      issues.push({ severity: 'error', code: 'invalid_record', message: 'Listing could not be read', externalId: ids[ordinal] });
    }
    allIssues.push(...issues);
    return {
      runId: run._id,
      feedId: feed._id,
      ordinal,
      externalId: ids[ordinal],
      valid,
      listing: valid ? n.listing : undefined,
      hash: valid && n.listing ? listingHash(n.listing) : undefined,
      issues,
    };
  });
  for (let i = 0; i < docs.length; i += STAGE_BATCH) {
    await AgencyFeedStagedRecord.insertMany(docs.slice(i, i + STAGE_BATCH), { ordered: false });
  }

  const valid = docs.filter((d) => d.valid);
  run.snapshot = {
    mode: feed.mode,
    complete: fetched.complete,
    incompleteReason: fetched.incompleteReason,
    declaredTotal: fetched.declaredTotal,
    pages: fetched.pages,
    bytes: fetched.bytes,
  };
  run.counts = { ...emptyRunCounts(), received: docs.length, valid: valid.length, rejected: docs.length - valid.length };
  run.samples = valid
    .map((d) => d.listing)
    .filter((l): l is NonNullable<typeof l> => Boolean(l) && l?.feedStatus !== 'removed')
    .slice(0, MAX_SAMPLES);
  // Nothing matched the mapping: say what the file does contain, and suggest a mapping for it.
  if (docs.length === 0 && fetched.header) {
    const detected = detectStructure(fetched.header);
    if (detected && detected.recordElement !== mapping.recordElement) {
      run.detected = detected as unknown as IAgencyFeedRun['detected'];
      allIssues.push({
        severity: 'error',
        code: 'no_listings_found',
        message: `No <${mapping.recordElement}> elements were found. This file lists properties as <${detected.recordElement}> — apply the suggested field mapping to import them.`,
      });
    } else {
      allIssues.push({
        severity: 'error',
        code: 'no_listings_found',
        message: `No <${mapping.recordElement}> elements were found in the file.`,
      });
    }
  }
  capIssues(run, allIssues);
  run.status = 'staged';
  await run.save();
  feedLogger.info('feed staged', {
    runId: String(run._id),
    feedId: String(feed._id),
    received: docs.length,
    valid: valid.length,
    complete: fetched.complete,
    pages: fetched.pages,
    bytes: fetched.bytes,
    rootElement: fetched.header?.name,
    feedVersion: fetched.header ? selectFirst(fetched.header, '@version') : undefined,
  });
};

// ── Phase 2 ────────────────────────────────────────────────────────────────

const planRun = async (run: IAgencyFeedRun, feed: IAgencyFeed, agency: IAgency): Promise<void> => {
  const staged = await AgencyFeedStagedRecord.find({ runId: run._id })
    .select('ordinal externalId valid listing hash')
    .lean<Array<Pick<IAgencyFeedStagedRecord, 'ordinal' | 'externalId' | 'valid' | 'listing' | 'hash'>>>();
  const existing = await Property.find({ 'feedSync.feedId': feed._id })
    .select('feedSync.externalId feedSync.sourceHash feedSync.deactivatedAt feedSync.lockedFields feedSync.failedImageUrls')
    .lean<Array<Pick<IProperty, 'feedSync'>>>();
  const allowance = await getCreationAllowance(feed.assignedAgentId, agency);

  const plan = planSync({
    records: staged,
    existing: existing.map((p) => ({
      externalId: p.feedSync?.externalId as string,
      sourceHash: p.feedSync?.sourceHash as string,
      deactivated: Boolean(p.feedSync?.deactivatedAt),
      statusLocked: (p.feedSync?.lockedFields ?? []).includes('status'),
      hasFailedImages: (p.feedSync?.failedImageUrls ?? []).length > 0,
    })),
    mode: feed.mode,
    complete: run.snapshot.complete,
    incompleteReason: run.snapshot.incompleteReason,
    previousSnapshotCount: feed.lastSnapshotCount,
    safeguards: feed.safeguards ?? { maxRemovalRatio: 0.3, minRemovalsForReview: 5 },
    remainingCreates: allowance.remaining,
  });

  const ops = Array.from(plan.actions.entries()).map(([ordinal, action]) => ({
    updateOne: { filter: { runId: run._id, ordinal }, update: { $set: { action } } },
  }));
  for (let i = 0; i < ops.length; i += STAGE_BATCH) {
    await AgencyFeedStagedRecord.bulkWrite(ops.slice(i, i + STAGE_BATCH), { ordered: false });
  }

  run.limit = {
    checked: true,
    remaining: allowance.remaining,
    allowance: allowance.allowance,
    plan: allowance.plan,
    newListings: plan.newListings,
    wouldExceed: plan.excess.length > 0,
    excess: plan.excess.slice(0, 200),
  };
  run.deactivation = {
    candidates: plan.deactivation.candidates.length,
    allowed: plan.deactivation.allowed,
    blockedReason: plan.deactivation.blockedReason ?? plan.deactivation.heldReason,
    held: plan.deactivation.held,
    pendingExternalIds: plan.deactivation.allowed ? plan.deactivation.candidates : [],
  };
  if (plan.excess.length > 0) {
    run.issues.push({
      severity: 'warning',
      code: 'listing_limit',
      message: `${plan.excess.length} new listing(s) exceed the plan's remaining allowance (${allowance.remaining}) and will not be published`,
    });
  }
};

// ── Phase 3 ────────────────────────────────────────────────────────────────

const loadWriterContext = async (run: IAgencyFeedRun, feed: IAgencyFeed, agency: IAgency, deps: SyncDeps): Promise<WriterContext> => {
  const seller = await User.findById(feed.assignedAgentId)
    .select('name email agencyName licenseNumber')
    .lean<WriterContext['seller']>();
  if (!seller) throw new Error('Assigned agent not found');
  return {
    feed,
    agency,
    seller,
    runId: run._id as Types.ObjectId,
    now: deps.now(),
    geocode: deps.geocode,
    images: { store: deps.imageStore, download: deps.download, now: deps.now },
  };
};

const findFeedListing = (feedId: unknown, externalId: string) =>
  Property.findOne({ 'feedSync.feedId': feedId, 'feedSync.externalId': externalId });

const applyRecord = async (
  record: IAgencyFeedStagedRecord,
  ctx: WriterContext,
  allowanceModel: Awaited<ReturnType<typeof getCreationAllowance>>['model']
): Promise<void> => {
  const listing = record.listing;
  if (!listing || !record.hash) {
    record.action = 'reject';
    record.appliedAt = ctx.now;
    await record.save();
    return;
  }
  let issues: FeedIssue[] = [];
  let result: StagedResult = {};
  let propertyId: Types.ObjectId | undefined;
  const existing = await findFeedListing(ctx.feed._id, listing.externalId);

  if (record.action === 'remove') {
    if (existing && (await deactivateListing(existing, ctx))) propertyId = existing._id as Types.ObjectId;
  } else if (existing) {
    // A create that already happened before a crash: the listing exists, so
    // bring it up to date instead of creating it twice. Its slot was charged
    // for this very listing and stays charged; the record still counts as
    // the create it was.
    const outcome = await updateListing(existing, listing, record.hash, ctx);
    ({ issues, result, propertyId } = outcome);
  } else {
    if (record.action === 'update') record.action = 'create'; // deleted locally since planning
    if (!record.slotReserved) {
      const reserved = await reserveListingSlot(ctx.seller._id, allowanceModel);
      if (!reserved) {
        record.action = 'skip_limit';
        record.appliedAt = ctx.now;
        await record.save();
        return;
      }
      record.slotReserved = true;
      await record.save();
    }
    const outcome = await createListing(listing, record.hash, ctx);
    ({ issues, result, propertyId } = outcome);
    if (outcome.rejected) {
      await releaseListingSlot(ctx.seller._id, allowanceModel);
      record.slotReserved = false;
      record.action = 'reject';
    } else {
      await Agent.updateOne({ userId: ctx.seller._id }, { $inc: { activeListings: 1 } }).catch(() => undefined);
    }
  }

  record.issues = [...(record.issues ?? []), ...issues];
  record.result = result;
  record.propertyId = propertyId;
  record.appliedAt = ctx.now;
  record.markModified('issues');
  record.markModified('result');
  await record.save();
};

const applyRun = async (run: IAgencyFeedRun, feed: IAgencyFeed, agency: IAgency, deps: SyncDeps): Promise<void> => {
  if (run.status !== 'applying') {
    run.status = 'applying';
    await run.save();
  }
  const ctx = await loadWriterContext(run, feed, agency, deps);
  const allowance = await getCreationAllowance(feed.assignedAgentId, agency);

  // Listings are independent, so several are written at once; photo
  // downloads inside each listing are themselves concurrent. Slot charges are
  // atomic, so parallel creates can never overshoot the plan allowance.
  const concurrency = Math.min(intEnv('AGENCY_FEED_APPLY_CONCURRENCY', 4), 16);
  let processed = 0;
  for (;;) {
    const batch = await AgencyFeedStagedRecord.find({
      runId: run._id,
      appliedAt: { $exists: false },
      action: { $in: ['create', 'update', 'remove'] },
    })
      .sort({ ordinal: 1 })
      .limit(100);
    if (batch.length === 0) break;
    await mapWithConcurrency(batch, concurrency, async (record) => {
      try {
        await applyRecord(record, ctx, allowance.model);
      } catch (err) {
        // A record that fails deterministically must not block the run or be retried forever.
        feedLogger.error('record apply failed', { runId: String(run._id), externalId: record.externalId, error: (err as Error).message });
        record.action = 'reject';
        record.appliedAt = ctx.now;
        record.issues = [
          ...(record.issues ?? []),
          { severity: 'error', code: 'apply_failed', message: 'The listing could not be saved; it will be retried on the next sync', externalId: record.externalId },
        ];
        record.markModified('issues');
        await record.save();
      }
    });
    processed += batch.length;
    await deps.heartbeat?.();
    feedLogger.info('applying', { runId: String(run._id), processed });
  }
};

// ── Phase 4 ────────────────────────────────────────────────────────────────

const tallyRun = async (run: IAgencyFeedRun, feedId: Types.ObjectId): Promise<void> => {
  const staged = await AgencyFeedStagedRecord.find({ runId: run._id }).select('action valid result issues').lean();
  const counts = { ...emptyRunCounts(), received: run.counts.received };
  const issues: FeedIssue[] = [];
  for (const s of staged) {
    if (s.valid) counts.valid++;
    issues.push(...((s.issues as FeedIssue[]) ?? []));
    switch (s.action) {
      case 'create': counts.created++; break;
      case 'update': counts.updated++; break;
      case 'unchanged': counts.unchanged++; break;
      case 'skip_limit': counts.skippedLimit++; break;
      case 'reject': counts.rejected++; break;
      default: break;
    }
    const r = (s.result ?? {}) as StagedResult;
    if (r.reactivated) counts.reactivated++;
    counts.localEditsKept += r.localEditsKept?.length ?? 0;
    counts.imagesDownloaded += r.imagesDownloaded ?? 0;
    counts.imagesReused += r.imagesReused ?? 0;
    counts.imagesFailed += r.imagesFailed ?? 0;
  }
  counts.deactivated = await Property.countDocuments({
    'feedSync.feedId': feedId,
    'feedSync.lastRunId': run._id,
    'feedSync.deactivatedAt': { $exists: true },
  });
  run.counts = counts;
  run.markModified('counts');
  const extra = run.issues.filter((i) => i.code === 'listing_limit' || i.code === 'deactivation_held');
  capIssues(run, [...extra, ...issues]);
};

const finalizeRun = async (run: IAgencyFeedRun, feed: IAgencyFeed, deps: SyncDeps): Promise<void> => {
  const now = deps.now();
  const seenIds = (await AgencyFeedStagedRecord.distinct('externalId', { runId: run._id })).filter(Boolean) as string[];
  await Property.updateMany(
    { 'feedSync.feedId': feed._id, 'feedSync.externalId': { $in: seenIds }, 'feedSync.lastSeenAt': { $lt: now } },
    { $set: { 'feedSync.lastSeenAt': now } }
  );

  const d = run.deactivation;
  if (d.allowed && !d.held && d.pendingExternalIds.length > 0) {
    await deactivateMissing(feed._id as Types.ObjectId, d.pendingExternalIds, run._id as Types.ObjectId, now, run.startedAt ?? now);
  }
  if (d.held && !run.issues.some((i) => i.code === 'deactivation_held')) {
    run.issues.unshift({
      severity: 'warning',
      code: 'deactivation_held',
      message: `${d.candidates} listing(s) are missing from the feed. ${d.blockedReason ?? ''} Review before they are deactivated.`.trim(),
    });
  }

  await tallyRun(run, feed._id as Types.ObjectId);
  const c = run.counts;
  run.status = d.held ? 'awaiting_review' : c.rejected > 0 || c.skippedLimit > 0 || c.imagesFailed > 0 ? 'partial' : 'succeeded';
  run.finishedAt = now;
  run.error = undefined;
  await run.save();

  await AgencyFeedRun.updateMany(
    { feedId: feed._id, _id: { $ne: run._id }, status: 'awaiting_review', 'deactivation.resolution': { $exists: false } },
    { $set: { 'deactivation.resolution': 'expired', 'deactivation.resolvedAt': now } }
  );

  const feedUpdate: Record<string, unknown> = {
    lastRunAt: now,
    lastRunId: run._id,
    lastSuccessfulSyncAt: now,
    consecutiveFailures: 0,
  };
  if (feed.mode === 'snapshot' && run.snapshot.complete && run.counts.received > 0) {
    feedUpdate.lastSnapshotCount = run.counts.received;
  }
  await AgencyFeed.updateOne({ _id: feed._id }, { $set: feedUpdate, $unset: { lastError: '' } });

  try {
    await sweepUnreferencedAssets(feed._id as Types.ObjectId, deps.imageStore, undefined, now);
  } catch (err) {
    feedLogger.warn('asset sweep failed', { feedId: String(feed._id), error: (err as Error).message });
  }
  try {
    const { invalidateCache } = await import('../../middleware/cache');
    await invalidateCache('/api/properties');
  } catch {
    /* cache is best-effort */
  }

  await auditFeedAction({
    agencyId: feed.agencyId,
    feedId: feed._id as Types.ObjectId,
    runId: run._id as Types.ObjectId,
    action: 'sync_completed',
    details: { status: run.status, trigger: run.trigger, ...run.counts },
  });
  if (d.held) {
    await auditFeedAction({
      agencyId: feed.agencyId,
      feedId: feed._id as Types.ObjectId,
      runId: run._id as Types.ObjectId,
      action: 'deactivations_held',
      details: { candidates: d.candidates, reason: d.blockedReason },
    });
  }
};

// ── Failure handling ───────────────────────────────────────────────────────

export const failRun = async (
  run: IAgencyFeedRun,
  feed: IAgencyFeed | null,
  error: { code: string; message: string },
  now: Date = new Date()
): Promise<void> => {
  run.status = 'failed';
  run.error = error;
  run.finishedAt = now;
  await run.save();
  if (!feed || run.dryRun) {
    if (feed) feedLogger.info('preview failed', { feedId: String(feed._id), code: error.code });
    return;
  }
  await AgencyFeed.updateOne(
    { _id: feed._id },
    {
      $set: { lastRunAt: now, lastRunId: run._id, lastError: { ...error, at: now } },
      $inc: { consecutiveFailures: 1 },
    }
  );
  await auditFeedAction({
    agencyId: feed.agencyId,
    feedId: feed._id as Types.ObjectId,
    runId: run._id as Types.ObjectId,
    action: 'sync_failed',
    details: { code: error.code, message: error.message, ...(feed.url ? { url: redactUrl(feed.url) } : {}) },
  });
  await activityLogger.log({
    category: 'system',
    action: 'agency_feed_sync_failed',
    severity: 'error',
    metadata: { agencyId: String(feed.agencyId), feedId: String(feed._id), runId: String(run._id), code: error.code },
  });
  if ((feed.consecutiveFailures ?? 0) + 1 >= 3) {
    captureMessage('Agency feed failing repeatedly', 'warning', { feedId: String(feed._id), code: error.code });
  }
};

// ── Entry point ────────────────────────────────────────────────────────────

export interface ExecuteOptions {
  /** On the last attempt a retryable error fails the run instead of re-queuing it. */
  finalAttempt: boolean;
}

export const executeRun = async (
  runId: Types.ObjectId | string,
  deps: SyncDeps = defaultSyncDeps(),
  options: ExecuteOptions = { finalAttempt: true }
): Promise<IAgencyFeedRun> => {
  const run = await AgencyFeedRun.findById(runId);
  if (!run) throw new Error(`Run ${String(runId)} not found`);
  if (['previewed', 'succeeded', 'partial', 'awaiting_review', 'failed'].includes(run.status)) return run;

  run.attempts += 1;
  const feed = await AgencyFeed.findById(run.feedId);
  if (!feed) {
    await failRun(run, null, { code: 'feed_deleted', message: 'The feed was deleted' });
    return run;
  }
  const agency = await Agency.findById(feed.agencyId);
  const blocked = checkPreconditions(feed, agency, run);
  if (blocked) {
    await failRun(run, feed, blocked, deps.now());
    return run;
  }

  if (run.status === 'queued' || run.status === 'fetching') {
    try {
      await fetchAndStage(run, feed, deps);
    } catch (err) {
      const fetchError =
        err instanceof FeedFetchError ? err : new FeedFetchError('internal_error', 'The feed could not be processed', true);
      if (!(err instanceof FeedFetchError)) feedLogger.error('fetch phase crashed', { runId: String(run._id), error: (err as Error).message });
      if (fetchError.retryable && !options.finalAttempt) {
        run.status = 'queued';
        run.error = { code: fetchError.code, message: `${fetchError.message} Retrying automatically.` };
        await run.save();
        throw new RetryLaterError(fetchError.message);
      }
      await failRun(run, feed, { code: fetchError.code, message: fetchError.message }, deps.now());
      return run;
    }
  }

  if (run.status === 'staged') {
    await planRun(run, feed, agency as IAgency);
    if (run.dryRun) {
      run.status = 'previewed';
      run.finishedAt = deps.now();
      await run.save();
      await AgencyFeed.updateOne({ _id: feed._id }, { $set: { lastPreviewRunId: run._id } });
      return run;
    }
    run.status = 'applying';
    await run.save();
  }

  if (run.status === 'applying') {
    await applyRun(run, feed, agency as IAgency, deps);
    await finalizeRun(run, feed, deps);
  }
  return run;
};

/**
 * Apply deactivations a manager approved after a suspicious-drop review.
 * Only valid for the feed's most recent sync, and only for listings that
 * have not reappeared in the feed since.
 */
export const applyHeldDeactivations = async (runId: Types.ObjectId | string, actorId: Types.ObjectId | string, now = new Date()): Promise<number> => {
  const run = await AgencyFeedRun.findById(runId);
  if (!run || run.status !== 'awaiting_review' || run.deactivation.resolution) return 0;
  const latest = await AgencyFeedRun.findOne({ feedId: run.feedId, dryRun: false, status: { $in: ['succeeded', 'partial', 'awaiting_review'] } })
    .sort({ createdAt: -1 })
    .select('_id');
  if (!latest || String(latest._id) !== String(run._id)) {
    run.deactivation.resolution = 'expired';
    run.deactivation.resolvedAt = now;
    await run.save();
    return 0;
  }
  const count = await deactivateMissing(
    run.feedId,
    run.deactivation.pendingExternalIds,
    run._id as Types.ObjectId,
    now,
    run.startedAt ?? run.createdAt
  );
  run.deactivation.resolution = 'approved';
  run.deactivation.resolvedAt = now;
  run.deactivation.resolvedBy = new Types.ObjectId(String(actorId));
  run.counts = { ...run.counts, deactivated: run.counts.deactivated + count };
  run.markModified('counts');
  run.status = run.counts.rejected > 0 || run.counts.skippedLimit > 0 || run.counts.imagesFailed > 0 ? 'partial' : 'succeeded';
  await run.save();
  return count;
};
