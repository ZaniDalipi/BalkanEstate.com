import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ZoneDynamicsCard from '../ZoneDynamicsCard';
import type { ZoneDynamics } from '../../../api/areaPricesApi';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const hook = vi.hoisted(() => ({ useAreaPrices: vi.fn() }));
vi.mock('../../../hooks/useAreaPrices', () => hook);

const withDynamics = (dynamics: ZoneDynamics | undefined) =>
  hook.useAreaPrices.mockReturnValue({ data: { dynamics }, isLoading: false, error: null });

const seller: ZoneDynamics = {
  status: 'ok', verdict: 'seller', score: 84, monthsOfSupply: 2, activeCount: 2, closedLastYear: 12, medianDaysOnMarket: 45,
};

beforeEach(() => hook.useAreaPrices.mockReset());

describe('ZoneDynamicsCard', () => {
  it('names a seller\'s market, marks the gauge and lists the figures', () => {
    withDynamics(seller);
    render(<ZoneDynamicsCard property={{ id: 'p1', listingType: 'sale' }} />);

    expect(screen.getByText("This area is a seller's market")).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '84 out of 100: Favours buyers at 0, Favours sellers at 100' })).toBeInTheDocument();
    expect(screen.getByText('2 on the market')).toBeInTheDocument();
    expect(screen.getByText('12 sold in the last 12 months')).toBeInTheDocument();
    expect(screen.getByText('≈ 2 months of supply')).toBeInTheDocument();
    expect(screen.getByText('Typically sold in 45 days')).toBeInTheDocument();
  });

  it('speaks of tenants and landlords for a rental', () => {
    withDynamics({ ...seller, verdict: 'buyer', score: 20 });
    render(<ZoneDynamicsCard property={{ id: 'p1', listingType: 'rent' }} />);
    expect(screen.getByText("This area is a tenant's market")).toBeInTheDocument();
    expect(screen.getByText('12 let in the last 12 months')).toBeInTheDocument();
    expect(screen.getByText('Favours landlords')).toBeInTheDocument();
  });

  it('says so when there are too few recent sales, without a gauge', () => {
    withDynamics({ status: 'insufficient', activeCount: 4, closedLastYear: 1 });
    render(<ZoneDynamicsCard property={{ id: 'p1', listingType: 'sale' }} />);
    expect(screen.getByText(/Not enough recent sales nearby/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders nothing while the neighbourhood data is not there', () => {
    hook.useAreaPrices.mockReturnValue({ data: null, isLoading: true, error: null });
    const { container } = render(<ZoneDynamicsCard property={{ id: 'p1', listingType: 'sale' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
