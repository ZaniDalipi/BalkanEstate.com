import type { BillingRefusal } from './billingError';

/** A discount code the server accepted: what is left to pay, before and after it. */
export interface AppliedCode {
  code: string;
  /** What is left to pay with the code. */
  amount: number;
  /** The price before the code. */
  listAmount: number;
  discount: number;
}

/**
 * A checkout refused only because a discount code leaves something to pay
 * (online payment is off): the code was accepted, and this is the new price.
 * Null for any other refusal.
 */
export function appliedCode(refusal: BillingRefusal | null): AppliedCode | null {
  if (refusal?.code !== 'PAYMENT_NOT_CONFIGURED' || !refusal.couponCode) return null;
  const { amount, listAmount, discount } = refusal;
  if (amount === undefined || listAmount === undefined || discount === undefined || amount <= 0 || amount > listAmount) return null;
  return { code: refusal.couponCode, amount, listAmount, discount };
}
