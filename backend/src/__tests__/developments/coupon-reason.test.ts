import { couponReason } from '../../services/developments/billing/couponReason';

describe('couponReason', () => {
  it('maps every refusal of DiscountCode.isValid to a key', () => {
    expect(couponReason('Code is no longer active')).toEqual({ reason: 'inactive' });
    expect(couponReason('Code is not yet valid')).toEqual({ reason: 'notYetValid' });
    expect(couponReason('Code has expired')).toEqual({ reason: 'expired' });
    expect(couponReason('Code has reached maximum usage limit')).toEqual({ reason: 'usedUp' });
    expect(couponReason('You have already used this code')).toEqual({ reason: 'alreadyUsed' });
    expect(couponReason('Minimum purchase amount is €50', 50)).toEqual({ reason: 'minimum', min: 50 });
    expect(couponReason('This code is restricted to specific plans')).toEqual({ reason: 'otherPlan' });
    expect(couponReason('This code is not valid for the selected plan')).toEqual({ reason: 'otherPlan' });
  });

  it('falls back to "not for residences" for a valid code of another product or an unknown text', () => {
    expect(couponReason(undefined)).toEqual({ reason: 'notResidence' });
    expect(couponReason('Something new')).toEqual({ reason: 'notResidence' });
  });
});
