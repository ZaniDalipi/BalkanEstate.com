/**
 * Read what an admin typed when marking an order paid. Pure: returns the
 * values or the first problem, with a code the panel can show next to the field.
 */
import { toCents } from './planPricing';

export const MANUAL_METHODS = ['bank_transfer', 'cash', 'card_terminal', 'other'] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];

/** Largest single payment accepted, in euros. */
export const MAX_PAYMENT_EUROS = 100_000;
export const MAX_NOTE_LENGTH = 500;
const EARLIEST_PAYMENT = Date.UTC(2020, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PaymentConfirmation {
  paidCents: number;
  method: ManualMethod;
  paidAt: Date;
  note?: string;
  acceptDifferentAmount: boolean;
}

export type ConfirmationResult =
  | { ok: true; value: PaymentConfirmation }
  | { ok: false; code: 'INVALID_AMOUNT' | 'INVALID_METHOD' | 'INVALID_DATE'; field: string; message: string };

const asNumber = (value: unknown): number =>
  typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value.replace(',', '.')) : NaN;

export function parsePaymentConfirmation(body: Record<string, unknown>, now: Date = new Date()): ConfirmationResult {
  const amount = asNumber(body.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PAYMENT_EUROS) {
    return { ok: false, code: 'INVALID_AMOUNT', field: 'amount', message: `Enter the amount received, between 0 and ${MAX_PAYMENT_EUROS} euros.` };
  }

  const method = body.method;
  if (typeof method !== 'string' || !(MANUAL_METHODS as readonly string[]).includes(method)) {
    return { ok: false, code: 'INVALID_METHOD', field: 'method', message: 'Choose how the payment was made.' };
  }

  let paidAt = now;
  if (body.paidAt !== undefined && body.paidAt !== null && body.paidAt !== '') {
    paidAt = new Date(String(body.paidAt));
    // A date picked in a later time zone can be a day ahead of the server.
    if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() < EARLIEST_PAYMENT || paidAt.getTime() > now.getTime() + DAY_MS) {
      return { ok: false, code: 'INVALID_DATE', field: 'paidAt', message: 'The payment date must be a real date, not in the future.' };
    }
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : '';

  return {
    ok: true,
    value: {
      paidCents: toCents(amount),
      method: method as ManualMethod,
      paidAt,
      ...(note ? { note } : {}),
      acceptDifferentAmount: body.acceptDifferentAmount === true,
    },
  };
}
