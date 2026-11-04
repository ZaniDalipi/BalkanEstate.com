import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import BusinessDetailPage from './BusinessDetailPage';

const h = vi.hoisted(() => ({
  detail: { listing: null as unknown, isLoading: false, error: null as unknown },
  list: { listings: [] as unknown[], total: 0, isLoading: false, error: null },
  user: null as null | { id: string },
  getTravelRoute: vi.fn(),
  geocodePlace: vi.fn(),
  map: vi.fn(),
}));

vi.mock('@/src/features/business-directory/api/businessExtrasApi', () => ({
  getTravelRoute: (...args: unknown[]) => h.getTravelRoute(...args),
  geocodePlace: (...args: unknown[]) => h.geocodePlace(...args),
}));

vi.mock('@/src/features/business-directory/hooks/useBusinessListings', () => {
  const mutation = { isLoading: false, error: null };
  return {
    useBusinessListing: () => h.detail,
    useBusinessListings: () => h.list,
    useMyBusinessListings: () => ({ listings: [], isLoading: false }),
    useCreateBusinessListing: () => ({ createListing: vi.fn(), ...mutation }),
    useUpdateBusinessListing: () => ({ updateListing: vi.fn(), ...mutation }),
    useDeleteBusinessListing: () => ({ deleteListing: vi.fn(), ...mutation }),
    useUploadBusinessLogo: () => ({ uploadLogo: vi.fn(), ...mutation }),
    useUploadBusinessBanner: () => ({ uploadBanner: vi.fn(), ...mutation }),
  };
});
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ state: { isAuthenticated: !!h.user, currentUser: h.user }, dispatch: vi.fn() }),
}));
vi.mock('@/src/components/seo', () => ({ SEO: () => null }));
vi.mock('@/components/shared/Footer', () => ({ default: () => null }));
vi.mock('@/shared/components/NotificationCenter', () => ({ default: () => null }));
vi.mock('./detail/BusinessLocationMap', () => ({
  default: (props: { precision: string; business: { lat: number; lng: number } }) => {
    h.map(props);
    return <div data-testid="location-map" data-precision={props.precision} />;
  },
}));

const listing: BusinessListing = {
  id: 'b1', slug: 'regina', owner: { id: 'owner1', name: 'sales' }, listingType: 'business',
  name: 'Regina Group Construction', category: 'construction', services: ['Real Estate'],
  description: 'A'.repeat(500), contactPhone: '+3550686060190', contactEmail: 'sales@regina.al',
  website: 'https://www.reginaconstruction.al/', whatsapp: '+355686060190',
  address: 'Rruga Pavllo Flloko, Vlorë', city: 'Vlore', country: 'Albania', latitude: 40.45, longitude: 19.48,
  languages: ['Albanian', 'English', 'Italian'], serviceAreas: ['vlore', 'palase'], paymentMethods: ['bank_transfer'],
  yearEstablished: 2022, socialMedia: { facebook: 'facebook.com/regina', instagram: 'https://instagram.com/regina' },
  isActive: true, isVerified: false, views: 7, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
};

/** The page with a fresh query cache (the route and the chat use React Query). */
const renderPage = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

/** Pretend the browser can locate the visitor (or refuses to). */
const mockGeolocation = (result: 'ok' | 'denied') => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback, fail: PositionErrorCallback) =>
        result === 'ok'
          ? ok({ coords: { latitude: 41.3275, longitude: 19.8187, accuracy: 30 } } as GeolocationPosition)
          : fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    },
  });
};

beforeEach(() => {
  h.getTravelRoute.mockReset();
  h.geocodePlace.mockReset();
  h.map.mockReset();
  h.detail = { listing, isLoading: false, error: null };
  h.list = { listings: [], total: 0, isLoading: false, error: null };
  h.user = null;
});

describe('BusinessDetailPage', () => {
  it('puts the ways to reach the business at the top, with dialable links', () => {
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: /Regina Group Construction/ })).toBeInTheDocument();
    const actions = within(screen.getByRole('group', { name: 'detail.actions.label' }));
    expect(actions.getByRole('link', { name: /detail.actions.call/ })).toHaveAttribute('href', 'tel:+355686060190');
    expect(actions.getByRole('link', { name: /detail.actions.whatsapp/ })).toHaveAttribute('href', 'https://wa.me/355686060190');
    expect(actions.getByRole('link', { name: /detail.actions.directions/ })).toHaveAttribute('href', expect.stringContaining('destination=40.45,19.48'));
    expect(actions.getByRole('button', { name: /detail.share/ })).toBeInTheDocument();
  });

  it('shows the phone readably, socials as brand links, and facts in one list', () => {
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getAllByText('+355 68 606 0190').length).toBeGreaterThan(0);
    const socials = screen.getAllByRole('link', { name: 'detail.openSocial' }).map((a) => a.getAttribute('href'));
    expect(socials).toEqual(['https://facebook.com/regina', 'https://instagram.com/regina']);
    const facts = within(screen.getByRole('region', { name: 'detail.atAGlance' }));
    expect(facts.getByText('Vlore')).toBeInTheDocument(); // service areas capitalised
    expect(facts.getByText('paymentMethods.bank_transfer')).toBeInTheDocument();
  });

  it('shows a view-only map — no location editor on a public profile', () => {
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    return screen.findByTestId('location-map').then(() => {
      // The page has a text box now (the chat); the location card must not.
      expect(within(screen.getByRole('region', { name: 'detail.location' })).queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('folds a long description behind "Read more"', () => {
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    const more = screen.getByRole('button', { name: 'detail.readMore' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'detail.readLess' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('suggests other businesses in the same trade, but not this one', () => {
    h.list = { ...h.list, listings: [listing, { ...listing, id: 'b2', slug: 'other', name: 'Other Builders' }] };
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    const similar = within(screen.getByRole('region', { name: 'detail.similar' }));
    expect(similar.getByRole('link', { name: /Other Builders/ })).toBeInTheDocument();
    expect(similar.queryByRole('link', { name: /Regina/ })).not.toBeInTheDocument();
  });

  it('gives the owner Edit and Customize; visitors get neither', () => {
    const { unmount } = renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'edit.button' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /banner.customize/ })).not.toBeInTheDocument();
    unmount();
    h.user = { id: 'owner1' };
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'edit.button' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /banner.customize/ })).toBeInTheDocument();
  });

  it('when the listing is gone, says so and offers the way back', () => {
    h.detail = { listing: null, isLoading: false, error: new Error('404') };
    const onBack = vi.fn();
    renderPage(<BusinessDetailPage listingId="gone" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /detail.backToDirectory/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows time and distance from the visitor, and a distance chip up top', async () => {
    mockGeolocation('ok');
    h.getTravelRoute.mockResolvedValue({ distanceMeters: 112_400, durationSeconds: 5_100, path: [[41.3, 19.8], [40.45, 19.48]] });
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /detail.route.fromMe/ }));
    expect(await screen.findByText('1 hr 25 min')).toBeInTheDocument();
    expect(screen.getByText('112 km')).toBeInTheDocument();
    expect(h.getTravelRoute).toHaveBeenCalledWith({ lat: 41.3275, lng: 19.8187 }, { lat: 40.45, lng: 19.48 }, 'car');
    expect(screen.getByRole('button', { name: 'detail.route.fromYou' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'detail.route.openIn' }).map((a) => a.getAttribute('href')))
      .toContain('https://www.google.com/maps/dir/?api=1&origin=41.3275,19.8187&destination=40.45,19.48&travelmode=driving');
    fireEvent.click(screen.getByRole('radio', { name: /detail.route.foot/ }));
    await waitFor(() => expect(h.getTravelRoute).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'foot'));
  });

  it('if location is refused, explains and still offers the maps apps', async () => {
    mockGeolocation('denied');
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /detail.route.fromMe/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('detail.route.denied');
    expect(screen.getAllByRole('link', { name: 'detail.route.openIn' }).length).toBe(2);
  });

  it('without a pin, finds the address on the map and says it is approximate', async () => {
    h.detail = { listing: { ...listing, latitude: undefined, longitude: undefined }, isLoading: false, error: null };
    h.geocodePlace.mockResolvedValue({ lat: 40.4512, lng: 19.4811 });
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(await screen.findByTestId('location-map')).toHaveAttribute('data-precision', 'address');
    expect(h.geocodePlace).toHaveBeenCalledWith('Rruga Pavllo Flloko, Vlorë', 'al');
    expect(h.map).toHaveBeenLastCalledWith(expect.objectContaining({ business: { lat: 40.4512, lng: 19.4811 } }));
    expect(screen.getByText('detail.map.approximate')).toBeInTheDocument();
  });

  it('falls back to the city, and to directions when nothing is found', async () => {
    h.detail = { listing: { ...listing, latitude: undefined, longitude: undefined }, isLoading: false, error: null };
    h.geocodePlace.mockResolvedValue(null);
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    await waitFor(() => expect(h.geocodePlace).toHaveBeenCalledTimes(2));
    expect(h.geocodePlace).toHaveBeenLastCalledWith('Vlore, Albania', 'al');
    const location = within(screen.getByRole('region', { name: 'detail.location' }));
    expect(await location.findByRole('link', { name: 'detail.getDirections' })).toBeInTheDocument();
    expect(location.queryByTestId('location-map')).not.toBeInTheDocument();
  });

  it('shows the numbers up top, the full address and the owner', () => {
    renderPage(<BusinessDetailPage listingId="regina" onBack={vi.fn()} />);
    expect(screen.getByText('detail.stats.services')).toBeInTheDocument();
    expect(screen.getByText('detail.stats.offered')).toBeInTheDocument();
    expect(screen.getAllByText(/^Rruga Pavllo Flloko, Vlorë, Albania$/).length).toBeGreaterThan(0);
    const owner = within(screen.getByRole('region', { name: 'detail.owner' }));
    expect(owner.getByText('sales')).toBeInTheDocument();
  });
});
