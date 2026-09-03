/**
 * City photo resolution
 *
 * The same place is curated in up to three collections, and before this each
 * had its own upload of the same picture. Resolution puts them in one order,
 * so these pin that order, the tolerance of the name matching that joins the
 * collections, and — the part that matters most in production — that one
 * collection failing degrades to the next rather than blanking every card on
 * the page.
 *
 * The three models are mocked rather than seeded: this is about the precedence
 * rules, not about Mongoose, and the rules are what a curator's edit either
 * obeys or doesn't.
 */

// Every model here is mocked, so the shared in-memory database is dead
// weight — see `usesDatabase` in setup.ts.
process.env.SKIP_TEST_DB = 'true';

type Row = Record<string, unknown>;

const cityRows: { value: Row[]; error?: Error } = { value: [] };
const showcaseRows: { value: Row[]; error?: Error } = { value: [] };
const villaRows: { value: Row[]; error?: Error } = { value: [] };

/** A `Model.find(...).lean()` chain backed by a plain array. */
const modelFor = (source: { value: Row[]; error?: Error }) => ({
  __esModule: true,
  default: {
    find: () => ({
      lean: async () => {
        if (source.error) throw source.error;
        return source.value;
      },
    }),
  },
});

jest.mock('../models/CityMarketData', () => modelFor(cityRows));
jest.mock('../models/CityShowcase', () => modelFor(showcaseRows));
jest.mock('../models/VillaDestination', () => modelFor(villaRows));
jest.mock('../utils/logger', () => ({
  apiLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  placeKey,
  pickCityPhoto,
  loadCityPhotoCandidates,
  resolveCityPhoto,
  resolveCityPhotos,
  type CityPhotoSource,
  type ResolvedCityPhoto,
} from '../services/cityPhotoService';

const TIRANA = { city: 'Tirana', country: 'Albania' };

beforeEach(() => {
  cityRows.value = [];
  cityRows.error = undefined;
  showcaseRows.value = [];
  showcaseRows.error = undefined;
  villaRows.value = [];
  villaRows.error = undefined;
});

describe('placeKey', () => {
  it('treats casing, padding and punctuation as the same place', () => {
    expect(placeKey(' TIRANA ', 'Albania')).toBe(placeKey('Tirana', 'albania'));
    expect(placeKey('Novi Sad', 'Serbia')).toBe(placeKey('novi-sad', 'serbia'));
  });

  it('strips accents, so a name entered either way still joins', () => {
    expect(placeKey('Prishtinë', 'Kosovo')).toBe(placeKey('Prishtine', 'Kosovo'));
  });

  it('keeps genuinely different places apart', () => {
    expect(placeKey('Tirana', 'Albania')).not.toBe(placeKey('Tirana', 'Kosovo'));
    // Not a claim that any two similar names are one city: "Prishtinë" and
    // "Prishtina" differ in their last letter and stay distinct.
    expect(placeKey('Prishtina', 'Kosovo')).not.toBe(placeKey('Prishtine', 'Kosovo'));
  });

  it('survives a missing or non-string name instead of throwing', () => {
    expect(placeKey(undefined as unknown as string, 'Albania')).toBe('|albania');
  });
});

describe('pickCityPhoto', () => {
  const photo = (source: CityPhotoSource): ResolvedCityPhoto =>
    ({ imageUrl: `https://x.example/${source}.jpg`, source });

  it('follows manual → city gallery → villa → auto', () => {
    const all = {
      manual: photo('manual'), cityGallery: photo('city-gallery'),
      villaDestination: photo('villa-destination'), auto: photo('auto'),
    };
    expect(pickCityPhoto(all)?.source).toBe('manual');
    expect(pickCityPhoto({ ...all, manual: null })?.source).toBe('city-gallery');
    expect(pickCityPhoto({ ...all, manual: null, cityGallery: null })?.source).toBe('villa-destination');
    expect(pickCityPhoto({ ...all, manual: null, cityGallery: null, villaDestination: null })?.source).toBe('auto');
  });

  it('returns null for a city with no photo anywhere', () => {
    expect(pickCityPhoto({ manual: null, cityGallery: null, villaDestination: null, auto: null })).toBeNull();
    expect(pickCityPhoto(undefined)).toBeNull();
  });
});

describe('loadCityPhotoCandidates', () => {
  it('separates a manual override from an auto-seeded photo on the same row', async () => {
    cityRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/manual.jpg', imageSource: 'manual' }];
    const candidates = await loadCityPhotoCandidates([TIRANA]);
    const entry = candidates.get(placeKey('Tirana', 'Albania'))!;

    expect(entry.manual?.imageUrl).toBe('https://x.example/manual.jpg');
    expect(entry.auto).toBeNull();
  });

  it('treats a row with no imageSource as auto, not as someone\'s choice', async () => {
    cityRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/seeded.jpg' }];
    const entry = (await loadCityPhotoCandidates([TIRANA])).get(placeKey('Tirana', 'Albania'))!;

    expect(entry.auto?.source).toBe('auto');
    expect(entry.manual).toBeNull();
  });

  it('matches a villa destination on its name or on the city photo it borrowed', async () => {
    villaRows.value = [
      { name: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/by-name.jpg', isActive: true },
      { name: 'Riviera', country: 'Albania', imageCity: 'Vlorë', imageCountry: 'Albania', imageUrl: 'https://x.example/by-image-city.jpg' },
    ];
    const candidates = await loadCityPhotoCandidates([TIRANA, { city: 'Vlore', country: 'Albania' }]);

    expect(candidates.get(placeKey('Tirana', 'Albania'))!.villaDestination?.imageUrl).toBe('https://x.example/by-name.jpg');
    expect(candidates.get(placeKey('Vlore', 'Albania'))!.villaDestination?.imageUrl).toBe('https://x.example/by-image-city.jpg');
  });

  it('keeps the first gallery panel when a city has two', async () => {
    showcaseRows.value = [
      { city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/first.jpg' },
      { city: 'tirana', country: 'albania', imageUrl: 'https://x.example/second.jpg' },
    ];
    const entry = (await loadCityPhotoCandidates([TIRANA])).get(placeKey('Tirana', 'Albania'))!;

    expect(entry.cityGallery?.imageUrl).toBe('https://x.example/first.jpg');
  });

  it('ignores a URL that has no business in an img src', async () => {
    cityRows.value = [
      { city: 'Tirana', country: 'Albania', imageUrl: 'javascript:alert(1)', imageSource: 'manual' },
      { city: 'Budva', country: 'Montenegro', imageUrl: '   ' },
      { city: 'Split', country: 'Croatia', imageUrl: 'data:image/png;base64,AAA' },
    ];
    const candidates = await loadCityPhotoCandidates([
      TIRANA, { city: 'Budva', country: 'Montenegro' }, { city: 'Split', country: 'Croatia' },
    ]);

    for (const entry of candidates.values()) {
      expect(pickCityPhoto(entry)).toBeNull();
    }
  });

  it('returns an entry for every city asked for, photo or not', async () => {
    const candidates = await loadCityPhotoCandidates([TIRANA, { city: 'Budva', country: 'Montenegro' }]);
    expect(candidates.size).toBe(2);
    expect(candidates.get(placeKey('Budva', 'Montenegro'))).toEqual({
      manual: null, cityGallery: null, villaDestination: null, auto: null,
    });
  });

  it('drops the collection that failed and keeps the rest', async () => {
    // The failure mode this exists for: a gallery lookup that throws must not
    // take the city's own photo down with it and blank the page.
    showcaseRows.error = new Error('gallery unavailable');
    cityRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/own.jpg', imageSource: 'manual' }];

    const entry = (await loadCityPhotoCandidates([TIRANA])).get(placeKey('Tirana', 'Albania'))!;
    expect(entry.manual?.imageUrl).toBe('https://x.example/own.jpg');
    expect(entry.cityGallery).toBeNull();
  });

  it('carries a credit through, and omits it when blank', async () => {
    villaRows.value = [{
      name: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/v.jpg',
      imageCredit: '  Jane Doe  ', imageCreditUrl: 'https://unsplash.example/jane',
    }];
    showcaseRows.value = [{ city: 'Budva', country: 'Montenegro', imageUrl: 'https://x.example/b.jpg', imageCredit: '   ' }];

    const candidates = await loadCityPhotoCandidates([TIRANA, { city: 'Budva', country: 'Montenegro' }]);
    const villa = candidates.get(placeKey('Tirana', 'Albania'))!.villaDestination!;
    expect(villa.credit).toBe('Jane Doe');
    expect(villa.creditUrl).toBe('https://unsplash.example/jane');
    expect(candidates.get(placeKey('Budva', 'Montenegro'))!.cityGallery).not.toHaveProperty('credit');
  });
});

describe('resolveCityPhotos', () => {
  it('omits cities with no photo, so the frontend keeps its own fallback chain', async () => {
    cityRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/t.jpg' }];
    const resolved = await resolveCityPhotos([TIRANA, { city: 'Budva', country: 'Montenegro' }]);

    expect(resolved.has(placeKey('Tirana', 'Albania'))).toBe(true);
    expect(resolved.has(placeKey('Budva', 'Montenegro'))).toBe(false);
  });

  it('asks nothing of the database for an empty list', async () => {
    expect((await resolveCityPhotos([])).size).toBe(0);
  });

  it('resolves one city through the same precedence', async () => {
    showcaseRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/gallery.jpg' }];
    cityRows.value = [{ city: 'Tirana', country: 'Albania', imageUrl: 'https://x.example/auto.jpg' }];

    const photo = await resolveCityPhoto('tirana', 'ALBANIA');
    expect(photo?.source).toBe('city-gallery');
  });
});
