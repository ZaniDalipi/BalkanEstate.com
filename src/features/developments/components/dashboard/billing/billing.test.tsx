import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import type { ResidenceBilling } from '../../../types';

vi.mock('../../../api/residenceBillingApi', () => ({
  getResidenceBilling: vi.fn(),
  checkoutResidence: vi.fn(),
  getResidencePricing: vi.fn(),
}));

import * as api from '../../../api/residenceBillingApi';
import { BuyResidenceDialog } from './BuyResidenceDialog';
import { PlanBanner } from './PlanBanner';
import { ResidencePlanCard } from './ResidencePlanCard';
import { UnlockBuildingNotice } from './UnlockBuildingNotice';

const billing = (over: Partial<ResidenceBilling> = {}): ResidenceBilling => ({
  state: 'trial',
  publicNow: true,
  visibleUntil: '2026-11-08T00:00:00.000Z',
  daysLeft: 12,
  trialStartedAt: '2026-10-24T00:00:00.000Z',
  trialEndsAt: '2026-11-08T00:00:00.000Z',
  paidUntil: null,
  includedUntil: null,
  buildings: { used: 2, limit: 5, included: 5, extra: 0 },
  publish: { allowed: true, startsTrial: false },
  premium: false,
  prices: { currency: 'EUR', pass: { listPrice: 149, unitPrice: 149, amount: 149, discountPct: 0 }, extraBuilding: { listPrice: 29, unitPrice: 29, amount: 29, discountPct: 0 } },
  terms: { trialDays: 15, passMonths: 12, includedBuildings: 5 },
  paymentsEnabled: false,
  ...over,
});

const refusal = (code: string, details?: Record<string, unknown>) =>
  Object.assign(new Error('refused'), { code, statusCode: 402, details: { code, message: 'refused', details } });

beforeEach(() => vi.clearAllMocks());

describe('ResidencePlanCard', () => {
  it('shows the trial, buildings used and a buy button for the owner', () => {
    render(<ResidencePlanCard developmentId="d1" billing={billing()} canBuy />);
    expect(screen.getByText('billing.state.trial')).toBeInTheDocument();
    expect(screen.getByText('billing.usedOf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /billing.buyPass/ })).toBeInTheDocument();
  });

  it('tells team members only the owner can buy', () => {
    render(<ResidencePlanCard developmentId="d1" billing={billing()} canBuy={false} />);
    expect(screen.queryByRole('button', { name: /billing.buyPass/ })).not.toBeInTheDocument();
    expect(screen.getByText('billing.askOwner')).toBeInTheDocument();
  });
});

describe('BuyResidenceDialog', () => {
  it('needs a code while online payment is off, then buys with it', async () => {
    vi.mocked(api.checkoutResidence).mockResolvedValue({ billing: billing({ state: 'active' }) });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<BuyResidenceDialog developmentId="d1" kind="pass" billing={billing()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'billing.unlock' }));
    expect(await screen.findByText('billing.code.required')).toBeInTheDocument();
    expect(api.checkoutResidence).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('billing.code.label'), ' RES100 ');
    await user.click(screen.getByRole('button', { name: 'billing.unlock' }));
    await waitFor(() => expect(api.checkoutResidence).toHaveBeenCalledWith('d1', { kind: 'pass', quantity: 1, couponCode: 'RES100' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows a refused code on the field, and a partial code as still owing', async () => {
    const user = userEvent.setup();
    render(<BuyResidenceDialog developmentId="d1" kind="pass" billing={billing()} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText('billing.code.label'), 'BADCODE');

    // The server's English reason is never shown: its reason key is translated.
    vi.mocked(api.checkoutResidence).mockRejectedValueOnce(
      Object.assign(new Error('Code has expired'), { code: 'COUPON_INVALID', statusCode: 400, details: { code: 'COUPON_INVALID', details: { reason: 'expired' } } })
    );
    await user.click(screen.getByRole('button', { name: 'billing.unlock' }));
    expect(await screen.findByText('billing.refusal.coupon.expired')).toBeInTheDocument();
    expect(screen.queryByText('Code has expired')).not.toBeInTheDocument();

    vi.mocked(api.checkoutResidence).mockRejectedValueOnce(refusal('PAYMENT_NOT_CONFIGURED', { amount: 74.5 }));
    await user.click(screen.getByRole('button', { name: 'billing.unlock' }));
    expect(await screen.findByText('billing.refusal.paymentSoonAmount')).toBeInTheDocument();
  });

  it('asks how many buildings to add, and checks the number', async () => {
    const user = userEvent.setup();
    render(<BuyResidenceDialog developmentId="d1" kind="extra_building" billing={billing({ state: 'active' })} onClose={vi.fn()} />);
    const qty = screen.getByLabelText('billing.quantity.label');
    await user.clear(qty);
    await user.type(qty, '99');
    await user.type(screen.getByLabelText('billing.code.label'), 'RES100');
    await user.click(screen.getByRole('button', { name: 'billing.unlock' }));
    expect(await screen.findByText('billing.quantity.range')).toBeInTheDocument();
    expect(api.checkoutResidence).not.toHaveBeenCalled();
  });
});

describe('UnlockBuildingNotice', () => {
  it('on a trial, more buildings start with the pass', () => {
    render(<UnlockBuildingNotice developmentId="d1" billing={billing({ buildings: { used: 5, limit: 5, included: 5, extra: 0 } })} canBuy />);
    expect(screen.getByText('billing.limit.needPass')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'billing.buyPass' })).toBeInTheDocument();
  });

  it('on a pass, one more building can be unlocked', async () => {
    const user = userEvent.setup();
    render(<UnlockBuildingNotice developmentId="d1" billing={billing({ state: 'active', buildings: { used: 5, limit: 5, included: 5, extra: 0 } })} canBuy />);
    await user.click(screen.getByRole('button', { name: 'billing.unlockOne' }));
    expect(await screen.findByLabelText('billing.quantity.label')).toBeInTheDocument();
  });
});

describe('PlanBanner', () => {
  it('warns in the last trial days', async () => {
    vi.mocked(api.getResidenceBilling).mockResolvedValue({ billing: billing({ daysLeft: 3 }) });
    render(<PlanBanner developmentId="d1" status="published" canBuy />);
    expect(await screen.findByText('billing.banner.endingSoon')).toBeInTheDocument();
  });

  it('alerts when a published residence is offline', async () => {
    vi.mocked(api.getResidenceBilling).mockResolvedValue({ billing: billing({ state: 'expired', publicNow: false, daysLeft: null }) });
    render(<PlanBanner developmentId="d1" status="published" canBuy />);
    expect(await screen.findByRole('alert')).toHaveTextContent('billing.banner.offline');
  });

  it('stays quiet otherwise', async () => {
    vi.mocked(api.getResidenceBilling).mockResolvedValue({ billing: billing({ daysLeft: 12 }) });
    const { container } = render(<PlanBanner developmentId="d1" status="published" canBuy />);
    await waitFor(() => expect(api.getResidenceBilling).toHaveBeenCalled());
    expect(container.querySelector('[role="status"],[role="alert"]')).toBeNull();
  });
});
