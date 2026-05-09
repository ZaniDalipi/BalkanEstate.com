import { Request, Response } from 'express';
import ListingSource from '../models/ListingSource';
import Property from '../models/Property';
import { runSource } from '../services/listingIngestService';
import { previewSource, getPreviewSession, deletePreviewSession } from '../services/listingPreviewService';
import type { RawListing } from '../services/listingAdapters/types';

/** GET /api/admin/listing-sources */
export const list = async (_req: Request, res: Response): Promise<void> => {
  const sources = await ListingSource.find().sort({ createdAt: -1 });
  res.json({ sources });
};

/** GET /api/admin/listing-sources/:id */
export const get = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findById(req.params.id);
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  res.json({ source });
};

/** POST /api/admin/listing-sources */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const source = await ListingSource.create(req.body);
    res.status(201).json({ source });
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

/** PUT /api/admin/listing-sources/:id */
export const update = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  res.json({ source });
};

/** DELETE /api/admin/listing-sources/:id */
export const remove = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findByIdAndDelete(req.params.id);
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  res.json({ ok: true });
};

/**
 * POST /api/admin/listing-sources/:id/run
 * Trigger an immediate ingest for one source. Useful for testing
 * a new fieldMap/selectors config without waiting for the cron tick.
 */
export const runNow = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findById(req.params.id);
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  const fullRefresh = req.query.fullRefresh === 'true';
  const limit = req.query.limit ? Math.max(1, Math.min(1000, Number(req.query.limit))) : undefined;
  const stats = await runSource(source, { fullRefresh, limit });
  res.json({ stats });
};

/**
 * POST /api/admin/listing-sources/:id/preview
 * Fetch listings from the source adapter without saving anything to the DB.
 * Returns a preview token + array of display items so the user can review
 * and select which listings to actually import before committing.
 */
export const preview = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findById(req.params.id);
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }
  const limit = req.query.limit ? Math.max(1, Math.min(200, Number(req.query.limit))) : 50;
  try {
    const result = await previewSource(source, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

/**
 * POST /api/admin/listing-sources/:id/confirm-import
 * Import only the approved listings from a previous preview session.
 * Body: { previewId: string, approvedIds: string[] }
 * Only approved items are saved; only they count toward the monthly limit.
 */
export const confirmImport = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findById(req.params.id);
  if (!source) {
    res.status(404).json({ message: 'ListingSource not found' });
    return;
  }

  const { previewId, approvedIds } = req.body as { previewId?: string; approvedIds?: string[] };
  if (!previewId || !Array.isArray(approvedIds)) {
    res.status(400).json({ message: 'previewId and approvedIds are required' });
    return;
  }

  const session = getPreviewSession(previewId);
  if (!session) {
    res.status(410).json({ message: 'Preview session expired. Please fetch listings again.' });
    return;
  }

  const approvedSet = new Set(approvedIds);
  const preFetched: RawListing[] = approvedIds
    .filter((id) => approvedSet.has(id) && session.rawMap[id])
    .map((id) => session.rawMap[id]);

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

  const stats = await runSource(source, { preFetched });
  res.json({ stats });
};

/**
 * GET /api/admin/listing-sources/:id/stats
 * Returns lifetime counters plus the 20 most recently ingested properties.
 */
export const stats = async (req: Request, res: Response): Promise<void> => {
  const source = await ListingSource.findById(req.params.id);
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
