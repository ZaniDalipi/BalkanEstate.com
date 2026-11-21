import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSubscriptionPanel from './UserSubscriptionPanel';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({
  listPaymentOrders: vi.fn(),
  listOrderablePlans: vi.fn(),
  markOrderPaid: vi.fn(),
  cancelOrder: vi.fn(),
  recordPayment: vi.fn(),
  freeGrant: vi.fn(),
  deactivateUserPlan: vi.fn(),
}));
vi.mock('../../api/paymentOrdersAdminApi', () => api);

const renderPanel = (user = { _id: 'u1', isSubscribed: false }) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <UserSubscriptionPanel user={user} />
    </QueryClientProvider>
  );

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listOrderablePlans.mockResolvedValue([
    { productId: 'pro_monthly', name: 'Pro Monthly', price: 25, billingPeriod: 'monthly' },
    { productId: 'pro_yearly', name: 'Pro Yearly', price: 200, billingPeriod: 'yearly' },
  ]);
});

const choosePlan = async (productId: string) => {
  const select = await screen.findByLabelText('Plan');
  await waitFor(() => expect(select).not.toBeDisabled());
  fireEvent.change(select, { target: { value: productId } });
};

describe('UserSubscriptionPanel', () => {
  it('records a payment for a plan from the catalogue, with the price filled in', async () => {
    api.recordPayment.mockResolvedValue({ order: {}, alreadyPaid: false, expiresAt: '2027-11-20T10:00:00.000Z' });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    await choosePlan('pro_yearly');
    expect(screen.getByLabelText('Amount received (€)')).toHaveValue('200.00');
    fireEvent.change(screen.getByLabelText('Paid by'), { target: { value: 'cash' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment and start the plan' }));

    await waitFor(() => expect(api.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', productId: 'pro_yearly', amount: 200, method: 'cash' }),
      expect.anything()
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/Plan active until/);
  });

  it('will not record a payment without a plan', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    fireEvent.change(await screen.findByLabelText('Amount received (€)'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment and start the plan' }));
    expect(await screen.findByText('Choose a plan.')).toBeInTheDocument();
    expect(api.recordPayment).not.toHaveBeenCalled();
  });

  it('a free grant needs a reason, shown next to the field', async () => {
    api.freeGrant.mockResolvedValue({ order: {}, alreadyPaid: false, expiresAt: '2026-12-20T10:00:00.000Z' });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Free grant' }));
    await choosePlan('pro_monthly');
    fireEvent.click(screen.getByRole('button', { name: 'Give the plan for free' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Say why this plan is given for free.');
    expect(api.freeGrant).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Why is it free?'), { target: { value: 'Partner agency' } });
    fireEvent.click(screen.getByRole('button', { name: 'Give the plan for free' }));
    await waitFor(() => expect(api.freeGrant).toHaveBeenCalledWith(
      { userId: 'u1', productId: 'pro_monthly', reason: 'Partner agency' }, expect.anything()
    ));
  });

  it('turns an active plan off after confirming', async () => {
    api.deactivateUserPlan.mockResolvedValue({ success: true, message: 'ok' });
    renderPanel({ _id: 'u1', isSubscribed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn the plan off' }));
    await waitFor(() => expect(api.deactivateUserPlan).toHaveBeenCalledWith('u1', expect.anything()));
    expect(await screen.findByRole('status')).toHaveTextContent('Plan turned off.');
  });
});
