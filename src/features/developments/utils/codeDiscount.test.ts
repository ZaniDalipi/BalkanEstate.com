import { describe, expect, it } from 'vitest';
import { appliedCode } from './codeDiscount';

describe('appliedCode', () => {
  it('reads the lower price a discount code leaves to pay', () => {
    expect(appliedCode({ code: 'PAYMENT_NOT_CONFIGURED', message: '', amount: 119.2, listAmount: 149, discount: 29.8, couponCode: 'RES-AAAA-BBBB' })).toEqual({ code: 'RES-AAAA-BBBB', amount: 119.2, listAmount: 149, discount: 29.8 });
  });

  it('is nothing for any other refusal, or numbers that do not add up', () => {
    expect(appliedCode(null)).toBeNull();
    expect(appliedCode({ code: 'PAYMENT_NOT_CONFIGURED', message: '', amount: 149 })).toBeNull();
    expect(appliedCode({ code: 'COUPON_INVALID', message: '', amount: 1, listAmount: 2, discount: 1, couponCode: 'X1Y' })).toBeNull();
    expect(appliedCode({ code: 'PAYMENT_NOT_CONFIGURED', message: '', amount: 300, listAmount: 149, discount: 0, couponCode: 'RES-A' })).toBeNull();
  });
});
