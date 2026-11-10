import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MAX_PENDING_POLLS, PENDING_POLL_MS } from '../../../hooks/useSurroundings';
import NoiseCard from '../NoiseCard';
import TrafficCard from '../TrafficCard';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
// Leaflet cannot draw in jsdom; the stub shows which day and hour it was given.
vi.mock('../traffic/TypicalTrafficMap', () => ({
  default: ({ day, hour, interactive }: { day: string; hour: number; interactive: boolean }) => (
    <div>{`map ${interactive ? 'full' : 'card'} ${day} ${hour}`}</div>
  ),
}));

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
  traffic: {
    level: 'busy',
    nearestStreet: { kind: 'street', name: 'Rruga Kala', distanceM: 12 },
    nearestMainRoad: { kind: 'primary', name: 'Bulevardi', distanceM: 40 },
  },
  roads: [{ kind: 'primary', name: 'Bulevardi', points: [[40.6, 20.8], [40.601, 20.801]] }],
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

describe('while the server is still looking the home up', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps checking, then shows the result', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.getSurroundings.mockResolvedValueOnce({ status: 'pending' }).mockResolvedValue(busy);
    withClient(<NoiseCard propertyId={ID} />);

    expect(await screen.findByRole('status')).toHaveTextContent('Checking the streets around this home…');
    await act(async () => { await vi.advanceTimersByTimeAsync(PENDING_POLL_MS); });
    expect(await screen.findByText('63')).toBeInTheDocument();
    expect(api.getSurroundings).toHaveBeenCalledTimes(2);
  });

  it('stops after a few minutes and offers to try again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.getSurroundings.mockResolvedValue({ status: 'pending' });
    withClient(<NoiseCard propertyId={ID} />);
    await screen.findByRole('status');

    for (let i = 0; i < MAX_PENDING_POLLS; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(PENDING_POLL_MS); });
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('The map servers are busy');
    expect(api.getSurroundings).toHaveBeenCalledTimes(MAX_PENDING_POLLS);

    api.getSurroundings.mockResolvedValue(busy);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('63')).toBeInTheDocument();
  });
});

describe('with the encoded id the API hands out', () => {
  it('asks for the data instead of claiming there is no location', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<NoiseCard propertyId="6_M28TTqCJUl1TrM" />);
    expect(await screen.findByText('63')).toBeInTheDocument();
    expect(api.getSurroundings).toHaveBeenCalledWith('6_M28TTqCJUl1TrM');
  });
});

describe('TrafficCard', () => {
  it('rates the streets and names the home\'s street and the nearest main road', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);

    expect(await screen.findByText('Busy street nearby')).toBeInTheDocument();
    expect(screen.getByText('Nearest street: Rruga Kala (Residential street), 10 m away')).toBeInTheDocument();
    expect(screen.getByText('Nearest main road: Bulevardi (Main road), 40 m away')).toBeInTheDocument();
  });

  it('shows when it gets busy through the day, for weekdays and weekends', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Weekdays' }));
    expect(screen.getByRole('button', { name: 'Weekdays' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Busiest around 08:00–09:00, 15:00–18:00')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('slider'), { target: { value: '17' } });
    expect(screen.getByText('map card weekday 17')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Weekends' }));
    expect(screen.getByText('Busiest around 11:00–17:00')).toBeInTheDocument();
    expect(screen.getByText('map card weekend 17')).toBeInTheDocument();
  });

  it('opens the map full screen and closes it on Esc, focus back on the button', async () => {
    api.getSurroundings.mockResolvedValue(busy);
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);

    const open = await screen.findByRole('button', { name: 'Open full-screen map' });
    open.focus();
    fireEvent.click(open);
    const dialog = await screen.findByRole('dialog', { name: 'Typical traffic around this home' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await screen.findByText(/^map full /)).toBeInTheDocument();
    expect(screen.queryByText(/^map card /)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close map' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });

  it('shows the daily pattern without a map when the server sent no roads', async () => {
    api.getSurroundings.mockResolvedValue({ ...busy, roads: [] });
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);
    expect(await screen.findByText(/^Busiest around/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open full-screen map' })).not.toBeInTheDocument();
  });

  it('words an unnamed road without repeating its kind', async () => {
    api.getSurroundings.mockResolvedValue({
      ...busy,
      traffic: { level: 'moderate', nearestStreet: { kind: 'secondary', distanceM: 300 }, nearestMainRoad: { kind: 'secondary', distanceM: 300 } },
    });
    withClient(<TrafficCard propertyId={ID} lat={40.6} lng={20.8} />);
    expect(await screen.findByText('Nearest main road: a secondary road, 300 m away')).toBeInTheDocument();
    // The home is on that main road, so it is not named twice.
    expect(screen.queryByText(/^Nearest street/)).not.toBeInTheDocument();
  });

  it('explains a missing location instead of offering the map', async () => {
    api.getSurroundings.mockResolvedValue({ status: 'no-location' });
    withClient(<TrafficCard propertyId={ID} lat={0} lng={0} />);
    expect(await screen.findByText(/no map location/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show live traffic' })).not.toBeInTheDocument();
  });
});
