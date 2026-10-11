import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSlug } from '@/shared/utils/validation';
import { COUNTRY_GUIDES, GUIDES_LAST_REVIEWED } from '@/features/guides/data/countryGuides';
import {
  filterGuides,
  findGuide,
  formatEuroRange,
  formatPercentRange,
  formatReviewDate,
  parseGuideSort,
  sortGuides,
} from '@/features/guides/utils/guideSelectors';
import { paths } from '@/src/app/router/paths';
import { resolveRoute } from '@/app/navigation/sidebarNavigation';

const LANGS = ['en', 'sq', 'bs', 'bg', 'hr', 'el', 'mk', 'me', 'ro', 'sr'];
const readLocale = (lang: string, ns: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `../i18n/locales/${lang}/${ns}.json`), 'utf8'));

describe('validateSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(validateSlug('north-macedonia')).toEqual({ isValid: true });
    expect(validateSlug('a1')).toEqual({ isValid: true });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['Montenegro', 'uppercase'],
    ['-serbia', 'leading hyphen'],
    ['serbia--x', 'double hyphen'],
    ['../etc', 'path traversal'],
    ['<script>', 'markup'],
    ['a'.repeat(81), 'too long'],
  ])('rejects %j (%s)', (slug) => {
    const result = validateSlug(slug);
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects non-strings', () => {
    expect(validateSlug(undefined).isValid).toBe(false);
    expect(validateSlug(42).isValid).toBe(false);
  });
});

describe('guide data', () => {
  it('has unique, valid slugs', () => {
    const slugs = COUNTRY_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(validateSlug(slug).isValid, slug).toBe(true);
  });

  it('has sane numeric ranges and non-empty content', () => {
    for (const g of COUNTRY_GUIDES) {
      expect(g.avgPricePerSqm.min, g.slug).toBeGreaterThan(0);
      expect(g.avgPricePerSqm.min, g.slug).toBeLessThanOrEqual(g.avgPricePerSqm.max);
      expect(g.rentalYield.min, g.slug).toBeGreaterThan(0);
      expect(g.rentalYield.max, g.slug).toBeLessThan(25);
      expect(g.rentalYield.min, g.slug).toBeLessThanOrEqual(g.rentalYield.max);
      expect(g.highlights.length, g.slug).toBeGreaterThan(0);
      expect(g.legalProcess.length, g.slug).toBeGreaterThan(0);
      expect(g.topCities.length, g.slug).toBeGreaterThan(0);
    }
  });

  it('has a translated country name for every guide in every locale', () => {
    for (const lang of LANGS) {
      const countries = readLocale(lang, 'common').countries;
      for (const g of COUNTRY_GUIDES) expect(countries[g.countryKey], `${lang}:${g.countryKey}`).toBeTruthy();
    }
  });

  it('has a parseable review date', () => {
    expect(Number.isNaN(new Date(GUIDES_LAST_REVIEWED).getTime())).toBe(false);
  });
});

describe('findGuide', () => {
  it('finds a guide by slug, case-insensitively', () => {
    const result = findGuide('Montenegro');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.guide.slug).toBe('montenegro');
      expect(COUNTRY_GUIDES[result.index]).toBe(result.guide);
    }
  });

  it('reports a well-formed unknown slug as not found', () => {
    expect(findGuide('slovenia')).toEqual({ status: 'not-found', slug: 'slovenia' });
  });

  it('reports a malformed slug as invalid without echoing it', () => {
    const result = findGuide('<img src=x onerror=alert(1)>');
    expect(result.status).toBe('invalid');
    expect(JSON.stringify(result)).not.toContain('onerror');
  });
});

describe('filterGuides', () => {
  it('returns everything for an empty query', () => {
    expect(filterGuides(COUNTRY_GUIDES, '')).toHaveLength(COUNTRY_GUIDES.length);
    expect(filterGuides(COUNTRY_GUIDES, '   ')).toHaveLength(COUNTRY_GUIDES.length);
  });

  it('matches countries and cities, ignoring case and accents', () => {
    expect(filterGuides(COUNTRY_GUIDES, 'GREECE').map((g) => g.slug)).toEqual(['greece']);
    expect(filterGuides(COUNTRY_GUIDES, 'budva').map((g) => g.slug)).toEqual(['montenegro']);
    expect(filterGuides(COUNTRY_GUIDES, 'nis').map((g) => g.slug)).toContain('serbia');
    expect(filterGuides(COUNTRY_GUIDES, 'timisoara').map((g) => g.slug)).toEqual(['romania']);
  });

  it('matches the translated name too', () => {
    const translate = (g: { countryKey: string; country: string }) => (g.countryKey === 'montenegro' ? 'Mal i Zi' : g.country);
    expect(filterGuides(COUNTRY_GUIDES, 'mal i zi', translate).map((g) => g.slug)).toEqual(['montenegro']);
  });

  it('sanitises markup out of the query', () => {
    expect(filterGuides(COUNTRY_GUIDES, '<b>serbia</b>').map((g) => g.slug)).toEqual([]);
    expect(filterGuides(COUNTRY_GUIDES, '<serbia>').map((g) => g.slug)).toEqual(['serbia']);
  });
});

describe('sortGuides', () => {
  it('sorts by price ascending and yield descending without mutating the input', () => {
    const before = COUNTRY_GUIDES.map((g) => g.slug);
    const byPrice = sortGuides(COUNTRY_GUIDES, 'price-asc');
    expect(byPrice[0].slug).toBe('north-macedonia');
    expect(byPrice[byPrice.length - 1].slug).toBe('croatia');
    expect(sortGuides(COUNTRY_GUIDES, 'yield-desc')[0].slug).toBe('kosovo');
    expect(COUNTRY_GUIDES.map((g) => g.slug)).toEqual(before);
  });

  it('falls back to name for an unknown sort value', () => {
    expect(parseGuideSort('price-asc')).toBe('price-asc');
    expect(parseGuideSort('DROP TABLE')).toBe('name');
    expect(sortGuides(COUNTRY_GUIDES, parseGuideSort(null))[0].slug).toBe('albania');
  });
});

describe('formatting', () => {
  it('formats ranges', () => {
    expect(formatEuroRange({ min: 1800, max: 3500 }, 'en')).toBe('€1,800–3,500');
    expect(formatPercentRange({ min: 5, max: 8 }, 'en')).toBe('5–8%');
  });

  it('does not throw for unusual locales or bad dates', () => {
    expect(() => formatEuroRange({ min: 1, max: 2 }, 'me')).not.toThrow();
    expect(() => formatEuroRange({ min: 1, max: 2 }, 'not a locale!!')).not.toThrow();
    expect(formatReviewDate('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('routing and navigation', () => {
  it('builds guide paths', () => {
    expect(paths.guides()).toBe('/guides');
    expect(paths.guide('montenegro')).toBe('/guides/montenegro');
  });

  it('is reachable from the sidebar', () => {
    expect(resolveRoute('guides')).toEqual({ isValid: true, path: '/guides' });
  });

  it('has every guides UI key in all locales', () => {
    const enKeys = Object.keys(readLocale('en', 'common').guides).sort();
    for (const lang of LANGS) {
      expect(Object.keys(readLocale(lang, 'common').guides).sort(), lang).toEqual(enKeys);
      expect(readLocale(lang, 'nav').guides, `${lang} nav`).toBeTruthy();
      expect(readLocale(lang, 'footer').links.guides, `${lang} footer`).toBeTruthy();
    }
  });
});
