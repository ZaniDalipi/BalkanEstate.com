import { Request, Response } from 'express';
import { Types } from 'mongoose';
import ListingSource from '../models/ListingSource';
import Property from '../models/Property';
import { runSource } from '../services/listingIngestService';
import {
  detectFeedForUrl,
  detectFromJsonSample,
  detectFeedForUrlWithAuth,
} from '../services/listingDetectorService';

/**
 * User-facing listing-source endpoints. All handlers require `req.user`
 * and only ever read/write sources whose `userId` matches the caller.
 *
 * HTML scraping requires an admin-set `acceptedTermsAt` for ToS reasons,
 * so users can only configure feed-style adapters (rss / jsonFeed /
 * xmlFeed / jsonLd / customApi). Attempts to create an `htmlScrape` source
 * via these routes are rejected.
 */

const USER_ALLOWED_ADAPTERS = new Set(['rss', 'jsonFeed', 'xmlFeed', 'jsonLd', 'customApi']);

const requireUserId = (req: Request, res: Response): Types.ObjectId | null => {
  const id = req.user?._id;
  if (!id) {
    res.status(401).json({ message: 'Not authorized' });
    return null;
  }
  return id as Types.ObjectId;
};

const requireValidId = (req: Request, res: Response): string | null => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id || !Types.ObjectId.isValid(id)) {
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
        'HTML scraping must be enabled by an administrator. Please use rss, jsonFeed, xmlFeed, jsonLd, or customApi.',
    });
    return;
  }

  // Force a per-user namespaced slug to keep the unique index conflict-free.
  const safeSlug = String(slug || `user-${userId.toString().slice(-6)}-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  try {
    const source = await ListingSource.create({
      ...req.body,
      slug: safeSlug,
      userId,
      acceptedTermsAt: undefined,
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
  const fullRefresh = req.query.fullRefresh === 'true';
  const limit = req.query.limit ? Math.max(1, Math.min(200, Number(req.query.limit))) : 50;
  const stats = await runSource(source, { fullRefresh, limit });
  res.json({ stats });
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
