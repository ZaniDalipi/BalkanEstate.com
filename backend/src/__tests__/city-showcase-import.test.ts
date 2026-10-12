/**
 * City Showcase Import Tests
 * Covers `resolveCityPhoto`'s source priority (the curated city library in R2
 * over the market-data row) and `selectImportCandidates`'s ordering — both
 * pure enough to test without a database.
 */

jest.mock('../config/r2', () => ({ isR2Enabled: () => true }));
jest.mock('../services/media/r2MediaStore', () => ({
  storedUrlFor: (key: string) => `https://media.example.com/${key}/original.jpg`,
}));
const mockFindOne = jest.fn();
jest.mock('../models/MediaAsset', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

import {
  resolveCityPhoto,
  selectImportCandidates,
  isUsablePhotoUrl,
  cityKey,
  type ImportableCity,
} from '../services/cityShowcaseImportService';

/** What MediaAsset.findOne(...).select(...).lean() resolves to. */
const libraryHas = (asset: { key: string; bucket: string } | null) =>
  mockFindOne.mockReturnValueOnce({ select: () => ({ lean: async () => asset }) });

describe('resolveCityPhoto', () => {
  beforeEach(() => {
    mockFindOne.mockReset();
  });

  const row: ImportableCity = {
    city: 'Durres',
    country: 'Albania',
    imageUrl: 'https://media.example.com/cities/albania/durres/m1/original.jpg',
  };

  it('prefers the curated city library over the market-data row', async () => {
    // The library is what `seedCityImages.ts` deliberately curated; the row
    // field is what the automatic, lower-quality pipeline writes. A city
    // covered by both must resolve to the curated one.
    libraryHas({ key: 'cities/convention/city-albania-durres', bucket: 'public' });

    const photo = await resolveCityPhoto(row);

    expect(mockFindOne).toHaveBeenCalledWith({ key: 'cities/convention/city-albania-durres' });
    expect(photo).toBe('https://media.example.com/cities/convention/city-albania-durres/original.jpg');
  });

  it('falls back to the row field when the city has no library photo', async () => {
    libraryHas(null);
    expect(await resolveCityPhoto(row)).toBe(row.imageUrl);
  });

  it('returns null when neither source has a usable photo', async () => {
    libraryHas(null);
    expect(await resolveCityPhoto({ city: 'Nowhere', country: 'Nowhereland' })).toBeNull();
  });

  it('rejects a non-https row URL rather than pointing an img src at it', async () => {
    libraryHas(null);
    expect(await resolveCityPhoto({ ...row, imageUrl: 'javascript:alert(1)' })).toBeNull();
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
