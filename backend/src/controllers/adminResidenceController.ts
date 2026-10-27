/**
 * Admin endpoints for residences: list with plan state, building limits,
 * pass grants and agencies' free residences. Logic lives in the services.
 */
import { Request, Response } from 'express';
import type { IUser } from '../models/User';
import Development from '../models/Development';
import { getObjectIdParam } from '../utils/validateParams';
import { addAgencyExtra, agencyAllowance } from '../services/developments/billing/agencyResidences';
import { listResidences, setBuildingLimit } from '../services/developments/billing/residenceAdminService';
import { grant } from '../services/developments/billing/residencePurchaseService';
import { recomputeAgencyResidences } from '../services/developments/billing/residenceBillingService';
import { residenceTerms } from '../services/developments/billing/residenceTerms';
import { recordDevelopmentAudit } from '../services/developments/developmentAudit';
import { sendServiceError } from './developmentController';

const admin = (req: Request): IUser => req.user as IUser;
const MAX_EXTRA_RESIDENCES = 20;

/** GET /api/admin/residences?search&filter&page */
export const listResidencesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await listResidences(req.query));
  } catch (error) {
    sendServiceError(res, error, 'list residences (admin)');
  }
};

/** PATCH /api/admin/residences/:id/building-limit { limit: number | null } */
export const setBuildingLimitAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const result = await setBuildingLimit(id, req.body?.limit ?? null);
    await recordDevelopmentAudit({ developmentId: id, action: 'billing.building_limit', actorId: admin(req)._id, metadata: result });
    res.json(result);
  } catch (error) {
    sendServiceError(res, error, 'set building limit (admin)');
  }
};

/** POST /api/admin/residences/:id/grant { months, extraBuildings?, note } */
export const grantResidenceAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const dev = await Development.findOne({ _id: id, deletedAt: { $exists: false } });
    if (!dev) {
      res.status(404).json({ message: 'Residence not found', code: 'RESIDENCE_NOT_FOUND' });
      return;
    }
    const purchases = await grant(dev, admin(req)._id, req.body ?? {});
    await recordDevelopmentAudit({
      developmentId: id,
      action: 'billing.grant',
      actorId: admin(req)._id,
      metadata: { purchases: purchases.map((p) => ({ kind: p.kind, quantity: p.quantity, until: p.periodEnd })), note: req.body?.note },
    });
    res.status(201).json({ purchases: purchases.length });
  } catch (error) {
    sendServiceError(res, error, 'grant residence (admin)');
  }
};

/** GET /api/admin/agencies/:agencyId/residence-allowance */
export const getAgencyAllowanceAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const allowance = await agencyAllowance(agencyId, (await residenceTerms()).residencesPerYear, new Date());
    if (!allowance) {
      res.status(404).json({ message: 'Agency not found', code: 'AGENCY_NOT_FOUND' });
      return;
    }
    res.json({ allowance });
  } catch (error) {
    sendServiceError(res, error, 'agency residence allowance (admin)');
  }
};

/** POST /api/admin/agencies/:agencyId/residence-allowance { extra, note } */
export const addAgencyExtraAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const extra = Number(req.body?.extra);
    if (!Number.isInteger(extra) || extra < 1 || extra > MAX_EXTRA_RESIDENCES) {
      res.status(400).json({
        message: `extra must be a whole number from 1 to ${MAX_EXTRA_RESIDENCES}`,
        code: 'FIELD_RANGE',
        details: { field: 'extra', params: { min: 1, max: MAX_EXTRA_RESIDENCES } },
      });
      return;
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : undefined;
    const now = new Date();
    if (!(await addAgencyExtra(agencyId, extra, note, admin(req)._id, now))) {
      res.status(409).json({ message: 'This agency has no active subscription, so it has no free residences to add to', code: 'AGENCY_NOT_SUBSCRIBED' });
      return;
    }
    await recomputeAgencyResidences(agencyId, now);
    res.status(201).json({ allowance: await agencyAllowance(agencyId, (await residenceTerms()).residencesPerYear, now) });
  } catch (error) {
    sendServiceError(res, error, 'add agency residences (admin)');
  }
};
