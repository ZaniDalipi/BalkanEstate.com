import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  ReviewError,
  acceptDraft,
  bulkReview,
  countPending,
  listDrafts,
  rejectDraft,
  restoreDraft,
  updateDraft,
} from '../services/importReviewService';
import type {
  ImportedListingDraftKind,
  ImportedListingDraftStatus,
} from '../models/ImportedListingDraft';
import { resolveId } from '../utils/idObfuscation';

/**
 * Review queue for listings fetched from the caller's external feeds.
 * Every handler is scoped to `req.user._id` — users only see their own drafts.
 */

const STATUSES = new Set<ImportedListingDraftStatus>(['pending', 'accepted', 'rejected']);
const KINDS = new Set<ImportedListingDraftKind>(['new', 'update']);
const BULK_MAX = 100;

const requireUserId = (req: Request, res: Response): Types.ObjectId | null => {
  const id = req.user?._id;
  if (!id) {
    res.status(401).json({ message: 'Not authorized' });
    return null;
  }
  return id as Types.ObjectId;
};

const decodeId = (raw: unknown): string | null =>
  typeof raw === 'string' && raw ? (resolveId(raw) ?? (Types.ObjectId.isValid(raw) ? raw : null)) : null;

const requireDraftId = (req: Request, res: Response): string | null => {
  const id = decodeId(req.params.draftId);
  if (!id) res.status(400).json({ message: 'Invalid draft id' });
  return id;
};

const sendError = (res: Response, err: unknown): void => {
  if (err instanceof ReviewError) {
    res.status(err.status).json({ message: err.message, code: err.code, ...err.details });
    return;
  }
  res.status(500).json({ message: (err as Error).message || 'Request failed' });
};

/** GET /api/listing-sources/review?status=&kind=&sourceId=&page=&limit= */
export const list = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const status = String(req.query.status ?? 'pending') as ImportedListingDraftStatus;
  if (!STATUSES.has(status)) {
    res.status(400).json({ message: 'status must be pending, accepted or rejected' });
    return;
  }
  const kind = req.query.kind ? (String(req.query.kind) as ImportedListingDraftKind) : undefined;
  if (kind && !KINDS.has(kind)) {
    res.status(400).json({ message: 'kind must be new or update' });
    return;
  }
  let sourceId: string | undefined;
  if (req.query.sourceId) {
    const decoded = decodeId(String(req.query.sourceId));
    if (!decoded) {
      res.status(400).json({ message: 'Invalid sourceId' });
      return;
    }
    sourceId = decoded;
  }
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  try {
    res.json(
      await listDrafts(userId, {
        status,
        kind,
        sourceId,
        page: Number.isFinite(page) ? Math.floor(page) : 1,
        limit: Number.isFinite(limit) ? Math.floor(limit) : 20,
      })
    );
  } catch (err) {
    sendError(res, err);
  }
};

/** GET /api/listing-sources/review/count */
export const count = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    res.json(await countPending(userId));
  } catch (err) {
    sendError(res, err);
  }
};

/** PATCH /api/listing-sources/review/:draftId — edit the draft before publishing. */
export const edit = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const draftId = requireDraftId(req, res);
  if (!draftId) return;
  try {
    res.json({ draft: await updateDraft(userId, draftId, req.body?.data) });
  } catch (err) {
    sendError(res, err);
  }
};

/** POST /api/listing-sources/review/:draftId/accept — publish (or apply the update). */
export const accept = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const draftId = requireDraftId(req, res);
  if (!draftId) return;
  try {
    res.json(await acceptDraft(userId, draftId));
  } catch (err) {
    sendError(res, err);
  }
};

/** POST /api/listing-sources/review/:draftId/reject — don't publish; later syncs skip it. */
export const reject = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const draftId = requireDraftId(req, res);
  if (!draftId) return;
  try {
    await rejectDraft(userId, draftId);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
};

/** POST /api/listing-sources/review/:draftId/restore — move a rejected draft back to pending. */
export const restore = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const draftId = requireDraftId(req, res);
  if (!draftId) return;
  try {
    await restoreDraft(userId, draftId);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
};

/** POST /api/listing-sources/review/bulk — Body: { ids: string[], action: 'accept' | 'reject' } */
export const bulk = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { ids, action } = (req.body ?? {}) as { ids?: unknown; action?: unknown };
  if (action !== 'accept' && action !== 'reject') {
    res.status(400).json({ message: 'action must be accept or reject' });
    return;
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > BULK_MAX) {
    res.status(400).json({ message: `ids[] must contain 1–${BULK_MAX} ids` });
    return;
  }
  const entries = ids
    .map((id) => ({ id: String(id), draftId: decodeId(id) }))
    .filter((e): e is { id: string; draftId: string } => e.draftId !== null);
  if (entries.length === 0) {
    res.status(400).json({ message: 'No valid ids provided' });
    return;
  }
  try {
    res.json(await bulkReview(userId, entries, action));
  } catch (err) {
    sendError(res, err);
  }
};
