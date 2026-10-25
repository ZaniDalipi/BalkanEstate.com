import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Development from '../models/Development';
import DevelopmentFollow, {
  type IFollowFilters,
  type IFollowPreferences,
} from '../models/DevelopmentFollow';
import { createLogger } from '../utils/logger';
import { sendServiceError } from './developmentController';
import { toPublicDevelopment } from '../services/developments/developmentPublicService';
import { publicResidenceFilter } from '../services/developments/billing/publicResidenceFilter';

const log = createLogger('DevelopmentFollowController');
const currentUser = (req: Request): IUser => req.user as IUser;

const FILTER_KEYS = ['minBeds', 'maxBeds', 'minPrice', 'maxPrice', 'minArea', 'maxArea'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Coerce a value to a non-negative finite number, or undefined. */
const toPositiveNumber = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN; // NaN signals "provided but invalid"
};

const sanitizePreferences = (raw: unknown): IFollowPreferences => {
  const o = (raw ?? {}) as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    newUnits: bool(o.newUnits, true),
    priceReductions: bool(o.priceReductions, true),
    availabilityChanges: bool(o.availabilityChanges, true),
    newBuildings: bool(o.newBuildings, false),
  };
};

const sanitizeFilters = (
  raw: unknown
): { ok: true; filters: IFollowFilters } | { ok: false; error: string } => {
  const o = (raw ?? {}) as Record<string, unknown>;
  const filters: IFollowFilters = {};
  for (const key of FILTER_KEYS) {
    const n = toPositiveNumber(o[key]);
    if (Number.isNaN(n)) return { ok: false, error: `${key} must be a non-negative number` };
    if (n !== undefined) filters[key as FilterKey] = n;
  }
  if (filters.minBeds !== undefined && filters.maxBeds !== undefined && filters.minBeds > filters.maxBeds)
    return { ok: false, error: 'minBeds cannot be greater than maxBeds' };
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice)
    return { ok: false, error: 'minPrice cannot be greater than maxPrice' };
  if (filters.minArea !== undefined && filters.maxArea !== undefined && filters.minArea > filters.maxArea)
    return { ok: false, error: 'minArea cannot be greater than maxArea' };
  return { ok: true, filters };
};

/**
 * Load a PUBLISHED development by slug, or send 404 and return null. A draft
 * or archived development does not exist for buyers, so it cannot be followed
 * (nor its existence probed through the follow endpoints).
 */
const loadBySlug = async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').toLowerCase();
  const development = await Development.findOne({ slug, ...publicResidenceFilter() }).select('_id');
  if (!development) {
    res.status(404).json({ message: 'Development not found' });
    return null;
  }
  return development;
};

/** POST /api/developments/:slug/follow — follow or update preferences. */
export const follow = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await loadBySlug(req, res);
    if (!development) return;

    const preferences = sanitizePreferences(req.body?.preferences);
    const filtersResult = sanitizeFilters(req.body?.filters);
    if (!filtersResult.ok) {
      res.status(400).json({ message: filtersResult.error });
      return;
    }

    const follow = await DevelopmentFollow.findOneAndUpdate(
      { developmentId: development._id, userId: currentUser(req)._id },
      { $set: { preferences, filters: filtersResult.filters } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({ following: true, follow });
  } catch (error) {
    sendServiceError(res, error, 'follow development');
  }
};

/** GET /api/developments/:slug/follow — the caller's follow state. */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await loadBySlug(req, res);
    if (!development) return;
    const follow = await DevelopmentFollow.findOne({
      developmentId: development._id,
      userId: currentUser(req)._id,
    });
    res.json({ following: !!follow, follow });
  } catch (error) {
    sendServiceError(res, error, 'get follow status');
  }
};

/** DELETE /api/developments/:slug/follow — unfollow. */
export const unfollow = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await loadBySlug(req, res);
    if (!development) return;
    await DevelopmentFollow.deleteOne({
      developmentId: development._id,
      userId: currentUser(req)._id,
    });
    res.json({ following: false });
  } catch (error) {
    sendServiceError(res, error, 'unfollow development');
  }
};

/** GET /api/developments/following — developments the caller follows. */
export const listFollowing = async (req: Request, res: Response): Promise<void> => {
  try {
    const follows = await DevelopmentFollow.find({ userId: currentUser(req)._id })
      .sort({ createdAt: -1 })
      .lean();
    const ids = follows.map((f) => f.developmentId);
    // Only published developments, in their public projection (no owner ids).
    const developments = await Development.find({ _id: { $in: ids }, ...publicResidenceFilter() });
    log.info(`User ${String(currentUser(req)._id)} follows ${developments.length} development(s)`);
    res.json({ developments: developments.map(toPublicDevelopment), follows });
  } catch (error) {
    sendServiceError(res, error, 'list followed developments');
  }
};
