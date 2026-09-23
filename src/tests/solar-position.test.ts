import { describe, it, expect } from 'vitest';
import {
  getSunPosition,
  getLocalSunTimes,
  guessBalkanTimeZone,
  zonedDateAtHour,
} from '../features/map/utils/solarPosition';

// Belgrade, reference values from timeanddate.com / NOAA
const BELGRADE = { lat: 44.8125, lng: 20.4612 };

describe('solarPosition', () => {
  it('matches the published summer-solstice sun times in Belgrade (CEST)', () => {
    const times = getLocalSunTimes(new Date(2026, 5, 21), BELGRADE.lat, BELGRADE.lng, 'Europe/Belgrade');
    // Sunrise 04:51, sunset 20:28, solar noon ~12:40
    expect(times.sunrise).toBeCloseTo(4 + 51 / 60, 1);
    expect(times.sunset).toBeCloseTo(20 + 28 / 60, 1);
    expect(times.solarNoon).toBeCloseTo(12 + 40 / 60, 1);
  });

  it('matches the published winter-solstice sun times in Belgrade (CET)', () => {
    const times = getLocalSunTimes(new Date(2026, 11, 21), BELGRADE.lat, BELGRADE.lng, 'Europe/Belgrade');
    // Sunrise 07:12, sunset 16:01
    expect(times.sunrise).toBeCloseTo(7 + 12 / 60, 1);
    expect(times.sunset).toBeCloseTo(16 + 1 / 60, 1);
  });

  it('puts the sun due south at its highest at solar noon', () => {
    const noon = getLocalSunTimes(new Date(2026, 2, 20), BELGRADE.lat, BELGRADE.lng, 'Europe/Belgrade').solarNoon;
    const pos = getSunPosition(zonedDateAtHour(new Date(2026, 2, 20), noon, 'Europe/Belgrade'), BELGRADE.lat, BELGRADE.lng);
    expect(pos.azimuth).toBeGreaterThan(178);
    expect(pos.azimuth).toBeLessThan(182);
    // Equinox: altitude ≈ 90° − latitude
    expect(pos.altitude).toBeCloseTo(90 - BELGRADE.lat, 0);
  });

  it('has the sun in the east in the morning and the west in the evening', () => {
    const day = new Date(2026, 6, 1);
    const morning = getSunPosition(zonedDateAtHour(day, 8, 'Europe/Belgrade'), BELGRADE.lat, BELGRADE.lng);
    const evening = getSunPosition(zonedDateAtHour(day, 18, 'Europe/Belgrade'), BELGRADE.lat, BELGRADE.lng);
    expect(morning.azimuth).toBeGreaterThan(60);
    expect(morning.azimuth).toBeLessThan(120);
    expect(evening.azimuth).toBeGreaterThan(250);
    expect(evening.azimuth).toBeLessThan(300);
  });

  it('interprets slider hours as the property’s wall-clock time across DST', () => {
    expect(zonedDateAtHour(new Date(2026, 6, 1), 15, 'Europe/Belgrade').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedDateAtHour(new Date(2026, 0, 15), 15, 'Europe/Athens').toISOString()).toBe('2026-01-15T13:00:00.000Z');
  });

  it('assigns Balkan towns to the right time zone', () => {
    const cet = [
      [44.81, 20.46, 'Belgrade'], [45.81, 15.98, 'Zagreb'], [41.33, 19.82, 'Tirana'],
      [41.99, 21.43, 'Skopje'], [42.66, 21.17, 'Pristina'], [43.86, 18.41, 'Sarajevo'],
      [42.44, 19.26, 'Podgorica'], [39.87, 20.0, 'Sarandë'], [40.62, 20.78, 'Korçë'],
      [40.07, 20.14, 'Gjirokastër'], [45.12, 21.3, 'Vršac'], [43.9, 22.28, 'Zaječar'],
      [43.15, 22.59, 'Pirot'], [41.44, 22.64, 'Strumica'], [41.03, 21.33, 'Bitola'],
      [41.14, 22.5, 'Gevgelija'], [44.23, 22.53, 'Negotin'],
    ] as const;
    const eet = [
      [37.98, 23.73, 'Athens'], [40.64, 22.94, 'Thessaloniki'], [39.62, 19.92, 'Corfu'],
      [42.70, 23.32, 'Sofia'], [44.43, 26.10, 'Bucharest'], [45.75, 21.23, 'Timișoara'],
      [44.63, 22.66, 'Drobeta-Turnu Severin'], [40.52, 21.26, 'Kastoria'], [39.66, 20.85, 'Ioannina'],
      [42.28, 22.69, 'Kyustendil'], [41.40, 23.21, 'Petrich'], [40.99, 22.87, 'Kilkis'],
      [40.78, 21.41, 'Florina'], [39.50, 20.26, 'Igoumenitsa'], [43.21, 27.91, 'Varna'],
    ] as const;
    for (const [lat, lng, name] of cet) expect([name, guessBalkanTimeZone(lat, lng)]).toEqual([name, 'Europe/Belgrade']);
    for (const [lat, lng, name] of eet) expect([name, guessBalkanTimeZone(lat, lng)]).toEqual([name, 'Europe/Athens']);
  });
});
