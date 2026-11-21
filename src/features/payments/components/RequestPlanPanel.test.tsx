import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import RequestPlanPanel from './RequestPlanPanel';
import type { PlanOrder, RequestPlanResult } from '../types/paymentOrders';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({ requestPlan: vi.fn(), getMyPlanOrders: vi.fn() }));
vi.mock('../api/paymentOrdersApi', () => api);

const order = (over: Partial<PlanOrder> = {}): PlanOrder => ({
  reference: 'BE-7K3Q-9F2M',
  status: 'requested',
  productId: 'pro_monthly',
  productName: 'Pro Monthly',
  listAmountCents: 2500,
  discountCents: 500,
  amountCents: 2000,
  currency: 'EUR',
  createdAt: '2026-11-20T10:00:00.000Z',
  ...over,
});

const result = (over: Partial<RequestPlanResult> = {}): RequestPlanResult => ({
  order: order(),
  existing: false,
  instructions: { contactEmail: 'sales@example.com', bankTransfer: { accountHolder: 'BalkanEstate Ltd', iban: 'AL47 2121 1009' } },
  ...over,
});

const renderPanel = (props: Partial<React.ComponentProps<typeof RequestPlanPanel>> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RequestPlanPanel productId="pro_monthly" planName="Pro Monthly" {...props} />
    </QueryClientProvider>
  );

// Block body: a function returned from beforeEach would be run as a cleanup.
beforeEach(() => {
  api.requestPlan.mockReset();
});

describe('RequestPlanPanel', () => {
  it('requests the plan (with a partial code) and shows the amount, reference and bank details', async () => {
    api.requestPlan.mockResolvedValue(result());
    renderPanel({ discountCode: 'SPRING20' });

    fireEvent.click(screen.getByRole('button', { name: 'Request this plan' }));

    expect(await screen.findByText('Request sent')).toBeInTheDocument();
    expect(api.requestPlan).toHaveBeenCalledWith({ productId: 'pro_monthly', discountCode: 'SPRING20' }, expect.anything());
    expect(screen.getByText('€20.00')).toBeInTheDocument();
    expect(screen.getAllByText('BE-7K3Q-9F2M').length).toBeGreaterThan(0);
    expect(screen.getByText('AL47 2121 1009')).toBeInTheDocument();
    expect(screen.getByText(/Put the reference BE-7K3Q-9F2M in the payment description/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Reference' })).toBeInTheDocument();
  });

  it('says so when the plan was already requested', async () => {
    api.requestPlan.mockResolvedValue(result({ existing: true }));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Request this plan' }));
    expect(await screen.findByText('You already requested this plan')).toBeInTheDocument();
  });

  it('tells the customer the team will be in touch when no bank account is set', async () => {
    api.requestPlan.mockResolvedValue(result({ instructions: { contactEmail: 'sales@example.com', bankTransfer: null } }));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Request this plan' }));
    expect(await screen.findByText(/Our team will contact you within one business day/)).toBeInTheDocument();
  });

  it('shows why a request was refused, as an alert, and keeps the email option', async () => {
    api.requestPlan.mockRejectedValue(Object.assign(new Error('This item cannot be ordered here.'), { code: 'PLAN_NOT_ELIGIBLE' }));
    renderPanel({ productId: 'listing_promo_featured_7days', planName: 'Featured' });

    fireEvent.click(screen.getByRole('button', { name: 'Request this plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This item cannot be ordered here.');
    expect(screen.getByRole('link', { name: /@/ })).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });

  it('without a product only offers the email', () => {
    renderPanel({ productId: undefined });
    expect(screen.queryByRole('button', { name: 'Request this plan' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /@/ })).toBeInTheDocument();
  });
});
