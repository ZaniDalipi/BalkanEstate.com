/**
 * Why a code was refused, as a stable key the client translates.
 * DiscountCode.isValid() answers in English sentences; this maps them once.
 */
export type CouponReason = 'unknown' | 'inactive' | 'notYetValid' | 'expired' | 'usedUp' | 'alreadyUsed' | 'minimum' | 'otherPlan' | 'notResidence';

const BY_TEXT: Record<string, CouponReason> = {
  'Code is no longer active': 'inactive',
  'Code is not yet valid': 'notYetValid',
  'Code has expired': 'expired',
  'Code has reached maximum usage limit': 'usedUp',
  'You have already used this code': 'alreadyUsed',
  'This code is restricted to specific plans': 'otherPlan',
  'This code is not valid for the selected plan': 'otherPlan',
};

export function couponReason(text: string | undefined, minPurchaseAmount?: number): { reason: CouponReason; min?: number } {
  if (!text) return { reason: 'notResidence' };
  if (text.startsWith('Minimum purchase amount')) return { reason: 'minimum', ...(typeof minPurchaseAmount === 'number' ? { min: minPurchaseAmount } : {}) };
  return { reason: BY_TEXT[text] ?? 'notResidence' };
}
