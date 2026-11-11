import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { addResidencePhotos, removeResidencePhoto, reorderResidencePhotos } from '../services/developments/residenceGallery';
import { sendServiceError } from './developmentController';

const actor = (req: Request) => (req.user as IUser)._id as mongoose.Types.ObjectId;

/** POST /:developmentId/gallery — add photos (multipart field `images`, up to 10 per request). */
export const uploadGalleryPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const development = await addResidencePhotos(req.development!, files.map((f) => f.buffer), actor(req));
    res.status(201).json({ development });
  } catch (error) {
    sendServiceError(res, error, 'upload residence gallery');
  }
};

/** DELETE /:developmentId/gallery/:index — remove one photo (and its stored file). */
export const deleteGalleryPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await removeResidencePhoto(req.development!, req.params.index, actor(req));
    res.json({ development });
  } catch (error) {
    sendServiceError(res, error, 'delete residence gallery photo');
  }
};

/** PATCH /:developmentId/gallery/order { urls } — the same photos in a new order. */
export const reorderGalleryPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const development = await reorderResidencePhotos(req.development!, req.body?.urls, actor(req));
    res.json({ development });
  } catch (error) {
    sendServiceError(res, error, 'reorder residence gallery');
  }
};
