import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Render the English default with its {{placeholders}} filled, so the tests
// read what a visitor reads (the shared setup returns bare keys).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, vars?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      const values = (typeof fallback === 'object' ? fallback : vars) ?? {};
      return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(values[k] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));
// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

vi.mock('@/src/shared/api/httpClient', () => ({ apiRequest: vi.fn() }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: vi.fn() }));
vi.mock('@/src/shared/illustrations', () => ({ SoftIcon: () => null }));

import { apiRequest } from '@/src/shared/api/httpClient';
import { navigate } from '@/src/app/router/navigation';
import SpotlightAsk from './SpotlightAsk';
import SpotlightRoute from './SpotlightRoute';
import SpotlightDetails from './SpotlightDetails';
import { useAskProperty } from './useAskProperty';
import type { SpotlightRoute as RouteState } from './useSpotlightRoute';
import type { Property } from '@/types';

const withQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{ui}</QueryClientProvider>);

function Ask({ authed = true, onSignIn = vi.fn() }: { authed?: boolean; onSignIn?: () => void }) {
  const chat = useAskProperty('64b7f0c2a1b2c3d4e5f60718');
  return <SpotlightAsk chat={chat} isAuthenticated={authed} onSignIn={onSignIn} />;
}

const route = (over: Partial<RouteState> = {}): RouteState => ({
  home: null, setHome: vi.fn(), locateMe: vi.fn(), isLocating: false,
  origin: { lat: 41.99, lng: 21.43 }, mode: 'driving', setMode: vi.fn(),
  result: null, isRouting: false, straightMeters: 3200, ...over,
});

describe('Spotlight · Ask AI', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a signed-out visitor to sign in instead of asking', () => {
    const onSignIn = vi.fn();
    withQuery(<Ask authed={false} onSignIn={onSignIn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Is there parking?' }));
    expect(onSignIn).toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('asks, shows the answer and the suggested follow-ups', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ answer: 'Yes, a garage space.', followUps: ['Is it included in the price?'] });
    withQuery(<Ask />);
    fireEvent.change(screen.getByLabelText('Ask about this home…'), { target: { value: 'Parking?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Yes, a garage space.')).toBeTruthy();
    expect(screen.getByText('Parking?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Is it included in the price?' })).toBeTruthy();
    expect(vi.mocked(apiRequest).mock.calls[0][0]).toBe('/ai/ask-property');
  });

  it('when the month is used up, says so and offers the plans', async () => {
    vi.mocked(apiRequest).mockRejectedValue(Object.assign(new Error('limit'), { statusCode: 429 }));
    withQuery(<Ask />);
    fireEvent.click(screen.getByRole('button', { name: 'Is there parking?' }));
    expect(await screen.findByText(/used this month's AI questions/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'See plans' }));
    expect(navigate).toHaveBeenCalled();
  });

  it('refuses an over-long question next to the field', () => {
    withQuery(<Ask />);
    fireEvent.change(screen.getByLabelText('Ask about this home…'), { target: { value: 'x'.repeat(501) } });
    expect(screen.getByRole('alert').textContent).toMatch(/500/);
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Spotlight · Route', () => {
  const dest = { lat: 41.11, lng: 20.8 };

  it('asks where the trip starts when there is no place yet', () => {
    render(<SpotlightRoute route={route({ origin: null })} destination={dest} />);
    expect(screen.getByText(/Choose where you start/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeTruthy();
  });

  it('shows the travel time and distance of the route', () => {
    render(<SpotlightRoute route={route({ result: { ok: true, meters: 12400, seconds: 1080, path: [] } })} destination={dest} />);
    expect(screen.getByText('18 min')).toBeTruthy();
    expect(screen.getByText('12 km')).toBeTruthy();
  });

  it('without live directions: the straight-line distance and a Google Maps link, never a dead end', () => {
    render(<SpotlightRoute route={route({ result: { ok: false, reason: 'unavailable' } })} destination={dest} />);
    expect(screen.getByRole('alert').textContent).toMatch(/3.2 km as the crow flies/);
    const link = screen.getByRole('link', { name: /Open in Google Maps/ }) as HTMLAnchorElement;
    expect(link.href).toContain('destination=41.11%2C20.8');
  });

  it('switches the way of travel', () => {
    const setMode = vi.fn();
    render(<SpotlightRoute route={route({ setMode })} destination={dest} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Walk' }));
    expect(setMode).toHaveBeenCalledWith('walking');
  });
});

describe('Spotlight · Details', () => {
  it('shows price per m², the facts, and opens the route from the distance row', async () => {
    const onShowRoute = vi.fn();
    const property = { id: 'p1', price: 120000, country: 'Montenegro', city: 'Kotor', address: 'Old Town 1', sqft: 60, beds: 2, baths: 1,
      yearBuilt: 2010, images: [], imageUrl: '', lat: 42.42, lng: 18.77 } as unknown as Property;
    render(<SpotlightDetails property={property} route={route()} onViewDetails={vi.fn()} onShowRoute={onShowRoute} />);
    expect(screen.getByText(/per m²/)).toBeTruthy();
    expect(screen.getByText('Bedrooms')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /as the crow flies/ }));
    await waitFor(() => expect(onShowRoute).toHaveBeenCalled());
  });
});
