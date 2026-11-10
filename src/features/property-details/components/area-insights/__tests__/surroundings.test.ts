import { describe, it, expect } from 'vitest';
import { formatDistance } from '../surroundingsLabels';
import { validateSurroundingsResponse } from '../../../api/surroundingsApi';
import { isPropertyId } from '../../../hooks/isPropertyId';

const ok = {
  status: 'ok',
  noise: {
    day: { db: 58, band: 'noisy' },
    night: { db: 49, band: 'noisy' },
    sources: [{ kind: 'primary', name: 'Bulevardi', distanceM: 80 }],
  },
  traffic: {
    level: 'busy',
    nearestStreet: { kind: 'street', name: 'Rruga Kala', distanceM: 15 },
    nearestMainRoad: { kind: 'primary', name: 'Bulevardi', distanceM: 80 },
  },
  roads: [{ kind: 'primary', name: 'Bulevardi', points: [[40.6, 20.8], [40.601, 20.801]] }],
};

describe('formatDistance', () => {
  it('rounds metres sensibly and switches to km', () => {
    expect(formatDistance(12, 'en')).toBe('10 m');
    expect(formatDistance(83, 'en')).toBe('85 m');
    expect(formatDistance(437, 'en')).toBe('440 m');
    expect(formatDistance(2440, 'en')).toBe('2.4 km');
    expect(formatDistance(2440, 'de')).toBe('2,4 km');
    expect(formatDistance(0, 'en')).toBe('5 m');
  });
});

describe('validateSurroundingsResponse', () => {
  it('passes a good answer through', () => {
    expect(validateSurroundingsResponse(ok)).toEqual(ok);
  });

  it('drops malformed sources and an unknown nearest road', () => {
    const result = validateSurroundingsResponse({
      ...ok,
      noise: { ...ok.noise, sources: [...ok.noise.sources, { kind: 'volcano', distanceM: 5 }, { kind: 'bar', distanceM: -1 }] },
      traffic: { level: 'calm', nearestStreet: { kind: 'airport', distanceM: 3 }, nearestMainRoad: { kind: 'railway', distanceM: 10 } },
    });
    expect(result.status === 'ok' && result.traffic.nearestStreet).toBeNull();
    expect(result.status === 'ok' && result.noise.sources).toHaveLength(1);
    expect(result.status === 'ok' && result.traffic.nearestMainRoad).toBeNull();
  });

  it('passes no-location through and rejects broken answers', () => {
    expect(validateSurroundingsResponse({ status: 'no-location' })).toEqual({ status: 'no-location' });
    expect(validateSurroundingsResponse({ status: 'pending' })).toEqual({ status: 'pending' });
    expect(() => validateSurroundingsResponse(null)).toThrow();
    expect(() => validateSurroundingsResponse({ ...ok, noise: { ...ok.noise, day: { db: 'loud', band: 'noisy' } } })).toThrow();
    expect(() => validateSurroundingsResponse({ ...ok, traffic: { level: 'jammed' } })).toThrow();
  });
});

describe('roads for the map', () => {
  it('keeps good roads and drops broken ones', () => {
    const result = validateSurroundingsResponse({
      ...ok,
      roads: [
        ...ok.roads,
        { kind: 'street', points: [[40.6, 20.8], [40.6, 20.81]] },
        { kind: 'runway', points: [[40.6, 20.8], [40.6, 20.81]] },
        { kind: 'primary', points: [[40.6, 20.8]] },
        { kind: 'primary', points: [[95, 20.8], [40.6, 'x']] },
        'nonsense',
      ],
    });
    expect(result.status === 'ok' && result.roads.map((r) => r.kind)).toEqual(['primary', 'street']);
  });

  it('treats a missing list as no roads', () => {
    const { roads: _roads, ...older } = ok;
    const result = validateSurroundingsResponse(older);
    expect(result.status === 'ok' && result.roads).toEqual([]);
  });
});

describe('isPropertyId', () => {
  it('accepts the encoded id the API hands out and a raw ObjectId', () => {
    expect(isPropertyId('6_M28TTqCJUl1TrM')).toBe(true);
    expect(isPropertyId('a9c75a9a00844de651e14ea9')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isPropertyId('')).toBe(false);
    expect(isPropertyId('BE-1234')).toBe(false);
    expect(isPropertyId('6_M28TTqCJUl1TrM/x')).toBe(false);
  });
});
