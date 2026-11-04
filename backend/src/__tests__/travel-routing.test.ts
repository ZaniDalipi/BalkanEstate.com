/**
 * The travel-route proxy behind "distance & route from my location" on
 * business profiles. Pure rules only — no database, no network.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  getRoute,
  clearRouteCache,
  haversineKm,
  osrmRouteUrl,
  parseOsrmResponse,
  routeCacheKey,
  validateRouteQuery,
  RoutingUnavailableError,
} from '../services/routing/routingService';

describe('validateRouteQuery', () => {
  it('accepts two coordinates and defaults to driving', () => {
    expect(validateRouteQuery({ from: '41.33,19.82', to: '40.45, 19.48' })).toEqual({
      isValid: true,
      value: { from: { lat: 41.33, lng: 19.82 }, to: { lat: 40.45, lng: 19.48 }, mode: 'car' },
    });
  });

  it.each([
    [{ to: '40,19' }, 'from and to must be "lat,lng" coordinates'],
    [{ from: '91,19', to: '40,19' }, 'from and to must be "lat,lng" coordinates'],
    [{ from: 'abc', to: '40,19' }, 'from and to must be "lat,lng" coordinates'],
    [{ from: ['40,19'], to: '40,19' }, 'from and to must be "lat,lng" coordinates'],
    [{ from: '40,19', to: '41,19', mode: 'plane' }, 'mode must be car, foot or bike'],
    [{ from: '40,19', to: '51.5,-0.12' }, 'Points are too far apart to route'],
  ])('rejects %j', (query, error) => {
    expect(validateRouteQuery(query as never)).toEqual({ isValid: false, error });
  });
});

describe('routing helpers', () => {
  const req = { from: { lat: 41.3275, lng: 19.8187 }, to: { lat: 40.4517, lng: 19.4805 }, mode: 'foot' as const };

  it('measures straight-line distance (Tirana → Vlorë ≈ 100 km)', () => {
    expect(haversineKm(req.from, req.to)).toBeGreaterThan(95);
    expect(haversineKm(req.from, req.to)).toBeLessThan(105);
  });

  it('builds the OSRM URL in lng,lat order for the profile', () => {
    expect(osrmRouteUrl('https://r.example/', req)).toBe(
      'https://r.example/routed-foot/route/v1/driving/19.8187,41.3275;19.4805,40.4517?overview=simplified&geometries=geojson&alternatives=false&steps=false',
    );
  });

  it('rounds the cache key to ~10 m so the exact spot is not kept', () => {
    expect(routeCacheKey({ ...req, from: { lat: 41.327512, lng: 19.818749 } })).toBe('foot:41.3275:19.8187:40.4517:19.4805');
  });

  it('reads an OSRM route, flipping coordinates to [lat, lng]', () => {
    expect(parseOsrmResponse({ code: 'Ok', routes: [{ distance: 1234.6, duration: 99.4, geometry: { coordinates: [[19.8, 41.3], [19.5, 40.4]] } }] }))
      .toEqual({ distanceMeters: 1235, durationSeconds: 99, path: [[41.3, 19.8], [40.4, 19.5]] });
    expect(parseOsrmResponse({ code: 'NoRoute' })).toBeNull();
  });

  it('caches answers and reports an unreachable router as such', async () => {
    clearRouteCache();
    const ok = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 'Ok', routes: [{ distance: 10, duration: 5, geometry: { coordinates: [] } }] }) });
    await getRoute(req, ok as unknown as typeof fetch);
    await getRoute(req, ok as unknown as typeof fetch);
    expect(ok).toHaveBeenCalledTimes(1);

    clearRouteCache();
    const down = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    await expect(getRoute(req, down as unknown as typeof fetch)).rejects.toBeInstanceOf(RoutingUnavailableError);

    const noRoute = jest.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ code: 'NoRoute' }) });
    await expect(getRoute(req, noRoute as unknown as typeof fetch)).resolves.toBeNull();
  });
});
