import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetAssistant } from './BudgetAssistant';
import type { PublicUnit } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);
vi.mock('@/src/features/cities/api/cityApi', () => ({ getCityMarketData: () => Promise.reject(new Error('404')) }));

const unit = (id: string, over: Partial<PublicUnit>): PublicUnit =>
  ({ id, unitNumber: id, unitType: 'apartment', availability: 'available', buildingId: 'b', floorId: 'f', listingIds: [], ...over }) as PublicUnit;

const renderIt = (units: PublicUnit[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BudgetAssistant units={units} onShow={vi.fn()} buttonClassName="" />
    </QueryClientProvider>
  );

// The test setup stubs sessionStorage with vi.fn()s.
const storage = window.sessionStorage as unknown as { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  storage.getItem.mockReset();
  storage.setItem.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('BudgetAssistant', () => {
  it('renders nothing when no home on sale has a public price', () => {
    const { container } = renderIt([unit('A1', { price: 100_000, availability: 'sold' }), unit('A2', { priceOnRequest: true })]);
    expect(container).toBeEmptyDOMElement();
  });

  it('teases the starting price after a moment, once per session', async () => {
    vi.useRealTimers(); // framer-motion's exit animation needs real frames
    renderIt([unit('A1', { price: 136_000, totalArea: 60 })]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(await screen.findByRole('status', {}, { timeout: 5000 })).toHaveTextContent('Homes here start at 136.000 €.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(storage.setItem).toHaveBeenCalledWith('be:budgetTeaserDismissed', '1');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  }, 10_000);

  it('does not tease again after it was dismissed', () => {
    storage.getItem.mockImplementation((k: string) => (k === 'be:budgetTeaserDismissed' ? '1' : null));
    renderIt([unit('A1', { price: 136_000 })]);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls out a bargain against the residence average', () => {
    const units = [
      unit('A1', { price: 100_000, totalArea: 100 }),
      unit('A2', { price: 200_000, totalArea: 100 }),
      unit('A3', { price: 200_000, totalArea: 100 }),
      unit('A4', { price: 200_000, totalArea: 100 }),
    ];
    renderIt(units);
    act(() => vi.advanceTimersByTime(4000));
    // Average 1.750/m²; A1 at 1.000/m² is 43% below.
    expect(screen.getByRole('status')).toHaveTextContent('Bargain spotted: Apt A1 costs 100.000 €, 43% below this residence’s average per m².');
  });
});
