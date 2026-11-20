import { Request, Response, NextFunction } from 'express';

/**
 * Self-serve online payment is off until PAYMENTS_ENABLED=true.
 *
 * Today plans are paid by arrangement with the team and switched on by an
 * admin, and the checkout window shows "coming soon". This keeps the server in
 * step with that: the checkout and the provider callback answer 503 instead of
 * taking a payment nothing is set up to grant.
 */
export const paymentsEnabled = (): boolean => process.env.PAYMENTS_ENABLED === 'true';

export const requirePaymentsEnabled = (_req: Request, res: Response, next: NextFunction): void => {
  if (paymentsEnabled()) {
    next();
    return;
  }
  res.status(503).json({
    success: false,
    code: 'PAYMENT_NOT_CONFIGURED',
    message: 'Online payment is not available yet. Contact our team to get this plan.',
  });
};
