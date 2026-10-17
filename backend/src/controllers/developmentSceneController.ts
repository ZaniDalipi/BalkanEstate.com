import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Development from '../models/Development';
import DevelopmentScene from '../models/DevelopmentScene';
import DevelopmentAuditLog from '../models/DevelopmentAuditLog';
import { getObjectIdParam, isValidObjectId } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';
import { createLogger } from '../utils/logger';
import { uploadImage, deleteImage, isMediaStorageConfigured } from '../services/mediaService';
import { sendServiceError } from './developmentController';
import {
  SCENE_TARGET_TYPES,
  HOTSPOT_SHAPES,
  HOTSPOT_LINK_TYPES,
  type SceneTargetType,
} from '../config/developments';

const log = createLogger('DevelopmentSceneController');
const currentUser = (req: Request): IUser => req.user as IUser;

const isSceneTarget = (v: unknown): v is SceneTargetType =>
  typeof v === 'string' && (SCENE_TARGET_TYPES as readonly string[]).includes(v);

/** Normalise and validate a hotspot array coming from the editor. */
interface CleanHotspot {
  id: string;
  shape: string;
  points: number[][];
  label?: string;
  linkType: string;
  linkId: string;
  z: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const sanitizeHotspots = (raw: unknown): { ok: true; hotspots: CleanHotspot[] } | { ok: false; error: string } => {
  if (!Array.isArray(raw)) return { ok: false, error: 'hotspots must be an array' };
  const hotspots: CleanHotspot[] = [];
  for (const h of raw) {
    if (!h || typeof h !== 'object') return { ok: false, error: 'invalid hotspot' };
    const o = h as Record<string, unknown>;
    if (!(HOTSPOT_SHAPES as readonly string[]).includes(String(o.shape)))
      return { ok: false, error: 'invalid hotspot shape' };
    if (!(HOTSPOT_LINK_TYPES as readonly string[]).includes(String(o.linkType)))
      return { ok: false, error: 'invalid hotspot linkType' };
    if (!o.linkId || typeof o.linkId !== 'string')
      return { ok: false, error: 'hotspot linkId is required' };
    if (!Array.isArray(o.points) || o.points.length < 2)
      return { ok: false, error: 'a hotspot needs at least 2 points' };
    const points: number[][] = [];
    for (const p of o.points as unknown[]) {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number')
        return { ok: false, error: 'each point must be [x, y]' };
      points.push([clamp01(p[0]), clamp01(p[1])]);
    }
    hotspots.push({
      id: String(o.id || `h_${Math.random().toString(36).slice(2)}`),
      shape: String(o.shape),
      points,
      label: typeof o.label === 'string' ? o.label.slice(0, 120) : undefined,
      linkType: String(o.linkType),
      linkId: String(o.linkId),
      z: typeof o.z === 'number' ? o.z : 0,
    });
  }
  return { ok: true, hotspots };
};

/**
 * POST /api/dashboard/developments/:developmentId/scenes
 * Upload (or replace) the image for a scene identified by targetType + targetId
 * (multipart field `image`). Creates the scene if it doesn't exist yet.
 */
export const upsertSceneImage = async (req: Request, res: Response): Promise<void> => {
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
    const targetType = req.body?.targetType;
    if (!isSceneTarget(targetType)) {
      res.status(400).json({ message: `targetType must be one of: ${SCENE_TARGET_TYPES.join(', ')}` });
      return;
    }
    // For a development-level aerial the target is the development itself.
    const rawTargetId =
      targetType === 'development' ? String(development._id) : resolveId(String(req.body?.targetId || ''));
    if (!rawTargetId || !isValidObjectId(rawTargetId)) {
      res.status(400).json({ message: 'A valid targetId is required' });
      return;
    }

    const result = await uploadImage(req.file.buffer, {
      userId: String(currentUser(req)._id),
      developmentId: String(development._id),
      developmentName: development.name,
      type: 'development-scene',
      maxWidth: 2560,
      maxHeight: 2560,
      preserveQuality: true,
    });

    let scene = await DevelopmentScene.findOne({
      developmentId: development._id,
      targetType,
      targetId: rawTargetId,
      deletedAt: { $exists: false },
    });

    if (scene) {
      if (scene.imagePublicId) {
        try {
          await deleteImage(scene.imagePublicId);
        } catch (err) {
          log.warn('Could not delete old scene image:', err);
        }
      }
      scene.imageUrl = result.url;
      scene.imagePublicId = result.publicId;
      scene.imageWidth = result.width;
      scene.imageHeight = result.height;
      await scene.save();
    } else {
      scene = await DevelopmentScene.create({
        developmentId: development._id,
        targetType,
        targetId: rawTargetId,
        imageUrl: result.url,
        imagePublicId: result.publicId,
        imageWidth: result.width,
        imageHeight: result.height,
        draft: { hotspots: [], version: 0 },
      });
    }

    res.status(201).json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'upsert scene image');
  }
};

/** GET /api/dashboard/developments/:developmentId/scenes */
export const listScenes = async (req: Request, res: Response): Promise<void> => {
  try {
    const scenes = await DevelopmentScene.find({
      developmentId: req.development!._id,
      deletedAt: { $exists: false },
    }).sort({ updatedAt: -1 });
    res.json({ scenes });
  } catch (error) {
    sendServiceError(res, error, 'list scenes');
  }
};

/** GET /api/dashboard/developments/:developmentId/scenes/:sceneId */
export const getScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const sceneId = getObjectIdParam(req, res, 'sceneId');
    if (!sceneId) return;
    const scene = await DevelopmentScene.findOne({
      _id: sceneId,
      developmentId: req.development!._id,
      deletedAt: { $exists: false },
    });
    if (!scene) {
      res.status(404).json({ message: 'Scene not found' });
      return;
    }
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'get scene');
  }
};

/** PATCH /api/dashboard/developments/:developmentId/scenes/:sceneId/draft */
export const saveDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const sceneId = getObjectIdParam(req, res, 'sceneId');
    if (!sceneId) return;
    const clean = sanitizeHotspots(req.body?.hotspots);
    if (!clean.ok) {
      res.status(400).json({ message: clean.error });
      return;
    }
    const scene = await DevelopmentScene.findOne({
      _id: sceneId,
      developmentId: req.development!._id,
      deletedAt: { $exists: false },
    });
    if (!scene) {
      res.status(404).json({ message: 'Scene not found' });
      return;
    }
    scene.draft = { hotspots: clean.hotspots as never, version: (scene.draft?.version ?? 0) + 1 };
    await scene.save();
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'save scene draft');
  }
};

/** POST /api/dashboard/developments/:developmentId/scenes/:sceneId/publish */
export const publishScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const sceneId = getObjectIdParam(req, res, 'sceneId');
    if (!sceneId) return;
    const scene = await DevelopmentScene.findOne({
      _id: sceneId,
      developmentId: req.development!._id,
      deletedAt: { $exists: false },
    });
    if (!scene) {
      res.status(404).json({ message: 'Scene not found' });
      return;
    }
    // Snapshot the draft into published so viewers on the old version are
    // never interrupted mid-publish.
    scene.published = {
      hotspots: scene.draft?.hotspots ?? ([] as never),
      publishedAt: new Date(),
      version: (scene.published?.version ?? 0) + 1,
    };
    scene.version = (scene.version ?? 0) + 1;
    await scene.save();

    await DevelopmentAuditLog.create({
      developmentId: req.development!._id,
      action: 'development.publish',
      actorId: currentUser(req)._id,
      targetType: 'scene',
      targetId: scene._id,
    });

    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'publish scene');
  }
};

/** DELETE /api/dashboard/developments/:developmentId/scenes/:sceneId */
export const deleteScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const sceneId = getObjectIdParam(req, res, 'sceneId');
    if (!sceneId) return;
    const scene = await DevelopmentScene.findOne({
      _id: sceneId,
      developmentId: req.development!._id,
      deletedAt: { $exists: false },
    });
    if (!scene) {
      res.status(404).json({ message: 'Scene not found' });
      return;
    }
    scene.deletedAt = new Date();
    await scene.save();
    if (scene.imagePublicId) {
      try {
        await deleteImage(scene.imagePublicId);
      } catch (err) {
        log.warn('Could not delete scene image on delete:', err);
      }
    }
    res.json({ success: true });
  } catch (error) {
    sendServiceError(res, error, 'delete scene');
  }
};

/**
 * GET /api/developments/:slug/scene?targetType=&targetId=
 * Public: the PUBLISHED scene for a target of a published development.
 * Defaults to the development-level aerial when no target is given.
 */
export const getPublishedScene = async (req: Request, res: Response): Promise<void> => {
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

    const targetType = typeof req.query.targetType === 'string' ? req.query.targetType : 'development';
    if (!isSceneTarget(targetType)) {
      res.status(400).json({ message: 'invalid targetType' });
      return;
    }
    const targetId =
      targetType === 'development'
        ? String(development._id)
        : resolveId(String(req.query.targetId || ''));
    if (!targetId || !isValidObjectId(targetId)) {
      res.status(400).json({ message: 'A valid targetId is required' });
      return;
    }

    const scene = await DevelopmentScene.findOne({
      developmentId: development._id,
      targetType,
      targetId,
      deletedAt: { $exists: false },
    }).lean();

    if (!scene || !scene.published) {
      res.json({ scene: null });
      return;
    }

    res.json({
      scene: {
        targetType: scene.targetType,
        imageUrl: scene.imageUrl,
        imageWidth: scene.imageWidth,
        imageHeight: scene.imageHeight,
        hotspots: scene.published.hotspots ?? [],
      },
    });
  } catch (error) {
    sendServiceError(res, error, 'get published scene');
  }
};

// --- Explorer contract stubs (implemented by the scenes/views slice) -------
// Registered in the routers now so the route files never need concurrent edits.

const notImplemented = (res: Response): void => {
  res.status(501).json({ message: 'Not implemented yet' });
};

/** PATCH /api/dashboard/developments/:developmentId/scenes/:sceneId — view name/direction/order. */
export const updateSceneMeta = async (_req: Request, res: Response): Promise<void> => notImplemented(res);

/** POST /api/dashboard/developments/:developmentId/scenes/:sceneId/unpublish */
export const unpublishScene = async (_req: Request, res: Response): Promise<void> => notImplemented(res);

/** GET /api/developments/:slug/views?targetType=&targetId= — public, filtered hotspots. */
export const listPublicViews = async (_req: Request, res: Response): Promise<void> => notImplemented(res);
