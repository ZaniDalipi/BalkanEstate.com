import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResidenceExplorer } from '../ResidenceExplorer';
import { EMPTY_CRITERIA } from '../../../../utils/unitFilters';
import type { ExplorerNav } from '../../../../hooks/useExplorerUrlState';
import type { DevelopmentBuilding, DevelopmentFloor, PublicSceneView, PublicUnit } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);
const views = vi.hoisted(() => ({ byTarget: {} as Record<string, PublicSceneView[]> }));
const market = vi.hoisted(() => ({ price: null as number | null }));
vi.mock('../../../../api/developmentsApi', () => ({
  getPublicViews: (_slug: string, type: string, id?: string) =>
    Promise.resolve({ views: views.byTarget[`${type}:${id ?? ''}`] ?? [] }),
}));
vi.mock('@/src/features/cities/api/cityApi', () => ({
  getCityMarketData: () => (market.price ? Promise.resolve({ avgPricePerSqm: market.price }) : Promise.reject(new Error('404'))),
}));
vi.mock('@/src/app/router/navigation', () => ({ navigate: vi.fn() }));

const view = (key: string, hotspots: PublicSceneView['hotspots']): PublicSceneView => ({
  viewKey: key, viewName: `View ${key}`, viewDirection: 'front', sortOrder: 0,
  imageUrl: 'https://media.test/a.jpg', imageWidth: 1600, imageHeight: 900, hotspots,
});
const tri = [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4]];
const spot = (id: string, linkType: 'building' | 'floor' | 'unit', linkId: string) => ({ id, shape: 'polygon' as const, points: tri, linkType, linkId, z: 0 });
const buildings = [{ id: 'b1', name: 'B1', order: 0 }] as DevelopmentBuilding[];
const floors = [{ id: 'f1', buildingId: 'b1', label: 'Floor 1', level: 1 }] as DevelopmentFloor[];
const unit = (id: string, price: number, totalArea: number): PublicUnit =>
  ({ id, unitNumber: id.toUpperCase(), unitType: 'apartment', availability: 'available', buildingId: 'b1', floorId: 'f1', listingIds: [], price, totalArea }) as unknown as PublicUnit;
const units = [unit('u1', 120_000, 80), unit('u2', 180_000, 90)];

const Harness: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [nav, setNav] = useState<ExplorerNav>({});
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ResidenceExplorer
        slug="res" residenceName="Aurora" buildings={buildings} floors={floors} units={units}
        criteria={EMPTY_CRITERIA} onCriteriaChange={() => undefined} nav={nav} onNavChange={setNav}
        onOpenUnit={onOpen} city="Tirana" country="Albania"
      />
    </QueryClientProvider>
  );
};

const askBudget = async (amount: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Your budget' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Your budget' }), { target: { value: amount } });
  fireEvent.click(screen.getByRole('button', { name: /Show options/ }));
};

beforeEach(() => {
  views.byTarget = {};
  market.price = null;
});

describe('budget helper', () => {
  it('validates the budget and explains what is wrong', async () => {
    views.byTarget['development:'] = [view('front', [spot('hb', 'building', 'b1')])];
    render(<Harness onOpen={vi.fn()} />);
    await askBudget('lots');
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an amount in euros');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your budget' }), { target: { value: '150k' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('suggests homes in budget, flagging a bargain against the city average', async () => {
    market.price = 2_000; // u1: 1.500/m² → 25% below
    views.byTarget['development:'] = [view('front', [spot('hb', 'building', 'b1')])];
    render(<Harness onOpen={vi.fn()} />);
    await askBudget('150.000');
    expect(await screen.findByText('Homes for 150.000 €')).toBeInTheDocument();
    expect(screen.getByText('Apt U1')).toBeInTheDocument();
    expect(screen.getByText(/25% below the Tirana average per m²/)).toBeInTheDocument();
    // u2 (180.000 €) is more than 10% over: not offered.
    expect(screen.queryByText('Apt U2')).not.toBeInTheDocument();
  });

  it('flies residence → building → floor → apartment, then opens it', async () => {
    views.byTarget['development:'] = [view('front', [spot('hb', 'building', 'b1')])];
    views.byTarget['building:b1'] = [view('east', [spot('hf', 'floor', 'f1')])];
    views.byTarget['floor:f1'] = [view('plan', [spot('hu', 'unit', 'u1')])];
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    await askBudget('150k');
    fireEvent.click(await screen.findByRole('button', { name: /Take me there/ }));
    expect(await screen.findByTestId('focus-pulse')).toBeInTheDocument();
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('u1'), { timeout: 6000 });
    expect(onOpen).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('still opens the apartment when nothing on the way is marked', async () => {
    views.byTarget['development:'] = [view('front', [])];
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    await askBudget('150k');
    fireEvent.click(await screen.findByRole('button', { name: /Take me there/ }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith('u1'), { timeout: 3000 });
  });

  it('stops steering when the buyer navigates themselves', async () => {
    views.byTarget['development:'] = [view('front', [spot('hb', 'building', 'b1')])];
    views.byTarget['building:b1'] = [view('east', [spot('hu', 'unit', 'u1')])];
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    await askBudget('150k');
    fireEvent.click(await screen.findByRole('button', { name: /Take me there/ }));
    expect(await screen.findByTestId('focus-pulse')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /B1/ })); // a building chip
    await new Promise((r) => setTimeout(r, 1600));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByTestId('focus-pulse')).not.toBeInTheDocument();
  }, 10_000);
});
