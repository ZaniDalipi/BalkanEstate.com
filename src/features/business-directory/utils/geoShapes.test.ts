import { describe, expect, it } from 'vitest';
import { circleRing, inflatePolygon, pickFootprint, pointInPolygon, type PolygonCoords } from './geoShapes';
import { countryCodeFor, pinnedPlace, placeQueries } from './businessPlace';

const square = (x: number, y: number, size: number): PolygonCoords => [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]];

describe('geoShapes', () => {
  it('knows when a point is inside a footprint, but not in its courtyard', () => {
    const withCourtyard: PolygonCoords = [square(0, 0, 10)[0], square(4, 4, 2)[0]];
    expect(pointInPolygon([1, 1], withCourtyard)).toBe(true);
    expect(pointInPolygon([5, 5], withCourtyard)).toBe(false);
    expect(pointInPolygon([11, 1], withCourtyard)).toBe(false);
  });

  it('picks the smallest building under the pin, across polygons and multipolygons', () => {
    const block = { type: 'Polygon', coordinates: square(0, 0, 10) };
    const shop = { type: 'MultiPolygon', coordinates: [square(20, 20, 1), square(2, 2, 2)] };
    expect(pickFootprint([block, shop], [3, 3])).toEqual(square(2, 2, 2));
    expect(pickFootprint([block], [30, 30])).toBeNull();
    expect(pickFootprint([{ type: 'Point', coordinates: [3, 3] }], [3, 3])).toBeNull();
  });

  it('grows a footprint a little all round, keeping its centre', () => {
    const lot = square(19.48, 40.45, 0.0002);
    const grown = inflatePolygon(lot, 1)[0];
    expect(grown[0][0]).toBeLessThan(lot[0][0][0]);
    expect(grown[2][0]).toBeGreaterThan(lot[0][2][0]);
    expect((grown[0][0] + grown[2][0]) / 2).toBeCloseTo((lot[0][0][0] + lot[0][2][0]) / 2, 9);
  });

  it('draws a closed circle of the right size', () => {
    const ring = circleRing([19.48, 40.45], 100, 16);
    expect(ring).toHaveLength(17);
    expect(ring[0]).toEqual(ring[16]);
    const northMetres = (ring[4][1] - 40.45) * 111_320;
    expect(northMetres).toBeCloseTo(100, 0);
  });
});

describe('businessPlace', () => {
  it('uses the owner pin when it is a real coordinate', () => {
    expect(pinnedPlace({ latitude: 40.45, longitude: 19.48 })).toEqual({ position: { lat: 40.45, lng: 19.48 }, precision: 'pin' });
    expect(pinnedPlace({ latitude: undefined, longitude: undefined })).toBeNull();
    expect(pinnedPlace({ latitude: 0, longitude: 0 })).toBeNull();
  });

  it('searches the address first, then the city', () => {
    expect(placeQueries({ address: '34, Kandlerova ulica, Pula', city: 'Pula', country: 'Croatia' })).toEqual([
      { query: '34, Kandlerova ulica, Pula', precision: 'address' },
      { query: 'Pula, Croatia', precision: 'city' },
    ]);
    expect(placeQueries({ address: '', city: 'Tirana', country: 'Albania' })).toEqual([{ query: 'Tirana, Albania', precision: 'city' }]);
  });

  it('narrows the search to the country', () => {
    expect(countryCodeFor('Croatia')).toBe('hr');
    expect(countryCodeFor(' north macedonia ')).toBe('mk');
    expect(countryCodeFor('France')).toBeNull();
  });
});
