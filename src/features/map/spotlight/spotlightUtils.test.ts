import { describe, it, expect } from 'vitest';
import { directionsUrl, formatDistance, isValidLatLng, pricePerSquareMetre, splitDuration, straightLineMeters } from './spotlightUtils';
import { parseHomePlace } from './homePlace';

describe('spotlightUtils', () => {
  it('measures straight-line distance (Skopje → Ohrid is ~ 116 km)', () => {
    const km = straightLineMeters({ lat: 41.9981, lng: 21.4254 }, { lat: 41.1172, lng: 20.8016 }) / 1000;
    expect(km).toBeGreaterThan(105);
    expect(km).toBeLessThan(120);
  });

  it('formats distances for people', () => {
    expect(formatDistance(843)).toBe('840 m');
    expect(formatDistance(3240)).toBe('3.2 km');
    expect(formatDistance(42400)).toBe('42 km');
    expect(formatDistance(NaN)).toBe('—');
  });

  it('splits durations into hours and minutes, at least a minute', () => {
    expect(splitDuration(20)).toEqual({ hours: 0, minutes: 1 });
    expect(splitDuration(3900)).toEqual({ hours: 1, minutes: 5 });
  });

  it('builds a Google Maps directions link, origin optional', () => {
    const url = directionsUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'walking');
    expect(url).toContain('origin=1%2C2');
    expect(url).toContain('destination=3%2C4');
    expect(url).toContain('travelmode=walking');
    expect(directionsUrl(null, { lat: 3, lng: 4 }, 'driving')).not.toContain('origin=');
  });

  it('price per m² only when both numbers are real', () => {
    expect(pricePerSquareMetre(120000, 60)).toBe(2000);
    expect(pricePerSquareMetre(120000, 0)).toBeNull();
    expect(pricePerSquareMetre(undefined, 60)).toBeNull();
  });

  it('validates coordinates', () => {
    expect(isValidLatLng({ lat: 41, lng: 21 })).toBe(true);
    expect(isValidLatLng({ lat: 120, lng: 21 })).toBe(false);
    expect(isValidLatLng(null)).toBe(false);
  });
});

describe('parseHomePlace', () => {
  it('reads a saved place and rejects anything else', () => {
    expect(parseHomePlace('{"lat":41,"lng":21,"label":"Home","source":"address"}')).toEqual({ lat: 41, lng: 21, label: 'Home', source: 'address' });
    expect(parseHomePlace('{"lat":410,"lng":21,"source":"gps"}')).toBeNull();
    expect(parseHomePlace('{"lat":41,"lng":21,"source":"evil"}')).toBeNull();
    expect(parseHomePlace('not json')).toBeNull();
    expect(parseHomePlace(null)).toBeNull();
  });
});
