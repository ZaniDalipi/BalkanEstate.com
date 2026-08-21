/**
 * City Showcase Import Tests
 * Covers `resolveCityPhoto`'s source priority (the curated Cloudinary library
 * over the market-data row) and `selectImportCandidates`'s ordering — both
 * pure enough to test without a database.
 */

jest.mock('../config/cloudinary', () => ({
  __esModule: true,
  default: {
    api: {
      resource: jest.fn(),
    },
  },
}));

import cloudinary from '../config/cloudinary';
import {
  resolveCityPhoto,
  selectImportCandidates,
  isUsablePhotoUrl,
  cityKey,
  type ImportableCity,
} from '../services/cityShowcaseImportService';

const mockResource = cloudinary.api.resource as jest.Mock;

describe('resolveCityPhoto', () => {
  beforeEach(() => {
    mockResource.mockReset();
  });

  const row: ImportableCity = {
    city: 'Durres',
    country: 'Albania',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/market-data-durres.jpg',
  };

  it('prefers the curated Cloudinary library over the market-data row', async () => {
    // The library is what `seedCityImages.ts` deliberately curated; the row
    // field is what the automatic, lower-quality pipeline writes. A city
    // covered by both must resolve to the curated one.
    mockResource.mockResolvedValueOnce({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/city-albania-durres.jpg',
    });

    const photo = await resolveCityPhoto(row);

    expect(mockResource).toHaveBeenCalledWith('city-albania-durres');
    expect(photo).toBe('https://res.cloudinary.com/demo/image/upload/v1/city-albania-durres.jpg');
  });

  it('falls back to the row field when the city has no library asset', async () => {
    mockResource.mockRejectedValueOnce(new Error('Not found'));

    expect(await resolveCityPhoto(row)).toBe(row.imageUrl);
  });

  it('falls back to the row field when the library resource has no usable URL', async () => {
    mockResource.mockResolvedValueOnce({ secure_url: undefined });

    expect(await resolveCityPhoto(row)).toBe(row.imageUrl);
  });

  it('returns null when neither source has a usable photo', async () => {
    mockResource.mockRejectedValueOnce(new Error('Not found'));

    expect(await resolveCityPhoto({ city: 'Nowhere', country: 'Nowhereland' })).toBeNull();
  });

  it('rejects a non-https row URL rather than pointing an img src at it', async () => {
    mockResource.mockRejectedValueOnce(new Error('Not found'));

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
