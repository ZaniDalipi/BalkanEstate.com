/**
 * NeighborhoodInsights user flow: a saved insight shows at once (no request),
 * a signed-out user is sent to sign in, bad locations never reach the server,
 * and failures show a reason with the right next step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NeighborhoodInsights } from './NeighborhoodInsights';

const apiRequest = vi.fn();
const dispatch = vi.fn();
let appState: Record<string, unknown>;

vi.mock('@/src/shared/api', () => ({ apiRequest: (...a: unknown[]) => apiRequest(...a) }));
vi.mock('../../../../context/AppContext', () => ({ useAppContext: () => ({ state: appState, dispatch }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'sq' },
  }),
}));
vi.mock('@/src/shared/illustrations', () => ({ SoftIcon: () => null }));
vi.mock('../../../../constants', () => ({ SparklesIcon: () => null }));

const place = { lat: 41.33, lng: 19.82, address: 'Rruga 1', city: 'Tirana', country: 'Albania' };

const renderIt = (props: Partial<React.ComponentProps<typeof NeighborhoodInsights>> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <NeighborhoodInsights listingId="l1" {...place} {...props} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  apiRequest.mockReset();
  dispatch.mockReset();
  appState = { isAuthenticated: true, currentUser: { id: 'u1' } };
});

describe('NeighborhoodInsights', () => {
  it("shows the user's saved insight without generating", async () => {
    apiRequest.mockResolvedValue({ insights: 'Saved **report**' });
    renderIt();
    expect(await screen.findByText('report')).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest.mock.calls[0][0]).toBe('/neighborhood-insights/saved/l1');
    expect(screen.queryByRole('button', { name: /neighborhood\.generateInsights/ })).toBeNull();
  });

  it('opens the sign-in modal for a signed-out user and makes no request', () => {
    appState = { isAuthenticated: false, currentUser: null };
    renderIt();
    fireEvent.click(screen.getByRole('button'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('refuses a property without a location and explains why', async () => {
    apiRequest.mockResolvedValue({ insights: null });
    renderIt({ lat: NaN, lng: NaN });
    fireEvent.click(await screen.findByRole('button'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Location data isn't available/);
    expect(apiRequest).toHaveBeenCalledTimes(1); // only the saved lookup
  });

  it('generates, sends the listing id and language, and shows the remaining quota', async () => {
    apiRequest
      .mockResolvedValueOnce({ insights: null })
      .mockResolvedValueOnce({ insights: 'Fresh report', usage: { used: 1, limit: 3, remaining: 2 } });
    renderIt();
    fireEvent.click(await screen.findByRole('button'));
    expect(await screen.findByText('Fresh report')).toBeTruthy();
    const [path, options] = apiRequest.mock.calls[1];
    expect(path).toBe('/neighborhood-insights');
    expect(options.body).toMatchObject({ listingId: 'l1', language: 'Albanian', city: 'Tirana' });
  });

  it('on the monthly limit shows the reason and an upgrade hint, with no retry', async () => {
    apiRequest
      .mockResolvedValueOnce({ insights: null })
      .mockRejectedValueOnce({ statusCode: 429, message: 'Monthly limit reached', details: { used: 3, limit: 3 } });
    renderIt();
    fireEvent.click(await screen.findByRole('button'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Monthly limit reached/);
    expect(alert.textContent).toMatch(/neighborhood\.upgradePrompt/);
    expect(screen.queryByText('neighborhood.tryAgain')).toBeNull();
  });

  it('offers a retry after a server failure', async () => {
    apiRequest
      .mockResolvedValueOnce({ insights: null })
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce({ insights: 'Second try works' });
    renderIt();
    fireEvent.click(await screen.findByRole('button'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/temporarily unavailable/);
    fireEvent.click(screen.getByText('neighborhood.tryAgain'));
    await waitFor(() => expect(screen.getByText('Second try works')).toBeTruthy());
  });
});
