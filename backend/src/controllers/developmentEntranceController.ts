import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { createEntrance, deleteEntrance, updateEntrance } from '../services/developments/entranceService';
import { sendServiceError } from './developmentController';

const ids = (req: Request) => ({
  developmentId: req.development!._id as mongoose.Types.ObjectId,
  actorId: (req.user as IUser)._id as mongoose.Types.ObjectId,
});

/** POST /:developmentId/buildings/:buildingId/entrances — add an entrance to a building. */
export const addEntrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const entrance = await createEntrance({ ...ids(req), buildingId: req.params.buildingId, payload: req.body });
    res.status(201).json({ entrance });
  } catch (error) {
    sendServiceError(res, error, 'create entrance');
  }
};

/** PATCH /:developmentId/entrances/:entranceId — rename it, change its kind, access or note. */
export const editEntrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const entrance = await updateEntrance({ ...ids(req), entranceId: req.params.entranceId, payload: req.body });
    res.json({ entrance });
  } catch (error) {
    sendServiceError(res, error, 'update entrance');
  }
};

/** DELETE /:developmentId/entrances/:entranceId — refused (409 ENTRANCE_IN_USE) while apartments use it. */
export const removeEntrance = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await deleteEntrance({ ...ids(req), entranceId: req.params.entranceId });
    res.json({ success: true, ...result });
  } catch (error) {
    sendServiceError(res, error, 'delete entrance');
  }
};
