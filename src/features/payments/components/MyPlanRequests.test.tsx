import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import MyPlanRequests from './MyPlanRequests';
import type { PlanOrder } from '../types/paymentOrders';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({ requestPlan: vi.fn(), getMyPlanOrders: vi.fn() }));
vi.mock('../api/paymentOrdersApi', () => api);

const order = (over: Partial<PlanOrder>): PlanOrder => ({
  reference: 'BE-AAAA-BBBB',
  status: 'requested',
  productId: 'pro_monthly',
  productName: 'Pro Monthly',
  listAmountCents: 2500,
  discountCents: 0,
  amountCents: 2500,
  currency: 'EUR',
  createdAt: '2026-11-20T10:00:00.000Z',
  ...over,
});

const renderList = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyPlanRequests />
    </QueryClientProvider>
  );

// Block body: a function returned from beforeEach would be run as a cleanup.
beforeEach(() => {
  api.getMyPlanOrders.mockReset();
});

describe('MyPlanRequests', () => {
  it('lists requests with their state and shows how to pay for an open one', async () => {
    api.getMyPlanOrders.mockResolvedValue({
      orders: [
        order({}),
        order({ reference: 'BE-CCCC-DDDD', status: 'paid', productName: 'Pro Yearly', amountCents: 20000, paidAt: '2026-10-01T10:00:00.000Z' }),
      ],
      instructions: { contactEmail: 'sales@example.com', bankTransfer: null },
    });
    renderList();

    expect(await screen.findByText('My plan requests')).toBeInTheDocument();
    expect(screen.getByText('Waiting for payment')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // Only the open request offers payment details.
    const howToPay = screen.getAllByRole('button', { name: 'How to pay' });
    expect(howToPay).toHaveLength(1);

    fireEvent.click(howToPay[0]);
    expect(howToPay[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Our team will contact you/)).toBeInTheDocument();
  });

  it('shows nothing when there are no requests', async () => {
    api.getMyPlanOrders.mockResolvedValue({ orders: [], instructions: { contactEmail: 'x@y.z', bankTransfer: null } });
    const { container } = renderList();
    await vi.waitFor(() => expect(api.getMyPlanOrders).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    api.getMyPlanOrders.mockRejectedValue(new Error('offline'));
    renderList();
    expect(await screen.findByRole('alert')).toHaveTextContent('Your plan requests could not be loaded.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
