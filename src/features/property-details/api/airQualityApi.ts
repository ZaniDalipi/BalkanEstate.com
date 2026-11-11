import { apiRequest } from '@/src/shared/api';

export type Season = 'summer' | 'winter';

export interface SeasonAirQuality {
  season: Season;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  /** Mean hourly European AQI, or null when there was too little data. */
  aqi: number | null;
  /** Mean PM2.5, µg/m³. */
  pm25: number | null;
}

export type AirQualityResponse =
  | { status: 'ok'; seasons: SeasonAirQuality[] }
  | { status: 'no-location' }
  | { status: 'no-data' };

export async function getAirQuality(propertyId: string): Promise<AirQualityResponse> {
  if (!propertyId || propertyId.trim() === '') {
    throw new Error('Property ID is required');
  }
  const data = await apiRequest<unknown>(`/properties/${propertyId}/air-quality`);
  return validateAirQualityResponse(data);
}

const isNumberOrNull = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));

/** Validate the shape at the ingestion boundary; drop malformed seasons. */
export function validateAirQualityResponse(data: unknown): AirQualityResponse {
  if (!data || typeof data !== 'object') throw new Error('Invalid air quality response');
  const d = data as Record<string, unknown>;
  if (d.status === 'no-location' || d.status === 'no-data') return { status: d.status };
  if (d.status !== 'ok' || !Array.isArray(d.seasons)) throw new Error('Invalid air quality response');
  const seasons = d.seasons.filter((s): s is SeasonAirQuality => {
    if (!s || typeof s !== 'object') return false;
    const r = s as Record<string, unknown>;
    return (r.season === 'summer' || r.season === 'winter') &&
      typeof r.start === 'string' && typeof r.end === 'string' &&
      isNumberOrNull(r.aqi) && isNumberOrNull(r.pm25);
  });
  return seasons.length > 0 ? { status: 'ok', seasons } : { status: 'no-data' };
}
