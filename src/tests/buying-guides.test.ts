import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSlug } from '@/shared/utils/validation';
import { COUNTRY_GUIDES, GUIDES_LAST_REVIEWED } from '@/features/guides/data/countryGuides';
import {
  filterGuides,
  findGuide,
  formatPriceStat,
  formatReviewDate,
  guideSources,
  sortByName,
} from '@/features/guides/utils/guideSelectors';
import { GUIDE_FACT_KEYS } from '@/features/guides/types/guide.types';
import { paths } from '@/src/app/router/paths';
import { resolveRoute } from '@/app/navigation/sidebarNavigation';

const LANGS = ['en', 'sq', 'bs', 'bg', 'hr', 'el', 'mk', 'me', 'ro', 'sr'];

/**
 * The only hosts a guide may cite: statistics offices, central banks, tax
 * authorities, ministries and official gazettes, and EU institutions. Adding a
 * host here is a deliberate decision that it is an official source.
 */
const OFFICIAL_HOSTS = [
  'gov.me', // Government of Montenegro
  'monstat.org', // Statistical Office of Montenegro
  'rgz.gov.rs', // Republic Geodetic Authority of Serbia
  'purs.gov.rs', // Tax Administration of Serbia
  'bqk-kos.org', // Central Bank of Kosovo
  'dzs.hr', // Croatian Bureau of Statistics
  'porezna-uprava.gov.hr', // Croatian Tax Administration
  'gov.hr', // Croatian government portal
  'mpudt.gov.hr', // Croatian Ministry of Justice
  'bhas.gov.ba', // Agency for Statistics of BiH
  'nsi.bg', // National Statistical Institute of Bulgaria
  'minfin.bg', // Bulgarian Ministry of Finance
  'europa.eu', // Eurostat
  'bankofgreece.gr', // Bank of Greece
  'aade.gr', // Greek tax authority
  'gov.gr', // Greek government portals (MITOS, Housing Policy, Enterprise Greece)
];

const isOfficial = (url: string) => {
  const { protocol, hostname } = new URL(url);
  return protocol === 'https:' && OFFICIAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
};
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

  it('cites only official sources, over HTTPS', () => {
    for (const g of COUNTRY_GUIDES) {
      for (const source of guideSources(g)) {
        expect(isOfficial(source.url), `${g.slug}: ${source.url}`).toBe(true);
        expect(source.publisher.trim(), `${g.slug}: publisher`).not.toBe('');
        expect(source.title.trim(), `${g.slug}: title`).not.toBe('');
      }
    }
  });

  it('never states a fact without a source', () => {
    for (const g of COUNTRY_GUIDES) {
      for (const key of GUIDE_FACT_KEYS) {
        const fact = g[key];
        if (!fact) continue;
        expect(fact.text.trim(), `${g.slug}.${key}`).not.toBe('');
        expect(fact.sources.length, `${g.slug}.${key} has no source`).toBeGreaterThan(0);
      }
      if (g.price) {
        expect(g.price.period.trim(), `${g.slug}.price.period`).not.toBe('');
        expect(g.price.measure.trim(), `${g.slug}.price.measure`).not.toBe('');
      }
    }
  });

  it('labels price figures with what they are', () => {
    for (const g of COUNTRY_GUIDES) {
      const p = g.price;
      if (!p) continue;
      if (p.kind === 'avg-per-sqm') {
        expect(p.amount, g.slug).toBeGreaterThan(0);
        if (p.currency !== 'EUR') expect(p.eurAmount, `${g.slug} needs a EUR equivalent`).toBeGreaterThan(0);
      } else {
        expect(Number.isFinite(p.changePct), g.slug).toBe(true);
      }
    }
  });

  it('converts KM at the fixed rate of 1.95583', () => {
    for (const g of COUNTRY_GUIDES) {
      const p = g.price;
      if (p?.kind === 'avg-per-sqm' && p.currency === 'BAM') {
        expect(p.eurAmount).toBe(Math.round(p.amount / 1.95583));
      }
    }
  });

  it('lists cities for every guide', () => {
    for (const g of COUNTRY_GUIDES) expect(g.cities.length, g.slug).toBeGreaterThan(0);
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
    expect(filterGuides(COUNTRY_GUIDES, 'NOVI sad').map((g) => g.slug)).toEqual(['serbia']);
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

describe('sortByName', () => {
  it('sorts by name without mutating the input', () => {
    const before = COUNTRY_GUIDES.map((g) => g.slug);
    expect(sortByName(COUNTRY_GUIDES)[0].slug).toBe('albania');
    expect(COUNTRY_GUIDES.map((g) => g.slug)).toEqual(before);
  });
});

describe('formatting', () => {
  it('formats official figures exactly as published', () => {
    const source = { publisher: 'X', title: 'Y', url: 'https://gov.me' };
    expect(formatPriceStat({ kind: 'avg-per-sqm', amount: 2445, currency: 'EUR', measure: 'm', period: 'p', source }, 'en')).toBe('€2,445');
    expect(formatPriceStat({ kind: 'avg-per-sqm', amount: 3147, currency: 'BAM', eurAmount: 1609, measure: 'm', period: 'p', source }, 'en')).toBe('3,147 KM (≈ €1,609)');
    expect(formatPriceStat({ kind: 'index-change', changePct: 5.25, measure: 'm', period: 'p', source }, 'en')).toBe('+5.25%');
    expect(formatPriceStat({ kind: 'index-change', changePct: -1.5, measure: 'm', period: 'p', source }, 'en')).toBe('-1.5%');
  });

  it('does not throw for unusual locales or bad dates', () => {
    const stat = { kind: 'index-change', changePct: 1, measure: 'm', period: 'p', source: { publisher: 'X', title: 'Y', url: 'https://gov.me' } } as const;
    expect(() => formatPriceStat(stat, 'me')).not.toThrow();
    expect(() => formatPriceStat(stat, 'not a locale!!')).not.toThrow();
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
