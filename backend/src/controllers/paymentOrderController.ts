/**
 * Thin HTTP layer over payment orders (services/payments/).
 * Customer: request a plan, list my requests.
 * Admin: list, mark paid, cancel, record a payment, free grant, plans to choose from.
 */
import { Request, Response } from 'express';
import { requestPlanOrder, listMyOrders } from '../services/payments/paymentOrderService';
import {
  listOrders,
  listOrderablePlans,
  markOrderPaid,
  cancelOrder,
  recordPayment,
  freeGrant,
} from '../services/payments/paymentOrderAdminService';
import type { OrderResult } from '../services/payments/paymentOrderViews';
import { paymentLogger } from '../utils/logger';

const currentUserId = (req: Request): string | undefined => {
  const id = (req as Request & { user?: { _id?: unknown } }).user?._id;
  return id ? String(id) : undefined;
};

/** Send a service result: the value on success, or the status, code and message (plus details) on refusal. */
function send<T extends object>(res: Response, result: OrderResult<T>, successStatus = 200): void {
  if (result.ok === false) {
    res.status(result.status).json({ success: false, code: result.code, message: result.message, ...(result.details ?? {}) });
    return;
  }
  res.status(successStatus).json({ success: true, ...result.value });
}

const failed = (res: Response, action: string, error: unknown): void => {
  paymentLogger.error(`Payment orders: ${action} failed:`, error);
  res.status(500).json({ success: false, message: `Could not ${action}. Please try again.` });
};

const withUser = (action: string, handler: (req: Request, res: Response, userId: string) => Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    const userId = currentUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    try {
      await handler(req, res, userId);
    } catch (error) {
      failed(res, action, error);
    }
  };

// ── Customer ────────────────────────────────────────────────────────────────

/** POST /api/payment-orders  { productId, discountCode? } */
export const requestPlan = withUser('request this plan', async (req, res, userId) => {
  const result = await requestPlanOrder(userId, req.body ?? {});
  send(res, result, result.ok && !result.value.existing ? 201 : 200);
});

/** GET /api/payment-orders/mine */
export const getMyOrders = withUser('load your requests', async (_req, res, userId) => {
  res.json({ success: true, ...(await listMyOrders(userId)) });
});

// ── Admin ───────────────────────────────────────────────────────────────────

/** GET /api/admin/payment-orders?status=&q=&page= */
export const adminListOrders = withUser('load payment orders', async (req, res) => {
  res.json({ success: true, ...(await listOrders(req.query)) });
});

/** GET /api/admin/payment-orders/plans */
export const adminListPlans = withUser('load plans', async (_req, res) => {
  res.json({ success: true, plans: await listOrderablePlans() });
});

/** POST /api/admin/payment-orders/:reference/mark-paid  { amount, method, paidAt?, note?, acceptDifferentAmount? } */
export const adminMarkPaid = withUser('mark the order paid', async (req, res, adminId) => {
  send(res, await markOrderPaid(String(req.params.reference), adminId, req.body ?? {}));
});

/** POST /api/admin/payment-orders/:reference/cancel  { reason? } */
export const adminCancelOrder = withUser('cancel the order', async (req, res, adminId) => {
  send(res, await cancelOrder(String(req.params.reference), adminId, req.body?.reason));
});

/** POST /api/admin/payment-orders/record-payment  { userId, productId, amount, method, paidAt?, note? } */
export const adminRecordPayment = withUser('record the payment', async (req, res, adminId) => {
  send(res, await recordPayment(adminId, req.body ?? {}), 201);
});

/** POST /api/admin/payment-orders/free-grant  { userId, productId, reason } */
export const adminFreeGrant = withUser('grant the plan', async (req, res, adminId) => {
  send(res, await freeGrant(adminId, req.body ?? {}), 201);
});
