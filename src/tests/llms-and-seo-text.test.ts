/**
 * What language models and search engines read about the site as a whole:
 * /llms.txt and /llms-full.txt, and the per-language titles and descriptions
 * of the prerendered pages (src/i18n/locales/{lang}/seoPages.json).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildLlmsFullTxt, buildLlmsTxt } from '@/scripts/lib/llms-text.mjs';
import { COUNTRY_GUIDES } from '@/src/features/guides/data/countryGuides';

const LANGS = ['en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el'];
const siteUrls = (text: string) => [...text.matchAll(/https:\/\/balkanestateai\.com[^\s)]*/g)].map((m) => m[0]);

describe('llms.txt', () => {
  const short = buildLlmsTxt();
  const full = buildLlmsFullTxt();

  it('links only to pages crawlers can read: language-prefixed, no query strings', () => {
    for (const url of [...siteUrls(short), ...siteUrls(full)]) {
      expect(url).not.toContain('?');
      // Pages under /en, the site root, and the llms / CSV files at the root.
      expect(url === 'https://balkanestateai.com' || /\/[\w-]+\.(txt|csv)$/.test(url) || /^https:\/\/balkanestateai\.com\/en(\/|$)/.test(url)).toBe(true);
    }
  });

  it('points to the price table and its CSV', () => {
    expect(short).toContain('(https://balkanestateai.com/en/property-prices)');
    expect(short).toContain('https://balkanestateai.com/property-prices.csv');
  });

  it('has a sale page, a rent page and a guide for every country', () => {
    for (const guide of COUNTRY_GUIDES) {
      expect(short).toContain(`Property for sale in ${guide.country}`);
      expect(short).toContain(`Property for rent in ${guide.country}`);
      expect(short).toContain(`/en/guides/${guide.slug})`);
    }
    expect(short).toContain('/en/property-for-sale/bosnia-and-herzegovina');
  });

  it('names the brand and its other spellings, and makes no unverifiable claims', () => {
    expect(short).toMatch(/BalkanEstateAI \(also written BalkanEstate AI, or BalkanEstate\)/);
    for (const text of [short, full]) {
      expect(text).not.toMatch(/\bthe only\b|\bleading\b|\bbest\b/i);
      expect(text).not.toMatch(/€\s?\d[\d,.]*\s*[–-]\s*\d[\d,.]*\/sqm|yields? of \d/i);
    }
  });

  it('carries each country\'s buying facts and official sources in the full version', () => {
    for (const guide of COUNTRY_GUIDES) {
      expect(full).toContain(`## ${guide.country}`);
      expect(full).toContain(guide.transferTax);
      for (const src of guide.sources.filter((s) => s.url)) expect(full).toContain(src.url as string);
    }
  });
});

describe('prerendered page titles and descriptions', () => {
  const read = (lang: string) =>
    JSON.parse(fs.readFileSync(path.resolve(__dirname, `../i18n/locales/${lang}/seoPages.json`), 'utf-8')) as Record<string, { title: string; description: string }>;
  const english = read('en');

  it('every language has every page', () => {
    for (const lang of LANGS) expect(Object.keys(read(lang)).sort()).toEqual(Object.keys(english).sort());
  });

  it('no two language versions of a page share a title or a description', () => {
    for (const key of Object.keys(english)) {
      const titles = LANGS.map((lang) => read(lang)[key].title);
      const descriptions = LANGS.map((lang) => read(lang)[key].description);
      expect(new Set(titles).size, `${key} titles`).toBe(LANGS.length);
      expect(new Set(descriptions).size, `${key} descriptions`).toBe(LANGS.length);
    }
  });

  it('descriptions are long enough to describe the page, short enough not to be cut', () => {
    for (const lang of LANGS) {
      for (const [key, text] of Object.entries(read(lang))) {
        expect(text.description.length, `${lang}/${key}`).toBeGreaterThanOrEqual(100);
        expect(text.description.length, `${lang}/${key}`).toBeLessThanOrEqual(200);
      }
    }
  });
});
