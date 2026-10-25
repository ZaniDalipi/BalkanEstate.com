/**
 * Residence Pass endpoints on a residence: read the plan, buy a pass or extra
 * buildings (owner), and admin grants. Logic lives in the billing services.
 */
import { Request, Response } from 'express';
import type { IUser } from '../models/User';
import { billingSummary } from '../services/developments/billing/residenceBillingSummary';
import { checkout, grant, listPrice } from '../services/developments/billing/residencePurchaseService';
import {
  INCLUDED_RESIDENCES_BY_TIER,
  PREMIUM_PASS_DISCOUNT,
  RESIDENCE_INCLUDED_BUILDINGS,
  RESIDENCE_PASS_MONTHS,
  RESIDENCE_TRIAL_DAYS,
} from '../config/residenceBilling';
import { recordDevelopmentAudit } from '../services/developments/developmentAudit';
import Development from '../models/Development';
import { sendServiceError } from './developmentController';

const actor = (req: Request): IUser => req.user as IUser;

/** GET /api/dashboard/developments/:developmentId/billing */
export const getBilling = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ billing: await billingSummary(req.development!) });
  } catch (error) {
    sendServiceError(res, error, 'get residence billing');
  }
};

/** POST /api/dashboard/developments/:developmentId/billing/checkout (owner) */
export const checkoutBilling = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchase = await checkout(req.development!, actor(req)._id, req.body ?? {});
    await recordDevelopmentAudit({
      developmentId: req.development!._id,
      action: 'billing.purchase',
      actorId: actor(req)._id,
      metadata: { kind: purchase.kind, quantity: purchase.quantity, provider: purchase.provider, until: purchase.periodEnd },
    });
    const fresh = (await Development.findById(req.development!._id)) ?? req.development!;
    res.status(201).json({ purchase, billing: await billingSummary(fresh) });
  } catch (error) {
    sendServiceError(res, error, 'residence checkout');
  }
};

/** POST /api/dashboard/developments/:developmentId/billing/grant (platform admin) */
export const grantBilling = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchases = await grant(req.development!, actor(req)._id, req.body ?? {});
    await recordDevelopmentAudit({
      developmentId: req.development!._id,
      action: 'billing.grant',
      actorId: actor(req)._id,
      metadata: { purchases: purchases.map((p) => ({ kind: p.kind, quantity: p.quantity, until: p.periodEnd })), note: req.body?.note },
    });
    const fresh = (await Development.findById(req.development!._id)) ?? req.development!;
    res.status(201).json({ purchases, billing: await billingSummary(fresh) });
  } catch (error) {
    sendServiceError(res, error, 'grant residence billing');
  }
};

/** GET /api/developments/pricing — public: what a residence costs (for the pricing page). */
export const publicResidencePricing = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [pass, extraBuilding] = await Promise.all([listPrice('pass'), listPrice('extra_building')]);
    res.json({
      currency: 'EUR',
      pass,
      extraBuilding,
      trialDays: RESIDENCE_TRIAL_DAYS,
      passMonths: RESIDENCE_PASS_MONTHS,
      includedBuildings: RESIDENCE_INCLUDED_BUILDINGS,
      includedByTier: INCLUDED_RESIDENCES_BY_TIER,
      premiumDiscountPct: Math.round(PREMIUM_PASS_DISCOUNT * 100),
    });
  } catch (error) {
    sendServiceError(res, error, 'residence pricing');
  }
};
