import { describe, it, expect } from 'vitest';
import { aqiBand, orderSeasons, seasonYears } from '../airQualityBands';
import { validateAirQualityResponse, type SeasonAirQuality } from '../../../api/airQualityApi';

const season = (over: Partial<SeasonAirQuality>): SeasonAirQuality => ({
  season: 'summer', start: '2026-06-01', end: '2026-08-31', aqi: 30, pm25: 8, ...over,
});

describe('aqiBand', () => {
  it('follows the European AQI bands', () => {
    expect(aqiBand(0).key).toBe('good');
    expect(aqiBand(19.9).key).toBe('good');
    expect(aqiBand(20).key).toBe('fair');
    expect(aqiBand(33).key).toBe('fair');
    expect(aqiBand(45).key).toBe('moderate');
    expect(aqiBand(70).key).toBe('poor');
    expect(aqiBand(95).key).toBe('veryPoor');
    expect(aqiBand(140).key).toBe('extremelyPoor');
  });
});

describe('seasonYears / orderSeasons', () => {
  it('names a summer by its year and a winter by both', () => {
    expect(seasonYears({ start: '2026-06-01', end: '2026-08-31' })).toBe('2026');
    expect(seasonYears({ start: '2025-12-01', end: '2026-02-28' })).toBe('2025–26');
  });

  it('puts summer before winter', () => {
    const ordered = orderSeasons([season({ season: 'winter' }), season({ season: 'summer' })]);
    expect(ordered.map((s) => s.season)).toEqual(['summer', 'winter']);
  });
});

describe('validateAirQualityResponse', () => {
  it('keeps well-formed seasons and drops broken ones', () => {
    const result = validateAirQualityResponse({
      status: 'ok',
      seasons: [season({}), { season: 'spring', start: 'x', end: 'y', aqi: 1, pm25: 1 }, season({ season: 'winter', aqi: 'high' as unknown as number })],
    });
    expect(result).toEqual({ status: 'ok', seasons: [season({})] });
  });

  it('turns an ok answer with no usable season into no-data', () => {
    expect(validateAirQualityResponse({ status: 'ok', seasons: [] })).toEqual({ status: 'no-data' });
  });

  it('passes the no-location and no-data answers through', () => {
    expect(validateAirQualityResponse({ status: 'no-location' })).toEqual({ status: 'no-location' });
    expect(validateAirQualityResponse({ status: 'no-data', extra: 1 })).toEqual({ status: 'no-data' });
  });

  it('rejects anything else', () => {
    expect(() => validateAirQualityResponse(null)).toThrow();
    expect(() => validateAirQualityResponse({ status: 'ok' })).toThrow();
    expect(() => validateAirQualityResponse({ status: 'weird' })).toThrow();
  });
});
