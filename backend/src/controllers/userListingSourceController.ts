import { Request, Response } from 'express';
import { Types } from 'mongoose';
import ListingSource from '../models/ListingSource';
import Property from '../models/Property';
import { runSource } from '../services/listingIngestService';

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
  const source = await ListingSource.findOne({ _id: req.params.id, userId });
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

  // Force a per-user namespaced slug to keep the unique index conflict-free
  // (and to make it visually obvious which user owns a slug).
  const safeSlug = String(slug || `user-${userId.toString().slice(-6)}-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  try {
    const source = await ListingSource.create({
      ...req.body,
      slug: safeSlug,
      userId,
      // Users can't bypass the HTML-scraping ToS gate.
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

  // Allow-list fields users can edit; never let them reassign userId or flip
  // adapterType to htmlScrape / set acceptedTermsAt.
  const { name, baseUrl, enabled, adapterConfig, fieldMap, schedule, rateLimitRpm } = req.body || {};
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (baseUrl !== undefined) update.baseUrl = baseUrl;
  if (enabled !== undefined) update.enabled = Boolean(enabled);
  if (adapterConfig !== undefined) update.adapterConfig = adapterConfig;
  if (fieldMap !== undefined) update.fieldMap = fieldMap;
  if (schedule !== undefined) update.schedule = schedule;
  if (rateLimitRpm !== undefined) update.rateLimitRpm = rateLimitRpm;

  const source = await ListingSource.findOneAndUpdate({ _id: req.params.id, userId }, update, {
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
  const source = await ListingSource.findOneAndDelete({ _id: req.params.id, userId });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  // Best-effort cleanup of the listings this source created. Users won't
  // expect to keep shadow copies of imports they've removed.
  await Property.deleteMany({ source: source.slug });
  res.json({ ok: true });
};

/** POST /api/listing-sources/:id/run — trigger an immediate ingest. */
export const runNow = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const source = await ListingSource.findOne({ _id: req.params.id, userId });
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

  const source = await ListingSource.findOne({ _id: req.params.id, userId });
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
