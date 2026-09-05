import { describe, it, expect } from 'vitest';
import { SUPPORTED_COUNTRY_CODES, isSupportedCountryCode } from '@/shared/geo';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';

describe('the countries this app covers', () => {
  it('is derived from the list a listing can be filed under, not written twice', () => {
    // The point of deriving it: coverage cannot drift from what the
    // create-listing form offers, because they are the same data.
    expect(SUPPORTED_COUNTRY_CODES).toEqual(
      BALKAN_LOCATIONS.map((country) => country.code.toLowerCase()).sort(),
    );
  });

  it('covers the ten Balkan countries', () => {
    expect([...SUPPORTED_COUNTRY_CODES].sort())
      .toEqual(['al', 'ba', 'bg', 'gr', 'hr', 'me', 'mk', 'ro', 'rs', 'xk']);
  });

  it('recognises a covered country by its code, in any case', () => {
    expect(isSupportedCountryCode('al')).toBe(true);
    expect(isSupportedCountryCode('XK')).toBe(true);
    expect(isSupportedCountryCode(' me ')).toBe(true);
  });

  it('does not recognise anywhere else', () => {
    // The results that prompted this: a Turkish residence and a Philippine
    // mall, offered by Google beside an Albanian one.
    for (const code of ['tr', 'pt', 'ph', 'it', 'si', 'at', 'hu', 'de']) {
      expect(isSupportedCountryCode(code), code).toBe(false);
    }
  });

  it('treats a missing code as not covered', () => {
    // The safe direction: a suggestion wrongly hidden costs one row, one
    // wrongly shown costs a search that cannot succeed.
    expect(isSupportedCountryCode(undefined)).toBe(false);
    expect(isSupportedCountryCode(null)).toBe(false);
    expect(isSupportedCountryCode('')).toBe(false);
  });

  it('says nothing about country names, which is the point', async () => {
    // Names arrive in the viewer's language, so a list of them goes stale the
    // moment a provider changes its wording. Codes do not have that problem,
    // and both providers accept them as a restriction — so the filtering
    // happens at the source rather than being guessed at afterwards.
    const coverage = Object.keys(await import('@/shared/geo/coverage'));
    expect(coverage).toEqual(['SUPPORTED_COUNTRY_CODES', 'isSupportedCountryCode']);
  });
});
