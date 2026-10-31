import { Request, Response } from 'express';
import { IUser } from '../models/User';
import DevelopmentAuditLog from '../models/DevelopmentAuditLog';
import { parseBuilderImageKind, removeBuilderImage, setBuilderImage } from '../services/developments/builderMedia';
import { sendServiceError } from './developmentController';

/**
 * POST /api/dashboard/developments/:developmentId/builder/:kind  (kind: logo | banner)
 * Upload (or replace) the builder's logo or banner. Multipart field: `image`.
 */
export const uploadBuilderImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const kind = parseBuilderImageKind(req.params.kind);
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded', code: 'NO_IMAGES' });
      return;
    }
    const development = req.development!;
    const actorId = (req.user as IUser)._id;
    const url = await setBuilderImage(development, kind, req.file.buffer, String(actorId));
    await DevelopmentAuditLog.create({ developmentId: development._id, action: 'development.update', actorId, metadata: { builder: kind } });
    res.json({ url, development });
  } catch (error) {
    sendServiceError(res, error, 'upload builder image');
  }
};

/** DELETE /api/dashboard/developments/:developmentId/builder/:kind — remove the logo or banner. */
export const deleteBuilderImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const kind = parseBuilderImageKind(req.params.kind);
    const development = req.development!;
    await removeBuilderImage(development, kind);
    await DevelopmentAuditLog.create({ developmentId: development._id, action: 'development.update', actorId: (req.user as IUser)._id, metadata: { builder: kind, removed: true } });
    res.json({ development });
  } catch (error) {
    sendServiceError(res, error, 'remove builder image');
  }
};
