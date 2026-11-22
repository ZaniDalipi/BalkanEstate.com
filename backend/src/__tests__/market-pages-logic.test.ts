/**
 * The pure logic behind the "property for sale / for rent in …" pages:
 * place slugs, parameter validation, merging city spellings, the price
 * figures, the indexing threshold and the sitemap entries.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  countryBySlug,
  countryByStoredName,
  groupCities,
  isPlaceSlug,
  marketPagePath,
  parseMarketParams,
  placeSlug,
} from '../services/marketPages/marketPlaces';
import {
  MIN_INDEXABLE_LISTINGS,
  askingPrice,
  buildMarketStats,
  isIndexable,
  percentile,
  type MarketStatsRow,
} from '../services/marketPages/marketStats';
import { hreflangOf, indexableMarketPaths, marketSitemapEntries } from '../services/marketPages/marketSitemap';

describe('placeSlug', () => {
  it('drops accents, lower-cases and joins words with hyphens', () => {
    expect(placeSlug('Durrës')).toBe('durres');
    expect(placeSlug('Novi Sad')).toBe('novi-sad');
    expect(placeSlug('Herceg Novi')).toBe('herceg-novi');
    expect(placeSlug('Sv. Filip i Jakov')).toBe('sv-filip-i-jakov');
    expect(placeSlug('  Niš  ')).toBe('nis');
  });

  it('spells out letters accents cannot be stripped from', () => {
    expect(placeSlug('Đakovica')).toBe('djakovica');
  });

  it('keeps Cyrillic and Greek letters', () => {
    expect(placeSlug('Скопје')).toBe('скопје');
    expect(placeSlug('Αθήνα')).toBe('αθηνα');
  });
});

describe('isPlaceSlug', () => {
  it('accepts slugs and rejects anything else', () => {
    expect(isPlaceSlug('novi-sad')).toBe(true);
    expect(isPlaceSlug('скопје')).toBe(true);
    expect(isPlaceSlug('')).toBe(false);
    expect(isPlaceSlug('Novi-Sad')).toBe(false);
    expect(isPlaceSlug('novi--sad')).toBe(false);
    expect(isPlaceSlug('-novi')).toBe(false);
    expect(isPlaceSlug('../etc')).toBe(false);
    expect(isPlaceSlug('a'.repeat(81))).toBe(false);
  });
});

describe('parseMarketParams', () => {
  it('accepts a deal alone, with a country, and with a city', () => {
    expect(parseMarketParams({ deal: 'sale' })).toEqual({ ok: true, value: { deal: 'sale' } });
    expect(parseMarketParams({ deal: 'rent', country: 'Albania', city: 'Tirana' })).toEqual({
      ok: true,
      value: { deal: 'rent', country: 'albania', city: 'tirana' },
    });
  });

  it('rejects an unknown deal and malformed places', () => {
    expect(parseMarketParams({ deal: 'lease' }).ok).toBe(false);
    expect(parseMarketParams({ deal: 'sale', country: '' }).ok).toBe(false);
    expect(parseMarketParams({ deal: 'sale', country: '$where' }).ok).toBe(false);
    expect(parseMarketParams({ deal: 'sale', country: 'albania', city: 'a/b' }).ok).toBe(false);
    expect(parseMarketParams({ deal: 'sale', country: ['albania'] }).ok).toBe(false);
  });

  it('says why', () => {
    const result = parseMarketParams({ deal: 'sale', country: 'albania', city: '<script>' });
    expect(result).toEqual({ ok: false, error: 'Invalid city' });
  });
});

describe('countries', () => {
  it('finds a country by slug and by any stored spelling', () => {
    expect(countryBySlug('north-macedonia')?.name).toBe('North Macedonia');
    expect(countryBySlug('macedonia')).toBeUndefined();
    expect(countryByStoredName('bosnia and herzegovina')?.slug).toBe('bosnia-and-herzegovina');
    expect(countryByStoredName('Bosnia')?.slug).toBe('bosnia-and-herzegovina');
    expect(countryByStoredName('Kosova')?.slug).toBe('kosovo');
    expect(countryByStoredName('Italy')).toBeUndefined();
  });
});

describe('marketPagePath', () => {
  it('builds the overview, country and city paths', () => {
    expect(marketPagePath('sale')).toBe('/property-for-sale');
    expect(marketPagePath('rent', 'albania')).toBe('/property-for-rent/albania');
    expect(marketPagePath('sale', 'albania', 'tirana')).toBe('/property-for-sale/albania/tirana');
  });

  it('never builds a city path without a country', () => {
    expect(marketPagePath('sale', undefined, 'tirana')).toBe('/property-for-sale');
  });
});

describe('groupCities', () => {
  it('merges spellings of one city and names it with the canonical spelling', () => {
    const cities = groupCities([
      { city: 'Tiranë', count: 3, indexableCount: 1 },
      { city: 'tirana', count: 10, indexableCount: 6 },
      { city: 'Durrës', count: 4, indexableCount: 4 },
    ]);
    expect(cities).toHaveLength(2);
    expect(cities[0]).toMatchObject({ slug: 'tirana', name: 'Tirana', count: 13, indexableCount: 7 });
    expect(cities[0].spellings.sort()).toEqual(['Tiranë', 'tirana']);
    expect(cities[1]).toMatchObject({ slug: 'durres', name: 'Durrës', count: 4 });
  });

  it('names an unknown city after its most used spelling', () => {
    const [city] = groupCities([
      { city: 'Gjilan', count: 2, indexableCount: 0 },
      { city: 'GJILAN', count: 1, indexableCount: 0 },
    ]);
    expect(city).toMatchObject({ slug: 'gjilan', name: 'Gjilan', count: 3 });
  });

  it('leaves out values that are not place names', () => {
    const cities = groupCities([
      { city: 'Load more', count: 5, indexableCount: 5 },
      { city: '12345', count: 5, indexableCount: 5 },
      { city: '', count: 5, indexableCount: 5 },
      { city: 'Rruga e Kavajës 12, Tiranë, Albania', count: 5, indexableCount: 5 },
      { city: 'Berat', count: 0, indexableCount: 0 },
    ]);
    expect(cities).toEqual([]);
  });

  it('orders the busiest city first', () => {
    const cities = groupCities([
      { city: 'Berat', count: 2, indexableCount: 0 },
      { city: 'Vlorë', count: 9, indexableCount: 0 },
    ]);
    expect(cities.map((c) => c.slug)).toEqual(['vlore', 'berat']);
  });
});

describe('percentile', () => {
  it('interpolates and handles the edges', () => {
    expect(percentile([], 0.5)).toBeNull();
    expect(percentile([7], 0.9)).toBe(7);
    expect(percentile([10, 20, 30, 40, 50], 0)).toBe(10);
    expect(percentile([10, 20, 30, 40, 50], 1)).toBe(50);
    expect(percentile([10, 20, 30, 40, 50], 0.1)).toBe(14);
  });
});

const row = (overrides: Partial<MarketStatsRow>): MarketStatsRow => ({
  price: 100_000,
  area: 80,
  propertyType: 'apartment',
  rentPeriod: null,
  isNegotiable: false,
  indexable: true,
  ...overrides,
});

describe('askingPrice', () => {
  it('ignores "price on request", missing prices and nightly stays', () => {
    expect(askingPrice(row({ isNegotiable: true }), 'sale')).toBeNull();
    expect(askingPrice(row({ price: 0 }), 'sale')).toBeNull();
    expect(askingPrice(row({ price: null }), 'sale')).toBeNull();
    expect(askingPrice(row({ price: 80, rentPeriod: 'daily' }), 'rent')).toBeNull();
  });

  it('turns a weekly rent into a monthly one', () => {
    expect(askingPrice(row({ price: 100, rentPeriod: 'weekly' }), 'rent')).toBe(433);
    expect(askingPrice(row({ price: 500, rentPeriod: 'monthly' }), 'rent')).toBe(500);
  });
});

describe('buildMarketStats', () => {
  it('reports the range, median and price per m² of priced listings', () => {
    const stats = buildMarketStats(
      [
        row({ price: 50_000, area: 50 }),
        row({ price: 100_000, area: 100 }),
        row({ price: 150_000, area: 100 }),
        row({ price: 200_000, area: 100, propertyType: 'house', indexable: false }),
        row({ price: 999, isNegotiable: true }),
      ],
      'sale',
    );
    expect(stats.listingCount).toBe(5);
    expect(stats.indexableCount).toBe(4);
    expect(stats.pricedCount).toBe(4);
    expect(stats.priceMedian).toBe(125_000);
    expect(stats.priceLow).toBe(65_000);
    expect(stats.priceHigh).toBe(185_000);
    expect(stats.pricePerSqmMedian).toBe(1250);
    expect(stats.pricePerSqmCount).toBe(4);
    expect(stats.typeCounts).toEqual([{ type: 'apartment', count: 4 }, { type: 'house', count: 1 }]);
  });

  it('shows no figures from too few prices, and no price per m² from tiny areas', () => {
    const few = buildMarketStats([row({}), row({})], 'sale');
    expect(few.priceMedian).toBeNull();
    expect(few.priceLow).toBeNull();
    expect(few.pricePerSqmMedian).toBeNull();

    const parking = buildMarketStats([row({ area: 12 }), row({ area: 12 }), row({ area: 0 })], 'sale');
    expect(parking.priceMedian).toBe(100_000);
    expect(parking.pricePerSqmMedian).toBeNull();
    expect(parking.pricePerSqmCount).toBe(0);
  });

  it('is empty, not broken, for an area with no listings', () => {
    expect(buildMarketStats([], 'rent')).toEqual({
      listingCount: 0,
      indexableCount: 0,
      pricedCount: 0,
      priceLow: null,
      priceMedian: null,
      priceHigh: null,
      pricePerSqmMedian: null,
      pricePerSqmCount: 0,
      typeCounts: [],
    });
  });
});

describe('isIndexable', () => {
  it(`needs ${MIN_INDEXABLE_LISTINGS} of our own listings`, () => {
    expect(isIndexable(MIN_INDEXABLE_LISTINGS - 1)).toBe(false);
    expect(isIndexable(MIN_INDEXABLE_LISTINGS)).toBe(true);
  });
});

describe('market sitemap', () => {
  const trees = [
    { country: { slug: 'albania' }, indexableCount: 12, cities: [{ slug: 'tirana', indexableCount: 9 }, { slug: 'berat', indexableCount: 1 }] },
    { country: { slug: 'greece' }, indexableCount: 2, cities: [{ slug: 'athens', indexableCount: 2 }] },
  ];

  it('lists only pages with enough of our own listings, overview first', () => {
    expect(indexableMarketPaths('sale', trees)).toEqual([
      '/property-for-sale',
      '/property-for-sale/albania',
      '/property-for-sale/albania/tirana',
    ]);
  });

  it('leaves the overview out when no country qualifies', () => {
    expect(indexableMarketPaths('rent', [trees[1]])).toEqual([]);
  });

  it('writes every language with its alternates and a valid Montenegrin tag', () => {
    const xml = marketSitemapEntries(['/property-for-sale/albania'], 'https://balkanestateai.com', '2026-11-22');
    expect(xml.match(/<url>/g)).toHaveLength(10);
    expect(xml).toContain('<loc>https://balkanestateai.com/sq/property-for-sale/albania</loc>');
    expect(xml).toContain('hreflang="sr-ME" href="https://balkanestateai.com/me/property-for-sale/albania"');
    expect(xml).toContain('hreflang="x-default" href="https://balkanestateai.com/en/property-for-sale/albania"');
    expect(xml).not.toContain('hreflang="me"');
    expect(hreflangOf('el')).toBe('el');
  });
});
