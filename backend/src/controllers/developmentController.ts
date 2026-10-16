import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentEntrance from '../models/DevelopmentEntrance';
import DevelopmentFloor from '../models/DevelopmentFloor';
import DevelopmentUnit from '../models/DevelopmentUnit';
import Property from '../models/Property';
import DevelopmentAuditLog from '../models/DevelopmentAuditLog';
import { createLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import {
  uploadImage,
  deleteImage,
  isMediaStorageConfigured,
} from '../services/mediaService';
import {
  createDevelopment,
  listDevelopmentsForUser,
  updateDevelopment,
  setDevelopmentStatus,
  softDeleteDevelopment,
} from '../services/developments/developmentService';
import {
  createBuilding,
  createFloor,
  createUnit,
  listUnits,
  setUnitAvailability,
} from '../services/developments/developmentInventoryService';

const log = createLogger('DevelopmentController');

/**
 * Map a thrown service error with a `statusCode` to an HTTP response. Anything
 * without one is a genuine 500. Keeps controllers thin and consistent.
 */
export const sendServiceError = (res: Response, error: unknown, context: string): void => {
  const e = error as { statusCode?: number; message?: string; conflicts?: unknown } | null;
  if (e && typeof e.statusCode === 'number') {
    const body: Record<string, unknown> = { message: e.message };
    if (e.conflicts) body.conflicts = e.conflicts;
    res.status(e.statusCode).json(body);
    return;
  }
  log.error(`${context} failed:`, error);
  res.status(500).json({ message: 'Internal server error' });
};

const currentUser = (req: Request): IUser => req.user as IUser;

// ---------------------------------------------------------------------------
// Dashboard: development lifecycle
// ---------------------------------------------------------------------------

/** POST /api/dashboard/developments — gated by an active subscription plan. */
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const development = await createDevelopment(req.body, currentUser(req));
    res.status(201).json({ development });
  } catch (error) {
    sendServiceError(res, error, 'create development');
  }
};

/** GET /api/dashboard/developments — developments the caller owns or belongs to. */
export const listMine = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const limit = Number(req.query.limit) || 20;
    const skip = Number(req.query.skip) || 0;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const { items, total } = await listDevelopmentsForUser(currentUser(req), {
      status,
      limit,
      skip,
    });
    res.json({ developments: items, total });
  } catch (error) {
    sendServiceError(res, error, 'list developments');
  }
};

/** GET /api/dashboard/developments/:developmentId */
export const getOne = async (req: Request, res: Response): Promise<void> => {
  // developmentAuth already loaded and authorized req.development.
  res.json({ development: req.development, role: req.developmentRole });
};

/**
 * GET /api/dashboard/developments/:developmentId/structure
 * The development's buildings, entrances and floors — what the inventory and
 * attach UIs need to place a unit. Any authorized member may read it.
 */
export const getStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const developmentId = req.development!._id;
    const [buildings, entrances, floors] = await Promise.all([
      DevelopmentBuilding.find({ developmentId, deletedAt: { $exists: false } }).sort({ order: 1 }),
      DevelopmentEntrance.find({ developmentId, deletedAt: { $exists: false } }).sort({ order: 1 }),
      DevelopmentFloor.find({ developmentId, deletedAt: { $exists: false } }).sort({ order: 1 }),
    ]);
    res.json({ buildings, entrances, floors });
  } catch (error) {
    sendServiceError(res, error, 'get development structure');
  }
};

/** PATCH /api/dashboard/developments/:developmentId */
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await updateDevelopment(req.development!, req.body);
    await DevelopmentAuditLog.create({
      developmentId: development._id,
      action: 'development.update',
      actorId: currentUser(req)._id,
    });
    res.json({ development });
  } catch (error) {
    sendServiceError(res, error, 'update development');
  }
};

/** POST /api/dashboard/developments/:developmentId/publish */
export const publish = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.body?.status === 'draft' ? 'draft' : 'published';
    const development = await setDevelopmentStatus(req.development!, status);
    await DevelopmentAuditLog.create({
      developmentId: development._id,
      action: 'development.publish',
      actorId: currentUser(req)._id,
      metadata: { status },
    });
    res.json({ development });
  } catch (error) {
    sendServiceError(res, error, 'publish development');
  }
};

/** DELETE /api/dashboard/developments/:developmentId (owner only, via route guard). */
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await softDeleteDevelopment(req.development!);
    await DevelopmentAuditLog.create({
      developmentId: req.development!._id,
      action: 'development.delete',
      actorId: currentUser(req)._id,
    });
    res.json({ success: true });
  } catch (error) {
    sendServiceError(res, error, 'delete development');
  }
};

/**
 * POST /api/dashboard/developments/:developmentId/cover
 * Upload (or replace) the development's cover image. Multipart field: `cover`.
 * Mirrors the agency cover-upload flow (media service + url/publicId on the doc).
 */
export const uploadCover = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    if (!isMediaStorageConfigured()) {
      res.status(500).json({ message: 'Image upload service not configured' });
      return;
    }
    const development = req.development!;

    // Remove the previous cover so storage doesn't accumulate orphans.
    if (development.coverImagePublicId) {
      try {
        await deleteImage(development.coverImagePublicId);
      } catch (err) {
        log.warn('Could not delete old development cover:', err);
      }
    }

    const result = await uploadImage(req.file.buffer, {
      userId: String(currentUser(req)._id),
      developmentId: String(development._id),
      developmentName: development.name,
      type: 'development-cover',
      maxWidth: 1920,
      maxHeight: 720,
    });

    development.coverImage = result.url;
    development.coverImagePublicId = result.publicId;
    await development.save();

    await DevelopmentAuditLog.create({
      developmentId: development._id,
      action: 'development.update',
      actorId: currentUser(req)._id,
      metadata: { cover: true },
    });

    res.json({ coverImage: result.url, development });
  } catch (error) {
    sendServiceError(res, error, 'upload development cover');
  }
};

// ---------------------------------------------------------------------------
// Dashboard: inventory
// ---------------------------------------------------------------------------

export const addBuilding = async (req: Request, res: Response): Promise<void> => {
  try {
    const building = await createBuilding(String(req.development!._id), req.body);
    await DevelopmentAuditLog.create({
      developmentId: req.development!._id,
      action: 'building.create',
      actorId: currentUser(req)._id,
      targetType: 'building',
      targetId: building._id,
    });
    res.status(201).json({ building });
  } catch (error) {
    sendServiceError(res, error, 'create building');
  }
};

export const addFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.body;
    if (!buildingId) {
      res.status(400).json({ message: 'buildingId is required' });
      return;
    }
    const floor = await createFloor(String(req.development!._id), buildingId, req.body);
    res.status(201).json({ floor });
  } catch (error) {
    sendServiceError(res, error, 'create floor');
  }
};

export const addUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const unit = await createUnit(String(req.development!._id), req.body);
    await DevelopmentAuditLog.create({
      developmentId: req.development!._id,
      action: 'unit.create',
      actorId: currentUser(req)._id,
      targetType: 'unit',
      targetId: unit._id,
    });
    res.status(201).json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'create unit');
  }
};

export const getUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const skip = Number(req.query.skip) || 0;
    const { items, total } = await listUnits(String(req.development!._id), {
      buildingId: typeof req.query.buildingId === 'string' ? req.query.buildingId : undefined,
      floorId: typeof req.query.floorId === 'string' ? req.query.floorId : undefined,
      availability:
        typeof req.query.availability === 'string' ? req.query.availability : undefined,
      limit,
      skip,
    });
    res.json({ units: items, total });
  } catch (error) {
    sendServiceError(res, error, 'list units');
  }
};

export const updateAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const unitId = getObjectIdParam(req, res, 'unitId');
    if (!unitId) return;
    const unit = await setUnitAvailability(
      String(req.development!._id),
      unitId,
      req.body?.availability
    );
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }
    await DevelopmentAuditLog.create({
      developmentId: req.development!._id,
      action: 'availability.change',
      actorId: currentUser(req)._id,
      targetType: 'unit',
      targetId: unit._id,
      metadata: { availability: req.body?.availability },
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'update availability');
  }
};

// ---------------------------------------------------------------------------
// Public (read-only) — published developments only
// ---------------------------------------------------------------------------

/** GET /api/developments — public, published discovery list. */
export const listPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = Number(req.query.skip) || 0;
    const query: Record<string, unknown> = {
      status: 'published',
      deletedAt: { $exists: false },
    };
    if (typeof req.query.city === 'string') query.city = req.query.city;
    if (typeof req.query.country === 'string') query.country = req.query.country;
    if (typeof req.query.category === 'string') query.category = req.query.category;

    const [items, total] = await Promise.all([
      Development.find(query).sort({ publishedAt: -1 }).skip(skip).limit(limit),
      Development.countDocuments(query),
    ]);
    res.json({ developments: items, total });
  } catch (error) {
    sendServiceError(res, error, 'list public developments');
  }
};

/** GET /api/developments/:slug — public development with its buildings/floors. */
export const getPublicBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const development = await Development.findOne({
      slug,
      status: 'published',
      deletedAt: { $exists: false },
    });
    if (!development) {
      res.status(404).json({ message: 'Development not found' });
      return;
    }
    const [buildings, floors] = await Promise.all([
      DevelopmentBuilding.find({
        developmentId: development._id,
        deletedAt: { $exists: false },
      }).sort({ order: 1 }),
      DevelopmentFloor.find({
        developmentId: development._id,
        deletedAt: { $exists: false },
      }).sort({ order: 1 }),
    ]);
    res.json({ development, buildings, floors });
  } catch (error) {
    sendServiceError(res, error, 'get public development');
  }
};

/**
 * GET /api/developments/:slug/units — the published development's units, each
 * enriched with its building name and floor label (so the buyer-facing browser
 * can group and filter without extra round-trips), plus a summary used for the
 * stats bar and price range.
 */
export const listPublicUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const development = await Development.findOne({
      slug,
      status: 'published',
      deletedAt: { $exists: false },
    })
      .select('_id')
      .lean();
    if (!development) {
      res.status(404).json({ message: 'Development not found' });
      return;
    }

    const [units, buildings, floors] = await Promise.all([
      DevelopmentUnit.find({ developmentId: development._id, deletedAt: { $exists: false } }).sort({
        buildingId: 1,
        unitNumber: 1,
      }),
      DevelopmentBuilding.find({ developmentId: development._id, deletedAt: { $exists: false } })
        .select('_id name')
        .lean(),
      DevelopmentFloor.find({ developmentId: development._id, deletedAt: { $exists: false } })
        .select('_id label level')
        .lean(),
    ]);

    const buildingName = new Map(buildings.map((b) => [String(b._id), b.name]));
    const floorLabel = new Map(floors.map((f) => [String(f._id), f.label]));

    const enriched = units.map((u) => ({
      ...u.toJSON(),
      buildingName: buildingName.get(String(u.buildingId)) ?? null,
      floorLabel: floorLabel.get(String(u.floorId)) ?? null,
    }));

    const priced = units.filter((u) => typeof u.price === 'number' && (u.price as number) > 0);
    const prices = priced.map((u) => u.price as number);
    const summary = {
      total: units.length,
      available: units.filter((u) => u.availability === 'available').length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      currency: priced[0]?.currency ?? 'EUR',
    };

    res.json({ units: enriched, summary });
  } catch (error) {
    sendServiceError(res, error, 'list public units');
  }
};

/**
 * GET /api/developments/:slug/units/:unitId — one unit of a published
 * development, with its building/floor context and the marketing listings
 * attached to it (basic fields + a small gallery), for the unit detail page.
 */
export const getPublicUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const development = await Development.findOne({
      slug,
      status: 'published',
      deletedAt: { $exists: false },
    }).lean();
    if (!development) {
      res.status(404).json({ message: 'Development not found' });
      return;
    }

    const unitId = getObjectIdParam(req, res, 'unitId');
    if (!unitId) return;

    const unit = await DevelopmentUnit.findOne({
      _id: unitId,
      developmentId: development._id,
      deletedAt: { $exists: false },
    });
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }

    const [building, floor, listings] = await Promise.all([
      DevelopmentBuilding.findById(unit.buildingId).select('name').lean(),
      DevelopmentFloor.findById(unit.floorId).select('label level').lean(),
      Property.find({ _id: { $in: unit.listingIds ?? [] }, status: { $ne: 'draft' } })
        .select('title imageUrl images price listingType beds baths sqft createdByName createdByAgencyName')
        .limit(10)
        .lean(),
    ]);

    res.json({
      unit: {
        ...unit.toJSON(),
        buildingName: building?.name ?? null,
        floorLabel: floor?.label ?? null,
      },
      development: {
        name: development.name,
        slug: development.slug,
        city: development.city,
        country: development.country,
      },
      listings: listings.map((l) => ({ ...l, id: String(l._id), _id: undefined })),
    });
  } catch (error) {
    sendServiceError(res, error, 'get public unit');
  }
};
