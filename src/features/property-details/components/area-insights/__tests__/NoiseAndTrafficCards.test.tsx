import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import NoiseCard from '../NoiseCard';
import TrafficCard from '../TrafficCard';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
// The real map needs Google; the card only has to load it on request.
vi.mock('../LiveTrafficMap', () => ({ default: () => <div>live traffic map</div> }));

const api = vi.hoisted(() => ({ getSurroundings: vi.fn() }));
vi.mock('../../../api/surroundingsApi', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSurroundings: api.getSurroundings,
}));

const ID = '64b7f0c2a1b2c3d4e5f60718';
const withClient = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

const busy = {
  status: 'ok',
  noise: {
    day: { db: 63, band: 'noisy' },
    night: { db: 54, band: 'noisy' },
    sources: [{ kind: 'primary', name: 'Bulevardi', distanceM: 40 }, { kind: 'bar', distanceM: 90 }],
  },
  traffic: { level: 'busy', nearestMainRoad: { kind: 'primary', name: 'Bulevardi', distanceM: 40 } },
};

beforeEach(() => {
  api.getSurroundings.mockReset();
});

describe('NoiseCard', () => {
  it('shows day and night levels with their bands, and the main sources', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<NoiseCard propertyId={ID} />);

    expect(await screen.findByText('63')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getAllByText('Noisy')).toHaveLength(2);
    expect(screen.getByText('Bulevardi')).toBeInTheDocument();
    expect(screen.getByText('· Main road')).toBeInTheDocument();
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('· 90 m')).toBeInTheDocument();
  });

  it('says when nothing loud is nearby', async () => {
    api.getSurroundings.mockResolvedValue({
      ...busy,
      noise: { day: { db: 42, band: 'quiet' }, night: { db: 33, band: 'quiet' }, sources: [] },
    });
    withClient(<NoiseCard propertyId={ID} />);
    expect(await screen.findByText('No busy roads, railways or nightlife close by.')).toBeInTheDocument();
  });

  it('shows a failure as an alert with a retry', async () => {
    api.getSurroundings.mockRejectedValue(Object.assign(new Error('down'), { statusCode: 404 }));
    withClient(<NoiseCard propertyId={ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load noise and traffic");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('TrafficCard', () => {
  it('rates the streets, names the nearest main road and loads the live map on request', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);

    expect(await screen.findByText('Busy street nearby')).toBeInTheDocument();
    expect(screen.getByText('Nearest main road: Bulevardi (Main road), 40 m away')).toBeInTheDocument();
    expect(screen.queryByText('live traffic map')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show live traffic' }));
    expect(await screen.findByText('live traffic map')).toBeInTheDocument();
  });

  it('words an unnamed road without repeating its kind', async () => {
    api.getSurroundings.mockResolvedValue({ ...busy, traffic: { level: 'moderate', nearestMainRoad: { kind: 'secondary', distanceM: 300 } } });
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);
    expect(await screen.findByText('Nearest main road: a secondary road, 300 m away')).toBeInTheDocument();
  });

  it('explains a missing location instead of offering the map', async () => {
    api.getSurroundings.mockResolvedValue({ status: 'no-location' });
    withClient(<TrafficCard propertyId={ID} lat={0} lng={0} />);
    expect(await screen.findByText(/no map location/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show live traffic' })).not.toBeInTheDocument();
  });
});
