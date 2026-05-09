import { Request, Response } from 'express';
import { Types } from 'mongoose';
import ListingSource from '../models/ListingSource';
import Property from '../models/Property';
import { runSource } from '../services/listingIngestService';
import { previewSource, getPreviewSession, deletePreviewSession } from '../services/listingPreviewService';
import {
  detectFeedForUrl,
  detectFromJsonSample,
  detectFeedForUrlWithAuth,
} from '../services/listingDetectorService';
import { resolveId } from '../utils/idObfuscation';
import type { RawListing } from '../services/listingAdapters/types';

/**
 * User-facing listing-source endpoints. All handlers require `req.user`
 * and only ever read/write sources whose `userId` matches the caller.
 *
 * Users can configure all adapter types including `htmlScrape`. Creating
 * an htmlScrape source via the wizard counts as the user accepting
 * responsibility for the target site's ToS, so `acceptedTermsAt` is
 * stamped automatically at create time.
 */

const USER_ALLOWED_ADAPTERS = new Set([
  'rss',
  'jsonFeed',
  'xmlFeed',
  'jsonLd',
  'customApi',
  'htmlScrape',
]);

const requireUserId = (req: Request, res: Response): Types.ObjectId | null => {
  const id = req.user?._id;
  if (!id) {
    res.status(401).json({ message: 'Not authorized' });
    return null;
  }
  return id as Types.ObjectId;
};

const requireValidId = (req: Request, res: Response): string | null => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  // Accepts encoded IDs (from global toJSON transform) or raw hex ObjectIds.
  const id = raw ? (resolveId(raw) ?? (Types.ObjectId.isValid(raw) ? raw : null)) : null;
  if (!id) {
    res.status(400).json({ message: 'Invalid listing source id' });
    return null;
  }
  return id;
};

/** GET /api/listing-sources */
export const list = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const sources = await ListingSource.find({ userId }).sort({ createdAt: -1 });
  res.json({ sources });
};

/** GET /api/listing-sources/:id */
export const get = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;
  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  res.json({ source });
};

/** POST /api/listing-sources */
export const create = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { adapterType, slug } = req.body || {};
  if (!USER_ALLOWED_ADAPTERS.has(adapterType)) {
    res.status(400).json({
      message:
        'Unsupported adapter type. Use rss, jsonFeed, xmlFeed, jsonLd, customApi, or htmlScrape.',
    });
    return;
  }

  // Force a per-user namespaced slug to keep the unique index conflict-free.
  const safeSlug = String(slug || `user-${userId.toString().slice(-6)}-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  // For HTML scraping, the user is explicitly opting in by adding the source,
  // so stamp acceptedTermsAt automatically. The HtmlScrapeAdapter checks this.
  const acceptedTermsAt = adapterType === 'htmlScrape' ? new Date() : undefined;

  try {
    const source = await ListingSource.create({
      ...req.body,
      slug: safeSlug,
      userId,
      acceptedTermsAt,
    });
    res.status(201).json({ source });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

/** PUT /api/listing-sources/:id */
export const update = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const { name, baseUrl, enabled, adapterConfig, fieldMap, schedule, rateLimitRpm } = req.body || {};
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (baseUrl !== undefined) patch.baseUrl = baseUrl;
  if (enabled !== undefined) patch.enabled = Boolean(enabled);
  if (adapterConfig !== undefined) patch.adapterConfig = adapterConfig;
  if (fieldMap !== undefined) patch.fieldMap = fieldMap;
  if (schedule !== undefined) patch.schedule = schedule;
  if (rateLimitRpm !== undefined) patch.rateLimitRpm = rateLimitRpm;

  const source = await ListingSource.findOneAndUpdate({ _id: id, userId }, patch, {
    new: true,
    runValidators: true,
  });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  res.json({ source });
};

/** DELETE /api/listing-sources/:id */
export const remove = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;
  const source = await ListingSource.findOneAndDelete({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  await Property.deleteMany({ source: source.slug });
  res.json({ ok: true });
};

/**
 * POST /api/listing-sources/bulk-delete
 * Body: { ids: string[] }
 * Deletes multiple sources (and their imported properties) in one round-trip.
 * Only sources owned by the caller are touched; unknown ids are silently skipped.
 */
export const bulkDelete = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const rawIds = req.body?.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    res.status(400).json({ message: 'ids[] is required' });
    return;
  }

  const decoded = rawIds
    .map((raw) => (typeof raw === 'string' ? (resolveId(raw) ?? (Types.ObjectId.isValid(raw) ? raw : null)) : null))
    .filter((v): v is string => v !== null);

  if (decoded.length === 0) {
    res.status(400).json({ message: 'No valid ids provided' });
    return;
  }

  const sources = await ListingSource.find({ _id: { $in: decoded }, userId }).select('slug');
  const slugs = sources.map((s) => s.slug);
  const ids = sources.map((s) => s._id);

  await Property.deleteMany({ source: { $in: slugs } });
  const result = await ListingSource.deleteMany({ _id: { $in: ids }, userId });

  res.json({ ok: true, deleted: result.deletedCount ?? 0, deletedSlugs: slugs });
};

/**
 * POST /api/listing-sources/:id/clear-imports
 * Wipes the imported `Property` documents for this source without deleting
 * the source itself. Resets ingest counters so the next sync starts fresh.
 */
export const clearImports = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }

  const result = await Property.deleteMany({ source: source.slug });

  source.listingsImported = 0;
  source.listingsUpdated = 0;
  source.listingsFailed = 0;
  source.lastErrorMessage = undefined;
  await source.save();

  res.json({ ok: true, deleted: result.deletedCount ?? 0, source });
};

/** POST /api/listing-sources/:id/run — trigger an immediate ingest. */
export const runNow = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  if (!source.enabled) {
    res.status(400).json({
      message: 'Source is disabled — enable it before running a sync.',
      code: 'SOURCE_DISABLED',
    });
    return;
  }

  // Validate query params at the API boundary
  const fullRefresh = req.query.fullRefresh === 'true';
  let limit = 50;
  if (req.query.limit !== undefined) {
    const parsed = Number(req.query.limit);
    if (!Number.isFinite(parsed) || parsed < 1) {
      res.status(400).json({
        message: 'limit must be a positive integer between 1 and 200',
        code: 'INVALID_LIMIT',
      });
      return;
    }
    limit = Math.max(1, Math.min(200, Math.floor(parsed)));
  }

  try {
    const stats = await runSource(source, { fullRefresh, limit });
    res.json({ stats });
  } catch (err) {
    const msg = (err as Error).message || 'Sync failed';
    res.status(500).json({
      message: msg,
      code: 'INGEST_FAILED',
    });
  }
};

/**
 * POST /api/listing-sources/:id/preview
 * Fetch listings from the adapter without saving anything. Returns a previewId
 * and array of display items so the user can review/select before importing.
 * Limited to 100 items by default to keep the review modal manageable.
 */
export const preview = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  if (!source.enabled) {
    res.status(400).json({
      message: 'Source is disabled — enable it before fetching listings.',
      code: 'SOURCE_DISABLED',
    });
    return;
  }

  let limit = 50;
  if (req.query.limit !== undefined) {
    const parsed = Number(req.query.limit);
    if (!Number.isFinite(parsed) || parsed < 1) {
      res.status(400).json({
        message: 'limit must be a positive integer between 1 and 200',
        code: 'INVALID_LIMIT',
      });
      return;
    }
    limit = Math.max(1, Math.min(200, Math.floor(parsed)));
  }

  try {
    const result = await previewSource(source, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      message: (err as Error).message || 'Preview failed',
      code: 'PREVIEW_FAILED',
    });
  }
};

/**
 * POST /api/listing-sources/:id/confirm-import
 * Import only the listings the user approved in the review modal.
 * Body: { previewId: string, approvedIds: string[] }
 * Only approved items are saved and counted toward the monthly limit.
 */
export const confirmImport = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }

  const { previewId, approvedIds } = (req.body ?? {}) as {
    previewId?: string;
    approvedIds?: string[];
  };
  if (!previewId || !Array.isArray(approvedIds)) {
    res.status(400).json({ message: 'previewId and approvedIds[] are required' });
    return;
  }

  const session = getPreviewSession(previewId);
  if (!session) {
    res.status(410).json({
      message: 'Preview session expired. Please fetch listings again.',
      code: 'PREVIEW_EXPIRED',
    });
    return;
  }

  // Hard guard: reject mismatched session/source pairs.
  if (session.sourceId !== String(source._id)) {
    res.status(403).json({ message: 'Preview session does not belong to this source' });
    return;
  }

  const approvedSet = new Set(approvedIds);
  const preFetched: RawListing[] = approvedIds
    .filter((rawId) => approvedSet.has(rawId) && session.rawMap[rawId])
    .map((rawId) => session.rawMap[rawId]);

  deletePreviewSession(previewId);

  if (preFetched.length === 0) {
    res.json({
      stats: {
        sourceSlug: source.slug,
        fetched: 0,
        imported: 0,
        updated: 0,
        failed: 0,
        deferred: 0,
        errors: [],
        durationMs: 0,
      },
    });
    return;
  }

  try {
    const stats = await runSource(source, { preFetched });
    res.json({ stats });
  } catch (err) {
    res.status(500).json({
      message: (err as Error).message || 'Import failed',
      code: 'INGEST_FAILED',
    });
  }
};

/** GET /api/listing-sources/:id/stats — counters + last 20 ingested listings. */
export const stats = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const id = requireValidId(req, res);
  if (!id) return;

  const source = await ListingSource.findOne({ _id: id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  const recent = await Property.find({ source: source.slug })
    .sort({ sourceFetchedAt: -1 })
    .limit(20)
    .select('_id title city country price sourceListingId sourceUrl sourceFetchedAt');

  res.json({
    source: {
      _id: source._id,
      slug: source.slug,
      enabled: source.enabled,
      adapterType: source.adapterType,
      lastRunAt: source.lastRunAt,
      lastSuccessAt: source.lastSuccessAt,
      lastErrorMessage: source.lastErrorMessage,
      listingsImported: source.listingsImported,
      listingsUpdated: source.listingsUpdated,
      listingsFailed: source.listingsFailed,
    },
    recent,
  });
};

/**
 * POST /api/listing-sources/detect
 * Probe a URL / analyze a JSON sample and return adapter config + a sample item.
 * Does not persist anything — purely a detection helper.
 *
 * Body variants:
 *   { method: 'url',       url: string }
 *   { method: 'rss',       url: string }          — direct RSS/Atom URL, skips detection
 *   { method: 'sampleJson', sampleJson: string }  — analyze pasted JSON
 *   { method: 'customApi', url: string, authHeaders?: Record<string,string> }
 */
export const detect = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const { method = 'url', url, sampleJson, authHeaders } = req.body || {};

  try {
    if (method === 'sampleJson') {
      if (!sampleJson || typeof sampleJson !== 'string') {
        res.status(400).json({ message: 'sampleJson is required' });
        return;
      }
      const result = detectFromJsonSample(sampleJson);
      res.json(result);
      return;
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ message: 'url is required' });
      return;
    }

    if (method === 'customApi') {
      const safeHeaders: Record<string, string> = {};
      if (authHeaders && typeof authHeaders === 'object') {
        for (const [k, v] of Object.entries(authHeaders)) {
          if (typeof k === 'string' && typeof v === 'string') safeHeaders[k] = v;
        }
      }
      const result = await detectFeedForUrlWithAuth(url.trim(), safeHeaders);
      res.json(result);
      return;
    }

    // 'url' or 'rss' — auto-detect
    const result = await detectFeedForUrl(url.trim());
    res.json(result);
  } catch (err) {
    res.status(422).json({ message: (err as Error).message });
  }
};
