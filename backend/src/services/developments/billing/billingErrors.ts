/**
 * A request the Residence Pass rules refuse: 402 with a machine-readable code
 * and details the dashboard uses to offer the right purchase.
 */
export type BillingErrorCode =
  | 'PASS_REQUIRED'
  | 'TRIAL_IN_PROGRESS'
  | 'TRIAL_LIMIT'
  | 'BUILDING_LIMIT'
  | 'PAYMENT_NOT_CONFIGURED'
  | 'COUPON_INVALID';

export class BillingError extends Error {
  statusCode: number;
  code: BillingErrorCode;
  details?: Record<string, unknown>;

  constructor(code: BillingErrorCode, message: string, details?: Record<string, unknown>, statusCode = 402) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}
