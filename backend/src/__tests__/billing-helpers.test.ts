process.env.SKIP_TEST_DB = 'true';

import { addBillingPeriod, addMonthsClamped, renewalStart, periodDays } from '../utils/billingPeriod';
import { toCents, toEuros, formatEuros } from '../utils/planPricing';
import { tierForProduct } from '../utils/planTier';
import { creditDaysForSwitch } from '../utils/planSwitchCredit';
import { newOrderReference, normalizeOrderReference, ORDER_REFERENCE_PATTERN } from '../utils/orderReference';

const utc = (iso: string) => new Date(`${iso}T10:00:00.000Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe('addMonthsClamped / addBillingPeriod', () => {
  it('keeps the day of the month', () => {
    expect(day(addBillingPeriod(utc('2026-03-15'), 'monthly'))).toBe('2026-04-15');
  });

  it('clamps Jan 31 to the end of February instead of spilling into March', () => {
    expect(day(addMonthsClamped(utc('2026-01-31'), 1))).toBe('2026-02-28');
    expect(day(addMonthsClamped(utc('2028-01-31'), 1))).toBe('2028-02-29');
  });

  it('clamps Feb 29 to Feb 28 a year later', () => {
    expect(day(addBillingPeriod(utc('2028-02-29'), 'yearly'))).toBe('2029-02-28');
  });

  it('crosses the year end', () => {
    expect(day(addBillingPeriod(utc('2026-12-31'), 'monthly'))).toBe('2027-01-31');
  });

  it('handles weekly, quarterly, and treats an unknown period as monthly', () => {
    expect(day(addBillingPeriod(utc('2026-03-01'), 'weekly'))).toBe('2026-03-08');
    expect(day(addBillingPeriod(utc('2026-11-30'), 'quarterly'))).toBe('2027-02-28');
    expect(day(addBillingPeriod(utc('2026-03-15'), undefined))).toBe('2026-04-15');
  });

  it('keeps the time of day', () => {
    expect(addBillingPeriod(utc('2026-03-15'), 'monthly').toISOString()).toBe('2026-04-15T10:00:00.000Z');
  });
});

describe('renewalStart', () => {
  const now = utc('2026-05-10');

  it('starts now with no current plan', () => {
    expect(renewalStart(now, null)).toBe(now);
  });

  it('starts when the current plan ends, so paying 10 days early keeps those days', () => {
    const expiry = utc('2026-05-20');
    expect(renewalStart(now, { status: 'active', expirationDate: expiry })).toBe(expiry);
  });

  it('starts from the original expiry when paid during the grace period', () => {
    const expiry = utc('2026-05-07');
    expect(renewalStart(now, { status: 'grace', expirationDate: expiry, gracePeriodEndDate: utc('2026-05-14') })).toBe(expiry);
  });

  it('starts now once the grace period is over', () => {
    const expiry = utc('2026-04-01');
    expect(renewalStart(now, { status: 'grace', expirationDate: expiry, gracePeriodEndDate: utc('2026-04-08') })).toBe(now);
  });

  it('starts now when an active-looking plan already ran out', () => {
    expect(renewalStart(now, { status: 'active', expirationDate: utc('2026-05-01') })).toBe(now);
  });
});

describe('planPricing', () => {
  it('converts without float drift', () => {
    expect(toCents(24.99)).toBe(2499);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toEuros(2499)).toBe(24.99);
    expect(formatEuros(2000)).toBe('€20.00');
  });
});

describe('tierForProduct', () => {
  it('reads the product tier', () => {
    expect(tierForProduct({ productId: 'pro_monthly', tier: 'pro' })).toBe('pro');
    expect(tierForProduct({ productId: 'agency_yearly', tier: 'agency' })).toBe('agency_owner');
    expect(tierForProduct({ productId: 'buyer_monthly', tier: 'buyer' })).toBe('buyer');
    expect(tierForProduct({ productId: 'free_tier', tier: 'free' })).toBe('free');
  });

  it('gives the agency-agent seat the agent tier, not owner or pro', () => {
    expect(tierForProduct({ productId: 'agency_agent_yearly', tier: 'pro' })).toBe('agency_agent');
  });

  it('does not guess from words in the id', () => {
    expect(tierForProduct({ productId: 'promotion_featured' })).toBeNull();
    expect(tierForProduct({ productId: 'x_enterprise' })).toBeNull();
    expect(tierForProduct({ productId: 'residence_pass_yearly', tier: 'residence' })).toBeNull();
  });
});

describe('creditDaysForSwitch', () => {
  const now = utc('2026-05-10');

  it('credits unused value of the old plan as days of the new one', () => {
    // 15 days left of €25/month (≈ €12.50) buys ≈ 22 days of €200/year.
    const days = creditDaysForSwitch({
      paidForOldPeriod: 25, oldPeriod: 'monthly', oldExpiresAt: utc('2026-05-25'),
      newPrice: 200, newPeriod: 'yearly', now,
    });
    expect(days).toBe(22);
  });

  it('gives fewer days on a pricier plan', () => {
    const days = creditDaysForSwitch({
      paidForOldPeriod: 25, oldPeriod: 'monthly', oldExpiresAt: utc('2026-05-25'),
      newPrice: 1000, newPeriod: 'yearly', now,
    });
    expect(days).toBe(4);
  });

  it('gives nothing for a plan that was free or already over', () => {
    expect(creditDaysForSwitch({
      paidForOldPeriod: 0, oldPeriod: 'monthly', oldExpiresAt: utc('2026-05-25'),
      newPrice: 200, newPeriod: 'yearly', now,
    })).toBe(0);
    expect(creditDaysForSwitch({
      paidForOldPeriod: 25, oldPeriod: 'monthly', oldExpiresAt: utc('2026-05-01'),
      newPrice: 200, newPeriod: 'yearly', now,
    })).toBe(0);
  });

  it('uses roughly 30 / 365 day periods', () => {
    expect(periodDays('monthly')).toBe(30);
    expect(periodDays('yearly')).toBe(365);
  });
});

describe('order references', () => {
  it('look like BE-XXXX-XXXX without ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const ref = newOrderReference();
      expect(ref).toMatch(ORDER_REFERENCE_PATTERN);
      expect(ref.slice(3)).not.toMatch(/[01OIL]/);
    }
  });

  it('use the coupon prefix when asked', () => {
    expect(newOrderReference('CP')).toMatch(/^CP-/);
  });

  it('are built from the random source', () => {
    expect(newOrderReference('BE', () => 0)).toBe('BE-AAAA-AAAA');
  });

  it('normalise what a person typed', () => {
    expect(normalizeOrderReference(' be-7k3q-9f2m ')).toBe('BE-7K3Q-9F2M');
    expect(normalizeOrderReference(42)).toBe('');
  });
});

import { parsePaymentConfirmation } from '../utils/paymentConfirmation';
import { paymentInstructionsFrom, DEFAULT_PAYMENT_CONTACT_EMAIL } from '../config/manualPayment';
import { instructionLines } from '../services/payments/paymentOrderEmails';
import type { IPaymentOrder } from '../models/PaymentOrder';

describe('parsePaymentConfirmation', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');

  it('reads amount in euros (comma or dot), method, date and note', () => {
    const result = parsePaymentConfirmation({ amount: '24,99', method: 'bank_transfer', paidAt: '2026-05-08', note: '  ref ok ' }, now);
    expect(result).toEqual({
      ok: true,
      value: { paidCents: 2499, method: 'bank_transfer', paidAt: new Date('2026-05-08'), note: 'ref ok', acceptDifferentAmount: false },
    });
  });

  it('defaults the date to now and only accepts true as confirmation', () => {
    const result = parsePaymentConfirmation({ amount: 25, method: 'cash', acceptDifferentAmount: 'yes' }, now);
    expect(result.ok && result.value.paidAt).toEqual(now);
    expect(result.ok && result.value.acceptDifferentAmount).toBe(false);
  });

  it.each([
    [{ amount: 'abc', method: 'cash' }, 'INVALID_AMOUNT', 'amount'],
    [{ amount: -5, method: 'cash' }, 'INVALID_AMOUNT', 'amount'],
    [{ amount: 200000, method: 'cash' }, 'INVALID_AMOUNT', 'amount'],
    [{ amount: 25, method: 'paysera' }, 'INVALID_METHOD', 'method'],
    [{ amount: 25, method: 'cash', paidAt: 'not a date' }, 'INVALID_DATE', 'paidAt'],
    [{ amount: 25, method: 'cash', paidAt: '2026-06-01' }, 'INVALID_DATE', 'paidAt'],
    [{ amount: 25, method: 'cash', paidAt: '2019-12-31' }, 'INVALID_DATE', 'paidAt'],
  ])('refuses %j with %s on %s', (body, code, field) => {
    expect(parsePaymentConfirmation(body, now)).toMatchObject({ ok: false, code, field });
  });
});

describe('payment instructions', () => {
  it('shows transfer details only when holder and IBAN are both set', () => {
    expect(paymentInstructionsFrom({ PAYMENT_BANK_IBAN: 'AL47 2121' })).toEqual({ contactEmail: DEFAULT_PAYMENT_CONTACT_EMAIL, bankTransfer: null });
    expect(paymentInstructionsFrom({
      PAYMENT_BANK_ACCOUNT_HOLDER: ' BalkanEstate SH.P.K ',
      PAYMENT_BANK_IBAN: 'AL47  2121 1009',
      PAYMENT_BANK_BIC: 'ABCDALTR',
      PAYMENT_CONTACT_EMAIL: 'billing@example.com',
    })).toEqual({
      contactEmail: 'billing@example.com',
      bankTransfer: { accountHolder: 'BalkanEstate SH.P.K', iban: 'AL47 2121 1009', bic: 'ABCDALTR', bankName: undefined },
    });
  });

  it('puts the reference in the transfer description, or says the team will get in touch', () => {
    const order = { productName: 'Pro Monthly', amountCents: 2000, reference: 'BE-AAAA-BBBB' } as IPaymentOrder;
    const withBank = instructionLines(order, { contactEmail: 'sales@x.com', bankTransfer: { accountHolder: 'BE Ltd', iban: 'AL47' } });
    expect(withBank).toContain('Amount: €20.00');
    expect(withBank).toContain('Payment description: BE-AAAA-BBBB');
    const withoutBank = instructionLines(order, { contactEmail: 'sales@x.com', bankTransfer: null });
    expect(withoutBank.join('\n')).toContain('Our team will contact you');
  });
});
