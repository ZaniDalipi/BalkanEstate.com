/**
 * Admin › Residences › Unlock codes (codes that unlock a Residence Pass or
 * extra buildings while online payment is off). Logic in residenceCodeService.
 */
import { Request, Response } from 'express';
import type { IUser } from '../models/User';
import { createResidenceCodes, deleteResidenceCode, listResidenceCodes, updateResidenceCode } from '../services/developments/billing/residenceCodeService';
import { sendServiceError } from './developmentController';

/** GET /api/admin/residences/codes?status&search&page */
export const listResidenceCodesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await listResidenceCodes(req.query as Record<string, unknown>));
  } catch (error) {
    sendServiceError(res, error, 'list residence codes (admin)');
  }
};

/** POST /api/admin/residences/codes { kind, count, usageLimit, days, note } */
export const createResidenceCodesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(201).json(await createResidenceCodes((req.user as IUser)._id, req.body));
  } catch (error) {
    sendServiceError(res, error, 'create residence codes (admin)');
  }
};

/** PATCH /api/admin/residences/codes/:id { isActive?, isSent? } */
export const updateResidenceCodeAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await updateResidenceCode(String(req.params.id), req.body));
  } catch (error) {
    sendServiceError(res, error, 'update residence code (admin)');
  }
};

/** DELETE /api/admin/residences/codes/:id — only an unused code. */
export const deleteResidenceCodeAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await deleteResidenceCode(String(req.params.id)));
  } catch (error) {
    sendServiceError(res, error, 'delete residence code (admin)');
  }
};
