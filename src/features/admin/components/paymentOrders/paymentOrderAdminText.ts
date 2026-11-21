/**
 * Texts for the admin payment-order screens that depend on data: server
 * refusals by code (with the field they belong to) and payment methods.
 * Translations live under `admin:paymentOrders.*`; these are the English defaults.
 */
import type { TFunction } from 'i18next';

export const ORDER_ERROR_TEXT: Record<string, string> = {
  PLAN_REQUIRED: 'Choose a plan.',
  PLAN_NOT_FOUND: 'This plan does not exist any more.',
  PLAN_NOT_ELIGIBLE: 'This plan cannot be granted.',
  ORDER_NOT_FOUND: 'No order with this reference.',
  ORDER_CANCELLED: 'This order was cancelled and cannot be paid.',
  ORDER_ALREADY_PAID: 'This order is already paid. Deactivate the plan instead.',
  AMOUNT_MISMATCH: 'The amount received differs from the amount due.',
  INVALID_AMOUNT: 'Enter the amount received in euros.',
  INVALID_METHOD: 'Choose how the payment was made.',
  INVALID_DATE: 'The payment date must be a real date, not in the future.',
  REASON_REQUIRED: 'Say why this plan is given for free.',
  USER_NOT_FOUND: 'This user does not exist any more.',
};

const GENERIC = 'That did not work. Please try again.';

export interface OrderErrorInfo {
  text: string;
  code?: string;
  /** The form field the text belongs next to. */
  field?: string;
  amountDueCents?: number;
  paidAmountCents?: number;
}

/** A refusal thrown by apiRequest, in the reader's language. */
export function describeOrderError(error: unknown, t: TFunction): OrderErrorInfo {
  const e = error as { code?: unknown; details?: Record<string, unknown> } | null;
  const code = typeof e?.code === 'string' ? e.code : undefined;
  const details = e?.details ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const text = code && ORDER_ERROR_TEXT[code]
    ? t(`admin:paymentOrders.errors.${code}`, { defaultValue: ORDER_ERROR_TEXT[code] })
    : t('admin:paymentOrders.errors.generic', { defaultValue: GENERIC });
  return {
    text,
    code,
    field: typeof details.field === 'string' ? details.field : undefined,
    amountDueCents: num(details.amountDueCents),
    paidAmountCents: num(details.paidAmountCents),
  };
}

export const METHOD_TEXT: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  card_terminal: 'Card terminal',
  other: 'Other',
  paysera: 'Online (Paysera)',
  free_grant: 'Free grant',
};

export const methodLabel = (method: string | undefined, t: TFunction): string =>
  method ? t(`admin:paymentOrders.methods.${method}`, { defaultValue: METHOD_TEXT[method] ?? method }) : '';

/** Today as yyyy-mm-dd in the admin's own time zone, for a date input. */
export const todayInputValue = (now: Date = new Date()): string => {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
