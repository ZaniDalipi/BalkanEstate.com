import { describe, it, expect } from 'vitest';
import { formatDistance } from '../surroundingsLabels';
import { validateSurroundingsResponse } from '../../../api/surroundingsApi';

const ok = {
  status: 'ok',
  noise: {
    day: { db: 58, band: 'noisy' },
    night: { db: 49, band: 'noisy' },
    sources: [{ kind: 'primary', name: 'Bulevardi', distanceM: 80 }],
  },
  traffic: { level: 'busy', nearestMainRoad: { kind: 'primary', name: 'Bulevardi', distanceM: 80 } },
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
      traffic: { level: 'calm', nearestMainRoad: { kind: 'railway', distanceM: 10 } },
    });
    expect(result.status === 'ok' && result.noise.sources).toHaveLength(1);
    expect(result.status === 'ok' && result.traffic.nearestMainRoad).toBeNull();
  });

  it('passes no-location through and rejects broken answers', () => {
    expect(validateSurroundingsResponse({ status: 'no-location' })).toEqual({ status: 'no-location' });
    expect(() => validateSurroundingsResponse(null)).toThrow();
    expect(() => validateSurroundingsResponse({ ...ok, noise: { ...ok.noise, day: { db: 'loud', band: 'noisy' } } })).toThrow();
    expect(() => validateSurroundingsResponse({ ...ok, traffic: { level: 'jammed' } })).toThrow();
  });
});
