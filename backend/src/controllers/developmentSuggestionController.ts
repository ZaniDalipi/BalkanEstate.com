import { Request, Response } from 'express';
import { toPublicDevelopment } from '../services/developments/developmentPublicService';
import { IUser } from '../models/User';
import Development, { IDevelopment } from '../models/Development';
import DevelopmentMembership from '../models/DevelopmentMembership';
import DevelopmentClaim from '../models/DevelopmentClaim';
import Property from '../models/Property';
import { isValidObjectId } from '../utils/validateParams';
import { encodeId, resolveId } from '../utils/idObfuscation';
import DevelopmentUnit from '../models/DevelopmentUnit';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import { createLogger } from '../utils/logger';
import { roleHasPermission, type DevelopmentRole } from '../config/developments';
import { sendServiceError } from './developmentController';
import {
  attachListingToDevelopmentLevel,
  callerControlsListing,
} from '../services/developments/developmentListingService';
import { publicResidenceFilter } from '../services/developments/billing/publicResidenceFilter';

const log = createLogger('DevelopmentSuggestionController');
const currentUser = (req: Request): IUser => req.user as IUser;

/** Great-circle distance between two lat/lng points, in metres. */
const haversineMeters = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
};

/** A 0–100 match score that falls off with distance. */
const scoreForDistance = (meters: number): number => {
  const km = meters / 1000;
  return Math.max(30, Math.min(99, Math.round(100 - km * 8)));
};

const MAX_NEARBY_METERS = 50_000; // 50 km

/**
 * GET /api/developments/nearby?lat=&lng=&city=&country=&limit=&listingId=
 * Published developments near a point, ranked by distance, with whether the
 * caller can attach to each (owner or a membership role that may attach).
 */
export const nearbyDevelopments = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ message: 'Valid lat and lng are required' });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);

    const query: Record<string, unknown> = {
      ...publicResidenceFilter(),
      lat: { $exists: true, $ne: null },
      lng: { $exists: true, $ne: null },
    };
    // Country narrows the candidate set cheaply before the distance pass.
    if (typeof req.query.country === 'string' && req.query.country.trim()) {
      query.country = req.query.country.trim();
    }

    const candidates = await Development.find(query).limit(200);

    const ranked = candidates
      .map((d) => ({
        dev: d,
        distanceM: haversineMeters(lat, lng, d.lat as number, d.lng as number),
      }))
      .filter((c) => c.distanceM <= MAX_NEARBY_METERS)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, limit);

    const canAttachMap = await resolveCanAttach(
      currentUser(req),
      ranked.map((r) => r.dev)
    );
    const attachment = await resolveListingAttachment(currentUser(req), req.query.listingId);

    res.json({
      suggestions: ranked.map((r) => ({
        development: toPublicDevelopment(r.dev),
        distanceM: Math.round(r.distanceM),
        matchScore: scoreForDistance(r.distanceM),
        canAttach: canAttachMap.get(String(r.dev._id)) ?? false,
        attachment: attachment && attachment.developmentId === String(r.dev._id) ? attachment.place : null,
      })),
    });
  } catch (error) {
    sendServiceError(res, error, 'nearby developments');
  }
};

interface ListingPlace {
  /** Set when the listing sits on an apartment; absent when only the residence is linked. */
  unitId?: string;
  unitNumber?: string;
  buildingName?: string;
}

/**
 * Where the caller's own listing is attached today (residence and apartment),
 * so the listing form shows the real state after a reload. Nothing for a
 * listing the caller does not control.
 */
const resolveListingAttachment = async (
  user: IUser,
  rawListingId: unknown
): Promise<{ developmentId: string; place: ListingPlace } | null> => {
  const listingId = typeof rawListingId === 'string' && rawListingId ? resolveId(rawListingId) : null;
  if (!listingId || !isValidObjectId(listingId)) return null;
  const property = await Property.findById(listingId).select('sellerId createdByAgencyId developmentId unitId');
  if (!property?.developmentId || !(await callerControlsListing(user, property))) return null;
  const place: ListingPlace = {};
  if (property.unitId) {
    const unit = await DevelopmentUnit.findOne({ _id: property.unitId, deletedAt: null }).select('unitNumber buildingId').lean();
    if (unit) {
      const building = await DevelopmentBuilding.findById(unit.buildingId).select('name').lean();
      Object.assign(place, { unitId: encodeId(String(unit._id)), unitNumber: unit.unitNumber, buildingName: building?.name });
    }
  }
  return { developmentId: String(property.developmentId), place };
};

/** Map of developmentId → whether the user may attach listings to it. */
const resolveCanAttach = async (
  user: IUser,
  developments: IDevelopment[]
): Promise<Map<string, boolean>> => {
  const result = new Map<string, boolean>();
  const userId = String(user._id);
  const needMembership: string[] = [];

  for (const d of developments) {
    if (d.ownerType === 'user' && String(d.ownerId) === userId) {
      result.set(String(d._id), true);
    } else {
      result.set(String(d._id), false);
      needMembership.push(String(d._id));
    }
  }

  if (needMembership.length > 0) {
    const memberships = await DevelopmentMembership.find({
      developmentId: { $in: needMembership },
      userId: user._id,
      status: 'active',
    })
      .select('developmentId role')
      .lean();
    for (const m of memberships) {
      if (roleHasPermission(m.role as DevelopmentRole, 'listing.attach')) {
        result.set(String(m.developmentId), true);
      }
    }
  }
  return result;
};

/**
 * POST /api/dashboard/developments/:developmentId/attach-listing
 * Associate a listing with the development (no specific unit). Route-guarded by
 * developmentAuth + listing.attach; the service also checks the caller controls
 * the listing.
 */
export const attachListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = resolveId(String(req.body?.listingId || ''));
    if (!listingId || !isValidObjectId(listingId)) {
      res.status(400).json({ message: 'A valid listingId is required' });
      return;
    }
    const property = await attachListingToDevelopmentLevel({
      user: currentUser(req),
      developmentId: String(req.development!._id),
      listingId,
    });
    res.json({ property });
  } catch (error) {
    sendServiceError(res, error, 'attach listing to development');
  }
};

/**
 * POST /api/developments/:slug/request-attachment
 * Ask the owner of a development you don't control for access to attach
 * listings. Creates (or returns) a pending claim.
 */
export const requestAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const development = await Development.findOne({ slug, ...publicResidenceFilter() }).select('_id');
    if (!development) {
      res.status(404).json({ message: 'Development not found' });
      return;
    }

    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : '';
    const listingId = req.body?.listingId ? resolveId(String(req.body.listingId)) : null;

    // If a listing was referenced, verify the caller controls it.
    if (listingId && isValidObjectId(listingId)) {
      const property = await Property.findById(listingId).select('sellerId createdByAgencyId');
      if (property && !(await callerControlsListing(currentUser(req), property))) {
        res.status(403).json({ message: 'You do not control the referenced listing.' });
        return;
      }
    }

    const existing = await DevelopmentClaim.findOne({
      developmentId: development._id,
      claimantId: currentUser(req)._id,
      status: 'pending',
    });
    if (existing) {
      res.status(200).json({ claim: existing, alreadyRequested: true });
      return;
    }

    const claim = await DevelopmentClaim.create({
      developmentId: development._id,
      claimantId: currentUser(req)._id,
      reason:
        note ||
        `Requesting access to attach ${listingId ? 'a listing' : 'listings'} to this development.`,
      evidenceMediaIds: [],
      status: 'pending',
    });
    log.info(`Attachment access requested for development ${String(development._id)} by ${String(currentUser(req)._id)}`);
    res.status(201).json({ claim });
  } catch (error) {
    sendServiceError(res, error, 'request attachment');
  }
};
