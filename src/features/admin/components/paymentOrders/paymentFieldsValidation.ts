/**
 * Checking the payment form before it is sent (the server checks again).
 * Pure: returns the English default text per field; the form translates by key.
 */
import type { ManualPaymentMethod, PaymentInput } from '../../api/paymentOrdersAdminApi';

export interface PaymentFieldValues {
  /** As typed: "25", "24,99". */
  amount: string;
  method: ManualPaymentMethod;
  /** yyyy-mm-dd, empty for today. */
  paidAt: string;
  note: string;
}

export type PaymentField = 'amount' | 'method' | 'paidAt' | 'note';
/** A field's problem: a translation key (checked here) or text already in the reader's language (from the server). */
export type FieldProblem = { key: string; defaultValue: string } | { text: string };
export type PaymentFieldErrors = Partial<Record<PaymentField, FieldProblem>>;

export const MANUAL_METHODS: readonly ManualPaymentMethod[] = ['bank_transfer', 'cash', 'card_terminal', 'other'];
const MAX_AMOUNT = 100_000;

export const parseAmount = (raw: string): number => (raw.trim() === '' ? NaN : Number(raw.trim().replace(',', '.')));

export function validatePaymentFields(values: PaymentFieldValues, today: string): PaymentFieldErrors {
  const errors: PaymentFieldErrors = {};
  const amount = parseAmount(values.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
    errors.amount = { key: 'admin:paymentOrders.errors.INVALID_AMOUNT', defaultValue: 'Enter the amount received in euros.' };
  }
  if (!MANUAL_METHODS.includes(values.method)) {
    errors.method = { key: 'admin:paymentOrders.errors.INVALID_METHOD', defaultValue: 'Choose how the payment was made.' };
  }
  if (values.paidAt && (!/^\d{4}-\d{2}-\d{2}$/.test(values.paidAt) || values.paidAt > today)) {
    errors.paidAt = { key: 'admin:paymentOrders.errors.INVALID_DATE', defaultValue: 'The payment date must be a real date, not in the future.' };
  }
  return errors;
}

/** The request body for valid values. */
export const toPaymentInput = (values: PaymentFieldValues, acceptDifferentAmount = false): PaymentInput => ({
  amount: parseAmount(values.amount),
  method: values.method,
  ...(values.paidAt ? { paidAt: values.paidAt } : {}),
  ...(values.note.trim() ? { note: values.note.trim() } : {}),
  ...(acceptDifferentAmount ? { acceptDifferentAmount: true } : {}),
});
