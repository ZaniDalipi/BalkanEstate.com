import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Property from '../models/Property';
import Agency from '../models/Agency';
import DevelopmentUnit from '../models/DevelopmentUnit';
import { getObjectIdParam, isValidObjectId } from '../utils/validateParams';
import { resolveId, encodeId } from '../utils/idObfuscation';
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
      // Scoped to this development: another development's unit is "not found".
      DevelopmentUnit.findOne({
        _id: unitId,
        developmentId: req.development!._id,
        deletedAt: { $exists: false },
      }),
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
    const all = detectAttachmentConflicts({
      property,
      unit,
      targetDevelopmentId: String(req.development!._id),
      controlsListing,
    });
    // For a listing the caller doesn't control, report only that: its status or
    // where else it is attached is the owner's business, not the caller's.
    const conflicts = controlsListing ? all : all.filter((c) => c.code === 'listing_not_controlled_by_caller');
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

/** Escape a user string for safe use inside a RegExp. */
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/dashboard/developments/:developmentId/attachable-listings?q=
 * Every listing the caller controls — their own plus any created by an agency
 * they own or administer — as lightweight options for the scene editor's
 * "place a listing on the map" picker. Drafts are excluded; an optional `q`
 * matches the title, address or custom id.
 */
export const listControllableListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = currentUser(req);

    // Agencies the caller owns or administers → their listings are controllable.
    const agencies = await Agency.find({ $or: [{ ownerId: user._id }, { admins: user._id }] })
      .select('_id')
      .lean();
    const agencyIds = agencies.map((a) => a._id);

    const ownership: Record<string, unknown>[] = [{ sellerId: user._id }];
    if (agencyIds.length > 0) ownership.push({ createdByAgencyId: { $in: agencyIds } });

    const filter: Record<string, unknown> = {
      $or: ownership,
      status: { $in: ['active', 'pending'] },
    };

    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$and = [{ $or: [{ title: rx }, { address: rx }, { city: rx }, { propertyId: rx }] }];
    }

    const listings = await Property.find(filter)
      .select('title imageUrl images price listingType city status')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      listings: listings.map((l) => ({
        id: encodeId(String(l._id)),
        title: l.title ?? '',
        imageUrl: l.imageUrl ?? (Array.isArray(l.images) && l.images[0] ? l.images[0].url : undefined),
        price: l.price,
        listingType: l.listingType,
        city: l.city,
      })),
    });
  } catch (error) {
    sendServiceError(res, error, 'list controllable listings');
  }
};
