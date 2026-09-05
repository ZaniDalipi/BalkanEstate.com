/**
 * City Showcase Import Tests
 * Covers `resolveCityPhoto`'s source priority (the curated photo library over
 * the market-data row) and `selectImportCandidates`'s ordering — both pure
 * enough to test without a database.
 */

// The library URL is built from the configured pull zone at import time.
process.env.BUNNY_PULL_ZONE_HOST = 'test-zone.b-cdn.net';

jest.mock('../services/bunnyStorageService', () => ({
  __esModule: true,
  objectExists: jest.fn(),
}));

import { objectExists } from '../services/bunnyStorageService';
import {
  resolveCityPhoto,
  selectImportCandidates,
  isUsablePhotoUrl,
  cityKey,
  type ImportableCity,
} from '../services/cityShowcaseImportService';

const mockExists = objectExists as jest.Mock;

describe('resolveCityPhoto', () => {
  beforeEach(() => {
    mockExists.mockReset();
  });

  const row: ImportableCity = {
    city: 'Durres',
    country: 'Albania',
    imageUrl: 'https://images.example/market-data-durres.jpg',
  };

  it('prefers the curated library over the market-data row', async () => {
    // The library is what `seedCityImages.ts` deliberately curated; the row
    // field is what the automatic, lower-quality pipeline writes. A city
    // covered by both must resolve to the curated one.
    mockExists.mockResolvedValueOnce(true);

    const photo = await resolveCityPhoto(row);

    expect(mockExists).toHaveBeenCalledWith('balkan-estate/cities/city-albania-durres.jpg');
    expect(photo).toBe('https://test-zone.b-cdn.net/balkan-estate/cities/city-albania-durres.jpg');
  });

  it('falls back to the row field when the city has no library asset', async () => {
    mockExists.mockResolvedValueOnce(false);

    expect(await resolveCityPhoto(row)).toBe(row.imageUrl);
  });

  it('falls back to the row field when the library lookup errors', async () => {
    mockExists.mockRejectedValueOnce(new Error('storage unreachable'));

    expect(await resolveCityPhoto(row)).toBe(row.imageUrl);
  });

  it('returns null when neither source has a usable photo', async () => {
    mockExists.mockResolvedValueOnce(false);

    expect(await resolveCityPhoto({ city: 'Nowhere', country: 'Nowhereland' })).toBeNull();
  });

  it('rejects a non-https row URL rather than pointing an img src at it', async () => {
    mockExists.mockResolvedValueOnce(false);

    expect(
      await resolveCityPhoto({ ...row, imageUrl: 'javascript:alert(1)' })
    ).toBeNull();
  });
});

describe('isUsablePhotoUrl', () => {
  it('accepts an https URL', () => {
    expect(isUsablePhotoUrl('https://example.com/a.jpg')).toBe(true);
  });

  it('rejects everything else that could reach an img src', () => {
    expect(isUsablePhotoUrl('http://example.com/a.jpg')).toBe(false);
    expect(isUsablePhotoUrl('javascript:alert(1)')).toBe(false);
    expect(isUsablePhotoUrl('data:image/png;base64,abc')).toBe(false);
    expect(isUsablePhotoUrl('')).toBe(false);
    expect(isUsablePhotoUrl(undefined)).toBe(false);
  });
});

describe('selectImportCandidates', () => {
  const city = (overrides: Partial<ImportableCity>): ImportableCity => ({
    city: 'City', country: 'Country', ...overrides,
  });

  it('puts featured cities first, then by listing count', () => {
    const candidates = selectImportCandidates(
      [
        city({ city: 'Quiet', featured: false, listingsCount: 500 }),
        city({ city: 'Popular', featured: true, listingsCount: 5 }),
        city({ city: 'Busiest', featured: true, listingsCount: 50 }),
      ],
      new Set(),
    );

    expect(candidates.map(c => c.city)).toEqual(['Busiest', 'Popular', 'Quiet']);
  });

  it('skips a city already in the gallery', () => {
    const candidates = selectImportCandidates(
      [city({ city: 'Durres', country: 'Albania' })],
      new Set([cityKey('Durres', 'Albania')]),
    );

    expect(candidates).toEqual([]);
  });

  it('skips a row missing a name, and de-duplicates within the source list', () => {
    const candidates = selectImportCandidates(
      [
        city({ city: '', country: 'Albania' }),
        city({ city: 'Split', country: '' }),
        city({ city: 'Ohrid', country: 'North Macedonia' }),
        city({ city: 'Ohrid', country: 'North Macedonia' }),
      ],
      new Set(),
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].city).toBe('Ohrid');
  });
});
