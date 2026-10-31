import { describe, it, expect } from 'vitest';
import { billingRefusal } from './billingError';

const apiError = (body: Record<string, unknown>) =>
  Object.assign(new Error(String(body.message)), { code: body.code ?? null, statusCode: 402, details: body });

describe('billingRefusal', () => {
  it('reads the code and the limit details of a building refusal', () => {
    const r = billingRefusal(apiError({ message: 'Limit', code: 'BUILDING_LIMIT', details: { limit: 5, current: 5, allowed: 0 } }));
    expect(r).toEqual({ code: 'BUILDING_LIMIT', message: 'Limit', limit: 5, current: 5, allowed: 0, amount: undefined });
  });

  it('reads the amount owed when payment is not configured', () => {
    expect(billingRefusal(apiError({ message: 'Soon', code: 'PAYMENT_NOT_CONFIGURED', details: { amount: 149 } }))?.amount).toBe(149);
  });

  it('ignores errors that are not billing refusals', () => {
    expect(billingRefusal(apiError({ message: 'Nope', code: 'FORBIDDEN' }))).toBeNull();
    expect(billingRefusal(new Error('network'))).toBeNull();
    expect(billingRefusal(null)).toBeNull();
  });
});
