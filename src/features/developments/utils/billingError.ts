/**
 * Read a Residence Pass refusal from an API error (402/503/400 with a code),
 * so a component can offer the right next step instead of a raw message.
 */
export type BillingErrorCode =
  | 'PASS_REQUIRED'
  | 'TRIAL_IN_PROGRESS'
  | 'TRIAL_LIMIT'
  | 'BUILDING_LIMIT'
  | 'PAYMENT_NOT_CONFIGURED'
  | 'COUPON_INVALID';

const CODES: readonly string[] = ['PASS_REQUIRED', 'TRIAL_IN_PROGRESS', 'TRIAL_LIMIT', 'BUILDING_LIMIT', 'PAYMENT_NOT_CONFIGURED', 'COUPON_INVALID'];

export interface BillingRefusal {
  code: BillingErrorCode;
  message: string;
  limit?: number;
  current?: number;
  allowed?: number;
  amount?: number;
  /** COUPON_INVALID: why (inactive, expired, usedUp, …), a key the client translates. */
  reason?: string;
  /** COUPON_INVALID with reason `minimum`: the minimum amount in euros. */
  min?: number;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function billingRefusal(error: unknown): BillingRefusal | null {
  const e = error as { code?: unknown; message?: unknown; details?: { code?: unknown; details?: Record<string, unknown> } } | null;
  const code = typeof e?.code === 'string' ? e.code : typeof e?.details?.code === 'string' ? e.details.code : null;
  if (!code || !CODES.includes(code)) return null;
  const d = e?.details?.details ?? {};
  return {
    code: code as BillingErrorCode,
    message: typeof e?.message === 'string' ? e.message : '',
    limit: num(d.limit),
    current: num(d.current),
    allowed: num(d.allowed),
    amount: num(d.amount),
    reason: typeof d.reason === 'string' ? d.reason : undefined,
    min: num(d.min),
  };
}
