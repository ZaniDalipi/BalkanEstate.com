import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AirQualityCard from '../AirQualityCard';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const api = vi.hoisted(() => ({ getAirQuality: vi.fn() }));
vi.mock('../../../api/airQualityApi', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAirQuality: api.getAirQuality,
}));

const ID = '64b7f0c2a1b2c3d4e5f60718';
const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AirQualityCard propertyId={ID} />
    </QueryClientProvider>
  );

beforeEach(() => api.getAirQuality.mockReset());

describe('AirQualityCard', () => {
  it('shows each season with its AQI, band and PM2.5, summer first', async () => {
    api.getAirQuality.mockResolvedValue({
      status: 'ok',
      seasons: [
        { season: 'winter', start: '2025-12-01', end: '2026-02-28', aqi: 54.2, pm25: 31.2 },
        { season: 'summer', start: '2026-06-01', end: '2026-08-31', aqi: 33, pm25: 7.7 },
      ],
    });
    renderCard();

    expect(await screen.findByText('Summer 2026')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual(['Summer 2026', 'Winter 2025–26']);
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getByText('Fair')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('PM2.5 7.7 µg/m³')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Air quality' })).toBeInTheDocument();
  });

  it('says when a season has no data', async () => {
    api.getAirQuality.mockResolvedValue({
      status: 'ok',
      seasons: [{ season: 'summer', start: '2026-06-01', end: '2026-08-31', aqi: null, pm25: null }],
    });
    renderCard();
    expect(await screen.findByText('No data for this season')).toBeInTheDocument();
  });

  it('explains a missing location instead of rendering nothing', async () => {
    api.getAirQuality.mockResolvedValue({ status: 'no-location' });
    renderCard();
    expect(await screen.findByText(/no map location/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows the failure as an alert and tries again on request', async () => {
    // A 503 is retried once by the hook before the card gives up.
    api.getAirQuality.mockRejectedValue(Object.assign(new Error('down'), { statusCode: 503 }));
    renderCard();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent("We couldn't load air quality right now.");

    api.getAirQuality.mockResolvedValue({
      status: 'ok',
      seasons: [{ season: 'summer', start: '2026-06-01', end: '2026-08-31', aqi: 12, pm25: 4 }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Good')).toBeInTheDocument());
  });
});
