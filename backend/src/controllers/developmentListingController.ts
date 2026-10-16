import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Property from '../models/Property';
import DevelopmentUnit from '../models/DevelopmentUnit';
import { getObjectIdParam, isValidObjectId } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';
import { sendServiceError } from './developmentController';

/**
 * Resolve a body id that may be the obfuscated public id (what the client UI
 * exposes) or a raw hex ObjectId, to a raw hex ObjectId. Returns null for
 * anything that is neither, so callers can 400.
 */
const resolveBodyId = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return null;
  const resolved = resolveId(value);
  return resolved && isValidObjectId(resolved) ? resolved : null;
};
import {
  attachListingToUnit,
  detachListingFromUnit,
  bulkAttach,
  detectAttachmentConflicts,
  callerControlsListing,
  type BulkAttachItem,
} from '../services/developments/developmentListingService';

const currentUser = (req: Request): IUser => req.user as IUser;

/** POST /api/dashboard/developments/:developmentId/units/:unitId/listings */
export const attach = async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = getObjectIdParam(req, res, 'unitId');
    if (!unitId) return;
    const listingId = resolveBodyId(req.body?.listingId);
    if (!listingId) {
      res.status(400).json({ message: 'A valid listingId is required' });
      return;
    }
    const result = await attachListingToUnit({
      user: currentUser(req),
      developmentId: String(req.development!._id),
      unitId,
      listingId,
      force: req.body?.force === true,
    });
    res.status(200).json(result);
  } catch (error) {
    sendServiceError(res, error, 'attach listing');
  }
};

/** POST /api/dashboard/developments/:developmentId/units/:unitId/listings/preview */
export const previewConflicts = async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = getObjectIdParam(req, res, 'unitId');
    if (!unitId) return;
    const listingId = resolveBodyId(req.body?.listingId);
    if (!listingId) {
      res.status(400).json({ message: 'A valid listingId is required' });
      return;
    }
    const [property, unit] = await Promise.all([
      Property.findById(listingId),
      DevelopmentUnit.findOne({ _id: unitId, deletedAt: { $exists: false } }),
    ]);
    if (!property) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }
    const controlsListing = await callerControlsListing(currentUser(req), property);
    const conflicts = detectAttachmentConflicts({
      property,
      unit,
      targetDevelopmentId: String(req.development!._id),
      controlsListing,
    });
    res.json({ conflicts, canAttach: conflicts.every((c) => !c.blocking) });
  } catch (error) {
    sendServiceError(res, error, 'preview attachment conflicts');
  }
};

/** DELETE /api/dashboard/developments/:developmentId/units/:unitId/listings/:listingId */
export const detach = async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = getObjectIdParam(req, res, 'unitId');
    if (!unitId) return;
    const listingId = getObjectIdParam(req, res, 'listingId');
    if (!listingId) return;
    const unit = await detachListingFromUnit({
      user: currentUser(req),
      developmentId: String(req.development!._id),
      unitId,
      listingId,
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'detach listing');
  }
};

/** POST /api/dashboard/developments/:developmentId/listings/bulk-attach */
export const bulkAttachListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'items must be a non-empty array' });
      return;
    }
    if (items.length > 200) {
      res.status(400).json({ message: 'A bulk attach is limited to 200 items' });
      return;
    }
    const normalized: BulkAttachItem[] = [];
    for (const item of items) {
      const listingId = resolveBodyId(item?.listingId);
      const unitId = resolveBodyId(item?.unitId);
      if (!listingId || !unitId) {
        res.status(400).json({ message: 'Each item needs a valid listingId and unitId' });
        return;
      }
      normalized.push({ listingId, unitId });
    }
    const result = await bulkAttach({
      user: currentUser(req),
      developmentId: String(req.development!._id),
      items: normalized,
      force: req.body?.force === true,
    });
    res.json(result);
  } catch (error) {
    sendServiceError(res, error, 'bulk attach listings');
  }
};
