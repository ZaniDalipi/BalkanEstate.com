/**
 * Under-construction listings.
 *
 * A listing that is still going up carries a promise ("finished in 2028")
 * instead of a fact ("built in 2019"). These tests pin the three rules that
 * keep the two apart: what the UI is allowed to say, what the form is allowed
 * to submit, and what gets persisted.
 */

import { describe, it, expect } from 'vitest';
import {
  COMPLETION_YEAR_HORIZON,
  buildConstructionFields,
  completionYearOptions,
  isUnderConstruction,
  normalizeConstructionStatus,
  resolveConstruction,
} from '../shared/property/construction';
import { validateCompletionYear, validateConstruction } from '../shared/utils/validation';
import { validateListing, initialListingData } from '../features/seller/components/ListingFormHelpers';

const NOW = new Date('2026-06-15T00:00:00Z');
const YEAR = NOW.getFullYear();

describe('normalizeConstructionStatus', () => {
  it('treats anything unrecognised as ready', () => {
    expect(normalizeConstructionStatus(undefined)).toBe('ready');
    expect(normalizeConstructionStatus(null)).toBe('ready');
    expect(normalizeConstructionStatus('Under-Construction')).toBe('ready');
    expect(normalizeConstructionStatus({ status: 'under-construction' })).toBe('ready');
  });

  it('keeps the one status it knows', () => {
    expect(normalizeConstructionStatus('under-construction')).toBe('under-construction');
    expect(normalizeConstructionStatus('ready')).toBe('ready');
  });
});

describe('resolveConstruction', () => {
  it('reads a legacy record with neither field as ready', () => {
    expect(resolveConstruction({ yearBuilt: 1998 } as never, NOW)).toEqual({ status: 'ready' });
    expect(resolveConstruction(null, NOW)).toEqual({ status: 'ready' });
  });

  it('returns the promised year when it is usable', () => {
    expect(
      resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 2 }, NOW)
    ).toEqual({ status: 'under-construction', expectedYear: YEAR + 2 });
  });

  it('accepts a year that arrived over the wire as a string', () => {
    expect(
      resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: String(YEAR + 1) }, NOW)
    ).toEqual({ status: 'under-construction', expectedYear: YEAR + 1 });
  });

  it('drops a year that is missing, unusable or already past', () => {
    const cases = [undefined, null, '', 'soon', NaN, YEAR - 1, YEAR + COMPLETION_YEAR_HORIZON + 1, 2026.5];
    for (const expectedCompletionYear of cases) {
      expect(resolveConstruction({ constructionStatus: 'under-construction', expectedCompletionYear }, NOW))
        .toEqual({ status: 'under-construction', expectedYear: null });
    }
  });

  it('ignores a stray year on a ready listing', () => {
    expect(resolveConstruction({ constructionStatus: 'ready', expectedCompletionYear: YEAR + 1 }, NOW))
      .toEqual({ status: 'ready' });
  });
});

describe('isUnderConstruction', () => {
  it('is false for legacy and ready records', () => {
    expect(isUnderConstruction(null)).toBe(false);
    expect(isUnderConstruction({})).toBe(false);
    expect(isUnderConstruction({ constructionStatus: 'ready' })).toBe(false);
  });

  it('is true only for the known status', () => {
    expect(isUnderConstruction({ constructionStatus: 'under-construction' })).toBe(true);
  });
});

describe('completionYearOptions', () => {
  it('offers this year through the horizon, oldest first', () => {
    const options = completionYearOptions(NOW);
    expect(options[0]).toBe(YEAR);
    expect(options[options.length - 1]).toBe(YEAR + COMPLETION_YEAR_HORIZON);
    expect(options).toHaveLength(COMPLETION_YEAR_HORIZON + 1);
  });
});

describe('validateCompletionYear', () => {
  it('accepts every year the picker offers', () => {
    for (const year of completionYearOptions(NOW)) {
      expect(validateCompletionYear(year, { now: NOW })).toEqual({ isValid: true });
    }
  });

  it('rejects a year that has already passed', () => {
    expect(validateCompletionYear(YEAR - 1, { now: NOW })).toEqual({
      isValid: false,
      error: 'Completion year cannot be in the past',
    });
  });

  it('rejects a year beyond the horizon', () => {
    const result = validateCompletionYear(YEAR + COMPLETION_YEAR_HORIZON + 1, { now: NOW });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(String(COMPLETION_YEAR_HORIZON));
  });

  it('rejects values that are not whole years', () => {
    expect(validateCompletionYear('not a year', { now: NOW }).isValid).toBe(false);
    expect(validateCompletionYear(2027.4, { now: NOW }).isValid).toBe(false);
  });
});

describe('validateConstruction', () => {
  it('passes a ready listing whatever year tags along', () => {
    expect(validateConstruction({ constructionStatus: 'ready' }, { now: NOW })).toEqual({ isValid: true });
    expect(validateConstruction({ constructionStatus: 'ready', expectedCompletionYear: 1900 }, { now: NOW }))
      .toEqual({ isValid: true });
  });

  it('requires a year once the listing says under construction', () => {
    const result = validateConstruction({ constructionStatus: 'under-construction' }, { now: NOW });
    expect(result).toEqual({ isValid: false, error: 'Please select the expected completion year' });
  });

  it('applies the year rules to the pair', () => {
    expect(
      validateConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: YEAR - 5 }, { now: NOW })
        .isValid
    ).toBe(false);
    expect(
      validateConstruction({ constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 1 }, { now: NOW })
    ).toEqual({ isValid: true });
  });
});

describe('buildConstructionFields', () => {
  it('leaves a finished listing alone', () => {
    expect(buildConstructionFields({ constructionStatus: 'ready', yearBuilt: 2011 }, NOW)).toEqual({
      yearBuilt: 2011,
      constructionStatus: 'ready',
    });
  });

  it('mirrors the completion year into yearBuilt so year sorts stay right', () => {
    expect(
      buildConstructionFields(
        { constructionStatus: 'under-construction', expectedCompletionYear: YEAR + 3, yearBuilt: YEAR },
        NOW
      )
    ).toEqual({
      yearBuilt: YEAR + 3,
      constructionStatus: 'under-construction',
      expectedCompletionYear: YEAR + 3,
    });
  });

  it('never writes a promise with no date on it', () => {
    expect(
      buildConstructionFields({ constructionStatus: 'under-construction', yearBuilt: 2020 }, NOW)
    ).toEqual({ yearBuilt: 2020, constructionStatus: 'ready' });
  });

  it('clears a stale year when the listing goes back to ready', () => {
    const fields = buildConstructionFields(
      { constructionStatus: 'ready', expectedCompletionYear: YEAR + 2, yearBuilt: 2015 },
      NOW
    );
    expect(fields.expectedCompletionYear).toBeUndefined();
  });
});

describe('validateListing — construction pair', () => {
  const t = (key: string, fallback?: string) => fallback ?? key;

  const base = {
    listingData: {
      ...initialListingData,
      title: 'New build by the marina',
      description: 'Two bedrooms, handover next year.',
      price: 180000,
      propertyType: 'apartment' as const,
      totalFloors: 6,
      floorNumber: 2,
      hasElevator: true,
      lat: 42.44,
      lng: 19.26,
    },
    imageCount: 2,
    selectedCountry: 'Montenegro',
    selectedCity: 'Podgorica',
  };

  it('publishes a ready listing without asking for a completion year', () => {
    expect(validateListing(base, t)).toEqual({});
  });

  it('blocks an under-construction listing with no year picked', () => {
    const errors = validateListing(
      { ...base, listingData: { ...base.listingData, constructionStatus: 'under-construction' } },
      t
    );
    expect(errors.expectedCompletionYear).toBe(
      'Please select the year this property is expected to be finished.'
    );
  });

  it('publishes once the year is picked', () => {
    const errors = validateListing(
      {
        ...base,
        listingData: {
          ...base.listingData,
          constructionStatus: 'under-construction',
          expected_completion_year: new Date().getFullYear() + 1,
        },
      },
      t
    );
    expect(errors).toEqual({});
  });
});
