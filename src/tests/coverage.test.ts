import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  SUPPORTED_COUNTRY_CODES,
  isPlaceInCoverage,
  isSupportedCountry,
  isSupportedCountryCode,
} from '@/shared/geo';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';

const LOCALES = ['en', 'sq', 'sr', 'hr', 'bs', 'me', 'mk', 'bg', 'el', 'ro'];

/**
 * The locale files carry an eleventh country, Slovenia, which the app has no
 * cities for and cannot file a listing under. Coverage follows what a seller
 * can actually list, so Slovenia is deliberately outside it and its locale
 * keys are skipped here rather than treated as a gap.
 */
const COVERED_KEYS = new Set([
  'albania', 'bosnia-herzegovina', 'bulgaria', 'croatia', 'greece',
  'kosovo', 'montenegro', 'north-macedonia', 'romania', 'serbia',
]);

describe('the ten countries this app covers', () => {
  it('is exactly the list the app can file a listing under', () => {
    expect(SUPPORTED_COUNTRY_CODES).toEqual(
      BALKAN_LOCATIONS.map((country) => country.code.toLowerCase()).sort(),
    );
    expect(SUPPORTED_COUNTRY_CODES).toHaveLength(10);
  });

  it('recognises each of them by the name the app stores', () => {
    for (const country of BALKAN_LOCATIONS) {
      expect(isSupportedCountry(country.name), country.name).toBe(true);
    }
  });

  it('recognises them in every language the app speaks', () => {
    // A place provider names the country in the viewer's language, so the
    // filter has to know Ελλάδα and Greqi as well as Greece.
    for (const locale of LOCALES) {
      const common = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, `../i18n/locales/${locale}/common.json`), 'utf8'),
      );
      for (const [key, name] of Object.entries(common.countries ?? {})) {
        if (!COVERED_KEYS.has(key)) continue; // See the Slovenia note below.
        expect(isSupportedCountry(name as string), `${locale}/${key}: ${name}`).toBe(true);
      }
    }
  });

  it('recognises the native names and the exonyms a map might use', () => {
    for (const name of [
      'Hrvatska', 'Srbija', 'Crna Gora', 'Bosna i Hercegovina', 'Shqipëria',
      'Kosova', 'România', 'Ελλάδα', 'Hellas', 'Македонија', 'България',
    ]) {
      expect(isSupportedCountry(name), name).toBe(true);
    }
  });

  it('does not recognise anywhere else', () => {
    // The results that prompted this: a Turkish residence and a Philippine
    // mall, offered by Google next to an Albanian one.
    for (const name of [
      'Türkiye', 'Turkey', 'Philippines', 'Portugal', 'Italy', 'Italia',
      'Slovenia', 'Austria', 'Hungary', 'Germany', 'North Cyprus',
    ]) {
      expect(isSupportedCountry(name), name).toBe(false);
    }
  });

  it('denies a name it does not know rather than letting it through', () => {
    // The safe direction: a suggestion wrongly hidden costs a result, one
    // wrongly shown costs a search that can only come back empty.
    expect(isSupportedCountry('Freedonia')).toBe(false);
    expect(isSupportedCountry('')).toBe(false);
    expect(isSupportedCountry(undefined)).toBe(false);
  });

  it('leaves out Slovenia, which the locales name but no listing can use', () => {
    // Not an oversight: `BALKAN_LOCATIONS` holds no Slovenian cities, so a
    // Slovenian suggestion would fly the map somewhere with nothing on it.
    expect(isSupportedCountry('Slovenia')).toBe(false);
    expect(BALKAN_LOCATIONS.some((country) => country.name === 'Slovenia')).toBe(false);
  });

  it('knows the codes providers are restricted by', () => {
    expect(isSupportedCountryCode('al')).toBe(true);
    expect(isSupportedCountryCode('XK')).toBe(true);
    expect(isSupportedCountryCode('tr')).toBe(false);
    expect(isSupportedCountryCode(undefined)).toBe(false);
  });
});

describe('isPlaceInCoverage', () => {
  it('keeps a place inside the coverage area', () => {
    expect(isPlaceInCoverage('Albania')).toBe(true);
    expect(isPlaceInCoverage('Црна Гора')).toBe(true);
  });

  it('drops a place outside it', () => {
    expect(isPlaceInCoverage('Türkiye')).toBe(false);
    expect(isPlaceInCoverage('Philippines')).toBe(false);
  });

  it('lets a place with no country line through, having been fenced already', () => {
    // A street or a business from a provider sometimes carries no country;
    // the request was already restricted by region code, so re-rejecting here
    // would throw away good results to re-check something already checked.
    expect(isPlaceInCoverage('')).toBe(true);
    expect(isPlaceInCoverage(undefined)).toBe(true);
  });
});

/**
 * The name list is generated from the locales, so it can fall behind them.
 * This is the guard: every country name the app displays must be a name the
 * filter accepts, or a user searching in that language sees their own country
 * disappear from the results.
 */
describe('the country-name list keeps up with the locales', () => {
  it('covers all ten countries in all ten locales', () => {
    const missing: string[] = [];

    for (const locale of LOCALES) {
      const common = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, `../i18n/locales/${locale}/common.json`), 'utf8'),
      );
      const countries = common.countries ?? {};
      expect(Object.keys(countries).length, `${locale} has no countries block`).toBeGreaterThanOrEqual(10);

      for (const [key, name] of Object.entries(countries)) {
        if (!COVERED_KEYS.has(key)) continue;
        if (!isSupportedCountry(name as string)) missing.push(`${locale}/${key}: ${name}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
