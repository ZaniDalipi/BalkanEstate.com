import { Types } from 'mongoose';
import { createHash } from 'crypto';
import AgencyFeed, { type AgencyFeedSourceType, type IAgencyFeed } from '../../models/AgencyFeed';
import AgencyFeedUpload from '../../models/AgencyFeedUpload';
import { UPLOAD_MAX_BYTES } from './syncService';
import AgencyFeedJob from '../../models/AgencyFeedJob';
import AgencyFeedRun, { type IAgencyFeedRun } from '../../models/AgencyFeedRun';
import Property from '../../models/Property';
import type { IAgency } from '../../models/Agency';
import { resolvePublicUrl, SsrfError } from '../../utils/ssrfGuard';
import { resolveId } from '../../utils/idObfuscation';
import { auditFeedAction } from './feedAudit';
import { buildStoredCredentials, redactCredentials, redactUrl, validateCredentialsInput, type CredentialsInput } from './feedCredentials';
import { enqueueFeedJob, syncIntervalMs } from './feedJobQueue';
import { validateMapping } from './fieldMapper';
import type { FeedMapping } from './feedTypes';
import { LOCKABLE_FIELDS } from './managedFields';

/**
 * Application service behind the "Property Imports" dashboard section.
 * Controllers do HTTP; this module owns validation, state transitions and
 * the audit trail. Every function assumes the caller already verified that
 * the actor manages `agency` (see requireAgencyFeedManager).
 */

export class FeedInputError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join('; '));
    this.name = 'FeedInputError';
  }
}

export class FeedStateError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FeedStateError';
  }
}

export const MAX_FEEDS_PER_AGENCY = 5;
/** A preview older than this no longer justifies activation. */
export const PREVIEW_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTHORIZATION_STATEMENT =
  'I confirm that this agency owns or is authorized to publish the listings, descriptions and photos in this feed on BalkanEstateAI.';

export interface FeedInput {
  name?: unknown;
  sourceType?: unknown;
  url?: unknown;
  format?: unknown;
  mapping?: unknown;
  mode?: unknown;
  assignedAgentId?: unknown;
  credentials?: unknown;
  safeguards?: unknown;
}

type ActorId = Types.ObjectId | string;

const isMember = (agency: IAgency, userId: string): boolean =>
  String(agency.ownerId) === userId ||
  (agency.agents ?? []).some((a) => String(a) === userId) ||
  (agency.admins ?? []).some((a) => String(a) === userId);

/** Validate a feed URL syntactically and against the SSRF guard (DNS included). */
export const checkFeedUrl = async (raw: string): Promise<string | undefined> => {
  if (raw.length > 2048) return 'The URL is too long';
  try {
    await resolvePublicUrl(raw);
    return undefined;
  } catch (err) {
    if (err instanceof SsrfError) {
      return err.message === 'Host could not be resolved'
        ? 'The feed host could not be found'
        : `This URL cannot be used: ${err.message}. Feeds must be public http(s) addresses on the standard ports.`;
    }
    return 'The URL is not valid';
  }
};

interface NormalizedInput {
  name?: string;
  sourceType?: AgencyFeedSourceType;
  url?: string;
  format?: 'canonical' | 'custom';
  mapping?: FeedMapping;
  mode?: 'snapshot' | 'delta';
  assignedAgentId?: Types.ObjectId;
  credentials?: CredentialsInput;
  safeguards?: { maxRemovalRatio: number; minRemovalsForReview: number };
}

const validateInput = async (
  input: FeedInput,
  agency: IAgency,
  current: Pick<IAgencyFeed, 'sourceType' | 'url'> | null
): Promise<NormalizedInput> => {
  const creating = current === null;
  const problems: string[] = [];
  const out: NormalizedInput = {};

  if (input.sourceType !== undefined) {
    if (input.sourceType !== 'url' && input.sourceType !== 'upload') problems.push('Source must be url or upload');
    else out.sourceType = input.sourceType;
  }
  const source = out.sourceType ?? current?.sourceType ?? 'url';

  if (input.name !== undefined || creating) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) problems.push('Name is required (max 80 characters)');
    else out.name = input.name.trim();
  }
  // An upload feed has no URL to fetch; a URL feed must always have one.
  if (source === 'url' && (input.url !== undefined || creating || !current?.url)) {
    if (typeof input.url !== 'string' || !input.url.trim()) problems.push('Feed URL is required');
    else {
      const url = input.url.trim();
      const problem = await checkFeedUrl(url);
      if (problem) problems.push(problem);
      else out.url = url;
    }
  }
  if (input.format !== undefined) {
    if (input.format !== 'canonical' && input.format !== 'custom') problems.push('Format must be canonical or custom');
    else out.format = input.format;
  }
  if (input.mapping !== undefined && input.mapping !== null) {
    const mappingProblems = validateMapping(input.mapping);
    if (mappingProblems.length) problems.push(...mappingProblems.map((p) => `Mapping: ${p}`));
    else out.mapping = input.mapping as FeedMapping;
  }
  if (input.mode !== undefined) {
    if (input.mode !== 'snapshot' && input.mode !== 'delta') problems.push('Mode must be snapshot or delta');
    else out.mode = input.mode;
  }
  if (input.assignedAgentId !== undefined && input.assignedAgentId !== '') {
    const id = resolveId(String(input.assignedAgentId)) ?? '';
    if (!Types.ObjectId.isValid(id) || !isMember(agency, id)) problems.push('Listings must be assigned to a member of this agency');
    else out.assignedAgentId = new Types.ObjectId(id);
  }
  if (source === 'url' && input.credentials !== undefined && input.credentials !== null) {
    const c = input.credentials as Record<string, unknown>;
    const creds: CredentialsInput = {
      type: c.type as CredentialsInput['type'],
      username: typeof c.username === 'string' ? c.username.trim() : undefined,
      headerName: typeof c.headerName === 'string' ? c.headerName.trim() : undefined,
      secret: typeof c.secret === 'string' && c.secret !== '' ? c.secret : undefined,
    };
    const problem = validateCredentialsInput(creds);
    if (problem) problems.push(problem);
    else out.credentials = creds;
  }
  if (input.safeguards !== undefined && input.safeguards !== null) {
    const s = input.safeguards as Record<string, unknown>;
    const ratio = Number(s.maxRemovalRatio);
    const min = Number(s.minRemovalsForReview);
    if (!(ratio >= 0.05 && ratio <= 1) || !(Number.isInteger(min) && min >= 0 && min <= 1000)) {
      problems.push('Safeguards: removal ratio must be 5–100% and the minimum 0–1000');
    } else out.safeguards = { maxRemovalRatio: ratio, minRemovalsForReview: min };
  }

  if (problems.length) throw new FeedInputError(problems);
  return out;
};

export const toFeedDto = (feed: IAgencyFeed, extras: { activeJob?: boolean; pendingReviewRunId?: string } = {}) => ({
  id: String(feed._id),
  name: feed.name,
  sourceType: feed.sourceType ?? 'url',
  url: feed.url ? redactUrl(feed.url) : null,
  format: feed.format,
  mapping: feed.mapping ?? null,
  mode: feed.mode,
  state: feed.state,
  assignedAgentId: String(feed.assignedAgentId),
  credentials: redactCredentials(feed.credentials),
  safeguards: feed.safeguards,
  authorization: feed.authorization?.confirmedAt
    ? { confirmedAt: feed.authorization.confirmedAt, confirmedBy: String(feed.authorization.confirmedBy) }
    : null,
  configVersion: feed.configVersion,
  lastPreviewRunId: feed.lastPreviewRunId ? String(feed.lastPreviewRunId) : null,
  lastRunId: feed.lastRunId ? String(feed.lastRunId) : null,
  lastRunAt: feed.lastRunAt ?? null,
  lastSuccessfulSyncAt: feed.lastSuccessfulSyncAt ?? null,
  nextSyncAt: feed.state === 'active' ? feed.nextSyncAt ?? null : null,
  consecutiveFailures: feed.consecutiveFailures,
  lastError: feed.lastError?.code ? feed.lastError : null,
  activatedAt: feed.activatedAt ?? null,
  activeJob: extras.activeJob ?? false,
  pendingReviewRunId: extras.pendingReviewRunId ?? null,
  createdAt: feed.createdAt,
  updatedAt: feed.updatedAt,
});

export const toRunDto = (run: IAgencyFeedRun, detail = false) => ({
  id: String(run._id),
  trigger: run.trigger,
  dryRun: run.dryRun,
  status: run.status,
  startedAt: run.startedAt ?? null,
  finishedAt: run.finishedAt ?? null,
  createdAt: run.createdAt,
  counts: run.counts,
  snapshot: run.snapshot,
  error: run.error?.code ? run.error : null,
  deactivation: {
    candidates: run.deactivation.candidates,
    allowed: run.deactivation.allowed,
    held: run.deactivation.held,
    blockedReason: run.deactivation.blockedReason ?? null,
    resolution: run.deactivation.resolution ?? null,
    ...(detail ? { pendingExternalIds: run.deactivation.pendingExternalIds.slice(0, 200) } : {}),
  },
  limit: run.limit,
  issueCount: run.issues.length,
  ...(detail ? { issues: run.issues, issuesTruncated: run.issuesTruncated, samples: run.samples } : {}),
});

export const describeFeeds = async (agencyId: Types.ObjectId) => {
  const feeds = await AgencyFeed.find({ agencyId }).sort({ createdAt: 1 });
  const feedIds = feeds.map((f) => f._id);
  const [jobs, reviews] = await Promise.all([
    AgencyFeedJob.find({ feedId: { $in: feedIds }, activeKey: { $exists: true } }).select('feedId').lean(),
    AgencyFeedRun.find({ feedId: { $in: feedIds }, status: 'awaiting_review', 'deactivation.resolution': { $exists: false } })
      .select('feedId')
      .lean(),
  ]);
  const busy = new Set(jobs.map((j) => String(j.feedId)));
  const review = new Map(reviews.map((r) => [String(r.feedId), String(r._id)]));
  return feeds.map((f) => toFeedDto(f, { activeJob: busy.has(String(f._id)), pendingReviewRunId: review.get(String(f._id)) }));
};

export const createFeed = async (agency: IAgency, actorId: ActorId, input: FeedInput): Promise<IAgencyFeed> => {
  const count = await AgencyFeed.countDocuments({ agencyId: agency._id });
  if (count >= MAX_FEEDS_PER_AGENCY) throw new FeedInputError([`An agency can connect at most ${MAX_FEEDS_PER_AGENCY} feeds`]);
  const data = await validateInput(input, agency, null);
  const sourceType = data.sourceType ?? 'url';
  const format = data.format ?? 'canonical';
  if (format === 'custom' && !data.mapping) throw new FeedInputError(['A custom feed needs a field mapping']);
  if (data.url && (await AgencyFeed.exists({ agencyId: agency._id, url: data.url }))) {
    throw new FeedInputError(['This feed URL is already connected']);
  }

  const feed = await AgencyFeed.create({
    agencyId: agency._id,
    name: data.name,
    sourceType,
    url: sourceType === 'url' ? data.url : undefined,
    format,
    mapping: format === 'custom' ? data.mapping : undefined,
    mode: data.mode ?? 'snapshot',
    state: 'draft',
    assignedAgentId: data.assignedAgentId ?? agency.ownerId,
    credentials: data.credentials ? buildStoredCredentials(data.credentials) : { type: 'none' },
    ...(data.safeguards ? { safeguards: data.safeguards } : {}),
    createdBy: actorId,
    updatedBy: actorId,
  });
  await auditFeedAction({
    agencyId: agency._id as Types.ObjectId,
    feedId: feed._id as Types.ObjectId,
    actorId,
    action: 'feed_created',
    details: { name: feed.name, sourceType, url: redactUrl(feed.url), format, mode: feed.mode, credentials: feed.credentials.type },
  });
  return feed;
};

/** Settings that change what is imported: changing one sends the feed back to draft. */
const PARSING_KEYS = ['sourceType', 'url', 'format', 'mapping', 'mode', 'credentials'] as const;

export const updateFeed = async (feed: IAgencyFeed, agency: IAgency, actorId: ActorId, input: FeedInput): Promise<IAgencyFeed> => {
  const data = await validateInput(input, agency, feed);
  const changed: string[] = [];
  if (data.name !== undefined && data.name !== feed.name) { feed.name = data.name; changed.push('name'); }
  if (data.sourceType !== undefined && data.sourceType !== feed.sourceType) {
    feed.sourceType = data.sourceType;
    changed.push('sourceType');
    if (data.sourceType === 'upload') {
      // Nothing to fetch any more: drop the URL and its credentials.
      feed.url = undefined;
      feed.credentials = { type: 'none' };
      feed.markModified('credentials');
    }
  }
  if (data.url !== undefined && data.url !== feed.url) {
    if (await AgencyFeed.exists({ agencyId: agency._id, url: data.url, _id: { $ne: feed._id } })) throw new FeedInputError(['This feed URL is already connected']);
    feed.url = data.url;
    changed.push('url');
  }
  if (data.format !== undefined && data.format !== feed.format) { feed.format = data.format; changed.push('format'); }
  if (data.mapping !== undefined) { feed.mapping = data.mapping; feed.markModified('mapping'); changed.push('mapping'); }
  if (feed.format === 'custom' && !feed.mapping) throw new FeedInputError(['A custom feed needs a field mapping']);
  if (data.mode !== undefined && data.mode !== feed.mode) { feed.mode = data.mode; changed.push('mode'); }
  if (data.assignedAgentId && String(data.assignedAgentId) !== String(feed.assignedAgentId)) {
    feed.assignedAgentId = data.assignedAgentId;
    changed.push('assignedAgentId');
  }
  if (data.credentials) {
    feed.credentials = buildStoredCredentials(data.credentials, feed.credentials);
    feed.markModified('credentials');
    changed.push('credentials');
  }
  if (data.safeguards) { feed.safeguards = data.safeguards; feed.markModified('safeguards'); changed.push('safeguards'); }
  if (changed.length === 0) return feed;

  const reconfigured = changed.some((c) => (PARSING_KEYS as readonly string[]).includes(c));
  if (reconfigured) {
    feed.configVersion += 1;
    if (feed.state !== 'draft') {
      // What will be imported changed: a fresh preview and activation are required.
      feed.state = 'draft';
      feed.nextSyncAt = undefined;
    }
  }
  feed.updatedBy = new Types.ObjectId(String(actorId));
  await feed.save();
  await auditFeedAction({
    agencyId: feed.agencyId,
    feedId: feed._id as Types.ObjectId,
    actorId,
    action: changed.includes('credentials') ? 'credentials_changed' : 'feed_updated',
    details: { changed, url: redactUrl(feed.url), backToDraft: reconfigured },
  });
  return feed;
};

const ensureIdle = async (feed: IAgencyFeed): Promise<void> => {
  if (await AgencyFeedJob.exists({ feedId: feed._id, activeKey: { $exists: true } })) {
    throw new FeedStateError('busy', 'An import for this feed is queued or running; try again when it finishes');
  }
};

export const requestPreview = async (feed: IAgencyFeed, actorId: ActorId) => {
  if (feed.sourceType === 'upload') throw new FeedStateError('upload_required', 'Upload an XML file to preview it');
  const queued = await enqueueFeedJob({ feed, kind: 'preview', trigger: 'preview', requestedBy: actorId });
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, runId: queued.runId, action: 'preview_requested' });
  return queued;
};

export const requestSync = async (feed: IAgencyFeed, actorId: ActorId) => {
  if (feed.sourceType === 'upload') throw new FeedStateError('upload_required', 'This feed imports uploaded files; upload a new XML file instead');
  if (feed.state === 'draft') throw new FeedStateError('not_active', 'Preview and activate the feed before syncing it');
  const queued = await enqueueFeedJob({ feed, kind: 'sync', trigger: 'manual', requestedBy: actorId });
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, runId: queued.runId, action: 'sync_requested' });
  return queued;
};

export interface ActivationInput {
  confirmAuthorized?: unknown;
  acceptListingLimit?: unknown;
}

export const activateFeed = async (feed: IAgencyFeed, actorId: ActorId, input: ActivationInput, now = new Date()) => {
  if (input.confirmAuthorized !== true) {
    throw new FeedStateError('authorization_required', 'Confirm that the agency is authorized to publish this feed');
  }
  const preview = feed.lastPreviewRunId ? await AgencyFeedRun.findById(feed.lastPreviewRunId) : null;
  if (!preview || preview.status !== 'previewed' || preview.configVersion !== feed.configVersion) {
    throw new FeedStateError('preview_required', 'Run a successful preview of the current settings before activating');
  }
  if (now.getTime() - (preview.finishedAt ?? preview.createdAt).getTime() > PREVIEW_VALIDITY_MS) {
    throw new FeedStateError('preview_stale', 'The last preview is more than 7 days old; preview the feed again');
  }
  if (preview.counts.valid === 0) {
    throw new FeedStateError('no_valid_listings', 'The preview found no valid listings; fix the reported problems first');
  }
  if (preview.limit.wouldExceed && input.acceptListingLimit !== true) {
    throw new FeedStateError(
      'listing_limit',
      `The feed has ${preview.limit.newListings} new listings but the plan allows ${preview.limit.remaining ?? 0} more. ` +
        'Confirm to import up to the allowance (the rest are not published and nothing is charged), or upgrade the plan first.'
    );
  }
  await ensureIdle(feed);
  feed.state = 'active';
  feed.authorization = { confirmedAt: now, confirmedBy: new Types.ObjectId(String(actorId)), statement: AUTHORIZATION_STATEMENT };
  feed.activatedAt = now;
  feed.nextSyncAt = feed.sourceType === 'upload' ? undefined : new Date(now.getTime() + syncIntervalMs());
  feed.updatedBy = new Types.ObjectId(String(actorId));
  await feed.save();
  await auditFeedAction({
    agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, runId: preview._id as Types.ObjectId,
    action: 'authorization_confirmed', details: { statement: AUTHORIZATION_STATEMENT },
  });
  await auditFeedAction({
    agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, action: 'feed_activated',
    details: { acceptedListingLimit: preview.limit.wouldExceed },
  });
  // The first import runs right away rather than in 24 hours. For an uploaded
  // file it imports exactly the file that was previewed.
  return enqueueFeedJob({
    feed,
    kind: 'sync',
    trigger: 'manual',
    requestedBy: actorId,
    ...(preview.uploadId && preview.sourceFile
      ? { upload: { id: preview.uploadId, filename: preview.sourceFile.filename, bytes: preview.sourceFile.bytes } }
      : {}),
  });
};

export const pauseFeed = async (feed: IAgencyFeed, actorId: ActorId) => {
  if (feed.sourceType === 'upload') throw new FeedStateError('not_scheduled', 'Upload feeds have no daily sync to pause');
  if (feed.state !== 'active') throw new FeedStateError('not_active', 'Only an active feed can be paused');
  feed.state = 'paused';
  feed.nextSyncAt = undefined;
  await feed.save();
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, action: 'feed_paused' });
};

export const resumeFeed = async (feed: IAgencyFeed, actorId: ActorId, now = new Date()) => {
  if (feed.sourceType === 'upload') throw new FeedStateError('not_scheduled', 'Upload feeds have no daily sync to resume');
  if (feed.state !== 'paused') throw new FeedStateError('not_paused', 'Only a paused feed can be resumed');
  feed.state = 'active';
  feed.nextSyncAt = now;
  await feed.save();
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, action: 'feed_resumed' });
};

/**
 * Remove a feed connection. Imported listings are kept as they are (their
 * provenance stays on the listing) and simply stop being synchronized.
 */
export const deleteFeed = async (feed: IAgencyFeed, actorId: ActorId) => {
  await ensureIdle(feed);
  const imported = await Property.countDocuments({ 'feedSync.feedId': feed._id });
  await AgencyFeed.deleteOne({ _id: feed._id });
  await auditFeedAction({
    agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, action: 'feed_deleted',
    details: { url: redactUrl(feed.url), listingsKept: imported },
  });
  return { listingsKept: imported };
};

export const resolveDeactivationReview = async (
  feed: IAgencyFeed,
  runId: string,
  decision: 'approve' | 'dismiss',
  actorId: ActorId,
  now = new Date()
) => {
  const run = await AgencyFeedRun.findOne({ _id: runId, feedId: feed._id });
  if (!run || run.status !== 'awaiting_review' || run.deactivation.resolution) {
    throw new FeedStateError('no_review', 'There is no pending review for this import');
  }
  if (decision === 'dismiss') {
    run.deactivation.resolution = 'dismissed';
    run.deactivation.resolvedAt = now;
    run.deactivation.resolvedBy = new Types.ObjectId(String(actorId));
    run.status = 'partial';
    await run.save();
    await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, runId: run._id as Types.ObjectId, action: 'deactivations_dismissed', details: { candidates: run.deactivation.candidates } });
    return { queued: false };
  }
  run.deactivation.resolvedBy = new Types.ObjectId(String(actorId));
  await run.save();
  const queued = await enqueueFeedJob({ feed, kind: 'apply_deactivations', trigger: 'manual', requestedBy: actorId, runId: run._id as Types.ObjectId });
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, runId: run._id as Types.ObjectId, action: 'deactivations_approved', details: { candidates: run.deactivation.candidates } });
  return { queued: true, jobId: String(queued.jobId) };
};

export const setListingLocks = async (feed: IAgencyFeed, propertyId: string, fields: unknown, actorId: ActorId) => {
  if (!Array.isArray(fields) || fields.some((f) => typeof f !== 'string' || !(LOCKABLE_FIELDS as readonly string[]).includes(f))) {
    throw new FeedInputError([`Lockable fields are: ${LOCKABLE_FIELDS.join(', ')}`]);
  }
  const unique = Array.from(new Set(fields as string[]));
  const result = await Property.updateOne(
    { _id: propertyId, 'feedSync.feedId': feed._id },
    { $set: { 'feedSync.lockedFields': unique } }
  );
  if (result.matchedCount === 0) throw new FeedStateError('not_found', 'Listing not found in this feed');
  await auditFeedAction({ agencyId: feed.agencyId, feedId: feed._id as Types.ObjectId, actorId, action: 'listing_fields_locked', details: { propertyId, fields: unique } });
  return unique;
};

export interface UploadInput {
  content: Buffer;
  filename: string;
  /** `import` applies the file on an activated feed; a draft feed always previews. */
  intent: 'preview' | 'import';
}

/** Leading bytes of an XML document: optional BOM, whitespace, then "<". */
const looksLikeXml = (content: Buffer): boolean => {
  const head = content.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  return head.startsWith('<');
};

/**
 * Store an uploaded XML file and queue it: a preview while the feed is a
 * draft (or when asked), otherwise an import that applies it exactly like a
 * fetched feed — same validation, limits and deactivation safeguards.
 */
export const uploadFeedFile = async (feed: IAgencyFeed, actorId: ActorId, input: UploadInput) => {
  if (feed.sourceType !== 'upload') {
    throw new FeedStateError('not_upload_feed', 'This feed is fetched from its URL; switch it to file uploads to upload XML');
  }
  if (input.content.length === 0) throw new FeedInputError(['The file is empty']);
  if (input.content.length > UPLOAD_MAX_BYTES) {
    throw new FeedInputError([`The file is larger than ${Math.round(UPLOAD_MAX_BYTES / 1048576)} MB`]);
  }
  if (!looksLikeXml(input.content)) throw new FeedInputError(['The file is not XML']);

  const kind = feed.state === 'draft' || input.intent === 'preview' ? 'preview' : 'sync';
  const filename = input.filename.replace(/[^\w.\- ]/g, '_').slice(0, 200) || 'feed.xml';
  const upload = await AgencyFeedUpload.create({
    feedId: feed._id,
    agencyId: feed.agencyId,
    filename,
    bytes: input.content.length,
    sha256: createHash('sha256').update(input.content).digest('hex'),
    content: input.content,
    uploadedBy: actorId,
  });
  try {
    const queued = await enqueueFeedJob({
      feed,
      kind,
      trigger: kind === 'preview' ? 'preview' : 'manual',
      requestedBy: actorId,
      upload: { id: upload._id as Types.ObjectId, filename, bytes: upload.bytes },
    });
    await auditFeedAction({
      agencyId: feed.agencyId,
      feedId: feed._id as Types.ObjectId,
      actorId,
      runId: queued.runId,
      action: kind === 'preview' ? 'preview_requested' : 'sync_requested',
      details: { upload: filename, bytes: upload.bytes, sha256: upload.sha256 },
    });
    return { ...queued, kind };
  } catch (err) {
    await AgencyFeedUpload.deleteOne({ _id: upload._id });
    throw err;
  }
};
