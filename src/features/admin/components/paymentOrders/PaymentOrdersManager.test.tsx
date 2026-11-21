import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import PaymentOrdersManager from './PaymentOrdersManager';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

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

const order = (over: Partial<AdminPlanOrder> = {}): AdminPlanOrder => ({
  reference: 'BE-7K3Q-9F2M',
  status: 'requested',
  productId: 'pro_monthly',
  productName: 'Pro Monthly',
  listAmountCents: 2500,
  discountCents: 0,
  amountCents: 2500,
  currency: 'EUR',
  createdAt: '2026-11-20T10:00:00.000Z',
  userId: 'u1',
  userEmail: 'ana@example.com',
  userName: 'Ana',
  source: 'customer',
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <PaymentOrdersManager />
    </QueryClientProvider>
  );

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listPaymentOrders.mockResolvedValue({ orders: [order()], total: 1, page: 1, pages: 1 });
});

describe('PaymentOrdersManager', () => {
  it('opens on the orders waiting for payment', async () => {
    renderPage();
    expect(await screen.findByText('BE-7K3Q-9F2M')).toBeInTheDocument();
    expect(api.listPaymentOrders).toHaveBeenCalledWith({ status: 'requested', q: undefined, page: 1 });
    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
  });

  it('marks an order paid with the amount due, method and date', async () => {
    api.markOrderPaid.mockResolvedValue({ order: order({ status: 'paid' }), alreadyPaid: false });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Amount received (€)')).toHaveValue('25.00');
    fireEvent.change(within(dialog).getByLabelText('Note (optional)'), { target: { value: 'Statement 2026-11-20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark paid and start the plan' }));

    await waitFor(() => expect(api.markOrderPaid).toHaveBeenCalledTimes(1));
    expect(api.markOrderPaid).toHaveBeenCalledWith('BE-7K3Q-9F2M', expect.objectContaining({
      amount: 25, method: 'bank_transfer', note: 'Statement 2026-11-20', paidAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
  });

  it('asks before accepting a different amount, then sends the confirmation', async () => {
    api.markOrderPaid
      .mockRejectedValueOnce(Object.assign(new Error('differs'), { code: 'AMOUNT_MISMATCH', details: { field: 'amount', amountDueCents: 2500, paidAmountCents: 2000 } }))
      .mockResolvedValueOnce({ order: order({ status: 'paid' }), alreadyPaid: false });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Amount received (€)'), { target: { value: '20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark paid and start the plan' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Received €20.00, but €25.00 is due.');
    const confirm = within(dialog).getByRole('button', { name: 'Mark paid and start the plan' });
    expect(confirm).toBeDisabled();

    fireEvent.click(within(dialog).getByLabelText('Accept €20.00 for this order'));
    fireEvent.click(confirm);
    await waitFor(() => expect(api.markOrderPaid).toHaveBeenCalledTimes(2));
    expect(api.markOrderPaid).toHaveBeenLastCalledWith('BE-7K3Q-9F2M', expect.objectContaining({ amount: 20, acceptDifferentAmount: true }));
  });

  it('shows a wrong date next to the field without calling the server', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Payment date'), { target: { value: '2999-01-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark paid and start the plan' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The payment date must be a real date');
    expect(within(dialog).getByLabelText('Payment date')).toHaveAttribute('aria-invalid', 'true');
    expect(api.markOrderPaid).not.toHaveBeenCalled();
  });

  it('cancels a request with a reason', async () => {
    api.cancelOrder.mockResolvedValue({ order: order({ status: 'cancelled' }), alreadyCancelled: false });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel request' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: 'Duplicate' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel the request' }));
    await waitFor(() => expect(api.cancelOrder).toHaveBeenCalledWith('BE-7K3Q-9F2M', 'Duplicate'));
  });

  it('switches to paid orders', async () => {
    renderPage();
    await screen.findByText('BE-7K3Q-9F2M');
    fireEvent.click(screen.getByRole('tab', { name: 'Paid' }));
    await waitFor(() => expect(api.listPaymentOrders).toHaveBeenLastCalledWith({ status: 'paid', q: undefined, page: 1 }));
  });
});
