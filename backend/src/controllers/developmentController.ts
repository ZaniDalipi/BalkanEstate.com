import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentEntrance from '../models/DevelopmentEntrance';
import DevelopmentFloor from '../models/DevelopmentFloor';
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
  setUnitAvailability,
  isDuplicateKeyError,
} from '../services/developments/developmentInventoryService';
import * as unitAdmin from '../services/developments/unitAdminService';
import { listAuditEntries } from '../services/developments/developmentAuditQuery';
import { deleteStructure, previewStructureDelete, type StructureKind } from '../services/developments/structureDeleteService';
import {
  getPublicDevelopmentDetail,
  listPublicUnits as listPublicUnitsService,
  getPublicUnitDetail,
  toPublicDevelopment,
} from '../services/developments/developmentPublicService';
import { recordDevelopmentAudit } from '../services/developments/developmentAudit';

const log = createLogger('DevelopmentController');

/**
 * Map a thrown service error with a `statusCode` to an HTTP response. Anything
 * without one is a genuine 500. Keeps controllers thin and consistent.
 */
export const sendServiceError = (res: Response, error: unknown, context: string): void => {
  const e = error as {
    statusCode?: number;
    message?: string;
    conflicts?: unknown;
    errors?: unknown;
    code?: unknown;
    currentVersion?: unknown;
  } | null;
  if (e && typeof e.statusCode === 'number') {
    const body: Record<string, unknown> = { message: e.message };
    if (e.conflicts) body.conflicts = e.conflicts;
    if (Array.isArray(e.errors)) body.errors = e.errors;
    if (typeof e.code === 'string') body.code = e.code;
    if (e.currentVersion !== undefined) body.currentVersion = e.currentVersion;
    res.status(e.statusCode).json(body);
    return;
  }
  // Schema rule broken by client input (min/max/enum/maxlength): a 400 with
  // the offending fields, not a 500.
  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(error.errors).map((err) => ({ field: err.path, message: err.message })),
    });
    return;
  }
  // A malformed id or wrong type in the input.
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid ${error.path}` });
    return;
  }
  if (isDuplicateKeyError(error)) {
    res.status(409).json({ message: 'A record with these details already exists' });
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
    const { buildingId } = req.body ?? {};
    if (!buildingId) {
      res.status(400).json({ message: 'buildingId is required' });
      return;
    }
    // createFloor resolves the (encoded) building id inside this development.
    const floor = await createFloor(req.development!._id as mongoose.Types.ObjectId, buildingId, req.body);
    await recordDevelopmentAudit({
      developmentId: req.development!._id as mongoose.Types.ObjectId,
      action: 'floor.create',
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      targetType: 'floor',
      targetId: floor._id as mongoose.Types.ObjectId,
    });
    res.status(201).json({ floor });
  } catch (error) {
    sendServiceError(res, error, 'create floor');
  }
};

export const addUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    // Same field-level rules as PATCH: a role without price.change /
    // availability.change cannot set those fields by creating a unit either.
    const body = (req.body ?? {}) as Record<string, unknown>;
    const touched = Object.keys(body).filter(
      (k) => body[k] !== undefined && body[k] !== null && body[k] !== '' && unitAdmin.permissionForUnitField(k) !== 'unit.manage'
    );
    unitAdmin.assertAllowed(req.developmentRole, touched);
    // createUnit resolves encoded building/floor ids and checks floor ∈ building ∈ development.
    const unit = await createUnit(req.development!._id as mongoose.Types.ObjectId, req.body ?? {});
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

/** GET /:developmentId/units — search / filter / sort / paginate → DashboardUnit[]. */
export const getUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await unitAdmin.listDashboardUnits(
      req.development!._id as mongoose.Types.ObjectId,
      req.query as unitAdmin.UnitListQuery
    );
    res.json(result);
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
    const rawLimit = Math.floor(Number(req.query.limit));
    const rawSkip = Math.floor(Number(req.query.skip));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;
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
    res.json({ developments: items.map(toPublicDevelopment), total });
  } catch (error) {
    sendServiceError(res, error, 'list public developments');
  }
};

/** GET /api/developments/:slug — public projection with per-building stats. */
export const getPublicBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getPublicDevelopmentDetail(req.params.slug));
  } catch (error) {
    sendServiceError(res, error, 'get public development');
  }
};

/** GET /api/developments/:slug/units — visible units with effective availability + summary. */
export const listPublicUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await listPublicUnitsService(req.params.slug));
  } catch (error) {
    sendServiceError(res, error, 'list public units');
  }
};

/** GET /api/developments/:slug/units/:unitId — one visible unit with its public listings. */
export const getPublicUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getPublicUnitDetail(req.params.slug, req.params.unitId));
  } catch (error) {
    sendServiceError(res, error, 'get public unit');
  }
};

// ---------------------------------------------------------------------------
// Dashboard: unit administration (field-level authz lives in unitAdminService)
// ---------------------------------------------------------------------------

const devId = (req: Request): mongoose.Types.ObjectId => req.development!._id as mongoose.Types.ObjectId;

/** PATCH /:developmentId/units/:unitId — field-level authz (unit.manage / price.change / availability.change). */
export const updateUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const unit = await unitAdmin.updateUnit({
      developmentId: devId(req),
      role: req.developmentRole,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
      payload: req.body,
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'update unit');
  }
};

/** DELETE /:developmentId/units/:unitId — soft delete. */
export const deleteUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    await unitAdmin.softDeleteUnit({
      developmentId: devId(req),
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
    });
    res.json({ success: true });
  } catch (error) {
    sendServiceError(res, error, 'delete unit');
  }
};

/** POST /:developmentId/units/bulk — { unitIds, availability?, visibility? }. */
export const bulkUpdateUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await unitAdmin.bulkUpdateUnits({
      developmentId: devId(req),
      role: req.developmentRole,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      payload: req.body,
    });
    res.json(result);
  } catch (error) {
    sendServiceError(res, error, 'bulk update units');
  }
};

/** GET /:developmentId/units/export.csv */
export const exportUnitsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const csv = await unitAdmin.buildUnitsCsv(devId(req));
    const base = String(req.development!.slug || 'development').replace(/[^a-z0-9-]/gi, '') || 'development';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}-units.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(csv);
  } catch (error) {
    sendServiceError(res, error, 'export units csv');
  }
};

/** POST /:developmentId/units/:unitId/floorplan (multipart field `floorplan`). */
export const uploadUnitFloorplan = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const unit = await unitAdmin.setUnitFloorplan({
      development: req.development!,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
      file: req.file.buffer,
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'upload unit floorplan');
  }
};

/** DELETE /:developmentId/units/:unitId/floorplan */
export const deleteUnitFloorplan = async (req: Request, res: Response): Promise<void> => {
  try {
    const unit = await unitAdmin.removeUnitFloorplan({
      development: req.development!,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'delete unit floorplan');
  }
};

/** POST /:developmentId/units/:unitId/gallery (multipart `images`, up to 10) */
export const uploadUnitGallery = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }
    const unit = await unitAdmin.addUnitGalleryImages({
      development: req.development!,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
      files: files.map((f) => f.buffer),
    });
    res.status(201).json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'upload unit gallery');
  }
};

/** DELETE /:developmentId/units/:unitId/gallery/:index */
export const deleteUnitGalleryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const unit = await unitAdmin.removeUnitGalleryImage({
      development: req.development!,
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      unitId: req.params.unitId,
      index: req.params.index,
    });
    res.json({ unit });
  } catch (error) {
    sendServiceError(res, error, 'delete unit gallery image');
  }
};

/** GET /:developmentId/audit — the development's activity trail, newest first. */
export const listAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await listAuditEntries(req.development!._id as mongoose.Types.ObjectId, {
      limit: req.query.limit,
      skip: req.query.skip,
      action: req.query.action,
    });
    res.json(result);
  } catch (error) {
    sendServiceError(res, error, 'list audit entries');
  }
};

/** GET /:developmentId/{buildings|floors}/:id/delete-impact — what a delete would remove. */
export const structureDeleteImpact =
  (kind: StructureKind) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const impact = await previewStructureDelete(devId(req), kind, kind === 'building' ? req.params.buildingId : req.params.floorId);
      res.json({ impact });
    } catch (error) {
      sendServiceError(res, error, `preview ${kind} delete`);
    }
  };

/** DELETE /:developmentId/{buildings|floors}/:id — cascading soft delete. */
export const deleteStructureHandler =
  (kind: StructureKind) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      const impact = await deleteStructure({
        developmentId: devId(req),
        actorId: currentUser(req)._id as mongoose.Types.ObjectId,
        kind,
        id: kind === 'building' ? req.params.buildingId : req.params.floorId,
      });
      res.json({ success: true, impact });
    } catch (error) {
      sendServiceError(res, error, `delete ${kind}`);
    }
  };

/** PATCH /:developmentId/buildings/:buildingId */
export const updateBuilding = async (req: Request, res: Response): Promise<void> => {
  try {
    const building = await unitAdmin.updateBuilding({
      developmentId: devId(req),
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      buildingId: req.params.buildingId,
      payload: req.body,
    });
    res.json({ building });
  } catch (error) {
    sendServiceError(res, error, 'update building');
  }
};

/** PATCH /:developmentId/floors/:floorId */
export const updateFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const floor = await unitAdmin.updateFloor({
      developmentId: devId(req),
      actorId: currentUser(req)._id as mongoose.Types.ObjectId,
      floorId: req.params.floorId,
      payload: req.body,
    });
    res.json({ floor });
  } catch (error) {
    sendServiceError(res, error, 'update floor');
  }
};
