/**
 * Pure helpers of the market landing pages: URLs, the words and figures the
 * page and its crawler HTML share, and the checks on API answers.
 */
import { describe, it, expect } from 'vitest';
import {
  countryNameKey,
  isMarketCountrySlug,
  isMarketSlug,
  marketCountrySlug,
  marketPath,
  otherDeal,
} from '@/src/features/market-pages/utils/marketRoutes';
import {
  formatEuro,
  marketFacts,
  marketHeadText,
  placeLabel,
  typeLabel,
} from '@/src/features/market-pages/utils/marketPageText';
import { isMarketHub, isMarketPageData, notFoundResult, shouldRetry } from '@/src/features/market-pages/utils/marketApiResult';
import { marketCollectionJsonLd } from '@/src/features/market-pages/utils/marketJsonLd';
import { marketTranslator } from '@/functions/_market-i18n';
import type { MarketStats } from '@/src/features/market-pages/types';

const en = marketTranslator('en');
const albania = { slug: 'albania', name: 'Albania', code: 'AL' };

const stats: MarketStats = {
  listingCount: 1234,
  indexableCount: 900,
  pricedCount: 1200,
  priceLow: 60_000,
  priceMedian: 118_500,
  priceHigh: 240_000,
  pricePerSqmMedian: 1420,
  pricePerSqmCount: 1100,
  typeCounts: [],
};

describe('market URLs', () => {
  it('builds overview, country and city paths, and encodes segments', () => {
    expect(marketPath('sale')).toBe('/property-for-sale');
    expect(marketPath('rent', 'kosovo')).toBe('/property-for-rent/kosovo');
    expect(marketPath('sale', 'north-macedonia', 'скопје')).toBe(`/property-for-sale/north-macedonia/${encodeURIComponent('скопје')}`);
    expect(marketPath('sale', undefined, 'tirana')).toBe('/property-for-sale');
    expect(otherDeal('sale')).toBe('rent');
  });

  it('maps country names to page slugs and translation keys', () => {
    expect(marketCountrySlug('Bosnia and Herzegovina')).toBe('bosnia-and-herzegovina');
    expect(marketCountrySlug('Bosnia')).toBe('bosnia-and-herzegovina');
    expect(marketCountrySlug('north macedonia')).toBe('north-macedonia');
    expect(marketCountrySlug('Italy')).toBeUndefined();
    expect(marketCountrySlug(undefined)).toBeUndefined();
    expect(countryNameKey('bosnia-and-herzegovina')).toBe('bosnia-herzegovina');
    expect(isMarketCountrySlug('greece')).toBe(true);
    expect(isMarketCountrySlug('bosnia')).toBe(false);
  });

  it('accepts only slug-shaped segments', () => {
    expect(isMarketSlug('novi-sad')).toBe(true);
    expect(isMarketSlug('скопје')).toBe(true);
    expect(isMarketSlug('Novi-Sad')).toBe(false);
    expect(isMarketSlug('a/b')).toBe(false);
    expect(isMarketSlug('')).toBe(false);
    expect(isMarketSlug(undefined)).toBe(false);
  });
});

describe('market page text', () => {
  it('names the place, translated', () => {
    expect(placeLabel(en, { country: albania, city: { name: 'Tirana' } })).toBe('Tirana, Albania');
    expect(placeLabel(marketTranslator('sq'), { country: albania })).toBe('Shqipëri');
    expect(placeLabel(en, {})).toBe('the Balkans');
  });

  it('formats euros in the reader\'s style, keeping a decimal on small figures', () => {
    expect(formatEuro(118_500, 'en')).toBe('€118,500');
    expect(formatEuro(8.46, 'en')).toBe('€8.5');
    expect(formatEuro(118_500, 'el')).toMatch(/118\.500/);
  });

  it('lists only the figures it has', () => {
    expect(marketFacts(en, 'en', 'sale', stats).map((f) => f.key)).toEqual(['listings', 'median', 'range', 'perSqm']);
    const thin = { ...stats, priceLow: null, priceMedian: null, priceHigh: null, pricePerSqmMedian: null };
    expect(marketFacts(en, 'en', 'rent', thin)).toEqual([{ key: 'listings', label: 'Live listings', value: '1,234' }]);
  });

  it('writes a title and a description that differ by place and lead with the figures', () => {
    const tirana = marketHeadText(en, 'en', 'sale', { country: albania, city: { name: 'Tirana' } }, stats);
    const durres = marketHeadText(en, 'en', 'sale', { country: albania, city: { name: 'Durrës' } }, stats);
    expect(tirana.title).toBe('Property for Sale in Tirana, Albania – Prices and Listings');
    expect(tirana.description.startsWith('Property for sale in Tirana, Albania. Live listings: 1,234 · Median asking price: €118,500')).toBe(true);
    expect(tirana.description.length).toBeGreaterThan(120);
    expect(tirana.description.length).toBeLessThanOrEqual(301);
    expect(durres.title).not.toBe(tirana.title);
    expect(durres.description).not.toBe(tirana.description);
  });

  it('labels property types, with a readable fallback', () => {
    expect(typeLabel(en, 'apartment')).toBe('Apartment');
    expect(typeLabel(en, 'luxury-villa')).toBe('Luxury villa');
    expect(typeLabel(en, 'other')).toBe('Other');
  });
});

describe('API answers', () => {
  const page = {
    deal: 'sale',
    country: albania,
    city: null,
    stats,
    indexable: true,
    cities: [],
    listings: [],
    generatedAt: '2026-11-22T00:00:00Z',
  };

  it('accepts a well-formed page and overview, and nothing else', () => {
    expect(isMarketPageData(page)).toBe(true);
    expect(isMarketPageData({ ...page, deal: 'buy' })).toBe(false);
    expect(isMarketPageData({ ...page, country: { slug: 'albania' } })).toBe(false);
    expect(isMarketPageData({ ...page, listings: undefined })).toBe(false);
    expect(isMarketPageData('<html>')).toBe(false);
    expect(isMarketHub({ deal: 'rent', countries: [{ ...albania, cities: [] }] })).toBe(true);
    expect(isMarketHub({ deal: 'rent', countries: [{ ...albania }] })).toBe(false);
  });

  it('turns the API 404s into answers the page can explain', () => {
    expect(notFoundResult({ statusCode: 404, details: { error: 'unknown-city', country: albania } }))
      .toEqual({ status: 'unknown-city', country: albania });
    expect(notFoundResult({ statusCode: 404, details: { error: 'unknown-country' } })).toEqual({ status: 'unknown-country' });
    expect(notFoundResult({ statusCode: 500 })).toBeNull();
    expect(notFoundResult(new Error('offline'))).toBeNull();
  });

  it('retries network and server errors, not rejected requests', () => {
    expect(shouldRetry(0, new Error('offline'))).toBe(true);
    expect(shouldRetry(0, { statusCode: 503 })).toBe(true);
    expect(shouldRetry(2, { statusCode: 503 })).toBe(false);
    expect(shouldRetry(0, { statusCode: 400 })).toBe(false);
  });
});

describe('JSON-LD', () => {
  it('lists the listings with absolute URLs and skips rows without an id', () => {
    const ld = marketCollectionJsonLd({
      lang: 'me',
      path: '/property-for-sale/montenegro',
      name: 'x',
      description: 'y',
      listings: [{ id: 'abc', title: 'Flat' }, { title: 'No id' }],
      total: 7,
    });
    expect(ld.inLanguage).toBe('sr-ME');
    expect(ld.url).toBe('https://balkanestateai.com/me/property-for-sale/montenegro');
    expect(ld.mainEntity.numberOfItems).toBe(7);
    expect(ld.mainEntity.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, url: 'https://balkanestateai.com/me/property/abc', name: 'Flat' },
    ]);
  });
});
