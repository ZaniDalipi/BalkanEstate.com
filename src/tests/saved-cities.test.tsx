/**
 * Saved places tab and the follow control.
 *
 * Following a city is what subscribes a reader to the market email, so the
 * control must report the truth: optimistic-looking state that did not persist
 * would tell someone they will be emailed when they will not.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CityMarketData } from '@/services/apiService';

const apiRequest = vi.fn();

vi.mock('@/src/shared/api', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import ExploreCitiesTabs from '../features/cities/components/ExploreCitiesTabs';
import SavedCitiesPanel from '../features/cities/components/SavedCitiesPanel';
import SaveCityButton from '../features/cities/components/SaveCityButton';
import { useSavedCities } from '../features/cities/hooks/useSavedCities';
import { savedCityKey } from '../features/cities/api/savedCitiesApi';

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const city = (overrides: Partial<CityMarketData> = {}): CityMarketData => ({
  _id: 'c1',
  city: 'Tirana',
  country: 'Albania',
  countryCode: 'AL',
  avgPricePerSqm: 2400,
  medianPrice: 168000,
  priceGrowthYoY: 9,
  priceGrowthMoM: 0.7,
  averageDaysOnMarket: 38,
  listingsCount: 120,
  soldLastMonth: 8,
  demandScore: 82,
  rentalYield: 5.4,
  investmentScore: 78,
  topNeighborhoods: ['Blloku'],
  marketTrend: 'rising',
  highlights: ['Strong demand'],
  lastUpdated: '2026-09-01T00:00:00.000Z',
  dataSource: 'gemini',
  featured: true,
  displayOrder: 0,
  ...overrides,
});

describe('ExploreCitiesTabs', () => {
  it('exposes both views as a tablist with the saved count', () => {
    render(<ExploreCitiesTabs active="all" savedCount={3} onChange={vi.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveTextContent('3');
  });

  it('switches on click and on arrow keys', () => {
    const onChange = vi.fn();
    render(<ExploreCitiesTabs active="all" savedCount={0} onChange={onChange} />);

    fireEvent.click(screen.getAllByRole('tab')[1]);
    expect(onChange).toHaveBeenCalledWith('saved');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('saved');
  });

  it('hides the badge when nothing is saved', () => {
    render(<ExploreCitiesTabs active="saved" savedCount={0} onChange={vi.fn()} />);
    expect(screen.getAllByRole('tab')[1]).not.toHaveTextContent('0');
  });
});

describe('SaveCityButton', () => {
  it('reports its state and explains itself when signed out', () => {
    const { rerender } = render(
      <SaveCityButton cityName="Tirana" isSaved={false} canSave isPending={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<SaveCityButton cityName="Tirana" isSaved canSave isPending={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');

    rerender(<SaveCityButton cityName="Tirana" isSaved={false} canSave={false} isPending={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'saved.signInToSave');
  });

  it('does not let the click reach the card underneath', () => {
    const onToggle = vi.fn();
    const onCardClick = vi.fn();
    render(
      <div onClick={onCardClick}>
        <SaveCityButton cityName="Tirana" isSaved={false} canSave isPending={false} onToggle={onToggle} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('is inert while a toggle is in flight', () => {
    const onToggle = vi.fn();
    render(<SaveCityButton cityName="Tirana" isSaved={false} canSave isPending onToggle={onToggle} />);

    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('SavedCitiesPanel', () => {
  const baseProps = {
    allCities: [city()],
    isSignedIn: true,
    isLoading: false,
    hasError: false,
    pendingKey: null,
    onToggleSave: vi.fn(),
    onOpen: vi.fn(),
    onViewListings: vi.fn(),
    onOpenEmailSettings: vi.fn(),
  };

  it('asks signed-out readers to sign in', () => {
    render(<SavedCitiesPanel {...baseProps} savedCities={[]} isSignedIn={false} />);
    expect(screen.getByText('saved.signedOutTitle')).toBeInTheDocument();
  });

  it('explains how to follow when the list is empty', () => {
    render(<SavedCitiesPanel {...baseProps} savedCities={[]} />);
    expect(screen.getByText('saved.emptyTitle')).toBeInTheDocument();
  });

  it('surfaces a load failure instead of an empty list', () => {
    render(<SavedCitiesPanel {...baseProps} savedCities={[]} hasError />);
    expect(screen.getByText('saved.loadError')).toBeInTheDocument();
    expect(screen.queryByText('saved.emptyTitle')).not.toBeInTheDocument();
  });

  it('renders a full card for a followed city and states that emails are sent', () => {
    render(
      <SavedCitiesPanel
        {...baseProps}
        savedCities={[{ city: 'Tirana', country: 'Albania', countryCode: 'AL', savedAt: '2026-09-01T00:00:00.000Z' }]}
      />,
    );

    expect(screen.getByText('Tirana')).toBeInTheDocument();
    expect(screen.getByText('saved.emailNotice')).toBeInTheDocument();
  });

  it('keeps a followed city visible even with no market row for it', () => {
    render(
      <SavedCitiesPanel
        {...baseProps}
        allCities={[]}
        savedCities={[{ city: 'Kotor', country: 'Montenegro', countryCode: 'ME', savedAt: '2026-09-01T00:00:00.000Z' }]}
      />,
    );

    expect(screen.getByText('Kotor')).toBeInTheDocument();
    expect(screen.getByText('saved.marketDataPending')).toBeInTheDocument();
    expect(screen.getByText('saved.unfollow')).toBeInTheDocument();
  });
});

describe('useSavedCities', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  const Probe: React.FC<{ enabled: boolean }> = ({ enabled }) => {
    const saved = useSavedCities(enabled);
    return (
      <div>
        <span data-testid="keys">{[...saved.savedKeys].join(',')}</span>
        <span data-testid="pending">{saved.pendingKey ?? ''}</span>
        <span data-testid="saved-tirana">{String(saved.isSaved('TIRANA', 'albania'))}</span>
        <button onClick={() => saved.toggle('Kotor', 'Montenegro')}>toggle</button>
      </div>
    );
  };

  it('does not call the authenticated endpoint when signed out', () => {
    renderWithQuery(<Probe enabled={false} />);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('matches a saved city case-insensitively', async () => {
    apiRequest.mockResolvedValue({
      cities: [{ city: 'Tirana', country: 'Albania', countryCode: 'AL', savedAt: '2026-09-01' }],
      count: 1,
      limit: 50,
    });

    renderWithQuery(<Probe enabled />);

    await waitFor(() => expect(screen.getByTestId('saved-tirana')).toHaveTextContent('true'));
    expect(screen.getByTestId('keys')).toHaveTextContent(savedCityKey('Tirana', 'Albania'));
  });

  it('refetches the list after a toggle so the server stays the source of truth', async () => {
    apiRequest.mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === 'POST') return Promise.resolve({ saved: true, city: null });
      return Promise.resolve({ cities: [], count: 0, limit: 50 });
    });

    renderWithQuery(<Probe enabled />);
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());

    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => {
      const toggleCall = apiRequest.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(toggleCall?.[0]).toBe('/saved-cities/toggle');
      expect(toggleCall?.[1].body).toEqual({ city: 'Kotor', country: 'Montenegro' });
    });

    // One initial load plus the invalidation-driven refetch.
    await waitFor(() => {
      const listCalls = apiRequest.mock.calls.filter(([, options]) => !options?.method || options.method === 'GET');
      expect(listCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
