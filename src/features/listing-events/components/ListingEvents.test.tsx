import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventRibbon from './EventRibbon';
import EventFilterChips from './EventFilterChips';
import ListingEventBanner from './ListingEventBanner';
import HomeEventsSection from './HomeEventsSection';
import type { EventFilterValues } from '../utils/eventSearchParams';

vi.mock('react-i18next', async () => (await import('./testI18n')).englishDefaults());

const h = vi.hoisted(() => ({ openHouses: [] as unknown[], feed: vi.fn() }));
vi.mock('@/src/features/open-houses/api/openHouseApi', () => ({
  fetchPropertyOpenHouses: () => Promise.resolve(h.openHouses),
}));
vi.mock('../api/eventFeedApi', () => ({ fetchOpenHousesThisWeek: (...a: unknown[]) => h.feed(...a) }));
vi.mock('@/src/features/property-details/components/PropertyCard', () => ({
  default: ({ property }: { property: { title: string } }) => <div>{property.title}</div>,
}));

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

const at = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

beforeEach(() => { h.openHouses = []; h.feed.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('EventRibbon', () => {
  it('shows nothing without an event', () => {
    const { container } = render(<EventRibbon property={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the auction with its starting price', () => {
    render(<EventRibbon property={{ country: 'Montenegro', auction: { startsAt: at(72), mode: 'online', startingPrice: 80000 } }} />);
    const ribbon = screen.getByTestId('event-ribbon');
    expect(ribbon).toHaveAttribute('data-kind', 'auction');
    expect(ribbon.textContent).toMatch(/^Auction · .+ · from .*80/);
  });

  it('prefers the sooner event', () => {
    render(<EventRibbon property={{ nextOpenHouse: { startsAt: at(5), endsAt: at(7) }, auction: { startsAt: at(72), mode: 'online' } }} />);
    expect(screen.getByTestId('event-ribbon')).toHaveAttribute('data-kind', 'openHouse');
  });
});

describe('EventFilterChips', () => {
  const Harness = () => {
    const [f, setF] = useState<EventFilterValues>({});
    return (
      <>
        <EventFilterChips filters={f} onFilterChange={(k, v) => setF((prev) => ({ ...prev, [k]: v }))} />
        <output data-testid="state">{JSON.stringify(f)}</output>
      </>
    );
  };
  const state = () => JSON.parse(screen.getByTestId('state').textContent || '{}');

  it('is off by default and each pair works like a radio you can clear', () => {
    render(<Harness />);
    const weekend = screen.getByRole('button', { name: /Open house this weekend/ });
    const anyOh = screen.getByRole('button', { name: /Any open house/ });
    expect(weekend).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(weekend);
    expect(state()).toMatchObject({ openHouseWeekend: true, hasOpenHouse: null });
    fireEvent.click(anyOh);
    expect(state()).toMatchObject({ openHouseWeekend: null, hasOpenHouse: true });
    expect(weekend).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(anyOh);
    expect(state()).toMatchObject({ openHouseWeekend: null, hasOpenHouse: null });

    const week = screen.getByRole('button', { name: 'Open house this week' });
    fireEvent.click(week);
    expect(state()).toMatchObject({ openHouseThisWeek: true, openHouseWeekend: null, hasOpenHouse: null });
    expect(week).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Auction this week/ }));
    expect(state()).toMatchObject({ auctionWithinDays: 7, hasAuction: null });
  });
});

describe('ListingEventBanner', () => {
  const property = { id: 'p1', title: 'Flat', city: 'Budva', country: 'Montenegro', lat: 42.28, lng: 18.84, status: 'active' };

  it('renders nothing for a listing without an open house or auction', async () => {
    const { container } = wrap(<ListingEventBanner property={property} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an in-person auction with countdown, details, calendar and directions', () => {
    wrap(<ListingEventBanner property={{ ...property, auction: { startsAt: at(50), mode: 'in_person', location: 'Notary, Budva', startingPrice: 70000, depositNote: '10% deposit' } }} />);
    expect(screen.getByRole('region', { name: 'Open house and auction dates' })).toBeInTheDocument();
    expect(screen.getByText('Notary, Budva')).toBeInTheDocument();
    expect(screen.getByText('10% deposit')).toBeInTheDocument();
    expect(screen.getByText(/^2d 2h$|^2d 1h$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Directions' })).toHaveAttribute('href', expect.stringContaining('42.28'));
    expect(screen.getByRole('button', { name: 'Add to calendar' })).toBeInTheDocument();
  });

  it('links to an online auction only through a safe link', () => {
    wrap(<ListingEventBanner property={{ ...property, auction: { startsAt: at(50), mode: 'online', url: 'javascript:alert(1)' } }} />);
    expect(screen.queryByRole('link', { name: 'Go to the auction page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Directions' })).not.toBeInTheDocument();
  });

  it('shows the open house from the listing\'s own open houses', async () => {
    h.openHouses = [{ id: 'o1', propertyId: 'p1', startsAt: at(30), endsAt: at(32), spotsLeft: null, rsvpCount: 0, isFull: false, isGoing: false }];
    wrap(<ListingEventBanner property={property} />);
    expect(await screen.findByRole('button', { name: "I'm coming" })).toBeInTheDocument();
  });
});

describe('HomeEventsSection', () => {
  it('stays hidden when nothing is planned', async () => {
    h.feed.mockResolvedValue([]);
    const { container } = wrap(<HomeEventsSection onSeeAll={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it("lists this week's open houses, soonest first, and opens the search", async () => {
    // Pinned to a Wednesday so "this week" is predictable (Wed → Sun night).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0));
    const oh = (d: number, h: number) => ({ startsAt: new Date(2026, 10, d, h).toISOString(), endsAt: new Date(2026, 10, d, h + 2).toISOString() });
    h.feed.mockResolvedValue([
      { id: 'sat', title: 'Saturday flat', nextOpenHouse: oh(21, 11) },
      { id: 'next', title: 'Next week flat', nextOpenHouse: oh(24, 11) },
      { id: 'thu', title: 'Thursday house', nextOpenHouse: oh(19, 17) },
    ]);
    const onSeeAll = vi.fn();
    wrap(<HomeEventsSection country="montenegro" onSeeAll={onSeeAll} />);
    expect(await screen.findByRole('heading', { name: 'Open houses this week' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Thursday house', 'Saturday flat']);
    expect(screen.getByText(/Wed 18\/11\/2026 – Sun 22\/11\/2026/)).toBeInTheDocument();
    expect(h.feed).toHaveBeenCalledWith(8, 'montenegro', expect.any(Date));
    fireEvent.click(screen.getByRole('button', { name: 'See all' }));
    expect(onSeeAll).toHaveBeenCalled();
  });
});
