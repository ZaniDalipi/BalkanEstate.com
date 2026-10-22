import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { sendServiceError } from './developmentController';
import * as sceneService from '../services/developments/developmentSceneService';

/**
 * Scenes ("views") of the interactive explorer. Thin HTTP layer: every rule
 * lives in services/developments/developmentSceneService. The dashboard routes
 * run behind `developmentAuth` + `requireDevelopmentPermission`, and every
 * lookup below is scoped to `req.development`, so a sceneId from another
 * development is always a 404.
 */

const actorOf = (req: Request): sceneService.SceneActor => ({
  developmentId: req.development!._id as mongoose.Types.ObjectId,
  developmentName: req.development!.name,
  user: req.user as IUser,
  role: req.developmentRole,
});

const body = (req: Request): Record<string, unknown> =>
  req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};

/** POST /api/dashboard/developments/:developmentId/scenes (multipart `image`). */
export const upsertSceneImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scene, aspectChanged, created } = await sceneService.upsertSceneImage(actorOf(req), {
      file: req.file,
      body: body(req),
    });
    res.status(created ? 201 : 200).json({ scene, aspectChanged });
  } catch (error) {
    sendServiceError(res, error, 'upsert scene image');
  }
};

/** GET /api/dashboard/developments/:developmentId/scenes */
export const listScenes = async (req: Request, res: Response): Promise<void> => {
  try {
    const scenes = await sceneService.listScenes(actorOf(req).developmentId);
    res.json({ scenes });
  } catch (error) {
    sendServiceError(res, error, 'list scenes');
  }
};

/** GET /api/dashboard/developments/:developmentId/scenes/:sceneId */
export const getScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.getScene(actorOf(req).developmentId, req.params.sceneId);
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'get scene');
  }
};

/** PATCH /api/dashboard/developments/:developmentId/scenes/:sceneId — view name/direction/order. */
export const updateSceneMeta = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.updateSceneMeta(actorOf(req), req.params.sceneId, body(req));
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'update scene');
  }
};

/** PATCH /api/dashboard/developments/:developmentId/scenes/:sceneId/draft */
export const saveDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.saveDraft(actorOf(req), req.params.sceneId, body(req));
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'save scene draft');
  }
};

/** POST /api/dashboard/developments/:developmentId/scenes/:sceneId/publish */
export const publishScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.publishScene(actorOf(req), req.params.sceneId);
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'publish scene');
  }
};

/** POST /api/dashboard/developments/:developmentId/scenes/:sceneId/unpublish */
export const unpublishScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.unpublishScene(actorOf(req), req.params.sceneId);
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'unpublish scene');
  }
};

/** DELETE /api/dashboard/developments/:developmentId/scenes/:sceneId */
export const deleteScene = async (req: Request, res: Response): Promise<void> => {
  try {
    await sceneService.deleteScene(actorOf(req), req.params.sceneId);
    res.json({ success: true });
  } catch (error) {
    sendServiceError(res, error, 'delete scene');
  }
};

/** GET /api/developments/:slug/views?targetType=&targetId= — public, filtered hotspots. */
export const listPublicViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const views = await sceneService.listPublicViews(req.params.slug, req.query);
    res.json({ views });
  } catch (error) {
    sendServiceError(res, error, 'list public views');
  }
};

/**
 * GET /api/developments/:slug/scene?targetType=&targetId= (legacy single view):
 * the target's 'main' view, else its first published view.
 */
export const getPublishedScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const scene = await sceneService.getPublishedScene(req.params.slug, req.query);
    res.json({ scene });
  } catch (error) {
    sendServiceError(res, error, 'get published scene');
  }
};
