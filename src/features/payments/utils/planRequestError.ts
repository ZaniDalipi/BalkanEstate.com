/**
 * Turn a refused plan request (POST /payment-orders) into a translated
 * message. Texts live under `payment:planRequest.errors.<CODE>` in every locale.
 */
export type PlanRequestErrorCode =
  | 'PLAN_REQUIRED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_ELIGIBLE'
  | 'CODE_INVALID'
  | 'CODE_COVERS_PRICE'
  | 'CODE_USED_UP'
  | 'USER_NOT_FOUND';

const CODES: readonly string[] = [
  'PLAN_REQUIRED',
  'PLAN_NOT_FOUND',
  'PLAN_NOT_ELIGIBLE',
  'CODE_INVALID',
  'CODE_COVERS_PRICE',
  'CODE_USED_UP',
  'USER_NOT_FOUND',
];

const GENERIC = 'We could not send your request. Please try again, or email our team.';

/** The translation key and English default for an error thrown by apiRequest. */
export function planRequestErrorText(error: unknown): { key: string; defaultValue: string } {
  const e = error as { code?: unknown; message?: unknown } | null;
  if (typeof e?.code === 'string' && CODES.includes(e.code)) {
    return {
      key: `payment:planRequest.errors.${e.code}`,
      defaultValue: typeof e.message === 'string' && e.message ? e.message : GENERIC,
    };
  }
  return { key: 'payment:planRequest.errors.generic', defaultValue: GENERIC };
}
