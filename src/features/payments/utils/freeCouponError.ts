/**
 * Read a refusal from POST /payments/apply-free-subscription, so the checkout
 * can show the reason in the user's language instead of the server's English.
 * Texts live under `payment:errors.freeCoupon.<CODE>` in every locale.
 */
export type FreeCouponErrorCode =
  | 'PLAN_REQUIRED'
  | 'CODE_REQUIRED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_ELIGIBLE'
  | 'ALREADY_SUBSCRIBED'
  | 'CODE_INVALID'
  | 'CODE_NOT_FREE'
  | 'CODE_USED_UP';

const CODES: readonly string[] = [
  'PLAN_REQUIRED',
  'CODE_REQUIRED',
  'PLAN_NOT_FOUND',
  'PLAN_NOT_ELIGIBLE',
  'ALREADY_SUBSCRIBED',
  'CODE_INVALID',
  'CODE_NOT_FREE',
  'CODE_USED_UP',
];

export interface FreeCouponRefusal {
  code: FreeCouponErrorCode;
  /** The server's English text, used as the translation's default. */
  message: string;
  /** CODE_NOT_FREE: euros still to pay. */
  remaining?: number;
}

export function freeCouponRefusal(body: unknown): FreeCouponRefusal | null {
  const b = body as { code?: unknown; message?: unknown; remaining?: unknown } | null;
  if (typeof b?.code !== 'string' || !CODES.includes(b.code)) return null;
  return {
    code: b.code as FreeCouponErrorCode,
    message: typeof b.message === 'string' ? b.message : '',
    remaining: typeof b.remaining === 'number' && Number.isFinite(b.remaining) ? b.remaining : undefined,
  };
}

/** The translation key and its options for a refusal. */
export const freeCouponErrorText = (
  refusal: FreeCouponRefusal
): { key: string; options: { defaultValue: string; remaining?: string } } => ({
  key: `payment:errors.freeCoupon.${refusal.code}`,
  options: {
    defaultValue: refusal.message,
    ...(refusal.remaining !== undefined ? { remaining: refusal.remaining.toFixed(2) } : {}),
  },
});
